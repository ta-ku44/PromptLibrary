import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import './styles.scss';
import { loadStoredData } from '../../utils/storage';
import type { Template, Group } from '../../types';

let root: Root | null = null;
let container: HTMLElement | null = null;

interface ShowSuggestParams {
  query: string;
  curInputEl: HTMLElement | null;
  insertText: (template: Template) => void;
}

//* サジェストを表示
export const showSuggest = async ({ query, curInputEl, insertText }: ShowSuggestParams): Promise<void> => {
  if (!curInputEl) return;

  const data = await loadStoredData();
  const templates = data.templates.filter(t =>
    t.name.toLowerCase().includes(query.toLowerCase())
  );
  if (!templates.length) return;

  if (!container) {
    container = document.createElement('div');
    container.id = 'pt-suggest-root';
    container.style.position = 'absolute';
    container.style.zIndex = `${Number.MAX_SAFE_INTEGER}`;
    document.body.appendChild(container);
    root = createRoot(container);
  }
  setSuggestPos(curInputEl);
  root?.render(
    <Suggest
      templates={templates}
      groups={data.groups}
      inputEl={curInputEl}
      onSelect={insertText}
      onClose={hideSuggest}
    />
  );
};

//* サジェストを非表示
export const hideSuggest = () => {
  root?.unmount();
  root = null;
  container?.remove();
  container = null;
};

//* サジェストの位置を設定
const setSuggestPos = (el: HTMLElement) => {
  if (!container) return;

  const rect = el.getBoundingClientRect();
  const viewportHeight = window.innerHeight;

  // フォーカス位置に合わせてleftを調整
  let left = rect.left;
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const r = selection.getRangeAt(0).getBoundingClientRect();
    if (r.left !== 0) left = r.left;
  }

  // 入力欄が中央付近なら下に、下部なら上に表示
  const suggestHeight = container.offsetHeight;
  const showAbove = rect.top / viewportHeight > 0.75;

  container.style.left = `${window.scrollX + left}px`;
  container.style.top = showAbove
    ? `${window.scrollY + rect.top - suggestHeight - 15}px` // 15px: バッファ
    : `${window.scrollY + rect.bottom}px`;
};

interface SuggestProps {
  templates: Template[];
  groups: Group[];
  inputEl: HTMLElement;
  onSelect: (template: Template) => void;
  onClose: () => void;
}

