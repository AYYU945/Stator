import { useState, useEffect, useCallback, useRef } from 'react';
import {
  PROJECT_SCHEMA_VERSION,
  ProjectAssetMeta,
  ProjectRecord,
  ProjectType,
} from '../types/project.ts';
import { DEFAULT_PRESET_SETTINGS, QueueItem } from '../types/queue.ts';
import {
  cacheProjectAssetFile,
  clearAllProjectsAndAssets,
  createThumbnailDataUrl,
  deleteProjectRecord,
  exportProjectBundleJson,
  inferProjectTypeFromFiles,
  loadAllProjects,
  loadProjectAssetsAsQueueItems,
  parseProjectBundleJson,
  saveProjectRecord,
} from '../utils/projectStorage.ts';

export interface ProjectWorkspaceOptions {
  autosaveProjects: boolean;
  cacheSmallMediaThresholdMb: number;
  ephemeralMode: boolean;
  filenameTemplate: string;
  queue: QueueItem[];
  setQueue: React.Dispatch<React.SetStateAction<QueueItem[]>>;
  onFilesSelected: (files: File[], openSingleInspector?: boolean) => QueueItem[];
  onClearEditHistory: () => void;
  onToast: (msg: string) => void;
}

const DEFAULT_PROJECT_TITLES: Record<ProjectType, string> = {
  video: 'Untitled Video Project',
  image: 'Untitled Image Studio',
  audio: 'Untitled Audio Session',
  gif: 'Untitled GIF Sequence',
  batch: 'Untitled Batch Conversion',
  blank: 'Untitled Workspace',
};

