import React, { useState, useCallback } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { type Template } from '../../types/index.ts';
import DragHandle from '../ui/DragHandle.tsx';
import Icons from '../assets/icons.ts';

interface TemplateRowProps {
  template: Template;
  onEdit: (template: Template) => void;
  onDelete: (id: number) => void;
  onNameChange: (id: number, name: string) => void;
  isDragging?: boolean;
}

const TemplateRow: React.FC<TemplateRowProps> = ({
  template,
  onEdit,
  onDelete,
  onNameChange,
  isDragging = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(template.name);

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
  } = useDraggable({
    id: `template-${template.id}`,
    data: { template },
  });

  const { setNodeRef: setDropRef } = useDroppable({
    id: `template-${template.id}`,
    data: { template },
  });

  const setNodeRef = useCallback(
    (node: HTMLDivElement | null) => {
      setDragRef(node);
      setDropRef(node);
    },
    [setDragRef, setDropRef]
  );

  const handleDoubleClick = () => {
    setIsEditing(true);
    setEditName(template.name);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (editName !== template.name) {
      onNameChange(template.id, editName.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditName(template.name);
    }
  };

  const isNameEmpty = !template.name.trim();

  return (
    <div ref={setNodeRef} className={`template-item ${isDragging ? 'dragging' : ''}`}>
      <DragHandle listeners={listeners} attributes={attributes} />
      {isEditing ? (
        <input
          type="text"
          className="template-name-input"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      ) : (
        <span className="template-name" onDoubleClick={handleDoubleClick}>
          {isNameEmpty ? (
            <>
              <span className="name-required-indicator">*</span>
              <span className="name-empty">(名前なし)</span>
            </>
          ) : (
            template.name
          )}
        </span>
      )}
      <div className="template-actions">
        <button className="icon-btn" onClick={() => onEdit(template)} title="編集">
          <Icons.Edit />
        </button>
        <button
          className="icon-btn delete"
          onClick={() => onDelete(template.id)}
          title="削除"
        >
          <Icons.Delete />
        </button>
      </div>
    </div>
  );
};

export default TemplateRow;