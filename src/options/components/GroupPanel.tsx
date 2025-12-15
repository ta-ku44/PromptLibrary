import React, { useState, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { Group, Template } from '../../types/index.ts';
import Icons from '../assets/icons.ts';
import TemplateRow from './TemplateRow.tsx';
import DropGap from '../ui/DropGap.tsx';

interface GroupPanelProps {
  group: Group;
  templates: Template[];
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: (template: Template) => void;
  onDeleteTemplate: (id: number) => void;
  onTemplateNameChange: (id: number, name: string) => void;
  onGroupNameChange: (id: number, name: string) => void;
  onDeleteGroup: (id: number) => void;
  onAddTemplate: (groupId: number) => void;
  startEditing?: boolean;
  onEditingComplete?: () => void;
  activeTemplateId?: number | null;
  activeGapId?: string | null;
  groupDraggableId?: string;
  isGroupDragging?: boolean;
  isGroupDropTarget?: boolean;
  groupDropPosition?: 'before' | 'after';
}

const GroupPanel: React.FC<GroupPanelProps> = ({
  group,
  templates,
  isExpanded,
  onToggle,
  onEdit,
  onDeleteTemplate,
  onTemplateNameChange,
  onGroupNameChange,
  onDeleteGroup,
  onAddTemplate,
  startEditing = false,
  onEditingComplete,
  activeTemplateId = null,
  activeGapId = null,
  isGroupDragging = false,
  isGroupDropTarget = false,
  groupDropPosition = 'before',
  groupDraggableId,
}) => {
  // グループ名編集状態
  const [isEditing, setIsEditing] = useState(startEditing);
  const [editName, setEditName] = useState(group.name);

  const { setNodeRef: setDragRef, attributes, listeners } = useDraggable({
    id: groupDraggableId ?? `group-${group.id}`,
    data: { type: 'group', groupId: group.id },
  });

  useEffect(() => {
    if (startEditing) {
      setIsEditing(true);
    }
  }, [startEditing]);

  //* グループ名ダブルクリック時の編集開始
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditName(group.name);
  };

  //* 編集終了処理
  const handleBlur = () => {
    setIsEditing(false);
    if (!editName.trim()) {
      setEditName(group.name);
    } else if (editName.trim() !== group.name) {
      onGroupNameChange(group.id, editName.trim());
    }
    onEditingComplete?.();
  };

  //* キーボード入力処理
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditName(group.name);
      onEditingComplete?.();
    }
  };

  const sortedTemplates = [...templates].sort((a, b) => a.order - b.order);

  return (
    <>
      {/* グループドロップ位置インジケーター（前） */}
      {isGroupDropTarget && groupDropPosition === 'before' && (
        <div className="group-drop-dummy" />
      )}

      <div 
        className={`group-item ${isGroupDragging ? 'dragging' : ''}`}
        style={isGroupDragging ? { opacity: 0.3 } : undefined}
      >
        {/* グループヘッダー */}
        <div 
          ref={setDragRef}
          className={`group-header ${activeTemplateId != null ? 'template-dragging' : ''}`}
          {...attributes}
          {...listeners}
          onClick={() => {
            if (!isEditing && !isGroupDragging) onToggle();
          }}
        >
          <button 
            className={`expand-btn ${isExpanded ? 'expanded' : ''}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              if (!isEditing && !isGroupDragging) onToggle();
            }}
          >
            <Icons.ExpandMore />
          </button>

          {isEditing ? (
            <input
              type="text"
              className="group-name-input"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              autoFocus
            />
          ) : (
            <span className="group-name">
              <span
                className="group-name-text"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  handleDoubleClick(e);
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {group.name}
              </span>
            </span>
          )}

          <div className="group-header-spacer" />

          <div className="group-actions">
            <button
              className="icon-btn delete"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteGroup(group.id);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              title="グループを削除"
              tabIndex={-1}
            >
              <Icons.Delete />
            </button>
          </div>
        </div>

        {/* テンプレート一覧 */}
        {isExpanded && !isGroupDragging && (
          <div className="templates-container">
            <DropGap 
              type="template"
              groupId={group.id}
              indexOrId={0}
              isActive={activeGapId === `gap-${group.id}-0`}
            />
            
            {sortedTemplates.map((template, idx) => (
              <React.Fragment key={template.id}>
                <TemplateRow
                  template={template}
                  onEdit={onEdit}
                  onDelete={onDeleteTemplate}
                  onNameChange={onTemplateNameChange}
                  isDragging={activeTemplateId === template.id}
                />
                
                <DropGap 
                  type="template"
                  groupId={group.id}
                  indexOrId={idx + 1}
                  isActive={activeGapId === `gap-${group.id}-${idx + 1}`}
                />
              </React.Fragment>
            ))}

            <div className="add-template-wrapper">
              <button 
                className="add-template-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddTemplate(group.id);
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

      {/* グループドロップ位置インジケーター（後） */}
      {isGroupDropTarget && groupDropPosition === 'after' && (
        <div className="group-drop-dummy" />
      )}
    </>
  );
};

export default GroupPanel;