import { memo } from 'react';
import { useShallow } from 'zustand/shallow';
import { PointerSensor, PointerActivationConstraints } from '@dnd-kit/dom';
import { useSortable } from '@dnd-kit/react/sortable';
import * as m from 'motion/react-m';
import type { Transition, TargetAndTransition } from 'motion/react';
import { ChevronDown, Trash2, Plus } from 'lucide-react';
import { ItemBar } from './ItemBar';
import { useCatalogStore } from '../stores/useCatalogStore';
import { useDragPlaceholder } from '../hooks/useDragPlaceholder';

const ALIGNMENT = { x: 'start', y: 'start' } as const;
const SENSORS = [PointerSensor.configure({activationConstraints: [
  new PointerActivationConstraints.Distance({ value: 5 }),
  new PointerActivationConstraints.Delay({ value: 200, tolerance: 10 }),
]})];

const EXPANDED: TargetAndTransition = { height: 'auto', opacity: 1 };
const COLLAPSED: TargetAndTransition = { height: 0, opacity: 0 };
const COLLAPSE_TRANSITION: Transition = { duration: 0.2, ease: 'easeInOut' };

type CategorySectionProps = {
  categoryId: string;
  index: number;
  onEditItem: (itemId: string) => void;
  onAddItem: (categoryId: string) => void;
};

export const CategorySection = memo(({ categoryId, index, onEditItem, onAddItem }: CategorySectionProps) => {
  const { category, itemIds, isExpanded, toggleExpand } = useCatalogStore(
    useShallow((state) => ({
      category: state.categories[categoryId],
      itemIds: state.itemIdsByCategory[categoryId],
      isExpanded: !state.collapsedIds.has(categoryId),
      toggleExpand: state.toggleExpand,
    })),
  );
  const { ref, handleRef, isDragSource, isDropping } = useSortable({
    id: categoryId, index, type: 'category', data: category, alignment: ALIGNMENT, sensors: SENSORS,
  });

  const isPlaceholder = useDragPlaceholder(categoryId, isDragSource);
  const expandedNow = isExpanded && !isDragSource && !isDropping;

  return (
    <m.section
      ref={ref}
      className={`flex flex-col overflow-hidden rounded-md border ${!isPlaceholder ? 'bg-muted shadow-md' : 'border-dashed bg-muted/50 *:invisible'}`}
    >
      <header
        ref={handleRef}
        onClick={() => toggleExpand(categoryId)}
        className={`flex cursor-grab items-center gap-2 border-b p-3 transition-colors duration-200 select-none active:cursor-grabbing ${expandedNow ? 'border-border' : 'border-transparent'}`}
      >
        <ChevronDown size={16} className={`transition-transform duration-200 ${expandedNow ? 'rotate-0' : '-rotate-90'}`}/>
        <span onDoubleClick={() => {}} className="shrink-0 cursor-text">
          {category.name}
        </span>
        <button className="mr-1.5 ml-auto">
          <Trash2 size={16} />
        </button>
      </header>

      <m.div animate={expandedNow ? EXPANDED : COLLAPSED} transition={COLLAPSE_TRANSITION} className="overflow-hidden">
        <div className="flex flex-col gap-2.5 px-3 py-2.5">
          <ul className="flex flex-col gap-1">
            {itemIds.map((itemId) => (
              <ItemBar key={itemId} itemId={itemId} onEditRequest={onEditItem}/>
            ))}
          </ul>
          <button
            onClick={() => onAddItem(categoryId)}
            className="flex items-center justify-center gap-1 rounded-md border border-dashed p-2 text-sm text-muted-foreground transition-colors duration-200 hover:border-primary hover:text-primary"
          >
            <Plus size={14} />
            <span>テンプレートの追加</span>
          </button>
        </div>
      </m.div>
    </m.section>
  );
});
