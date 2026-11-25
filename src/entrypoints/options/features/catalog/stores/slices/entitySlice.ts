import { stableArray, mergeById, mergeIdsByCategory } from '../../libs/diffMerge';
import { getCatalog, updateItem, updateCategory } from '@/utils/storage';
import { keyAtIndex, sortByFractionalIndex } from '@/utils/fractionalIndex';
import type { StateCreator } from 'zustand';
import type { Item, Category, Catalog } from '@/types/catalog';
import type { DragSlice } from './dragSlice';
import type { ExpandSlice } from './expandSlice';

export interface EntitySlice {
  items: Record<string, Item>;
  categories: Record<string, Category>;
  categoryIds: string[];
  itemIdsByCategory: Record<string, string[]>;
  pendingCatalog: Catalog | null;

  syncFromStorage: (catalog: Catalog) => void;
  flushPendingCatalog: () => void;
  moveItem: (itemId: string, toCategoryId: string, index: number) => boolean;
  moveCategory: (categoryId: string, index: number) => boolean;
}

export const createEntitySlice: StateCreator<EntitySlice & DragSlice & ExpandSlice, [], [], EntitySlice> = (set, get) => {
  const applyCatalog = (catalog: Catalog) =>
    set((state) => {
      const categories = sortByFractionalIndex(catalog.categories);
      const items = sortByFractionalIndex(catalog.items);
      return {
        items: mergeById(state.items, items),
        categories: mergeById(state.categories, categories),
        categoryIds: stableArray(state.categoryIds, categories.map((c) => c.id)),
        itemIdsByCategory: mergeIdsByCategory(state.itemIdsByCategory, categories, items),
      };
    });

  const rollback = (error: unknown) => {
    console.error(error);
    getCatalog().then(applyCatalog);
  };

  return {
    items: {},
    categories: {},
    categoryIds: [],
    itemIdsByCategory: {},
    pendingCatalog: null,

    syncFromStorage: (catalog) => {
      if (get().active) {
        set({ pendingCatalog: catalog });
        return;
      }
      applyCatalog(catalog);
    },

    flushPendingCatalog: () => {
      const { pendingCatalog } = get();
      if (!pendingCatalog) return;
      set({ pendingCatalog: null });
      applyCatalog(pendingCatalog);
    },

    moveItem: (itemId, toCategoryId, index) => {
      const { items, itemIdsByCategory } = get();
      const item = items[itemId];
      const targetIds = itemIdsByCategory[toCategoryId];
      if (!item || !targetIds) return false;
      if (item.categoryId === toCategoryId && targetIds.indexOf(itemId) === index) return false;

      const siblingIds = targetIds.filter((id) => id !== itemId);
      const fractionalIndex = keyAtIndex(siblingIds, items, index);

      set({
        items: { ...items, [itemId]: { ...item, categoryId: toCategoryId, fractionalIndex } },
        itemIdsByCategory: {
          ...itemIdsByCategory,
          [item.categoryId]: itemIdsByCategory[item.categoryId].filter((id) => id !== itemId),
          [toCategoryId]: siblingIds.toSpliced(index, 0, itemId),
        },
      });
      updateItem(itemId, { categoryId: toCategoryId, fractionalIndex }).catch(rollback);
      return true;
    },

    moveCategory: (categoryId, index) => {
      const { categories, categoryIds } = get();
      const category = categories[categoryId];
      if (!category || categoryIds.indexOf(categoryId) === index) return false;

      const siblingIds = categoryIds.filter((id) => id !== categoryId);
      const fractionalIndex = keyAtIndex(siblingIds, categories, index);

      set({
        categories: { ...categories, [categoryId]: { ...category, fractionalIndex } },
        categoryIds: siblingIds.toSpliced(index, 0, categoryId),
      });
      updateCategory(categoryId, { fractionalIndex }).catch(rollback);
      return true;
    },
  };
};
