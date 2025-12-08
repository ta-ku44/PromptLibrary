import React, { useRef, useMemo, useEffect } from 'react';
import { createRoot ,type Root } from 'react-dom/client';
//import useAutocomplete from '@mui/lab/useAutocomplete';
import './styles.css';
import { loadStoredData } from '../../utils/storage.ts';
import type { Template, Group } from '../../types/index';

let root: Root | null = null;
let container: HTMLElement | null = null;

//** サジェストを表示 */
export const showSuggest = async (
  query: string,
  el: HTMLElement | null,
  onSelect: (template: Template) => void
): Promise<void> => {
  if (!el) return;

  // プロンプトのテンプレートを取得
  const data = await loadStoredData();
  const templates = data.templates.filter(t =>
    t.name.toLowerCase().includes(query.toLowerCase())
  );
  if (templates.length === 0) return

  // サジェストの位置を計算
  const rect = el.getBoundingClientRect();
  const suggestHeight = Math.min(templates.length * 40 + 50, 300);
  const viewportHeight = window.innerHeight;

  // 画面下に収まるかチェック
  const spaceBelow = viewportHeight - rect.bottom;
  const spaceAbove = rect.top;
  const showAbove = spaceBelow < suggestHeight && spaceAbove > spaceBelow;

  // 上に表示する場合は入力欄の上端から、下に表示する場合は入力欄の下端から
  const gap = 12; // 入力欄との間隔
  const position = {
    top: showAbove 
      ? rect.top + window.scrollY - suggestHeight - gap
      : rect.bottom + window.scrollY + gap,
    left: rect.left + window.scrollX,
  };

  // 既存のコンテナが存在しなければコンテナを作成
  if (!container) {
    container = document.createElement('div');
    container.id = 'pt-suggest-root';
    container.style.position = 'absolute';
    container.style.zIndex = `${Number.MAX_SAFE_INTEGER}`;
    document.body.appendChild(container);
    root = createRoot(container);
  }

  container.style.top = `${position.top}px`;
  container.style.left = `${position.left}px`;
  container.style.width = `${rect.width}px`;
  console.log('サジェストコンテナの位置を設定:', container.style.top, container.style.left);

  root?.render(
    <Suggest
      templates={templates}
      groups={data.groups}
      onSelect={onSelect}
      onClose={hideSuggest}
    />
  );
  console.log('サジェストを表示しました');
};

//** サジェストを非表示 */
export const hideSuggest = () => {
  if (root) {
    root.unmount();
    root = null;
  }
  if (container) {
    container.remove();
    container = null;
  }

  console.log('サジェストを非表示にしました');
};

interface SuggestProps {
  templates: Template[];
  groups: Group[];
  onSelect: (template: Template) => void;
  onClose: () => void;
}

const Suggest: React.FC<SuggestProps> = ({ templates, groups, onSelect, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // サジェスト外のクリック時に閉じる
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const groupedData = useMemo(() => {
    const grouped = new Map<string, Template[]>();
    templates.forEach(template => {
      const group = groups.find(g => g.id === template.groupId);
      const groupName = group?.name || 'Others';
      if (!grouped.has(groupName)) {
        grouped.set(groupName, []);
      }
      grouped.get(groupName)?.push(template);
    });
    return Array.from(grouped, ([title, items]) => ({ title, items }));
  }, [templates, groups]);

  return (
    <div className="pt-suggestion-container" ref={containerRef}>
      <div className='pt-suggestion-scroll-area'>
        
        {groupedData.map((section, idx) => (
          <div key={idx}>
            {/* セクションヘッダー */}
            {section.title && (
              <div className="section-header">{section.title}</div>
            )}
            
            {/* リストアイテム */}
            {section.items.map((item) => (
              <div 
                key={item.id} 
                className="list-item"
                onClick={() => onSelect(item)}
              >
                {/* ここではテンプレート名を表示。必要に応じて content のプレビューなども追加可 */}
                {item.name}
              </div>
            ))}
          </div>
        ))}
        
        {groupedData.length === 0 && (
          <div style={{ padding: '10px', color: '#999', fontSize: '12px' }}>
            No templates found.
          </div>
        )}
      </div>
    </div>
  );
};

export default Suggest;