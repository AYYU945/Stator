import {
  PROJECT_SCHEMA_VERSION,
  ProjectAssetMeta,
  ProjectRecord,
  ProjectTransferBundle,
  ProjectType,
} from '../types/project.ts';
import { DEFAULT_PRESET_SETTINGS, FileTypeCategory, QueueItem } from '../types/queue.ts';
import {
  openStatorDB,
  PROJECT_ASSETS_STORE_NAME,
  PROJECTS_STORE_NAME,
} from './dbSchema.ts';
import { isEphemeralPrivacyMode } from './historyStorage.ts';

const PROJECTS_LS_KEY = 'stator_projects_meta_v3';
export const PROJECT_ASSET_CACHE_MAX_BYTES = 200 * 1024 * 1024; // 200 MB total LRU cap for cached source files

interface CachedAssetRecord {
  key: string; // `${projectId}:${assetId}`
  projectId: string;
  assetId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  cachedAt: number;
  blob: Blob;
}

/**
 * Pure schema migration for imported or stored project records (forward-safe).
 */
export function migrateProjectRecord(raw: unknown): ProjectRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || !r.id) return null;

  const validTypes = new Set<ProjectType>(['video', 'image', 'audio', 'gif', 'batch', 'blank']);
  const type: ProjectType = validTypes.has(r.type as ProjectType)
    ? (r.type as ProjectType)
    : 'blank';

  const now = Date.now();
  const assets: ProjectAssetMeta[] = Array.isArray(r.assets)
    ? r.assets
        .filter((a): a is Record<string, unknown> => Boolean(a && typeof a === 'object'))
        .map((a) => ({
          id: typeof a.id === 'string' ? a.id : `asset-${Math.random().toString(36).slice(2, 8)}`,
          name: typeof a.name === 'string' ? a.name : 'media_file',
          mimeType: typeof a.mimeType === 'string' ? a.mimeType : '',
          sizeBytes: typeof a.sizeBytes === 'number' ? a.sizeBytes : 0,
          sizeFormatted: typeof a.sizeFormatted === 'string' ? a.sizeFormatted : '0 B',
          typeCategory: (['image', 'video', 'audio', 'document', 'other'].includes(
            String(a.typeCategory)
          )
            ? a.typeCategory
            : 'other') as FileTypeCategory,
          formatBadge: typeof a.formatBadge === 'string' ? a.formatBadge : 'FILE',
          targetFormat: typeof a.targetFormat === 'string' ? a.targetFormat : 'MP4',
          presetSettings: {
            ...DEFAULT_PRESET_SETTINGS,
            ...(typeof a.presetSettings === 'object' && a.presetSettings
              ? (a.presetSettings as Record<string, unknown>)
              : {}),
          },
          dimensions: typeof a.dimensions === 'string' ? a.dimensions : undefined,
          duration: typeof a.duration === 'string' ? a.duration : undefined,
          durationSeconds: typeof a.durationSeconds === 'number' ? a.durationSeconds : undefined,
          technicalTag: typeof a.technicalTag === 'string' ? a.technicalTag : undefined,
          hasCachedBlob: Boolean(a.hasCachedBlob),
          thumbnailDataUrl:
            typeof a.thumbnailDataUrl === 'string' ? a.thumbnailDataUrl : undefined,
        }))
    : [];

  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    id: r.id,
    name: typeof r.name === 'string' && r.name.trim() ? r.name.trim() : 'Untitled Project',
    type,
    pinned: Boolean(r.pinned),
    createdAt: typeof r.createdAt === 'number' ? r.createdAt : now,
    updatedAt: typeof r.updatedAt === 'number' ? r.updatedAt : now,
    lastOpenedAt: typeof r.lastOpenedAt === 'number' ? r.lastOpenedAt : now,
    assets,
    activePipelineId: typeof r.activePipelineId === 'string' ? r.activePipelineId : undefined,
    thumbnailDataUrl: typeof r.thumbnailDataUrl === 'string' ? r.thumbnailDataUrl : undefined,
    exportSettings: {
      filenameTemplate:
        typeof (r.exportSettings as any)?.filenameTemplate === 'string'
          ? (r.exportSettings as any).filenameTemplate
          : '{name}',
      batchZipPreferred: Boolean((r.exportSettings as any)?.batchZipPreferred),
      defaultTargetFormat:
        typeof (r.exportSettings as any)?.defaultTargetFormat === 'string'
          ? (r.exportSettings as any).defaultTargetFormat
          : undefined,
    },
    snapshots: Array.isArray(r.snapshots) ? (r.snapshots as ProjectRecord['snapshots']).slice(0, 12) : [],
  };
}

