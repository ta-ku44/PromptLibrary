import { useEffect } from 'react';
import { flushSync } from 'react-dom';
import { useShallow } from 'zustand/shallow';
import { DragDropProvider, DragOverlay } from '@dnd-kit/react';
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/react';
import type { DropAnimationFunction } from '@dnd-kit/dom';
import { RestrictToVerticalAxis } from '@dnd-kit/abstract/modifiers';
import { LazyMotion, animate, type Transition } from 'motion/react';
import { ChevronDown, GripVertical } from 'lucide-react';
import { useCatalog } from '@/hooks';
import { CategorySection } from './CategorySection';
import { useCatalogStore } from '../stores/useCatalogStore';
import type { DragType } from '../stores/slices/dragSlice';

const loadFeatures = () => import('../features').then((res) => res.default);

const DROP_TRANSITION: Transition = { duration: 0.25, ease: 'easeOut' };
const dropAnimation: DropAnimationFunction = async ({ source, element, feedbackElement }) => {
  const target = source.manager?.registry.draggables.get(source.id)?.element ?? element;
  const content = feedbackElement.firstElementChild;

  if (content) {
    const from = feedbackElement.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    await animate(content, { x: to.left - from.left, y: to.top - from.top }, DROP_TRANSITION);
  }

  flushSync(() => useCatalogStore.getState().clearPlaceholder(String(source.id)));
};

export const CatalogBoard = () => {
  const catalog = useCatalog();
  const { syncFromStorage, categoryIds, startDrag, setOver, cancelDrag, commitDrop } = useCatalogStore(
    useShallow((state) => ({
      syncFromStorage: state.syncFromStorage,
      categoryIds: state.categoryIds,
      startDrag: state.startDrag,
      setOver: state.setOver,
      cancelDrag: state.cancelDrag,
      commitDrop: state.commitDrop,
    })),
  );

  useEffect(() => {
    syncFromStorage(catalog);
  }, [catalog, syncFromStorage]);

  const dragStart = (event: DragStartEvent) => {
    const { source } = event.operation;
    if (!source) return;
    startDrag({ id: String(source.id), type: source.type as DragType });
  };

  const dragOver = (event: DragOverEvent) => {
    const { target, position } = event.operation;
    if (!target || !target.shape) {
      setOver(null);
      return;
    }
    const edge = position.current.y < target.shape.center.y ? 'top' : 'bottom';
    setOver({ id: String(target.id), type: target.type as DragType, edge });
  };

  const dragEnd = (event: DragEndEvent) => {
    flushSync(event.canceled ? cancelDrag : commitDrop);
  };

  return (
    <LazyMotion features={loadFeatures}>
      <DragDropProvider modifiers={[RestrictToVerticalAxis]} onDragStart={dragStart} onDragOver={dragOver} onDragEnd={dragEnd}>
        <div className="mx-auto flex max-w-2xl flex-col gap-2.5">
          {categoryIds.map((c, i) => (
            <CategorySection key={c} categoryId={c} index={i} onEditItem={() => {}} onAddItem={() => {}} />
          ))}
        </div>
        <DragOverlay dropAnimation={dropAnimation}>
          {(source) => {
            const data = source.data as { name: string } | undefined;
            if (!data) return null;
            return source.type === 'category' ? (
              <div className="flex flex-col overflow-hidden rounded-md border bg-muted shadow-md">
                <div className="flex items-center gap-2 border-b border-transparent p-3">
                  <ChevronDown size={16} className="-rotate-90" />
                  <span className="shrink-0">{data.name}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-md border bg-card p-3 shadow-md ring-1 ring-primary">
                <GripVertical size={18} className="text-primary" />
                <span>{data.name}</span>
              </div>
            );
          }}
        </DragOverlay>
      </DragDropProvider>
    </LazyMotion>
  );
};
