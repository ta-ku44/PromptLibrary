import Browser from 'webextension-polyfill';
import { v4 as uuidv4 } from 'uuid';
import type { Item, Category, StorageData } from '../../types/index.ts';
import { DEFAULT_DATA } from './default.ts';

const ITEM_KEY = 'items';
const CATEGORY_KEY = 'categories';
const TRIGGER_KEY = 'triggerKey';
type StorageKey = typeof ITEM_KEY | typeof CATEGORY_KEY | typeof TRIGGER_KEY;

const storage = Browser.storage.sync;

function assertKey(key: keyof StorageData): asserts key is StorageKey {
  if (key !== ITEM_KEY && key !== CATEGORY_KEY && key !== TRIGGER_KEY) {
    throw new Error(`Invalid storage key: ${key}`);
  }
}

export async function readAllData(): Promise<StorageData> {
  const result = await storage.get(null);
  const data = result as StorageData;
  return { ...DEFAULT_DATA, ...data };
}

export async function updateAllData(data: StorageData) {
  await storage.set(data);
}

async function readByKey<K extends keyof StorageData>(key: K): Promise<StorageData[K]> {
  assertKey(key);
  const result = await storage.get([key]);
  const data = result[key] as StorageData[K];
  return data ?? DEFAULT_DATA[key];
}

async function updateByKey<K extends keyof StorageData>(key: K, value: StorageData[K]) {
  assertKey(key);
  await storage.set({ [key]: value });
}

async function createEntityByKey<K extends typeof ITEM_KEY | typeof CATEGORY_KEY>(key: K, entity: Omit<StorageData[K][string], 'id'>): Promise<string> {
  const entities = await readByKey(key);
  const id = uuidv4();
  const newEntity = { id, ...entity, order: Object.keys(entities).length };
  await updateByKey(key, { ...entities, [id]: newEntity });
  return id;
}

async function deleteEntityByKey(key: typeof ITEM_KEY | typeof CATEGORY_KEY, id: string): Promise<void> {
  const entities = await readByKey(key);
  if (!(id in entities)) {
    throw new Error(`Entity not found in ${key}: ${id}`);
  }
  const { [id]: _, ...rest } = entities;
  await updateByKey(key, rest);
}

export const createItem = (item: Omit<Item, 'id'>) => createEntityByKey(ITEM_KEY, item);
export const readItems = () => readByKey(ITEM_KEY);
export const updateItems = (items: Record<string, Item>) => updateByKey(ITEM_KEY, items);
export const deleteItem = (id: string) => deleteEntityByKey(ITEM_KEY, id);

export const createCategory = (category: Omit<Category, 'id'>) => createEntityByKey(CATEGORY_KEY, category);
export const readCategories = () => readByKey(CATEGORY_KEY);
export const updateCategories = (categories: Record<string, Category>) => updateByKey(CATEGORY_KEY, categories);
export const deleteCategory = (id: string) => deleteEntityByKey(CATEGORY_KEY, id);

export const readTriggerKey = () => readByKey(TRIGGER_KEY);
export const updateTriggerKey = (triggerKey: string) => updateByKey(TRIGGER_KEY, triggerKey);
