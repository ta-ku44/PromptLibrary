import React from "react";
import { useDroppable } from '@dnd-kit/core';

interface DropGapProps {
  type: 'template' | 'group';
  indexOrId: number;
  groupId?: number;
  isDraggingGroup?: boolean;
  isActive: boolean;
}

const DropGap: React.FC<DropGapProps> = ({
  type,
  indexOrId,
  groupId,
  isDraggingGroup = false,
  isActive,
}) => {
  const id = type === 'template' 
    ? `gap-${groupId}-${indexOrId}`
    : `group-gap-${indexOrId}`;

  const { setNodeRef } = useDroppable({
    id,
    data: { 
      type: `${type}-gap`, 
      groupId: type === 'template' ? groupId : undefined, 
      indexOrId 
    },
  });

  const height = (type === 'group' && isDraggingGroup) ? { height:'60px' } : undefined;

  return (
    <div 
      ref={setNodeRef} 
      className={`drop-gap drop-gap-${type} ${isActive ? 'active' : ''}`}
      style={{ ...height }}
    />
  );
};

export default DropGap;