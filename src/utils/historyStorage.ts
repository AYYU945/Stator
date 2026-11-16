import { HistoryEntry } from '../types/history.ts';

const STORAGE_KEY = 'stator_conversion_history';
const FALLBACK_STORAGE_KEY = 'omniconvert_history_v1';
const EPHEMERAL_MODE_KEY = 'stator_ephemeral_privacy';
const DB_NAME = 'stator_db';
const STORE_NAME = 'history_entries';
const DB_VERSION = 1;

export const HISTORY_BLOB_QUOTA_BYTES = 250 * 1024 * 1024; // 250 MB LRU cap
export const HISTORY_MAX_ENTRIES = 50;

export function isEphemeralPrivacyMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(EPHEMERAL_MODE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setEphemeralPrivacyMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(EPHEMERAL_MODE_KEY, enabled ? 'true' : 'false');
  } catch {}
}

/**
 * Pure chronological LRU quota enforcement for cached history blobs.
 * Retains newest entries whose cached blobs fit inside maxBytes, evicting blob payloads from older entries.
 */
export function enforceHistoryBlobQuota(
  entries: HistoryEntry[],
  maxBytes: number = HISTORY_BLOB_QUOTA_BYTES
): { retained: HistoryEntry[]; evictedIds: string[]; totalBlobBytes: number } {
  const sorted = [...entries].sort((a, b) => b.timestamp - a.timestamp).slice(0, HISTORY_MAX_ENTRIES);
  let runningBytes = 0;
  let quotaReached = false;
  const evictedIds: string[] = [];

  const retained = sorted.map((entry) => {
    const blobSize = entry.blob ? entry.blob.size : 0;
    if (blobSize > 0 && (quotaReached || runningBytes + blobSize > maxBytes)) {
      quotaReached = true;
      evictedIds.push(entry.id);
      if (entry.outputBlobUrl && entry.outputBlobUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(entry.outputBlobUrl);
        } catch {}
      }
      return {
        ...entry,
        blob: undefined,
        outputBlobUrl: undefined,
      };
    }
    if (blobSize > 0) {
      runningBytes += blobSize;
    }
    return entry;
  });

  return { retained, evictedIds, totalBlobBytes: runningBytes };
}

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
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Loads history records from IndexedDB or localStorage.
 * Clean empty state on first visit (never injects fake seed records).
 */
export async function loadHistoryRecords(): Promise<HistoryEntry[]> {
  if (isEphemeralPrivacyMode()) {
    return [];
  }

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
        const { retained } = enforceHistoryBlobQuota(records);
        return retained;
      }
    } catch (e) {
      console.warn('Failed to read from IndexedDB:', e);
    }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(FALLBACK_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.sort((a, b) => b.timestamp - a.timestamp);
      }
    }
  } catch {}

  return [];
}

/**
 * Computes current IndexedDB cached blob footprint from loaded entries.
 */
export function getHistoryStorageUsage(entries: HistoryEntry[]): {
  usedBytes: number;
  quotaBytes: number;
  percentUsed: number;
} {
  const usedBytes = entries.reduce((sum, entry) => sum + (entry.blob ? entry.blob.size : 0), 0);
  const percentUsed = Math.min(100, Math.round((usedBytes / HISTORY_BLOB_QUOTA_BYTES) * 100));
  return {
    usedBytes,
    quotaBytes: HISTORY_BLOB_QUOTA_BYTES,
    percentUsed,
  };
}

/**
 * Saves a single history entry while respecting Ephemeral Privacy Mode and 250 MB LRU cache cap.
 */
export async function saveHistoryRecord(entry: HistoryEntry): Promise<void> {
  if (isEphemeralPrivacyMode()) {
    return;
  }

  const existing = await loadHistoryRecords();
  const combined = [entry, ...existing.filter((r) => r.id !== entry.id)];
  const { retained } = enforceHistoryBlobQuota(combined);

  const db = await openDB();
  if (db) {
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.clear();
        for (const r of retained) {
          store.put({
            id: r.id,
            originalName: r.originalName,
            convertedName: r.convertedName,
            originalSizeFormatted: r.originalSizeFormatted,
            outputSizeFormatted: r.outputSizeFormatted,
            savingsPercent: r.savingsPercent,
            typeCategory: r.typeCategory,
            timestamp: r.timestamp,
            blob: r.blob || undefined,
          });
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.warn('Failed to save to IndexedDB:', e);
    }
  }

  try {
    const metadataMirror = retained.map((r) => ({
      ...r,
      blob: undefined,
      outputBlobUrl: undefined,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(metadataMirror));
  } catch (e) {
    console.warn('Failed to save history mirror to localStorage:', e);
  }
}

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
    const updated = current
      .filter((item) => item.id !== id)
      .map((r) => ({ ...r, blob: undefined, outputBlobUrl: undefined }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

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
    localStorage.removeItem(FALLBACK_STORAGE_KEY);
  } catch {}
}

/**
 * 1-click full reset wiping IndexedDB history store, presets, brand kit, and preferences.
 */
export async function wipeAllLocalData(): Promise<void> {
  await clearAllHistoryRecords();
  if (typeof window !== 'undefined') {
    try {
      const keysToClear: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('stator_') || k.startsWith('omniconvert_'))) {
          keysToClear.push(k);
        }
      }
      keysToClear.forEach((k) => localStorage.removeItem(k));
    } catch {}
  }
}
