import { storage, getAppConfig } from '#imports';
import { nanoid } from 'nanoid';
import { keyAtEnd } from '@/utils/fractionalIndex';
import { seed } from '@/utils/seed';
import { Catalog } from '@/types/catalog';

const catalog = storage.defineItem<Catalog>('local:catalog', { init: () => seed(getAppConfig().catalog), version: 1 });

type Key = keyof Catalog;
type Entity = { id: string; fractionalIndex: string };

const getCatalogField = async <T extends Key>(field: T): Promise<Catalog[T]> => {
  const catalogValue = await catalog.getValue();
  return catalogValue[field];
};

const setCatalogField = async <T extends Key>(field: T, value: Catalog[T]): Promise<void> => {
  const catalogValue = await catalog.getValue();
  await catalog.setValue({ ...catalogValue, [field]: value });
};

type Draft<T extends Key> = Omit<Catalog[T][number], 'id' | 'fractionalIndex'>;
type Writable<T extends Key> = Omit<Catalog[T][number], 'id'>;

const referenceChecks: { [K in Key]?: (entity: Partial<Writable<K>>) => Promise<void> } = {
  // categoryIdが指すカテゴリが実在するか確認
  items: async (item) => {
    if (!item.categoryId) return;
    const categories = await getCatalogField('categories');
    if (!categories.some((c) => c.id === item.categoryId)) {
      throw new Error(`Category not found: ${item.categoryId}`);
    }
  },
};

const addEntity = async <T extends Key>(field: T, entity: Draft<T>) => {
  await referenceChecks[field]?.(entity as Partial<Writable<T>>);

  const list = await getCatalogField(field);

  const newEntity = {
    id: nanoid(8),
    ...entity,
    fractionalIndex: keyAtEnd(list as Entity[]),
  } as Catalog[T][number];
  await setCatalogField(field, [...list, newEntity] as Catalog[T]);
};

const updateEntity = async <T extends Key>(field: T, id: string, entity: Partial<Writable<T>>) => {
  await referenceChecks[field]?.(entity);

  const list = await getCatalogField(field);

  // 存在確認と、更新位置の特定を兼ねてindexを取得
  const index = (list as Entity[]).findIndex((entity) => entity.id === id);
  if (index === -1) throw new Error(`${field} entity not found: ${id}`);

  const updated = [...list] as Catalog[T];
  updated[index] = { ...updated[index], ...entity } as Catalog[T][number];

  await setCatalogField(field, updated);
};

const deleteEntity = async <T extends Key>(field: T, id: string) => {
  const list = await getCatalogField(field);

  const exists = (list as Entity[]).some((entity) => entity.id === id);
  if (!exists) throw new Error(`${field} entity not found: ${id}`);

  await setCatalogField(field, (list as Entity[]).filter((entity) => entity.id !== id) as Catalog[T]);
};

export const getCatalog = () => catalog.getValue();
export const watchCatalog = (callback: (catalog: Catalog) => void) => catalog.watch(callback);

export const addItem = (item: Draft<'items'>) => addEntity('items', item);
export const updateItem = (id: string, item: Partial<Writable<'items'>>) => updateEntity('items', id, item);
export const deleteItem = (id: string) => deleteEntity('items', id);

export const addCategory = (cat: Draft<'categories'>) => addEntity('categories', cat);
export const updateCategory = (id: string, cat: Partial<Writable<'categories'>>) => updateEntity('categories', id, cat);
export const deleteCategory = (id: string) => deleteEntity('categories', id);
