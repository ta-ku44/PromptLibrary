export interface Template {
  id: number;
  categoryId: number | null;
  name: string;
  content: string;
  order: number;
}

export interface Category {
  id: number;
  name: string;
  order: number;
}

export interface StorageData {
  templates: Template[];
  categories: Category[];
  shortcutKey: string;
}
