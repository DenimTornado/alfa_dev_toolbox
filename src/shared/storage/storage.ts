import { createDefaults, validateData, type AppData } from './schema';
export const STORAGE_KEY = 'dev-toolbox:data';
export type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
export type LoadResult = { data: AppData; error: string; blocked: boolean };
export function loadData(storage: StoragePort): LoadResult {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return {
      data: raw === null ? createDefaults() : validateData(JSON.parse(raw)),
      error: '',
      blocked: false,
    };
  } catch {
    return {
      data: createDefaults(),
      error:
        'Saved data is damaged, from an unsupported version, or storage is unavailable. Original data has not been overwritten. Export a backup or explicitly enable saving in Settings.',
      blocked: true,
    };
  }
}
export function saveData(storage: StoragePort, data: AppData): string {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
    return '';
  } catch {
    return 'Unable to save data. Browser storage may be full or restricted in this iframe. Changes remain in this tab; export JSON to keep them.';
  }
}
export function browserStorage(): StoragePort {
  return {
    getItem: (key) => window.localStorage.getItem(key),
    setItem: (key, value) => window.localStorage.setItem(key, value),
  };
}

export function readOriginalData(): string | null {
  return browserStorage().getItem(STORAGE_KEY);
}
