import React, { /*useEffect,*/ useRef, useMemo } from 'react';
import { createRoot ,type Root } from 'react-dom/client';
import useAutocomplete from '@mui/lab/useAutocomplete';
import './styles.css';
import { loadStoredData } from '../utils/storage';
import type { Template, Group } from '../types/index';
import { insertTemplate } from './index';

let root: Root | null = null;
let container: HTMLElement | null = null;

//** サジェストを表示 */
export const viewSuggest = async (query: string, textArea: HTMLElement | null) => {
  if (!textArea) return;

  // プロンプトのテンプレートを取得
  const data = await loadStoredData();
  const templates = data.templates.filter(t =>
    t.name.toLowerCase().includes(query.toLowerCase()) ||
    t.content.toLowerCase().includes(query.toLowerCase())
  );
  if (templates.length === 0) {
    console.log('該当するテンプレートが存在しない');
    hideSuggest();
    return;
  }

  const rect = textArea.getBoundingClientRect();
  const position = {
    top: rect.bottom + window.scrollY,
    left: rect.left + window.scrollX,
  };

  // 既存のコンテナが存在しなければコンテナを作成
  if (!container) {
    container = document.createElement('div');
    container.id = 'pt-suggest-root';
    container.style.position = 'absolute';
    container.style.zIndex = '2147483647';
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
      onSelect={insertTemplate}
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

// interface GroupedSection {
//   title: string;
//   items: Template[];
// }

const Suggest: React.FC<SuggestProps> = ({ templates, groups, onSelect, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    getRootProps,
    getListboxProps,
    getOptionProps,
  } = useAutocomplete<Template>({
    options: templates,

    getOptionLabel: (option: Template) => option.name,
    groupBy: (option: Template) => {
      const group = groups.find((g: Group) => g.id === option.groupId);
      return group?.name || 'Others';
    },

    defaultValue: null,
    freeSolo: false,
    open: true,

    onClose: (_, reason) => { if (reason === 'escape' || reason === 'blur') { onClose();} }
  });

  // グループごとにテンプレートを分類
  const groupedSections = useMemo(() => {
    const sections = new Map<string, Template[]>();
    templates.forEach(template => {
      const group = groups.find(g => g.id === template.groupId);
      const groupName = group ? group.name : 'Others';
      if (!sections.has(groupName)) {
        sections.set(groupName, []);
      }
      sections.get(groupName)?.push(template);
    }
    );
    return Array.from(sections.entries()).map(([title, items]) => ({ title, items }));
  }, [templates, groups]);

  const root = getRootProps();
  const listbox = getListboxProps();

  return (
    <div className="pt-suggestion-container" ref={containerRef} {...root}>
      <div className="pt-suggestion-scroll-area">
        {groupedSections.map((groupOption, groupIdx) => {
          return (
            <div key={groupIdx}>
              {/* ← ここは UL の外に置く！ */}
              <div className="section-header">{groupOption.title}</div>
              {/* ← 必ず UL は option のみ */}
              <ul {...listbox}>
                {groupOption.items.map((item, index) => {
                  const optionProps = getOptionProps({ option: item, index });

                  return (
                    <li
                      {...optionProps}
                      key={item.id}
                      className="list-item"
                      onClick={() => onSelect(item)}
                    >
                      {item.name}
                  </li>
                  );
                })}
              </ul>
            </div>
          );
        })}

        {groupedSections.length === 0 && (
          <div style={{ padding: '10px', color: '#999', fontSize: '12px' }}>
            No templates found.
          </div>
        )}
      </div>
    </div>
  );
};

export default Suggest;