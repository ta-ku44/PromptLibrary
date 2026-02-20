export type Item = {
  id: string;
  name: string;
  content: string;
};

export type Category = {
  id: string;
  name: string;
  itemIds: string[];
};

export type StorageData = {
  version: number;
  items: Record<string, Item>;
  categories: string[];
  triggerKey: string;
};