export function inferProjectTypeFromFiles(files: Array<{ typeCategory: FileTypeCategory }>): ProjectType {
  if (!files || files.length === 0) return 'blank';
  if (files.length > 2) return 'batch';
  const categories = new Set(files.map((f) => f.typeCategory));
  if (categories.size > 1) return 'batch';
  const only = files[0].typeCategory;
  if (only === 'video') return 'video';
  if (only === 'image') return 'image';
  if (only === 'audio') return 'audio';
  return 'batch';
}

export async function createThumbnailDataUrl(file: File): Promise<string | undefined> {
  if (typeof document === 'undefined') return undefined;
  try {
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.onerror = reject;
          el.src = url;
        });
        const maxSide = 320;
        const scale = Math.min(1, maxSide / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
        const w = Math.max(16, Math.round((img.naturalWidth || 320) * scale));
        const h = Math.max(16, Math.round((img.naturalHeight || 180) * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return undefined;
        ctx.drawImage(img, 0, 0, w, h);
        return canvas.toDataURL('image/jpeg', 0.72);
      } finally {
        URL.revokeObjectURL(url);
      }
    }

    if (file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      try {
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.preload = 'metadata';
        await new Promise<void>((resolve, reject) => {
          video.onloadeddata = () => resolve();
          video.onerror = () => reject(new Error('video thumb failed'));
          video.src = url;
        });
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          const maxSide = 320;
          const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
          const w = Math.max(16, Math.round(video.videoWidth * scale));
          const h = Math.max(16, Math.round(video.videoHeight * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, w, h);
            return canvas.toDataURL('image/jpeg', 0.7);
          }
        }
      } finally {
        URL.revokeObjectURL(url);
      }
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export async function loadAllProjects(): Promise<ProjectRecord[]> {
  if (isEphemeralPrivacyMode()) return [];
  const db = await openStatorDB();
  if (db) {
    try {
      const rows = await new Promise<unknown[]>((resolve, reject) => {
        const tx = db.transaction(PROJECTS_STORE_NAME, 'readonly');
        const store = tx.objectStore(PROJECTS_STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
      const migrated = rows
        .map(migrateProjectRecord)
        .filter((p): p is ProjectRecord => p !== null)
        .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.lastOpenedAt - a.lastOpenedAt);
      return migrated;
    } catch (err) {
      console.warn('IndexedDB projects read failed:', err);
    }
  }

  try {
    const raw = localStorage.getItem(PROJECTS_LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .map(migrateProjectRecord)
          .filter((p): p is ProjectRecord => p !== null)
          .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.lastOpenedAt - a.lastOpenedAt);
      }
    }
  } catch {}
  return [];
}

export async function saveProjectRecord(project: ProjectRecord): Promise<void> {
  if (isEphemeralPrivacyMode()) return;
  const normalized = migrateProjectRecord(project);
  if (!normalized) return;

  const db = await openStatorDB();
  if (db) {
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(PROJECTS_STORE_NAME, 'readwrite');
        tx.objectStore(PROJECTS_STORE_NAME).put(normalized);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn('IndexedDB project write failed:', err);
    }
  }

  try {
    const existing = await loadAllProjects();
    const merged = [normalized, ...existing.filter((p) => p.id !== normalized.id)].slice(0, 60);
    // Store lightweight metadata mirror (omit big thumbnails if quota tight)
    localStorage.setItem(PROJECTS_LS_KEY, JSON.stringify(merged));
  } catch {}
}