const Suggest: React.FC<SuggestProps> = ({ templates, groups, inputEl, onSelect, onClose }) => {
  // Refs
  const suggestRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // セレクト状態の管理
  const [keyboardSelectedId, setKeyboardSelectedId] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [isKeyboardMode, setIsKeyboardMode] = useState(true);

  // グループごとにテンプレートを分類
  const groupedData = useMemo(() => {
    const map = new Map<number | null, Template[]>();
    const sortedGroups = [...groups].sort((a, b) => a.order - b.order);

    sortedGroups.forEach(g => {
      map.set(g.id, []);
    });
    map.set(null, []);

    templates.forEach(t => {
      const id = t.groupId ?? null;
      if (map.has(id)) {
        map.get(id)!.push(t);
      } else {
        map.get(null)!.push(t);
      }
    });
    for (const [key, value] of map.entries()) {
      if (value.length === 0) {
        map.delete(key);
      }
    }

    return map;
  }, [templates, groups]);

  // グループ名を取得
  const getGroupName = (id: number | null) =>
    id === null
      ? 'other'
      : groups.find(g => g.id === id)?.name ?? 'other';

  const flatTemplates = useMemo(() => {
    return Array.from(groupedData.values()).flatMap(list =>
      list.slice().sort((a, b) => a.order - b.order)
    );
  }, [groupedData]);

  // 最初のアイテムを選択状態にする
  useEffect(() => {
    if (flatTemplates.length) {
      setKeyboardSelectedId(flatTemplates[0].id);
      setHoveredId(null);
    }
  }, [flatTemplates]);

  // リサイズ・スクロール時に位置を更新
  useEffect(() => {
    const update = () => setSuggestPos(inputEl);
    const ro = new ResizeObserver(update);
    ro.observe(inputEl);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update);
    };
  }, [inputEl]);

  // 選択・確定をキーボードで操作
  useEffect(() => {
    const onKeyDownCapture = (e: KeyboardEvent) => {
      if (!flatTemplates.length || keyboardSelectedId == null) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsKeyboardMode(true);
        e.preventDefault();
        e.stopPropagation();
        const idx = flatTemplates.findIndex(t => t.id === keyboardSelectedId);
        if (idx === -1) return;

        if (e.key === 'ArrowDown' && idx < flatTemplates.length - 1) {
          setKeyboardSelectedId(flatTemplates[idx + 1].id);
        }
        if (e.key === 'ArrowUp' && idx > 0) {
          setKeyboardSelectedId(flatTemplates[idx - 1].id);
        }
      }

      if (e.key === 'Tab') {
        setIsKeyboardMode(true);
        e.preventDefault();
        e.stopPropagation();
        const t = flatTemplates.find(x => x.id === keyboardSelectedId);
        if (t) onSelect(t);
      }
    };

    window.addEventListener('keydown', onKeyDownCapture, true);
    return () =>
      window.removeEventListener('keydown', onKeyDownCapture, true);
  }, [flatTemplates, keyboardSelectedId, onSelect]);

  // 選択アイテムをスクロール位置に合わせる
  useEffect(() => {
    if (keyboardSelectedId == null) return;

    const itemEl = itemRefs.current.get(keyboardSelectedId);
    const listEl = listRef.current;
    if (!itemEl || !listEl) return;

    if (flatTemplates.length > 0 && keyboardSelectedId === flatTemplates[0].id) {
      listEl.scrollTop = 0;
      return;
    }

    const itemRect = itemEl.getBoundingClientRect();
    const listRect = listEl.getBoundingClientRect();
    const listHeight = listRect.height;

    const itemRelativeTop = itemRect.top - listRect.top;
    const itemRelativeBottom = itemRect.bottom - listRect.top;

    const centerZoneStart = listHeight * 0.4;
    const centerZoneEnd = listHeight * 0.6;

    if (itemRelativeTop < centerZoneStart) {
      const targetScroll = listEl.scrollTop - (centerZoneStart - itemRelativeTop);
      listEl.scrollTop = Math.max(0, targetScroll);
    } else if (itemRelativeBottom > centerZoneEnd) {
      const targetScroll = listEl.scrollTop + (itemRelativeBottom - centerZoneEnd);
      listEl.scrollTop = Math.min(listEl.scrollHeight - listHeight, targetScroll);
    }
  }, [keyboardSelectedId, flatTemplates]);

  // マウスクリック・Escで閉じる
  useEffect(() => {
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (
        suggestRef.current &&
        (!suggestRef.current.contains(e.target as Node) ||
          (e instanceof KeyboardEvent && e.key === 'Escape'))
      ) {
        onClose();
      }
    };
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', close);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', close);
    };
  }, [onClose]);

  // マウス操作があったらキーボードモードを解除
  useEffect(() => {
    const onMouseMove = () => {
      setIsKeyboardMode(false);
    };
    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, []);

  return (
    <div className="suggest__container" ref={suggestRef}>
      <div className="suggest__groupItems" ref={listRef}>
        {Array.from(groupedData.entries()).map(([groupId, list]) => (
          <div key={groupId ?? 'other'}>
            <div className="suggest__group-header">
              {getGroupName(groupId)}
            </div>

            {list
              .slice()
              .sort((a, b) => a.order - b.order)
              .map(item => (
                <div
                  key={item.id}
                  ref={el => {
                    if (el) itemRefs.current.set(item.id, el);
                    else itemRefs.current.delete(item.id);
                  }}
                  className={`suggest__templateItem ${item.id === keyboardSelectedId ? 'is-keyboard-selected' : ''} ${!isKeyboardMode && item.id === hoveredId ? 'is-hovered' : ''}`}
                  onMouseEnter={() => {
                    if (!isKeyboardMode) setHoveredId(item.id);
                  }}
                  onMouseLeave={() => {
                    if (!isKeyboardMode) setHoveredId(null);
                  }}
                  onClick={() => onSelect(item)}
                >
                  {item.name}
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Suggest;