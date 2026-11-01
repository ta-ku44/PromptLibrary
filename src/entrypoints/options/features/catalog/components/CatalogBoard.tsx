import { useCallback, useEffect, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { DragDropProvider, DragOverlay } from '@dnd-kit/react';
import type { DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/react';
import { RestrictToVerticalAxis } from '@dnd-kit/abstract/modifiers';
import { LazyMotion } from 'motion/react';
import { ChevronDown, GripVertical } from 'lucide-react';
import { useCatalog } from '@/hooks';
import { updateItem, updateCategory } from '@/utils/storage';
import { keyAtIndex } from '@/utils/fractionalIndex';
import { CategorySection } from './CategorySection';
import { useCatalogStore } from '../stores/useCatalogStore';
import { insertIndex } from '../libs/reorder';
import type { EditTarget } from './PromptEditModal';

const loadFeatures = () => import('../features').then((res) => res.default);

export const CatalogBoard = () => {
  const catalog = useCatalog();
  const { syncCatalog, categoryIds, startDrag, setOver, endDrag } = useCatalogStore(
    useShallow((state) => ({
      syncCatalog: state.syncCatalog,
      categoryIds: state.categoryIds,
      startDrag: state.startDrag,
      setOver: state.setOver,
      endDrag: state.endDrag,
    })),
  );
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const handleAddItem = useCallback((categoryId: string) => setEditTarget({ mode: 'create', categoryId }), []);
  const handleEditItem = useCallback((itemId: string) => setEditTarget({ mode: 'edit', itemId }), []);

  useEffect(() => {
    syncCatalog(catalog);
  }, [catalog, syncCatalog]);

  const dragStart = (event: DragStartEvent) => {
    const { source } = event.operation;
    if (!source) return;
    startDrag(String(source.id), source.type as 'item' | 'category');
  };

  const dragOver = (event: DragOverEvent) => {
    const { target, position } = event.operation;
    const { overId: prevOverId, edge: prevEdge } = useCatalogStore.getState();

    if (!target || !target.shape) {
      if (prevOverId !== null) setOver(null, null, null);
      return;
    }

    const id = String(target.id);
    const edge = position.current.y < target.shape.center.y ? 'top' : 'bottom';
    if (id === prevOverId && edge === prevEdge) return;
    setOver(id, target.type as 'item' | 'category' | 'category-slot', edge);
  };

  const dragEnd = (event: DragEndEvent) => {
    const { activeId, activeType, overId, overType, edge, categories, items, itemIdsByCategory } =
      useCatalogStore.getState();
    endDrag();
    if (event.canceled || !activeId || !overId) return;

    if (activeType === 'category' && overType === 'category') {
      const siblingIds = categoryIds.filter((id) => id !== activeId);
      const fractionalIndex = keyAtIndex(siblingIds, categories, insertIndex(siblingIds, overId, edge));
      updateCategory(activeId, { fractionalIndex });
      return;
    }

    if (activeType === 'item') {
      const targetCategoryId = overType === 'item' ? items[overId]?.categoryId : overId;
      if (!targetCategoryId) return;

      const siblingIds = (itemIdsByCategory[targetCategoryId] ?? []).filter((id) => id !== activeId);
      const index = overType === 'item' ? insertIndex(siblingIds, overId, edge) : 0;
      const fractionalIndex = keyAtIndex(siblingIds, items, index);
      updateItem(activeId, { categoryId: targetCategoryId, fractionalIndex });
    }
  };

  return (
    <LazyMotion features={loadFeatures}>
      <DragDropProvider
        modifiers={[RestrictToVerticalAxis]}
        onDragStart={dragStart}
        onDragOver={dragOver}
        onDragEnd={dragEnd}
      >
        <div className="mx-auto flex max-w-2xl flex-col gap-2.5">
          {categoryIds.map((c, i) => (
            <CategorySection key={c} categoryId={c} index={i} onEditItem={handleEditItem} onAddItem={handleAddItem} />
          ))}
        </div>
        <DragOverlay>
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