export async function deleteProjectRecord(projectId: string): Promise<void> {
  const db = await openStatorDB();
  if (db) {
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([PROJECTS_STORE_NAME, PROJECT_ASSETS_STORE_NAME], 'readwrite');
        tx.objectStore(PROJECTS_STORE_NAME).delete(projectId);
        const assetStore = tx.objectStore(PROJECT_ASSETS_STORE_NAME);
        const req = assetStore.getAllKeys();
        req.onsuccess = () => {
          const keys = (req.result || []) as string[];
          keys.forEach((k) => {
            if (typeof k === 'string' && k.startsWith(`${projectId}:`)) {
              assetStore.delete(k);
            }
          });
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {}
  }

  try {
    const raw = localStorage.getItem(PROJECTS_LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        localStorage.setItem(
          PROJECTS_LS_KEY,
          JSON.stringify(parsed.filter((p: any) => p?.id !== projectId))
        );
      }
    }
  } catch {}
}

export async function clearAllProjectsAndAssets(): Promise<void> {
  const db = await openStatorDB();
  if (db) {
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([PROJECTS_STORE_NAME, PROJECT_ASSETS_STORE_NAME], 'readwrite');
        tx.objectStore(PROJECTS_STORE_NAME).clear();
        tx.objectStore(PROJECT_ASSETS_STORE_NAME).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {}
  }
  try {
    localStorage.removeItem(PROJECTS_LS_KEY);
  } catch {}
}

/**
 * Selectively caches a source File in IndexedDB only when within per-file threshold,
 * enforcing a 200 MB LRU cap across cached project assets.
 */
export async function cacheProjectAssetFile(
  projectId: string,
  assetId: string,
  file: File,
  maxPerFileMb: number = 35
): Promise<boolean> {
  if (isEphemeralPrivacyMode()) return false;
  const maxFileBytes = Math.max(5, maxPerFileMb) * 1024 * 1024;
  if (file.size <= 0 || file.size > maxFileBytes) {
    return false;
  }

  const db = await openStatorDB();
  if (!db) return false;

  const key = `${projectId}:${assetId}`;
  const entry: CachedAssetRecord = {
    key,
    projectId,
    assetId,
    name: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    cachedAt: Date.now(),
    blob: file,
  };

  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(PROJECT_ASSETS_STORE_NAME, 'readwrite');
      const store = tx.objectStore(PROJECT_ASSETS_STORE_NAME);
      const getAllReq = store.getAll();
      getAllReq.onsuccess = () => {
        const all = ((getAllReq.result || []) as CachedAssetRecord[])
          .filter((r) => r.key !== key)
          .sort((a, b) => b.cachedAt - a.cachedAt);
        let total = file.size;
        for (const existing of all) {
          if (total + existing.sizeBytes > PROJECT_ASSET_CACHE_MAX_BYTES) {
            store.delete(existing.key);
          } else {
            total += existing.sizeBytes;
          }
        }
        store.put(entry);
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return true;
  } catch {
    return false;
  }
}

