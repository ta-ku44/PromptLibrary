import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Template, Category } from '../../types/index';
import * as s from '../../utils/storage';

// 特別なOtherカテゴリ（categoryId: null のテンプレート用）
const OTHER_CATEGORY: Category = {
  id: -1, // 特別なID
  name: 'Other',
  order: Number.MAX_SAFE_INTEGER, // 常に最後
};

export const useGroupsAndTemplates = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);

  // 初期データ読み込み
  const loadData = useCallback(async () => {
    try {
      const data = await s.loadStoredData();
      // 通常のカテゴリ + Otherカテゴリ
      const normalCategories = [...data.categories].sort((a, b) => a.order - b.order);
      setCategories([...normalCategories, OTHER_CATEGORY]);
      setTemplates(data.templates);
    } catch (error) {
      handleStorageError(error, 'データの読み込み');
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // エラーハンドリング（storage側で既にログ出力済み）
  const handleStorageError = (error: unknown, operation: string) => {
    if (error instanceof Error && error.name === 'StorageError') {
      const cause = (error as any).cause;
      if (cause?.name === 'QuotaExceededError') {
        alert('ストレージ容量が不足しています。不要なデータを削除してください。');
        return;
      }
    }
    alert(`${operation}中にエラーが発生しました。再度お試しください。`);
  };

  // カテゴリ操作
  const addCategory = async () => {
    const tempId = -Date.now();
    const newCategory: Category = {
      id: tempId,
      name: '新しいカテゴリ',
      order: categories.length - 1, // Otherカテゴリの前
    };

    // 楽観的更新（Otherカテゴリは常に最後に保持）
    setCategories((prev) => {
      const withoutOther = prev.filter((c) => c.id !== OTHER_CATEGORY.id);
      return [...withoutOther, newCategory, OTHER_CATEGORY];
    });

    try {
      const actualId = await s.addCategory({ name: '新しいカテゴリ' });
      // 実際のidに置き換え
      setCategories((prev) => prev.map((c) => (c.id === tempId ? { ...c, id: actualId } : c)));
      return actualId;
    } catch (error) {
      // ロールバック
      setCategories((prev) => prev.filter((c) => c.id !== tempId));
      handleStorageError(error, 'カテゴリの追加');
      throw error;
    }
  };

  const deleteCategory = async (id: number) => {
    // Otherカテゴリは削除不可
    if (id === OTHER_CATEGORY.id) {
      return;
    }

    if (!confirm('このカテゴリとすべてのテンプレートを削除しますか？')) {
      return;
    }

    // 楽観的削除（Otherカテゴリは保持）
    const prevCategories = categories;
    const prevTemplates = templates;
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setTemplates((prev) => prev.filter((t) => t.categoryId !== id));

    try {
      await s.deleteCategory(id);
    } catch (error) {
      // ロールバック
      setCategories(prevCategories);
      setTemplates(prevTemplates);
      handleStorageError(error, 'カテゴリの削除');
    }
  };

  const updateCategoryName = async (id: number, name: string) => {
    // Otherカテゴリの名前は変更不可
    if (id === OTHER_CATEGORY.id) {
      return;
    }

    // 楽観的更新
    const prevCategories = categories;
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));

    try {
      await s.updateCategory(id, { name });
    } catch (error) {
      setCategories(prevCategories);
      handleStorageError(error, 'カテゴリ名の更新');
    }
  };

  const reorderCategories = async (categoryIds: number[]) => {
    // Otherカテゴリは並び替え対象外（常に最後）
    const normalCategoryIds = categoryIds.filter((id) => id !== OTHER_CATEGORY.id);

    // 楽観的更新
    const prevCategories = categories;
    const reordered = normalCategoryIds.map((id, index) => {
      const category = categories.find((c) => c.id === id)!;
      return { ...category, order: index };
    });
    setCategories([...reordered, OTHER_CATEGORY]);

    try {
      await s.reorderCategories(normalCategoryIds);
    } catch (error) {
      setCategories(prevCategories);
      handleStorageError(error, 'カテゴリの並び替え');
    }
  };

  // テンプレート操作
  const addTemplate = async (data: { categoryId: number | null; name: string; content: string }) => {
    const tempId = -Date.now();
    const categoryTemplates = templates.filter((t) => t.categoryId === data.categoryId);
    const newTemplate: Template = {
      ...data,
      id: tempId,
      order: categoryTemplates.length,
    };

    // 楽観的更新
    setTemplates((prev) => [...prev, newTemplate]);

    try {
      const actualId = await s.addTemplate(data);
      // 実際のIDに置き換え
      setTemplates((prev) => prev.map((t) => (t.id === tempId ? { ...t, id: actualId } : t)));
    } catch (error) {
      // ロールバック
      setTemplates((prev) => prev.filter((t) => t.id !== tempId));
      handleStorageError(error, 'テンプレートの追加');
    }
  };

  const updateTemplate = async (id: number, data: Partial<Template>) => {
    const prevTemplates = templates;
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)));

    try {
      await s.updateTemplate(id, data);
    } catch (error) {
      setTemplates(prevTemplates);
      handleStorageError(error, 'テンプレートの更新');
    }
  };

  const deleteTemplate = async (id: number) => {
    if (!confirm('このテンプレートを削除しますか？')) {
      return;
    }

    const prevTemplates = templates;
    setTemplates((prev) => prev.filter((t) => t.id !== id));

    try {
      await s.deleteTemplate(id);
    } catch (error) {
      setTemplates(prevTemplates);
      handleStorageError(error, 'テンプレートの削除');
    }
  };

  const moveTemplateToCategory = async (templateId: number, targetCategoryId: number | null, targetIndex: number) => {
    const prevTemplates = templates;

    // 楽観的更新は useDragAndDrop で既に実行済み
    try {
      await s.moveTemplateToCategory(templateId, targetCategoryId, targetIndex);
    } catch (error) {
      setTemplates(prevTemplates);
      handleStorageError(error, 'テンプレートの移動');
    }
  };

  const reorderTemplates = async (categoryId: number | null, templateIds: number[]) => {
    const prevTemplates = templates;

    // 楽観的更新は useDragAndDrop で既に実行済み
    try {
      await s.reorderTemplates(categoryId, templateIds);
    } catch (error) {
      setTemplates(prevTemplates);
      handleStorageError(error, 'テンプレートの並び替え');
    }
  };

  // カテゴリ別テンプレート取得（categoryId: null のテンプレートは OTHER_CATEGORY.id で管理）
  const templatesByCategory = useMemo(() => {
    const map = new Map<number, Template[]>();
    templates.forEach((t) => {
      const key = t.categoryId ?? OTHER_CATEGORY.id;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(t);
    });
    // 各カテゴリ内でソート
    map.forEach((temps) => {
      temps.sort((a, b) => a.order - b.order);
    });
    return map;
  }, [templates]);

  const getTemplatesForCategory = useCallback(
    (categoryId: number) => templatesByCategory.get(categoryId) || [],
    [templatesByCategory],
  );

  return {
    categories,
    templates,
    setCategories,
    setTemplates,
    loadData,
    addCategory,
    deleteCategory,
    updateCategoryName,
    reorderCategories,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    moveTemplateToCategory,
    reorderTemplates,
    getTemplatesForCategory,
  };
};
