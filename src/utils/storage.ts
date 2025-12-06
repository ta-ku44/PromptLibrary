import browser from 'webextension-polyfill';
import type { Template, Group, StorageData } from '../types/index';

const DEFAULT_DATA: StorageData = {
  templates: [],
  groups: [],
  shortcutKey: '#',
};

//* Template関連のストレージ操作 */
export const loadStoredData = async (): Promise<StorageData> => {
  const result = await browser.storage.sync.get('data');
  const data = result.data as Partial<StorageData> | undefined;
  return {
    templates: data?.templates ?? DEFAULT_DATA.templates,
    groups: data?.groups ?? DEFAULT_DATA.groups,
    shortcutKey: data?.shortcutKey ?? DEFAULT_DATA.shortcutKey,
  };
};

export const saveTemplates = async (templates: Template[]): Promise<void> => {
  const data = await loadStoredData();
  await browser.storage.sync.set({ data: { ...data, templates } });
};

export const addTemplate = async (template: Template): Promise<void> => {
  const data = await loadStoredData();
  await saveTemplates([...data.templates, template]);
};

export const updateTemplate = async (id: number, updates: Partial<Template>): Promise<void> => {
  const data = await loadStoredData();
  const templates = data.templates.map(t => 
    t.id === id ? { ...t, ...updates } : t
  );
  await saveTemplates(templates);
};

export const deleteTemplate = async (id: number): Promise<void> => {
  const data = await loadStoredData();
  const templates = data.templates.filter(t => t.id !== id);
  await saveTemplates(templates);
};

export const deleteAllTemplates = async (): Promise<void> => {
  await saveTemplates([]);
}

//* Group関連のストレージ操作 */
export const saveGroups = async (groups: Group[]): Promise<void> => {
  const data = await loadStoredData();
  await browser.storage.sync.set({ data: { ...data, groups } });
}

export const addGroup = async (group: Group): Promise<void> => {
  const data = await loadStoredData();
  await saveGroups([...data.groups, group]);
};

export const updateGroup = async (id: number, updates: Partial<Group>): Promise<void> => {
  const data = await loadStoredData();
  const groups = data.groups.map(g => 
    g.id === id ? { ...g, ...updates } : g
  );
  await saveGroups(groups);
};

export const deleteGroup = async (id: number): Promise<void> => {
  const data = await loadStoredData();
  const groups = data.groups.filter(g => g.id !== id);
  await saveGroups(groups);
};

export const deleteAllGroups = async (): Promise<void> => {
  await saveGroups([]);
};

export const getTemplatesByGroup = async (groupId: number): Promise<Template[]> => {
  const data = await loadStoredData();
  return data.templates.filter(t => t.groupId === groupId);
};

/* ShortcutKey関連のストレージ操作 */
export const getShortcutKey = async (): Promise<string> => {
  const data = await loadStoredData();
  return data.shortcutKey;
}

export const setShortcutKey = async (key: string): Promise<void> => {
  const data = await loadStoredData();
  await browser.storage.sync.set({ data: { ...data, shortcutKey: key } });
};