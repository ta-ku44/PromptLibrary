import browser from 'webextension-polyfill';
import type { Template, Category, StorageData } from '../types/index';

const DEFAULT_DATA: StorageData = {
  templates: [],
  categories: [],
  shortcutKey: '#',
};

//* ストレージエラー処理
class StorageError extends Error {
  public readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'StorageError';
    this.cause = cause;
  }
}

//* 基本操作
export const loadStoredData = async (): Promise<StorageData> => {
  try {
    const result = await browser.storage.sync.get('data');
    const data = result.data as any;

    // 下位互換性: 古いgroupsをcategoriesに変換
    if (data && data.groups && !data.categories) {
      data.categories = data.groups;
      delete data.groups;
    }

    // 下位互換性: 古いgroupIdをcategoryIdに変換
    if (data && data.templates) {
      data.templates = data.templates.map((t: any) => {
        if ('groupId' in t && !('categoryId' in t)) {
          const { groupId, ...rest } = t;
          return { ...rest, categoryId: groupId };
        }
        return t;
      });
    }

    return { ...DEFAULT_DATA, ...data };
  } catch (error) {
    throw new StorageError('データの読み込みに失敗しました', error);
  }
};

const saveStoredData = async (data: StorageData): Promise<void> => {
  try {
    await browser.storage.sync.set({ data });
  } catch (error) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      throw new StorageError('ストレージの容量が超過しました', error);
    }
    throw new StorageError('データの保存に失敗しました', error);
  }
};

const updateStoredData = async (updater: (data: StorageData) => StorageData): Promise<void> => {
  const data = await loadStoredData();
  const updated = updater(data);
  await saveStoredData(updated);
};

//* ユーティリティ
const getNextId = <T extends { id: number }>(items: T[]): number =>
  items.reduce((max, item) => Math.max(max, item.id), 0) + 1;

const getNextOrder = <T extends { order: number }>(items: T[]): number =>
  items.reduce((max, item) => Math.max(max, item.order), 0) + 1;

const reorderItems = <T extends { id: number; order: number }>(items: T[], orderedIds: number[]): T[] =>
  items.map((item) => {
    const newOrder = orderedIds.indexOf(item.id);
    return newOrder !== -1 ? { ...item, order: newOrder } : item;
  });

//* Template操作
export const saveTemplates = async (templates: Template[]): Promise<void> => {
  await updateStoredData((data) => ({ ...data, templates }));
};

export const addTemplate = async (template: Omit<Template, 'id' | 'order'>): Promise<number> => {
  let newId = 0;
  await updateStoredData((data) => {
    const categoryTemplates = data.templates.filter((t) => t.categoryId === template.categoryId);
    newId = getNextId(data.templates);
    const newTemplate: Template = {
      ...template,
      id: newId,
      order: getNextOrder(categoryTemplates),
    };
    return { ...data, templates: [...data.templates, newTemplate] };
  });
  return newId;
};

export const updateTemplate = async (id: number, updates: Partial<Template>): Promise<void> => {
  await updateStoredData((data) => ({
    ...data,
    templates: data.templates.map((t) => (t.id === id ? { ...t, ...updates } : t)),
  }));
};

export const deleteTemplate = async (id: number): Promise<void> => {
  await updateStoredData((data) => ({
    ...data,
    templates: data.templates.filter((t) => t.id !== id),
  }));
};

export const deleteAllTemplates = async (): Promise<void> => {
  await updateStoredData((data) => ({ ...data, templates: [] }));
};

export const reorderTemplates = async (categoryId: number | null, orderedIds: number[]): Promise<void> => {
  await updateStoredData((data) => ({
    ...data,
    templates: data.templates.map((t) => {
      if (t.categoryId !== categoryId) return t;
      const newOrder = orderedIds.indexOf(t.id);
      return newOrder !== -1 ? { ...t, order: newOrder } : t;
    }),
  }));
};

//* テンプレート移動時のorder調整
const adjustOrderOnMove = (
  template: Template,
  targetId: number,
  oldCategoryId: number | null,
  oldOrder: number,
  newCategoryId: number | null,
  newOrder: number,
): Template => {
  if (template.id === targetId) {
    return { ...template, categoryId: newCategoryId, order: newOrder };
  }

  // 同じカテゴリ内での移動
  if (oldCategoryId === newCategoryId && template.categoryId === newCategoryId) {
    if (oldOrder < newOrder && template.order > oldOrder && template.order <= newOrder) {
      return { ...template, order: template.order - 1 };
    }
    if (oldOrder > newOrder && template.order >= newOrder && template.order < oldOrder) {
      return { ...template, order: template.order + 1 };
    }
  }

  // 異なるカテゴリ間での移動
  if (oldCategoryId !== newCategoryId) {
    if (template.categoryId === oldCategoryId && template.order > oldOrder) {
      return { ...template, order: template.order - 1 };
    }
    if (template.categoryId === newCategoryId && template.order >= newOrder) {
      return { ...template, order: template.order + 1 };
    }
  }

  return template;
};

export const moveTemplateToCategory = async (
  templateId: number,
  newCategoryId: number | null,
  newOrder: number,
): Promise<void> => {
  await updateStoredData((data) => {
    const targetTemplate = data.templates.find((t) => t.id === templateId);
    if (!targetTemplate) return data;

    const { categoryId: oldCategoryId, order: oldOrder } = targetTemplate;
    if (oldOrder === null) return data;
    const templates = data.templates.map((t) =>
      adjustOrderOnMove(t, templateId, oldCategoryId, oldOrder, newCategoryId, newOrder),
    );

    return { ...data, templates };
  });
};

//* Category操作
export const saveCategories = async (categories: Category[]): Promise<void> => {
  await updateStoredData((data) => ({ ...data, categories }));
};

export const addCategory = async (category: Omit<Category, 'id' | 'order'>): Promise<number> => {
  const data = await loadStoredData();
  const newCategory: Category = {
    ...category,
    id: getNextId(data.categories),
    order: getNextOrder(data.categories),
  };
  await saveCategories([...data.categories, newCategory]);
  return newCategory.id;
};

export const updateCategory = async (id: number, updates: Partial<Category>): Promise<void> => {
  await updateStoredData((data) => ({
    ...data,
    categories: data.categories.map((c) => (c.id === id ? { ...c, ...updates } : c)),
  }));
};

export const deleteCategory = async (id: number): Promise<void> => {
  await updateStoredData((data) => ({
    ...data,
    categories: data.categories.filter((c) => c.id !== id),
    templates: data.templates.filter((t) => t.categoryId !== id),
  }));
};

export const reorderCategories = async (orderedIds: number[]): Promise<void> => {
  await updateStoredData((data) => ({
    ...data,
    categories: reorderItems(data.categories, orderedIds),
  }));
};

export const getTemplatesByCategory = async (categoryId: number): Promise<Template[]> => {
  const data = await loadStoredData();
  return data.templates.filter((t) => t.categoryId === categoryId).sort((a, b) => a.order - b.order);
};

//* ショートカットキー操作
export const saveShortcutKey = async (shortcutKey: string): Promise<void> => {
  await updateStoredData((data) => ({ ...data, shortcutKey }));
};

export const loadShortcutKey = async (): Promise<string> => {
  const data = await loadStoredData();
  return data.shortcutKey;
};

export const resetStorage = async (): Promise<void> => {
  await saveStoredData(DEFAULT_DATA);
};
