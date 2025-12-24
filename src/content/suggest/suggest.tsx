import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import './styles.scss';
import { loadStoredData } from '../../utils/storage';
import type { Template, Group, StorageData } from '../../types';

let root: Root | null = null;
let rootEl: HTMLElement | null = null;
let cachedData: StorageData | null = null;
let cachePromise: Promise<StorageData> | null = null;

interface ShowSuggestParams {
  query: string;
  curInputEl: HTMLElement | null;
  onInsert: (template: Template) => void;
}

//* サジェストを表示
export const showSuggest = async ({ query, curInputEl, onInsert }: ShowSuggestParams): Promise<void> => {
  if (!curInputEl) return;
  const data = await getCachedData();
  const templates = data.templates.filter(t =>
    t.name.toLowerCase().includes(query.toLowerCase())
  );
  if (!templates.length) {
    hideSuggest();
    return;
  }

  if (!rootEl) {
    rootEl = Object.assign(document.createElement('div'), {
      id: 'pt-suggest-root',
      style: `position:absolute;z-index:${Number.MAX_SAFE_INTEGER};visibility:hidden`
    });
    document.body.appendChild(rootEl);
    root = createRoot(rootEl);
  }

  root?.render(
    <Suggest
      templates={templates}
      groups={data.groups}
      inputEl={curInputEl}
      onSelect={onInsert}
      onClose={hideSuggest}
    />
  );
};

//* サジェストを非表示
export const hideSuggest = () => {
  root?.unmount();
  root = null;
  rootEl?.remove();
  rootEl = null;
};

//* サジェストの位置を設定
const setPos = (el: HTMLElement) => {
  if (!rootEl) return;

  const rect = el.getBoundingClientRect();
  const sel = window.getSelection();
  const rangeRect = sel?.rangeCount ? sel.getRangeAt(0).getBoundingClientRect() : null;
  const left = rangeRect?.left ? rangeRect.left : rect.left;

  const showAbove = rect.top / window.innerHeight > 0.75;
  const height = rootEl.offsetHeight;

  rootEl.style.left = `${window.scrollX + left}px`;
  rootEl.style.top = showAbove
    ? `${window.scrollY + rect.top - height - 15}px`
    : `${window.scrollY + rect.bottom}px`;
};

//* キャッシュされたデータを取得
const getCachedData = async (): Promise<StorageData> => {
  if (cachedData) return cachedData;
  if (cachePromise) return cachePromise;

  cachePromise = loadStoredData().then(data => {
    cachedData = data;
    cachePromise = null;
    return data;
  });

  return cachePromise;
};

//* キャッシュをクリア
export const clearSuggestCache = () => {
  cachedData = null;
};

interface SuggestProps {
  templates: Template[];
  groups: Group[];
  inputEl: HTMLElement;
  onSelect: (template: Template) => void;
  onClose: () => void;
}

const Suggest: React.FC<SuggestProps> = ({ templates, groups, inputEl, onSelect, onClose }) => {
  const suggestRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const [keyboardSelectedId, setKeyboardSelectedId] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [isKeyboardMode, setIsKeyboardMode] = useState(true);

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

  const getGroupName = (id: number | null) =>
    id === null
      ? 'other'
      : groups.find(g => g.id === id)?.name ?? 'other';

  const flatTemplates = useMemo(() => {
    return Array.from(groupedData.values()).flatMap(list =>
      list.slice().sort((a, b) => a.order - b.order)
    );
  }, [groupedData]);

  useEffect(() => {
    if (flatTemplates.length) {
      setKeyboardSelectedId(flatTemplates[0].id);
      setHoveredId(null);
    }
  }, [flatTemplates]);

  useLayoutEffect(() => {
    setPos(inputEl);
    if (rootEl) {
      rootEl.style.visibility = 'visible';
    }
  }, [inputEl]);

  // リサイズ・スクロール時に位置を更新
  useEffect(() => {
    const update = () => setPos(inputEl);
    const ro = new ResizeObserver(update);
    ro.observe(inputEl);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [inputEl]);

  useEffect(() => {
    const onKeyDownCapture = (e: KeyboardEvent) => {
      if (!flatTemplates.length || keyboardSelectedId == null) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        console.time('keyboard-update');
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
        console.timeEnd('keyboard-update');
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

  useLayoutEffect(() => {
    if (keyboardSelectedId == null) return;
    console.time('scroll-sync');

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
    console.timeEnd('scroll-sync');
  }, [keyboardSelectedId, flatTemplates]);

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