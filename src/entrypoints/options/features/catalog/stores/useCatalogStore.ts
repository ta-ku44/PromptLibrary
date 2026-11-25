import { create } from 'zustand';
import { createEntitySlice, type EntitySlice } from './slices/entitySlice';
import { createDragSlice, type DragSlice } from './slices/dragSlice';
import { createExpandSlice, type ExpandSlice } from './slices/expandSlice';

export const useCatalogStore = create<EntitySlice & DragSlice & ExpandSlice>()((...a) => ({
  ...createEntitySlice(...a),
  ...createDragSlice(...a),
  ...createExpandSlice(...a),
}));
