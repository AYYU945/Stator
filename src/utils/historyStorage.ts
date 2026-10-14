import { HistoryEntry } from '../types/history.ts';

const STORAGE_KEY = 'stator_conversion_history';
const FALLBACK_STORAGE_KEY = 'omniconvert_history_v1';
const DB_NAME = 'stator_db';
const STORE_NAME = 'history_entries';
const DB_VERSION = 1;

// Seed initial history entries matching the demo state
const SEED_HISTORY: HistoryEntry[] = [
  {
    id: 'seed-hist-1',
    originalName: 'portrait-shoot.raw',
    convertedName: 'portrait-shoot.png',
    originalSizeFormatted: '42.8 MB',
    outputSizeFormatted: '24.8 MB',
    savingsPercent: 42,
    typeCategory: 'image',
    timestamp: Date.now() - 5 * 60 * 1000, // 5 mins ago
  },
  {
    id: 'seed-hist-2',
    originalName: 'brand-hero-intro.mov',
    convertedName: 'brand-hero-intro.mp4',
    originalSizeFormatted: '152.0 MB',
    outputSizeFormatted: '84.5 MB',
    savingsPercent: 44,
    typeCategory: 'video',
    timestamp: Date.now() - 25 * 60 * 1000, // 25 mins ago
  },
  {
    id: 'seed-hist-3',
    originalName: 'podcast-master.wav',
    convertedName: 'podcast-master.mp3',
    originalSizeFormatted: '78.2 MB',
    outputSizeFormatted: '18.4 MB',
    savingsPercent: 76,
    typeCategory: 'audio',
    timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2h ago
  },
];

// Open IndexedDB helper
function openDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.warn('IndexedDB open error, falling back to localStorage');
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

/**
 * Loads history records from IndexedDB or localStorage
 */
export async function loadHistoryRecords(): Promise<HistoryEntry[]> {
  const db = await openDB();

  if (db) {
    try {
      const records = await new Promise<HistoryEntry[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();

        req.onsuccess = () => {
          const list: any[] = req.result || [];
          const entries: HistoryEntry[] = list.map((item) => {
            let outputBlobUrl = item.outputBlobUrl;
            if (item.blob && !outputBlobUrl) {
              outputBlobUrl = URL.createObjectURL(item.blob);
            }
            return {
              id: item.id,
              originalName: item.originalName,
              convertedName: item.convertedName,
              originalSizeFormatted: item.originalSizeFormatted,
              outputSizeFormatted: item.outputSizeFormatted,
              savingsPercent: item.savingsPercent,
              typeCategory: item.typeCategory,
              timestamp: item.timestamp,
              outputBlobUrl,
              blob: item.blob,
            };
          });
          resolve(entries);
        };
        req.onerror = () => reject(req.error);
      });

      if (records.length > 0) {
        return records.sort((a, b) => b.timestamp - a.timestamp);
      }
    } catch (e) {
      console.warn('Failed to read from IndexedDB:', e);
    }
  }

  // Fallback to localStorage
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(FALLBACK_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.sort((a, b) => b.timestamp - a.timestamp);
      }
    }
  } catch {}

  // If completely empty, seed initial records
  await saveAllHistoryRecords(SEED_HISTORY);
  return SEED_HISTORY;
}

/**
 * Saves a single new entry
 */
export async function saveHistoryRecord(entry: HistoryEntry): Promise<void> {
  const db = await openDB();

  if (db) {
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put({
          ...entry,
          // Store actual blob if present
          blob: entry.blob || undefined,
        });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Failed to save to IndexedDB:', e);
    }
  }

  // Also maintain in localStorage metadata mirror
  try {
    const current = await loadHistoryRecords();
    const filtered = current.filter((r) => r.id !== entry.id);
    const updated = [
      {
        ...entry,
        blob: undefined, // Don't put raw blob in localStorage string
      },
      ...filtered,
    ].slice(0, 50); // limit to latest 50

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
}

/**
 * Deletes a single history record by ID
 */
export async function deleteHistoryRecord(id: string): Promise<void> {
  const db = await openDB();

  if (db) {
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {}
  }

  try {
    const current = await loadHistoryRecords();
    const updated = current.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

/**
 * Clears all history records
 */
export async function clearAllHistoryRecords(): Promise<void> {
  const db = await openDB();

  if (db) {
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {}
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

/**
 * Bulk save helper
 */
async function saveAllHistoryRecords(records: HistoryEntry[]): Promise<void> {
  const db = await openDB();
  if (db) {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      for (const r of records) {
        store.put(r);
      }
    } catch {}
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {}
}
