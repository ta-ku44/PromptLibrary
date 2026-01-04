import React from 'react';
import { useDroppable } from '@dnd-kit/core';

interface DropGapProps {
  type: 'template' | 'category-gap';
  indexOrId: number;
  categoryId?: number;
  isDraggingGroup?: boolean;
  isActive: boolean;
  disabled?: boolean;
}

const DropGap: React.FC<DropGapProps> = ({
  type,
  indexOrId,
  categoryId,
  isDraggingGroup = false,
  isActive,
  disabled = false,
}) => {
  const id = type === 'template' ? `gap_${categoryId}_${indexOrId}` : `category-gap-${indexOrId}`;

  const isDisabled = (type === 'category-gap' && !isDraggingGroup) || disabled;

  const { setNodeRef } = useDroppable({
    id,
    data: {
      type: `${type}-gap`,
      categoryId: type === 'template' ? categoryId : undefined,
      indexOrId,
    },
    disabled: isDisabled,
  });

  return <div ref={setNodeRef} className={`drop-gap drop-gap--${type} ${isActive ? 'drop-gap--active' : ''}`} />;
};

export default DropGap;
