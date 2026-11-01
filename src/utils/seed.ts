import { nanoid } from 'nanoid';
import type { Catalog } from '@/types/catalog';

export const seed = (catalog: Catalog): Catalog => {
  const categoryIds = new Map(catalog.categories.map((c) => [c.id, nanoid(8)]));

  return {
    categories: catalog.categories.map((c) => ({ ...c, id: categoryIds.get(c.id)! })),
    items: catalog.items.map((i) => ({ ...i, id: nanoid(8), categoryId: categoryIds.get(i.categoryId)! })),
  };
};
