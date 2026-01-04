import React, { useState, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { Category, Template } from '../../types/index.ts';
import Icons from '../assets/icons.ts';
import TemplateRow from './TemplateRow.tsx';
import DropGap from './DropGap.tsx';

const OTHER_CATEGORY_ID = -1; // Otherカテゴリのid

interface CategoryPanelProps {
  category: Category;
  templates: Template[];
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: (template: Template) => void;
  onDeleteTemplate: (id: number) => void;
  onTemplateNameChange: (id: number, name: string) => void;
  onCategoryNameChange: (id: number, name: string) => void;
  onDeleteCategory: (id: number) => void;
  onAddTemplate: (categoryId: number) => void;
  startEditing?: boolean;
  onEditingComplete?: () => void;
  activeTemplateId?: number | null;
  activeGapId?: string | null;
  categoryDraggableId?: string;
  isCategoryDragging?: boolean;
  isAnyCategoryDragging?: boolean;
}

const CategoryPanel: React.FC<CategoryPanelProps> = ({
  category,
  templates,
  isExpanded,
  onToggle,
  onEdit,
  onDeleteTemplate,
  onTemplateNameChange,
  onCategoryNameChange,
  onDeleteCategory,
  onAddTemplate,
  startEditing = false,
  onEditingComplete,
  activeTemplateId = null,
  activeGapId = null,
  isCategoryDragging = false,
  isAnyCategoryDragging = false,
  categoryDraggableId,
}) => {
  const [isEditing, setIsEditing] = useState(startEditing);
  const [editName, setEditName] = useState(category.name);
  const isOtherCategory = category.id === OTHER_CATEGORY_ID;

  const {
    setNodeRef: setDragRef,
    attributes,
    listeners,
  } = useDraggable({
    id: categoryDraggableId ?? `category-${category.id}`,
    data: { type: 'category', categoryId: category.id },
    disabled: isOtherCategory, // Otherカテゴリはドラッグ無効
  });

  useEffect(() => {
    if (startEditing) {
      setIsEditing(true);
    }
  }, [startEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (isOtherCategory) return; // Otherカテゴリは編集不可
    e.stopPropagation();
    setIsEditing(true);
    setEditName(category.name);
  };

  const handleBlur = () => {
    if (isOtherCategory) return; // Otherカテゴリは編集不可
    setIsEditing(false);
    if (!editName.trim()) {
      setEditName(category.name);
    } else if (editName.trim() !== category.name) {
      onCategoryNameChange(category.id, editName.trim());
    }
    onEditingComplete?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditName(category.name);
      onEditingComplete?.();
    }
  };

  const sortedTemplates = [...templates].sort((a, b) => a.order - b.order);

  return (
    <div className={`category ${isCategoryDragging ? 'category--dragging' : ''}`}>
      {/* カテゴリヘッダー */}
      <div
        ref={setDragRef}
        className={`category__header ${activeTemplateId != null ? 'category__header--template-dragging' : ''}`}
        {...attributes}
        {...listeners}
        onPointerDown={(e) => {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          console.log(
            `[CategoryPanel] Category: ${category.name} (id=${category.id}) | Y: ${e.clientY} | elemTop: ${rect.top}`,
          );
        }}
        onClick={() => {
          if (!isEditing && !isCategoryDragging) onToggle();
        }}
      >
        <button
          className={`button--expand ${isExpanded ? 'button--expand--expanded' : ''}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            if (!isEditing && !isCategoryDragging) onToggle();
          }}
        >
          <Icons.ExpandMore />
        </button>

        {isEditing ? (
          <input
            type="text"
            className="category__name-input"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            autoFocus
          />
        ) : (
          <div className="category__name">
            <span
              className="category__name-text"
              onDoubleClick={(e) => {
                e.stopPropagation();
                handleDoubleClick(e);
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {category.name}
            </span>
          </div>
        )}

        <div className="category__actions">
          {!isOtherCategory && (
            <button
              className="button--icon button--icon--delete"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteCategory(category.id);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              title="カテゴリを削除"
              tabIndex={-1}
            >
              <Icons.Delete />
            </button>
          )}
        </div>
      </div>

      {/* テンプレート一覧 */}
      {isExpanded && !isCategoryDragging && (
        <div className="category__templates">
          <DropGap
            type="template"
            categoryId={category.id}
            indexOrId={0}
            isActive={activeGapId === `gap_${category.id}_0`}
            disabled={isAnyCategoryDragging}
          />

          {sortedTemplates.map((template, idx) => (
            <React.Fragment key={template.id}>
              <TemplateRow
                template={template}
                onEdit={onEdit}
                onDelete={onDeleteTemplate}
                onNameChange={onTemplateNameChange}
                isDragging={activeTemplateId === template.id}
                disabled={isAnyCategoryDragging}
              />

              <DropGap
                type="template"
                categoryId={category.id}
                indexOrId={idx + 1}
                isActive={activeGapId === `gap_${category.id}_${idx + 1}`}
                disabled={isAnyCategoryDragging}
              />
            </React.Fragment>
          ))}

          <div className="add-template-wrapper" style={{ marginTop: '8px' }}>
            <button
              className="button button--add-template"
              onClick={(e) => {
                e.stopPropagation();
                onAddTemplate(category.id);
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Icons.Add />
              テンプレートを追加
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryPanel;
