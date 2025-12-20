import React, { useEffect, useMemo } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import './styles.scss';
import { loadStoredData } from '../../utils/storage.ts';
import type { Template, Group } from '../../types/index';

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

  // プロンプトのテンプレートを取得
  const data = await loadStoredData();
  const templates = data.templates.filter(t =>
    t.name.toLowerCase().includes(query.toLowerCase())
  );
  if (templates.length === 0) return;

  // 既存のコンテナが存在しなければコンテナを作成
  if (!container) {
    container = document.createElement('div');
    container.id = 'pt-suggest-root';
    container.style.position = 'absolute';
    container.style.zIndex = `${Number.MAX_SAFE_INTEGER}`;
    document.body.appendChild(container);
    root = createRoot(container);
  }

  root?.render(
    <Suggest
      templates={templates}
      groups={data.groups}
      inputEl={curInputEl}
      onSelect={insertText}
      onClose={hideSuggest}
    />
  );

  setSuggestPos(curInputEl);
};

//* サジェストを非表示
export const hideSuggest = () => {
  if (root) {
    root.unmount();
    root = null;
  }
  if (container) {
    container.remove();
    container = null;
  }
};

//* サジェストの位置を設定
const setSuggestPos = (el: HTMLElement) => {
  if (!container) return;
  // サジェストの位置を計算
  const rect = el.getBoundingClientRect();
  const viewportHeight = window.innerHeight;

  let left: number;
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const r = selection.getRangeAt(0).getBoundingClientRect();
    left = r.left !== 0 ? r.left : rect.left;
  } else {
    left = rect.left;
  }

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
  const suggestRef = React.useRef<HTMLDivElement>(null);
  // const [selectedIndex, setSelectedIndex] = React.useState(0);
  
  const groupedData = useMemo(() => {
    const groupMap = new Map<number | null, Template[]>();

    templates.forEach(template => {
      const groupId = template.groupId ?? null;
      if (!groupMap.has(groupId)) {
        groupMap.set(groupId, []);
      }
      groupMap.get(groupId)!.push(template);
    });
    return groupMap;
  }, [templates]);

  const getGroupName = (groupId: number | null): string => {
    if (groupId === null) return 'other';
    const group = groups.find(g => g.id === groupId);
    return group?.name ?? 'other';
  };

  // 入力欄やサイトのリサイズ・スクロールに合わせて位置を更新
  useEffect(() => {
    const updatePosition = () => {
      setSuggestPos(inputEl);
    };
    const observer = new ResizeObserver(() => {
        updatePosition();
      }
    );
    if (inputEl) {
      observer.observe(inputEl);
    }
    
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [inputEl]);

  // サジェストの操作関連
  // useEffect(() => {
  //   const suggestControl = (e: KeyboardEvent) => {
  //     if (e.key === 'ArrowDown') {
  //       e.preventDefault();
  //       setSelectedIndex((prev) => (prev + 1) % templates.length);
  //     } else if (e.key === 'ArrowUp') {
  //       e.preventDefault();
  //       setSelectedIndex((prev) => (prev - 1 + templates.length) % templates.length);
  //     } else if (e.key === 'Tab') {
  //       e.preventDefault();
  //       onSelect(templates[selectedIndex]);
  //     }
  //   };

  //   window.addEventListener('keydown', suggestControl);
  //   return () => {
  //     window.removeEventListener('keydown', suggestControl);
  //   };
  // }, [selectedIndex, templates, onSelect]);

  // サジェストの外部クリックやEscapeキーで閉じる
  useEffect(() => {
    const closeSuggest = (e: MouseEvent | KeyboardEvent) => {
      if (suggestRef.current) {
        if (!suggestRef.current.contains(e.target as Node) || (e instanceof KeyboardEvent && e.key === 'Escape')) {
          onClose();
        }
      }
    };

    window.addEventListener('mousedown', closeSuggest);
    window.addEventListener('keydown', closeSuggest);
    return () => {
      window.removeEventListener('mousedown', closeSuggest);
      window.removeEventListener('keydown', closeSuggest);
    };
  }, [onClose]);

  return (
    <div className="suggest__container" ref={suggestRef}>
      <div className='suggest__list'>    
        {Array.from(groupedData.entries())
          .sort(([groupIdA], [groupIdB]) => {
            if (groupIdA === null) return 1;
            if (groupIdB === null) return -1;
            
            const groupA = groups.find(g => g.id === groupIdA);
            const groupB = groups.find(g => g.id === groupIdB);
            return (groupA?.order ?? 0) - (groupB?.order ?? 0);
          })
          .map(([groupId, tmplList]) => (
            <div key={groupId ?? 'ungrouped'}>
              {getGroupName(groupId) && (
                <div className="suggest__group-header">{getGroupName(groupId)}</div>
              )}
              {tmplList
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((item) => (
                  <div 
                    key={item.id} 
                    className="suggest__item"
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