export async function loadProjectAssetsAsQueueItems(project: ProjectRecord): Promise<QueueItem[]> {
  const db = await openStatorDB();
  const cachedBlobs = new Map<string, CachedAssetRecord>();

  if (db) {
    try {
      const rows = await new Promise<CachedAssetRecord[]>((resolve, reject) => {
        const tx = db.transaction(PROJECT_ASSETS_STORE_NAME, 'readonly');
        const req = tx.objectStore(PROJECT_ASSETS_STORE_NAME).getAll();
        req.onsuccess = () => resolve((req.result || []) as CachedAssetRecord[]);
        req.onerror = () => reject(req.error);
      });
      rows
        .filter((r) => r.projectId === project.id)
        .forEach((r) => cachedBlobs.set(r.assetId, r));
    } catch {}
  }

  return project.assets.map((meta) => {
    const cached = cachedBlobs.get(meta.id);
    let file: File | undefined;
    let previewUrl: string | undefined;

    if (cached && cached.blob) {
      file =
        cached.blob instanceof File
          ? cached.blob
          : new File([cached.blob], meta.name, {
              type: meta.mimeType || cached.mimeType || 'application/octet-stream',
            });
      if (meta.typeCategory === 'image') {
        previewUrl = URL.createObjectURL(file);
      }
    }

    const needsReconnect = !file;

    return {
      id: meta.id,
      file,
      name: meta.name,
      sizeFormatted: meta.sizeFormatted,
      sizeBytes: meta.sizeBytes,
      typeCategory: meta.typeCategory,
      formatBadge: meta.formatBadge,
      metadata: meta.mimeType || `${meta.typeCategory.toUpperCase()} asset`,
      technicalTag: meta.technicalTag || meta.sizeFormatted,
      targetFormat: meta.targetFormat,
      presetSettings: { ...DEFAULT_PRESET_SETTINGS, ...meta.presetSettings },
      status: 'ready',
      progress: 0,
      dimensions: meta.dimensions,
      duration: meta.duration,
      durationSeconds: meta.durationSeconds,
      previewUrl: previewUrl || meta.thumbnailDataUrl,
      needsReconnect,
    };
  });
}

export async function getProjectStorageFootprint(): Promise<{
  projectCount: number;
  cachedAssetBytes: number;
  cachedAssetCount: number;
}> {
  const projects = await loadAllProjects();
  const db = await openStatorDB();
  if (!db) {
    return { projectCount: projects.length, cachedAssetBytes: 0, cachedAssetCount: 0 };
  }
  try {
    const rows = await new Promise<CachedAssetRecord[]>((resolve, reject) => {
      const tx = db.transaction(PROJECT_ASSETS_STORE_NAME, 'readonly');
      const req = tx.objectStore(PROJECT_ASSETS_STORE_NAME).getAll();
      req.onsuccess = () => resolve((req.result || []) as CachedAssetRecord[]);
      req.onerror = () => reject(req.error);
    });
    const bytes = rows.reduce((s, r) => s + (r.sizeBytes || 0), 0);
    return {
      projectCount: projects.length,
      cachedAssetBytes: bytes,
      cachedAssetCount: rows.length,
    };
  } catch {
    return { projectCount: projects.length, cachedAssetBytes: 0, cachedAssetCount: 0 };
  }
}

export function exportProjectBundleJson(project: ProjectRecord): string {
  const bundle: ProjectTransferBundle = {
    statorProjectBundle: 3,
    exportedAt: Date.now(),
    project: {
      ...project,
      assets: project.assets.map((a) => ({ ...a, hasCachedBlob: false })),
    },
    note: 'Contains Stator 3.0 project metadata, presets, and edit operations. Source media blobs stay local unless reconnected.',
  };
  return JSON.stringify(bundle, null, 2);
}

export function parseProjectBundleJson(jsonText: string): ProjectRecord | null {
  try {
    const parsed = JSON.parse(jsonText);
    const rawProject = parsed?.project ? parsed.project : parsed;
    const migrated = migrateProjectRecord(rawProject);
    if (!migrated) return null;
    // Generate a fresh local ID on import to avoid accidental overwrites
    return {
      ...migrated,
      id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      lastOpenedAt: Date.now(),
      updatedAt: Date.now(),
      assets: migrated.assets.map((a) => ({ ...a, hasCachedBlob: false })),
    };
  } catch {
    return null;
  }
}