export function useProjectWorkspace(opts: ProjectWorkspaceOptions) {
  const {
    autosaveProjects,
    cacheSmallMediaThresholdMb,
    ephemeralMode,
    filenameTemplate,
    queue,
    setQueue,
    onFilesSelected,
    onClearEditHistory,
    onToast,
  } = opts;

  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'ephemeral' | 'unsaved'>('saved');

  const cachedIdsRef = useRef<Set<string>>(new Set());
  const thumbMapRef = useRef<Map<string, string>>(new Map());
  const autosaveTimerRef = useRef<number | null>(null);

  const activeProject = projects.find((p) => p.id === activeProjectId) || null;

  const refreshProjects = useCallback(async () => {
    const loaded = await loadAllProjects();
    setProjects(loaded);
  }, []);

  useEffect(() => {
    void refreshProjects();
  }, [refreshProjects]);

  useEffect(() => {
    if (ephemeralMode) {
      setSaveStatus('ephemeral');
    } else if (!autosaveProjects) {
      setSaveStatus('unsaved');
    }
  }, [ephemeralMode, autosaveProjects]);

  const queueToAssetMetas = useCallback(
    async (projectId: string, items: QueueItem[]): Promise<ProjectAssetMeta[]> => {
      const metas: ProjectAssetMeta[] = [];
      for (const item of items) {
        let hasCachedBlob = !item.needsReconnect && Boolean(item.file);
        if (item.file && !ephemeralMode && !cachedIdsRef.current.has(`${projectId}:${item.id}`)) {
          const cached = await cacheProjectAssetFile(
            projectId,
            item.id,
            item.file,
            cacheSmallMediaThresholdMb
          );
          if (cached) {
            cachedIdsRef.current.add(`${projectId}:${item.id}`);
          }
          hasCachedBlob = cached;
        }

        let thumb = thumbMapRef.current.get(item.id);
        if (!thumb && item.file && (item.typeCategory === 'image' || item.typeCategory === 'video')) {
          thumb = await createThumbnailDataUrl(item.file);
          if (thumb) {
            thumbMapRef.current.set(item.id, thumb);
          }
        }

        metas.push({
          id: item.id,
          name: item.name,
          mimeType: item.file?.type || item.metadata || '',
          sizeBytes: item.sizeBytes || item.file?.size || 0,
          sizeFormatted: item.sizeFormatted,
          typeCategory: item.typeCategory,
          formatBadge: item.formatBadge,
          targetFormat: item.targetFormat,
          presetSettings: item.presetSettings || { ...DEFAULT_PRESET_SETTINGS },
          dimensions: item.dimensions,
          duration: item.duration,
          durationSeconds: item.durationSeconds,
          technicalTag: item.technicalTag,
          hasCachedBlob,
          thumbnailDataUrl: thumb,
        });
      }
      return metas;
    },
    [cacheSmallMediaThresholdMb, ephemeralMode]
  );

  // Autosave active project whenever queue changes
  useEffect(() => {
    if (!activeProjectId || ephemeralMode || !autosaveProjects) return;
    const current = projects.find((p) => p.id === activeProjectId);
    if (!current) return;

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    setSaveStatus('saving');
    autosaveTimerRef.current = window.setTimeout(async () => {
      try {
        const assetMetas = await queueToAssetMetas(current.id, queue);
        const leadThumb =
          assetMetas.find((a) => Boolean(a.thumbnailDataUrl))?.thumbnailDataUrl ||
          current.thumbnailDataUrl;

        const nextRecord: ProjectRecord = {
          ...current,
          updatedAt: Date.now(),
          lastOpenedAt: Date.now(),
          assets: assetMetas,
          thumbnailDataUrl: leadThumb,
          exportSettings: {
            ...current.exportSettings,
            filenameTemplate,
          },
        };
        await saveProjectRecord(nextRecord);
        setProjects((prev) =>
          prev
            .map((p) => (p.id === nextRecord.id ? nextRecord : p))
            .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.lastOpenedAt - a.lastOpenedAt)
        );
        setSaveStatus('saved');
      } catch {
        setSaveStatus('unsaved');
      }
    }, 350);

    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [activeProjectId, queue, autosaveProjects, ephemeralMode, filenameTemplate, queueToAssetMetas]);

  const createProject = useCallback(
    async (type: ProjectType, customName?: string, initialFiles?: File[]): Promise<ProjectRecord> => {
      const now = Date.now();
      const id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? `proj-${crypto.randomUUID().slice(0, 8)}`
          : `proj-${now}-${Math.random().toString(36).slice(2, 6)}`;

      const name = (customName || '').trim() || DEFAULT_PROJECT_TITLES[type];
      onClearEditHistory();
      setQueue([]);

      let stagedItems: QueueItem[] = [];
      if (initialFiles && initialFiles.length > 0) {
        stagedItems = onFilesSelected(initialFiles, true);
      }

      const assetMetas = await queueToAssetMetas(id, stagedItems);
      const record: ProjectRecord = {
        schemaVersion: PROJECT_SCHEMA_VERSION,
        id,
        name,
        type,
        pinned: false,
        createdAt: now,
        updatedAt: now,
        lastOpenedAt: now,
        assets: assetMetas,
        thumbnailDataUrl: assetMetas.find((a) => a.thumbnailDataUrl)?.thumbnailDataUrl,
        exportSettings: {
          filenameTemplate,
          batchZipPreferred: type === 'batch',
        },
        snapshots: [],
      };

      if (!ephemeralMode) {
        await saveProjectRecord(record);
      }
      setProjects((prev) => [record, ...prev]);
      setActiveProjectId(record.id);
      setSaveStatus(ephemeralMode ? 'ephemeral' : 'saved');
      return record;
    },
    [ephemeralMode, filenameTemplate, onClearEditHistory, onFilesSelected, queueToAssetMetas, setQueue]
  );

  const openProject = useCallback(
    async (projectId: string): Promise<ProjectRecord | null> => {
      const target = projects.find((p) => p.id === projectId);
      if (!target) return null;

      onClearEditHistory();
      const hydratedQueue = await loadProjectAssetsAsQueueItems(target);
      setQueue(hydratedQueue);
      setActiveProjectId(target.id);

      const updated: ProjectRecord = {
        ...target,
        lastOpenedAt: Date.now(),
      };
      if (!ephemeralMode) {
        await saveProjectRecord(updated);
      }
      setProjects((prev) =>
        prev
          .map((p) => (p.id === updated.id ? updated : p))
          .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.lastOpenedAt - a.lastOpenedAt)
      );

      const missingCount = hydratedQueue.filter((i) => i.needsReconnect).length;
      if (missingCount > 0) {
        onToast(
          `Opened "${target.name}" (${missingCount} large source file${missingCount === 1 ? '' : 's'} need reconnection)`
        );
      }
      return updated;
    },
    [ephemeralMode, onClearEditHistory, onToast, projects, setQueue]
  );

  const openFilesInSmartProject = useCallback(
    async (files: File[], preferredType?: ProjectType): Promise<ProjectRecord> => {
      if (activeProjectId && queue.length === 0 && activeProject) {
        const staged = onFilesSelected(files, true);
        if (!preferredType && activeProject.type === 'blank' && staged.length > 0) {
          const inferred = inferProjectTypeFromFiles(staged);
          const renamed: ProjectRecord = {
            ...activeProject,
            type: inferred,
            name:
              activeProject.name === DEFAULT_PROJECT_TITLES.blank
                ? staged[0].name.replace(/\.[^/.]+$/, '')
                : activeProject.name,
          };
          setProjects((prev) => prev.map((p) => (p.id === renamed.id ? renamed : p)));
          if (!ephemeralMode) await saveProjectRecord(renamed);
          return renamed;
        }
        return activeProject;
      }

      if (activeProjectId && queue.length > 0) {
        onFilesSelected(files, false);
        return activeProject!;
      }

      // Create a fresh project matching the dropped files
      const items = onFilesSelected(files, true);
      const inferred = preferredType || inferProjectTypeFromFiles(items);
      const title =
        items.length === 1
          ? items[0].name.replace(/\.[^/.]+$/, '')
          : `${items.length} File ${inferred === 'image' ? 'Image' : inferred === 'audio' ? 'Audio' : inferred === 'video' ? 'Video' : 'Batch'} Project`;
      const now = Date.now();
      const id = `proj-${now}-${Math.random().toString(36).slice(2, 6)}`;
      const metas = await queueToAssetMetas(id, items);
      const record: ProjectRecord = {
        schemaVersion: PROJECT_SCHEMA_VERSION,
        id,
        name: title,
        type: inferred,
        pinned: false,
        createdAt: now,
        updatedAt: now,
        lastOpenedAt: now,
        assets: metas,
        thumbnailDataUrl: metas.find((a) => a.thumbnailDataUrl)?.thumbnailDataUrl,
        exportSettings: {
          filenameTemplate,
          batchZipPreferred: items.length > 1,
        },
        snapshots: [],
      };
      if (!ephemeralMode) {
        await saveProjectRecord(record);
      }
      setProjects((prev) => [record, ...prev]);
      setActiveProjectId(record.id);
      return record;
    },
    [
      activeProject,
      activeProjectId,
      ephemeralMode,
      filenameTemplate,
      onFilesSelected,
      queue.length,
      queueToAssetMetas,
    ]
  );

  const renameProject = useCallback(
    async (projectId: string, nextName: string) => {
      const clean = nextName.trim();
      if (!clean) return;
      const target = projects.find((p) => p.id === projectId);
      if (!target) return;
      const updated = { ...target, name: clean, updatedAt: Date.now() };
      if (!ephemeralMode) await saveProjectRecord(updated);
      setProjects((prev) => prev.map((p) => (p.id === projectId ? updated : p)));
      onToast(`Renamed project to "${clean}"`);
    },
    [ephemeralMode, onToast, projects]
  );

  const togglePinProject = useCallback(
    async (projectId: string) => {
      const target = projects.find((p) => p.id === projectId);
      if (!target) return;
      const updated = { ...target, pinned: !target.pinned, updatedAt: Date.now() };
      if (!ephemeralMode) await saveProjectRecord(updated);
      setProjects((prev) =>
        prev
          .map((p) => (p.id === projectId ? updated : p))
          .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.lastOpenedAt - a.lastOpenedAt)
      );
    },
    [ephemeralMode, projects]
  );

  const duplicateProject = useCallback(
    async (projectId: string) => {
      const target = projects.find((p) => p.id === projectId);
      if (!target) return;
      const now = Date.now();
      const copy: ProjectRecord = {
        ...target,
        id: `proj-${now}-${Math.random().toString(36).slice(2, 6)}`,
        name: `${target.name} (Copy)`,
        pinned: false,
        createdAt: now,
        updatedAt: now,
        lastOpenedAt: now,
        assets: target.assets.map((a) => ({ ...a, hasCachedBlob: false })),
      };
      if (!ephemeralMode) await saveProjectRecord(copy);
      setProjects((prev) => [copy, ...prev]);
      onToast(`Duplicated "${target.name}"`);
    },
    [ephemeralMode, onToast, projects]
  );

  const removeProject = useCallback(
    async (projectId: string) => {
      await deleteProjectRecord(projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      if (activeProjectId === projectId) {
        setActiveProjectId(null);
      }
      onToast('Project deleted from local workspace');
    },
    [activeProjectId, onToast]
  );

  const exportProjectFile = useCallback(
    (projectId: string) => {
      const target = projects.find((p) => p.id === projectId);
      if (!target) return;
      const json = exportProjectBundleJson(target);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const slug = target.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project';
      a.download = `${slug}.stator.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onToast(`Exported ${slug}.stator.json`);
    },
    [onToast, projects]
  );

  const importProjectFile = useCallback(
    async (file: File): Promise<ProjectRecord | null> => {
      try {
        const text = await file.text();
        const imported = parseProjectBundleJson(text);
        if (!imported) {
          onToast('Invalid .stator.json project file.');
          return null;
        }
        if (!ephemeralMode) {
          await saveProjectRecord(imported);
        }
        setProjects((prev) => [imported, ...prev]);
        onToast(`Imported project "${imported.name}"`);
        return imported;
      } catch {
        onToast('Unable to read project JSON file.');
        return null;
      }
    },
    [ephemeralMode, onToast]
  );

  const createProjectSnapshot = useCallback(
    async (label?: string) => {
      if (!activeProject) return;
      const metas = await queueToAssetMetas(activeProject.id, queue);
      const snapLabel = label || `Snapshot · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      const updated: ProjectRecord = {
        ...activeProject,
        updatedAt: Date.now(),
        snapshots: [
          {
            id: `snap-${Date.now()}`,
            label: snapLabel,
            createdAt: Date.now(),
            assets: metas,
          },
          ...activeProject.snapshots,
        ].slice(0, 12),
      };
      if (!ephemeralMode) await saveProjectRecord(updated);
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      onToast(`Saved snapshot "${snapLabel}"`);
    },
    [activeProject, ephemeralMode, onToast, queue, queueToAssetMetas]
  );

  const restoreProjectSnapshot = useCallback(
    async (snapshotId: string) => {
      if (!activeProject) return;
      const snap = activeProject.snapshots.find((s) => s.id === snapshotId);
      if (!snap) return;
      // Restore presetSettings onto matching queue items by id or name
      setQueue((prev) =>
        prev.map((item) => {
          const match = snap.assets.find((a) => a.id === item.id || a.name === item.name);
          if (!match) return item;
          return {
            ...item,
            targetFormat: match.targetFormat,
            presetSettings: { ...DEFAULT_PRESET_SETTINGS, ...match.presetSettings },
          };
        })
      );
      onToast(`Restored snapshot "${snap.label}"`);
    },
    [activeProject, onToast, setQueue]
  );

  const clearAllProjects = useCallback(async () => {
    await clearAllProjectsAndAssets();
    setProjects([]);
    setActiveProjectId(null);
  }, []);

  return {
    projects,
    activeProject,
    activeProjectId,
    setActiveProjectId,
    saveStatus,
    refreshProjects,
    createProject,
    openProject,
    openFilesInSmartProject,
    renameProject,
    togglePinProject,
    duplicateProject,
    removeProject,
    exportProjectFile,
    importProjectFile,
    createProjectSnapshot,
    restoreProjectSnapshot,
    clearAllProjects,
  };
}
