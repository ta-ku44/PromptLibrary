export type Item = {
  id: string;
  name: string;
  content: string;
  order: number;
};

export type Category = {
  id: string;
  name: string;
  order: number;
  itemIds: string[];
};

export type StorageData = {
  version: number;
  items: Record<string, Item>;
  categories: Record<string, Category>;
  triggerKey: string;
};
