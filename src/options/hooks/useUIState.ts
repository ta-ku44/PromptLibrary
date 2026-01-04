import { useEffect, useRef, useState } from 'react';
import type { Template } from '../../types';

export const useUIState = (categoryIds: number[]) => {
  const initializedRef = useRef(false);
  const prevCategoryIdsRef = useRef<number[]>([]);

  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(() => new Set());
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [addingToCategoryId, setAddingToCategoryId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);

  useEffect(() => {
    // 初回: すべてのカテゴリを展開
    if (!initializedRef.current && categoryIds.length > 0) {
      setExpandedCategories(new Set(categoryIds));
      prevCategoryIdsRef.current = categoryIds;
      initializedRef.current = true;
      return;
    }

    // 以降: 新規追加されたカテゴリのみ展開
    if (initializedRef.current) {
      const prevIds = new Set(prevCategoryIdsRef.current);
      const newCategoryIds = categoryIds.filter((id) => !prevIds.has(id));

      if (newCategoryIds.length > 0) {
        setExpandedCategories((prev) => {
          const next = new Set(prev);
          newCategoryIds.forEach((id) => next.add(id));
          return next;
        });
      }

      // 削除されたカテゴリは展開状態から除外
      const currentIds = new Set(categoryIds);
      setExpandedCategories((prev) => {
        const next = new Set(prev);
        let changed = false;
        prev.forEach((id) => {
          if (!currentIds.has(id)) {
            next.delete(id);
            changed = true;
          }
        });
        return changed ? next : prev;
      });

      prevCategoryIdsRef.current = categoryIds;
    }
  }, [categoryIds]);

  const toggleCategory = (categoryId: number) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      next.has(categoryId) ? next.delete(categoryId) : next.add(categoryId);
      return next;
    });
  };

  const openAddTemplateModal = (categoryId: number) => {
    setAddingToCategoryId(categoryId);
    setEditingTemplate(null);
    setIsModalOpen(true);
  };

  const openEditTemplateModal = (template: Template) => {
    setEditingTemplate(template);
    setAddingToCategoryId(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTemplate(null);
    setAddingToCategoryId(null);
  };

  const startEditingCategory = (categoryId: number) => {
    setEditingCategoryId(categoryId);
  };

  const finishEditingCategory = () => {
    setEditingCategoryId(null);
  };

  return {
    expandedCategories,
    setExpandedCategories,
    editingTemplate,
    addingToCategoryId,
    isModalOpen,
    editingCategoryId,
    toggleCategory,
    openAddTemplateModal,
    openEditTemplateModal,
    closeModal,
    startEditingCategory,
    finishEditingCategory,
  };
};
