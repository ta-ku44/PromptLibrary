import { useEffect, useRef } from 'react';
import { useCatalogStore } from '../stores/useCatalogStore';

export const useDragPlaceholder = (id: string, isDragSource: boolean): boolean => {
  const isPlaceholder = useCatalogStore((state) => state.placeholderId === id);
  const clearPlaceholder = useCatalogStore((state) => state.clearPlaceholder);
  const wasDragSource = useRef(isDragSource);

  useEffect(() => {
    if (wasDragSource.current && !isDragSource) clearPlaceholder(id);
    wasDragSource.current = isDragSource;
  }, [id, isDragSource, clearPlaceholder]);

  return isPlaceholder;
};
