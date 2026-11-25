import type { StateCreator } from 'zustand';
import type { EntitySlice } from './entitySlice';
import type { ExpandSlice } from './expandSlice';

export type DragType = 'item' | 'category';
export type Edge = 'top' | 'bottom';

export type DragActive = { id: string; type: DragType };
export type DragOver = { id: string; type: DragType; edge: Edge };

export interface DragSlice {
  active: DragActive | null;
  over: DragOver | null;
  placeholderId: string | null;

  startDrag: (active: DragActive) => void;
  clearPlaceholder: (id: string) => void;
  setOver: (over: DragOver | null) => void;
  cancelDrag: () => void;
  commitDrop: () => void;
}

const insertIndex = (ids: string[], overId: string, edge: Edge) => ids.indexOf(overId) + (edge === 'bottom' ? 1 : 0);

export const createDragSlice: StateCreator<EntitySlice & DragSlice & ExpandSlice, [], [], DragSlice> = (set, get) => {
  const finish = (moved: boolean) => {
    set({ active: null, over: null });
    if (moved) set({ pendingCatalog: null });
    else get().flushPendingCatalog();
  };

  const resolveMove = (): boolean => {
    const { active, over, items, categoryIds, itemIdsByCategory, moveItem, moveCategory } = get();
    if (!active || !over) return false;

    if (active.type === 'category') {
      if (over.type !== 'category') return false;
      const siblingIds = categoryIds.filter((id) => id !== active.id);
      return moveCategory(active.id, insertIndex(siblingIds, over.id, over.edge));
    }

    if (over.type === 'category') return moveItem(active.id, over.id, 0);

    const toCategoryId = items[over.id]?.categoryId;
    if (!toCategoryId) return false;
    const siblingIds = (itemIdsByCategory[toCategoryId] ?? []).filter((id) => id !== active.id);
    return moveItem(active.id, toCategoryId, insertIndex(siblingIds, over.id, over.edge));
  };

  return {
    active: null,
    over: null,
    placeholderId: null,

    startDrag: (active) => set({ active, over: null, placeholderId: active.id }),

    clearPlaceholder: (id) => {
      if (get().placeholderId === id) set({ placeholderId: null });
    },

    setOver: (over) => {
      const prev = get().over;
      if (prev === over) return;
      if (prev && over && prev.id === over.id && prev.type === over.type && prev.edge === over.edge) return;
      set({ over });
    },

    cancelDrag: () => finish(false),

    commitDrop: () => finish(resolveMove()),
  };
};
