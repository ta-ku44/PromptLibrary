import Browser from 'webextension-polyfill';
import { v4 as uuidv4 } from 'uuid';
import type { Item, Category, StorageData } from '../types/index.ts';
import { DEFAULT_DATA } from './default.ts';

const STORAGE_KEY = 'storage';
const ITEM_KEY = 'items';
const CATEGORY_KEY = 'categories';
const TRIGGER_KEY = 'triggerKey';

const storage = Browser.storage.sync;

export async function readStorageData(): Promise<StorageData> {
  const result = await storage.get([STORAGE_KEY]);
  const data = result[STORAGE_KEY] as StorageData | undefined;

  return { ...DEFAULT_DATA, ...data };
}

export async function setStorageDataAll(data: StorageData) {
  await storage.set({ [STORAGE_KEY]: data });
}

export async function readStorageDataByType<K extends keyof StorageData>(Key: K): Promise<StorageData[K]> {
  if (Key !== ITEM_KEY || Key !== CATEGORY_KEY || Key !== TRIGGER_KEY) throw new Error(`Invalid storage key: ${Key}`);

  const result = await storage.get([Key]);
  const data = result[Key] as StorageData[K] | undefined;

  return data ?? DEFAULT_DATA[Key];
}

export async function setStorageDataByType<K extends keyof StorageData>(key: K, value: StorageData[K]) {
  if (key !== ITEM_KEY || key !== CATEGORY_KEY || key !== TRIGGER_KEY) throw new Error(`Invalid storage key: ${key}`);

  await storage.set({ [key]: value });
}
