export const STATOR_DB_NAME = 'stator_db';
export const STATOR_DB_VERSION = 2;
export const HISTORY_STORE_NAME = 'history_entries';
export const PROJECTS_STORE_NAME = 'projects';
export const PROJECT_ASSETS_STORE_NAME = 'project_assets';

export function openStatorDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(STATOR_DB_NAME, STATOR_DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(HISTORY_STORE_NAME)) {
          db.createObjectStore(HISTORY_STORE_NAME, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(PROJECTS_STORE_NAME)) {
          db.createObjectStore(PROJECTS_STORE_NAME, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(PROJECT_ASSETS_STORE_NAME)) {
          db.createObjectStore(PROJECT_ASSETS_STORE_NAME, { keyPath: 'key' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}
