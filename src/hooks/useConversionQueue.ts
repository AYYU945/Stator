import { useState, useEffect, useRef, useCallback } from 'react';
import JSZip from 'jszip';
import {
  QueueItem,
  FileTypeCategory,
  PresetSettings,
  DEFAULT_PRESET_SETTINGS,
  detectTypeCategory,
  formatFileSize,
  getPresetLabel,
} from '../types/queue.ts';
import { HistoryEntry } from '../types/history.ts';
import {
  loadHistoryRecords,
  saveHistoryRecord,
  deleteHistoryRecord,
  clearAllHistoryRecords,
  isEphemeralPrivacyMode,
  setEphemeralPrivacyMode,
  wipeAllLocalData,
} from '../utils/historyStorage.ts';
import {
  convertClientImage,
  calculateReductionBadge,
} from '../utils/converter.ts';
import { ffmpegManager, WasmStatus } from '../utils/ffmpegManager.ts';
import { imageWorkerPool } from '../utils/imageWorkerPool.ts';
import {
  getStoredGlobalPreset,
  saveGlobalPreset,
  globalPresetToSettings,
  settingsToGlobalPreset,
  resolutionToResizeKey,
  resizeKeyToResolution,
  decodePresetRecipeFromHash,
} from '../lib/presets.ts';
import { extractFileMetadata } from '../utils/metadataExtractor.ts';
import {
  validateIncomingFile,
  buildOutputFilename,
} from '../utils/formatCapabilities.ts';
import { generateSampleMediaFiles } from '../utils/sampleGenerator.ts';
import { applyFilenameTemplate } from '../lib/settingsStore.ts';
import { applyCompressionGoalToPreset } from '../utils/compressionEngine.ts';
import { useHistoryStack } from './useHistoryStack.ts';

export interface ConversionQueueOptions {
  filenameTemplate?: string;
  maxImageWorkers?: number;
  defaultCompressionGoal?: 'smaller' | 'balanced' | 'highest';
  defaultNormalizeAudio?: boolean;
  defaultStripMetadata?: boolean;
}

interface PresetEditAction {
  itemId: string;
  preset: PresetSettings;
}

export function useConversionQueue(options?: ConversionQueueOptions) {
  const filenameTemplate = options?.filenameTemplate || '{name}';
  const maxImageWorkers = options?.maxImageWorkers || 4;
  const defaultCompressionGoal = options?.defaultCompressionGoal || 'balanced';
  const defaultNormalizeAudio = options?.defaultNormalizeAudio ?? false;
  const defaultStripMetadata = options?.defaultStripMetadata;

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [wasmStatus, setWasmStatus] = useState<WasmStatus>('idle');
  const [wasmLoadProgress, setWasmLoadProgress] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [ephemeralMode, setEphemeralModeState] = useState<boolean>(() => isEphemeralPrivacyMode());
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const [globalPreset, setGlobalPreset] = useState<PresetSettings>(() =>
    globalPresetToSettings(getStoredGlobalPreset())
  );
  const [itemPresets, setItemPresets] = useState<Record<string, PresetSettings>>({});
  const [inspectorFileId, setInspectorFileId] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [canUndoClear, setCanUndoClear] = useState(false);

  const undoQueueRef = useRef<QueueItem[] | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const isPausedRef = useRef<boolean>(false);
  const queueRef = useRef<QueueItem[]>([]);
  queueRef.current = queue;

  const editStack = useHistoryStack<PresetEditAction>(40);

  useEffect(() => {
    imageWorkerPool.setMaxWorkers(maxImageWorkers);
  }, [maxImageWorkers]);

  const computeFormattedOutputName = useCallback(
    (sourceName: string, targetFormat: string, resolution?: string) => {
      if (filenameTemplate && filenameTemplate !== '{name}') {
        return applyFilenameTemplate(sourceName, targetFormat, filenameTemplate, resolution);
      }
      return buildOutputFilename(sourceName, targetFormat);
    },
    [filenameTemplate]
  );

  const revokeQueueUrls = (items: QueueItem[]) => {
    items.forEach((item) => {
      if (item.outputUrl && item.outputUrl.startsWith('blob:')) {
        URL.revokeObjectURL(item.outputUrl);
      }
      if (
        item.previewUrl &&
        item.previewUrl.startsWith('blob:') &&
        item.previewUrl !== item.outputUrl
      ) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
  };

  const showToast = useCallback((message: string, allowUndo = false) => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    if (!allowUndo && undoQueueRef.current) {
      revokeQueueUrls(undoQueueRef.current);
      undoQueueRef.current = null;
    }
    setToastMessage(message);
    setCanUndoClear(allowUndo);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
      setCanUndoClear(false);
      if (undoQueueRef.current) {
        revokeQueueUrls(undoQueueRef.current);
        undoQueueRef.current = null;
      }
    }, allowUndo ? 5000 : 3500);
  }, []);

  // Synchronize ready items with GlobalPreset changes
  useEffect(() => {
    const syncWithGlobalPreset = () => {
      const currentGlobal = getStoredGlobalPreset();
      const settings = globalPresetToSettings(currentGlobal);
      setGlobalPreset(settings);

      setQueue((prev) =>
        prev.map((item) => {
          if (item.status !== 'ready') return item;
          const resizeKey = resolutionToResizeKey(currentGlobal.targetResolution);
          const updatedSettings: PresetSettings = {
            ...(item.presetSettings || settings),
            imageQuality: currentGlobal.imageQuality,
            imageResize: resizeKey,
            videoResolution: resizeKey === 'custom' ? 'original' : (resizeKey as any),
            stripMetadata: currentGlobal.stripExif,
          };
          return {
            ...item,
            quality: currentGlobal.imageQuality,
            resolution: currentGlobal.targetResolution,
            stripExif: currentGlobal.stripExif,
            presetSettings: updatedSettings,
            preset: getPresetLabel(updatedSettings, item.typeCategory),
          };
        })
      );
    };

    syncWithGlobalPreset();
    window.addEventListener('stator_preset_changed', syncWithGlobalPreset);
    window.addEventListener('omniconvert_preset_changed', syncWithGlobalPreset);
    window.addEventListener('storage', syncWithGlobalPreset);
    return () => {
      window.removeEventListener('stator_preset_changed', syncWithGlobalPreset);
      window.removeEventListener('omniconvert_preset_changed', syncWithGlobalPreset);
      window.removeEventListener('storage', syncWithGlobalPreset);
    };
  }, []);

  useEffect(() => {
    loadHistoryRecords().then((records) => {
      setHistory(records);
    });
  }, []);

  useEffect(() => {
    const unsubStatus = ffmpegManager.subscribe((status) => setWasmStatus(status));
    const unsubProg = ffmpegManager.subscribeLoadProgress((msg) => setWasmLoadProgress(msg));
    return () => {
      unsubStatus();
      unsubProg();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const recipe = decodePresetRecipeFromHash(window.location.hash);
    if (!recipe) return;

    const merged: PresetSettings = {
      ...DEFAULT_PRESET_SETTINGS,
      ...recipe.settings,
    };
    const newGlobal = settingsToGlobalPreset(merged);
    saveGlobalPreset(newGlobal);
    setGlobalPreset(merged);
    showToast(`Loaded shared preset: ${recipe.name || 'Creator Recipe'}`);
  }, [showToast]);

  const recordHistory = useCallback(
    (item: QueueItem, updates: Partial<QueueItem>) => {
      if (ephemeralMode) return;
      const originalBytes = item.sizeBytes || 0;
      const outputBytes = updates.outputSizeBytes || 0;
      const savingsPercent =
        originalBytes > 0 && outputBytes > 0
          ? Math.max(0, Math.round(((originalBytes - outputBytes) / originalBytes) * 100))
          : 0;

      const newRecord: HistoryEntry = {
        id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        originalName: item.name,
        convertedName:
          updates.outputName ||
          item.outputName ||
          computeFormattedOutputName(item.name, item.targetFormat, item.resolution),
        originalSizeFormatted: item.sizeFormatted,
        outputSizeFormatted: updates.outputSizeFormatted || formatFileSize(outputBytes),
        savingsPercent,
        typeCategory: item.typeCategory,
        timestamp: Date.now(),
        outputBlobUrl: updates.outputUrl,
        blob: updates.outputBlob,
      };

      void saveHistoryRecord(newRecord);
      setHistory((prev) => [newRecord, ...prev.filter((r) => r.id !== newRecord.id)]);
    },
    [ephemeralMode, computeFormattedOutputName]
  );

  const handleToggleEphemeralMode = useCallback(
    async (enabled: boolean) => {
      setEphemeralPrivacyMode(enabled);
      setEphemeralModeState(enabled);
      if (enabled) {
        await clearAllHistoryRecords();
        setHistory([]);
        showToast('Ephemeral Privacy Mode enabled — history will not persist');
      } else {
        showToast('Persistent IndexedDB history enabled');
      }
    },
    [showToast]
  );

  const handleDeleteHistoryEntry = useCallback(async (id: string) => {
    await deleteHistoryRecord(id);
    setHistory((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const handleClearAllHistory = useCallback(async () => {
    await clearAllHistoryRecords();
    setHistory([]);
  }, []);

  const handleWipeAllData = useCallback(async () => {
    await wipeAllLocalData();
    setHistory([]);
    setEphemeralModeState(false);
    const resetGlobal = globalPresetToSettings(getStoredGlobalPreset());
    setGlobalPreset(resetGlobal);
    showToast('All local IndexedDB & browser preferences wiped');
  }, [showToast]);

  const handleFilesSelected = useCallback(
    (incomingFiles: File[], openSingleInspector = true): QueueItem[] => {
      if (!incomingFiles || incomingFiles.length === 0) return [];

      const currentGlobalPreset = getStoredGlobalPreset();
      const globalSettings = globalPresetToSettings(currentGlobalPreset);
      const acceptedItems: QueueItem[] = [];
      const rejectedReasons: string[] = [];

      for (const file of incomingFiles) {
        const validation = validateIncomingFile(file);
        if (!validation.valid) {
          rejectedReasons.push(validation.reason || `Unsupported file: ${file.name}`);
          continue;
        }

        const { typeCategory, formatBadge, defaultTarget } = detectTypeCategory(file);
        const id =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const sizeFormatted = formatFileSize(file.size);
        const resizeKey = resolutionToResizeKey(currentGlobalPreset.targetResolution);
        const stripMeta =
          typeof defaultStripMetadata === 'boolean'
            ? defaultStripMetadata
            : currentGlobalPreset.stripExif;
        const baseSettings: PresetSettings = {
          ...globalSettings,
          imageQuality: currentGlobalPreset.imageQuality,
          imageResize: resizeKey,
          videoResolution: resizeKey === 'custom' ? 'original' : (resizeKey as any),
          stripMetadata: stripMeta,
          normalizeAudio: defaultNormalizeAudio,
        };
        const smartPresetSettings = applyCompressionGoalToPreset(
          baseSettings,
          defaultCompressionGoal,
          typeCategory
        );

        acceptedItems.push({
          id,
          file,
          name: file.name,
          sizeFormatted,
          sizeBytes: file.size,
          typeCategory,
          formatBadge,
          metadata: file.type || `${typeCategory.toUpperCase()} asset`,
          technicalTag: sizeFormatted,
          targetFormat: defaultTarget,
          quality: smartPresetSettings.imageQuality,
          resolution: currentGlobalPreset.targetResolution,
          stripExif: stripMeta,
          preset: getPresetLabel(smartPresetSettings, typeCategory),
          presetSettings: smartPresetSettings,
          status: 'ready',
          progress: 0,
          outputName: computeFormattedOutputName(file.name, defaultTarget),
          warningMessage: validation.warning,
          previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
          needsReconnect: false,
        });
      }

      if (rejectedReasons.length > 0) {
        showToast(rejectedReasons[0]);
      }
      if (acceptedItems.length === 0) return [];

      setQueue((prev) => [...prev, ...acceptedItems]);

      const hasMediaStream = acceptedItems.some(
        (item) => item.typeCategory === 'video' || item.typeCategory === 'audio'
      );
      if (hasMediaStream) {
        ffmpegManager.load().catch((err) => {
          console.warn('WASM warmup notice:', err);
        });
      }

      acceptedItems.forEach((item) => {
        if (!item.file) return;
        extractFileMetadata(item.file).then((meta) => {
          setQueue((prev) =>
            prev.map((i) =>
              i.id === item.id
                ? {
                    ...i,
                    dimensions: meta.dimensions || i.dimensions,
                    duration: meta.duration || i.duration,
                    durationSeconds: meta.durationSeconds || i.durationSeconds,
                    technicalTag: meta.technicalTag,
                  }
                : i
            )
          );
        });
      });

      if (openSingleInspector && acceptedItems.length === 1) {
        setInspectorFileId(acceptedItems[0].id);
      }
      return acceptedItems;
    },
    [
      showToast,
      computeFormattedOutputName,
      defaultCompressionGoal,
      defaultNormalizeAudio,
      defaultStripMetadata,
    ]
  );

  const handleReconnectItemFile = useCallback(
    (itemId: string, file: File) => {
      const validation = validateIncomingFile(file);
      if (!validation.valid) {
        showToast(validation.reason || `Cannot reconnect unsupported file ${file.name}`);
        return;
      }
      setQueue((prev) =>
        prev.map((item) => {
          if (item.id !== itemId) return item;
          const previewUrl = file.type.startsWith('image/')
            ? URL.createObjectURL(file)
            : item.previewUrl;
          return {
            ...item,
            file,
            name: file.name,
            sizeBytes: file.size,
            sizeFormatted: formatFileSize(file.size),
            previewUrl,
            needsReconnect: false,
            errorMessage: undefined,
            status: 'ready',
          };
        })
      );
      extractFileMetadata(file).then((meta) => {
        setQueue((prev) =>
          prev.map((i) =>
            i.id === itemId
              ? {
                  ...i,
                  dimensions: meta.dimensions || i.dimensions,
                  duration: meta.duration || i.duration,
                  durationSeconds: meta.durationSeconds || i.durationSeconds,
                  technicalTag: meta.technicalTag,
                }
              : i
          )
        );
      });
      showToast(`Reconnected ${file.name}`);
    },
    [showToast]
  );

  const handleLoadSampleFiles = useCallback(async () => {
    try {
      const sampleFiles = await generateSampleMediaFiles();
      const items = handleFilesSelected(sampleFiles, false);
      showToast('Loaded 3 local sample files (PNG & WAV)');
      return items;
    } catch (err: any) {
      showToast(err?.message || 'Unable to synthesize sample files');
      return [];
    }
  }, [handleFilesSelected, showToast]);

  const handleRemoveItem = useCallback((id: string) => {
    const controller = abortControllersRef.current.get(id);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(id);
    }
    setQueue((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) {
        revokeQueueUrls([target]);
      }
      return prev.filter((item) => item.id !== id);
    });
  }, []);

  const handleReorderItem = useCallback((id: string, direction: 'up' | 'down') => {
    setQueue((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx === -1) return prev;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(idx, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
  }, []);

  const handleClearQueue = useCallback(() => {
    if (queueRef.current.length === 0) return;
    abortControllersRef.current.forEach((c) => c.abort());
    abortControllersRef.current.clear();

    const snapshot = queueRef.current;
    undoQueueRef.current = snapshot;
    setQueue([]);
    editStack.clearHistory();
    showToast(
      `Cleared ${snapshot.length} item${snapshot.length === 1 ? '' : 's'} from queue`,
      true
    );
  }, [showToast, editStack]);

  const handleUndoClearQueue = useCallback(() => {
    if (!undoQueueRef.current) return;
    setQueue(undoQueueRef.current);
    undoQueueRef.current = null;
    setToastMessage(null);
    setCanUndoClear(false);
  }, []);

  const handleUpdateTargetFormat = useCallback(
    (id: string, targetFormat: string) => {
      setQueue((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          return {
            ...item,
            targetFormat,
            outputName: computeFormattedOutputName(item.name, targetFormat, item.resolution),
          };
        })
      );
    },
    [computeFormattedOutputName]
  );

  const handleBatchUpdateFormat = useCallback(
    (category: FileTypeCategory, targetFormat: string) => {
      let count = 0;
      setQueue((prev) =>
        prev.map((item) => {
          if (item.typeCategory !== category || item.status !== 'ready') return item;
          count += 1;
          return {
            ...item,
            targetFormat,
            outputName: computeFormattedOutputName(item.name, targetFormat, item.resolution),
          };
        })
      );
      if (count > 0) {
        showToast(`Updated ${count} ${category} file${count === 1 ? '' : 's'} to ${targetFormat}`);
      }
    },
    [showToast, computeFormattedOutputName]
  );

  const applyPresetMutation = useCallback(
    (id: string, settings: PresetSettings, pushToUndo: boolean, label: string = 'Edit preset') => {
      const existingItem = queueRef.current.find((i) => i.id === id);
      if (pushToUndo && existingItem) {
        const beforePreset = itemPresets[id] || existingItem.presetSettings || globalPreset;
        editStack.pushSnapshot(
          label,
          { itemId: id, preset: beforePreset },
          { itemId: id, preset: settings }
        );
      }

      setItemPresets((prev) => ({ ...prev, [id]: settings }));
      setQueue((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                presetSettings: settings,
                preset: getPresetLabel(settings, item.typeCategory),
                quality: settings.imageQuality,
                resolution: resizeKeyToResolution(
                  item.typeCategory === 'video' ? settings.videoResolution : settings.imageResize
                ),
                stripExif: settings.stripMetadata,
              }
            : item
        )
      );
    },
    [editStack, globalPreset, itemPresets]
  );

  const handleUpdatePresetSettings = useCallback(
    (id: string, settings: PresetSettings, label: string = 'Studio adjustment') => {
      applyPresetMutation(id, settings, true, label);
    },
    [applyPresetMutation]
  );

  const handleUndoEdit = useCallback(() => {
    const entry = editStack.undo();
    if (!entry) return;
    applyPresetMutation(entry.before.itemId, entry.before.preset, false);
    showToast(`Undid: ${entry.label}`);
  }, [editStack, applyPresetMutation, showToast]);

  const handleRedoEdit = useCallback(() => {
    const entry = editStack.redo();
    if (!entry) return;
    applyPresetMutation(entry.after.itemId, entry.after.preset, false);
    showToast(`Redid: ${entry.label}`);
  }, [editStack, applyPresetMutation, showToast]);

  const handleApplyPreset = useCallback(
    (settings: PresetSettings, itemId: string | null) => {
      if (itemId === null) {
        const newGlobal = settingsToGlobalPreset(settings);
        saveGlobalPreset(newGlobal);
        setGlobalPreset(settings);

        setQueue((prev) =>
          prev.map((item) => {
            if (item.status !== 'ready') return item;
            const resizeKey = resolutionToResizeKey(newGlobal.targetResolution);
            const updatedSettings: PresetSettings = {
              ...(item.presetSettings || settings),
              ...settings,
              imageQuality: newGlobal.imageQuality,
              imageResize: resizeKey,
              videoResolution:
                settings.videoResolution || (resizeKey === 'custom' ? 'original' : (resizeKey as any)),
              stripMetadata: newGlobal.stripExif,
            };
            return {
              ...item,
              quality: newGlobal.imageQuality,
              resolution: newGlobal.targetResolution,
              stripExif: newGlobal.stripExif,
              presetSettings: updatedSettings,
              preset: getPresetLabel(updatedSettings, item.typeCategory),
            };
          })
        );

        showToast('Global preset applied');
      } else {
        handleUpdatePresetSettings(itemId, settings, 'Apply preset');
        showToast('Preset applied');
      }
    },
    [handleUpdatePresetSettings, showToast]
  );

  const handleSplitItemSegment = useCallback(
    (itemId: string, splitSec: number) => {
      const target = queueRef.current.find((i) => i.id === itemId);
      if (!target || !target.durationSeconds || splitSec <= 0.2 || splitSec >= target.durationSeconds - 0.2) {
        showToast('Move the playhead cleanly inside the clip before splitting.');
        return;
      }
      const roundedSplit = Number(splitSec.toFixed(2));
      const basePreset = target.presetSettings || globalPreset;
      const origStart = basePreset.trimStart ?? 0;
      const origEnd = basePreset.trimEnd ?? target.durationSeconds;
      if (roundedSplit <= origStart + 0.1 || roundedSplit >= origEnd - 0.1) {
        showToast('Split point must lie between current In and Out trim markers.');
        return;
      }

      const part1Preset: PresetSettings = { ...basePreset, trimStart: origStart, trimEnd: roundedSplit };
      const part2Preset: PresetSettings = { ...basePreset, trimStart: roundedSplit, trimEnd: origEnd };
      const stem = target.name.replace(/\.[^/.]+$/, '');
      const ext = target.name.split('.').pop() || 'mp4';

      const secondClip: QueueItem = {
        ...target,
        id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: `${stem}_part2.${ext}`,
        outputName: computeFormattedOutputName(`${stem}_part2.${ext}`, target.targetFormat, target.resolution),
        presetSettings: part2Preset,
        preset: getPresetLabel(part2Preset, target.typeCategory),
        status: 'ready',
        progress: 0,
        outputBlob: undefined,
        outputUrl: undefined,
      };

      setQueue((prev) => {
        const idx = prev.findIndex((i) => i.id === itemId);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          name: `${stem}_part1.${ext}`,
          outputName: computeFormattedOutputName(`${stem}_part1.${ext}`, target.targetFormat, target.resolution),
          presetSettings: part1Preset,
          preset: getPresetLabel(part1Preset, target.typeCategory),
        };
        updated.splice(idx + 1, 0, secondClip);
        return updated;
      });
      showToast(`Split clip at ${roundedSplit.toFixed(1)}s into 2 non-destructive parts`);
    },
    [globalPreset, computeFormattedOutputName, showToast]
  );

  const handleMergeClips = useCallback(
    async (itemIds: string[], mode: 'video' | 'audio', targetFormat: string) => {
      const files = itemIds
        .map((id) => queueRef.current.find((i) => i.id === id)?.file)
        .filter((f): f is File => Boolean(f));
      if (files.length < 2) {
        showToast('Select at least 2 active files in memory to merge.');
        return null;
      }
      const res = await ffmpegManager.mergeMediaClips(files, mode, targetFormat);
      const mergedFile = new File([res.blob], res.outputName, { type: res.blob.type });
      handleFilesSelected([mergedFile], true);
      showToast(`Merged ${files.length} clips into ${res.outputName}`);
      return res;
    },
    [handleFilesSelected, showToast]
  );

  const handleReplaceVideoAudio = useCallback(
    async (itemId: string, audioFile: File) => {
      const target = queueRef.current.find((i) => i.id === itemId);
      if (!target || !target.file || target.typeCategory !== 'video') {
        showToast('Select a video with source media loaded to replace audio.');
        return;
      }
      const out = await ffmpegManager.replaceVideoAudio(target.file, audioFile, 'MP4');
      const { badge } = calculateReductionBadge(target.file.size, out.sizeBytes);
      setQueue((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? {
                ...i,
                status: 'completed',
                progress: 100,
                outputBlob: out.blob,
                outputUrl: out.url,
                outputName: out.outputName,
                outputSizeBytes: out.sizeBytes,
                outputSizeFormatted: formatFileSize(out.sizeBytes),
                reductionBadge: badge,
              }
            : i
        )
      );
      showToast(`Replaced audio track on ${target.name}`);
    },
    [showToast]
  );

  const processItemConversion = useCallback(
    async (item: QueueItem, signal: AbortSignal): Promise<Partial<QueueItem>> => {
      if (!item.file) {
        return {
          status: 'error',
          progress: 0,
          needsReconnect: true,
          errorMessage: 'Source media is not cached locally. Use Reconnect Source File to attach it.',
        };
      }

      const effectivePreset = item.presetSettings || itemPresets[item.id] || globalPreset;
      const outName = computeFormattedOutputName(item.name, item.targetFormat, item.resolution);

      if (item.typeCategory === 'image') {
        try {
          const startedAt = performance.now();
          const result = await convertClientImage(
            item.file,
            item.targetFormat,
            effectivePreset,
            signal,
            item.id
          );
          const { badge } = calculateReductionBadge(item.file.size, result.sizeBytes);
          const elapsedSec = ((performance.now() - startedAt) / 1000).toFixed(1);

          return {
            status: 'completed',
            progress: 100,
            outputBlob: result.blob,
            outputUrl: result.url,
            outputName: outName,
            outputSizeBytes: result.sizeBytes,
            outputSizeFormatted: formatFileSize(result.sizeBytes),
            reductionBadge: badge,
            outputDimensions: `${result.width} × ${result.height}`,
            conversionTime: `${elapsedSec}s`,
            workers: 1,
            errorMessage: undefined,
          };
        } catch (err: any) {
          if (err?.name === 'AbortError' || signal.aborted) {
            return { status: 'ready', progress: 0, speed: undefined, eta: undefined };
          }
          return {
            status: 'error',
            errorMessage: err?.message || 'Failed to encode image output.',
            progress: 0,
          };
        }
      }

      if (item.typeCategory === 'video' || item.typeCategory === 'audio') {
        try {
          const transcodeResult = await ffmpegManager.transcodeMedia(
            item.file,
            item.targetFormat,
            (progress, telemetry) => {
              if (signal.aborted) return;
              setQueue((prev) =>
                prev.map((i) =>
                  i.id === item.id && i.status === 'converting'
                    ? {
                        ...i,
                        progress,
                        speed: telemetry?.speed || i.speed,
                        eta: telemetry?.eta || i.eta,
                        workers: telemetry?.workers || i.workers,
                      }
                    : i
                )
              );
            },
            effectivePreset,
            signal,
            item.durationSeconds
          );

          return {
            status: 'completed',
            progress: 100,
            outputBlob: transcodeResult.blob,
            outputUrl: transcodeResult.url,
            outputName: outName || transcodeResult.outputName,
            outputSizeBytes: transcodeResult.sizeBytes,
            outputSizeFormatted: formatFileSize(transcodeResult.sizeBytes),
            reductionBadge: transcodeResult.reductionBadge,
            conversionTime: transcodeResult.duration,
            streamMetadata: transcodeResult.streamMetadata,
            codecDetail: item.targetFormat.toUpperCase().includes('MP4')
              ? `H.264 / AAC (${effectivePreset.videoBitrate.toUpperCase()})`
              : `${item.targetFormat} Engine`,
            errorMessage: undefined,
          };
        } catch (err: any) {
          if (err?.name === 'AbortError' || signal.aborted) {
            return { status: 'ready', progress: 0, speed: undefined, eta: undefined };
          }
          return {
            status: 'error',
            errorMessage: err?.message || 'Failed to transcode media stream.',
            progress: 0,
          };
        }
      }

      return {
        status: 'error',
        progress: 0,
        errorMessage: `Unsupported media category "${item.typeCategory}".`,
      };
    },
    [globalPreset, itemPresets, computeFormattedOutputName]
  );

  const runSingleItem = useCallback(
    async (
      id: string,
      overrideFormat?: string,
      overrideSettings?: PresetSettings
    ) => {
      if (overrideSettings) {
        setItemPresets((prev) => ({ ...prev, [id]: overrideSettings }));
      }

      const existing = queueRef.current.find((i) => i.id === id);
      if (!existing) return;

      const targetFormat = overrideFormat || existing.targetFormat;
      const presetSettings = overrideSettings || existing.presetSettings || globalPreset;
      const updatedItem: QueueItem = {
        ...existing,
        targetFormat,
        presetSettings,
        preset: getPresetLabel(presetSettings, existing.typeCategory),
        outputName: computeFormattedOutputName(existing.name, targetFormat, existing.resolution),
        status: 'converting',
        errorMessage: undefined,
        progress: existing.typeCategory === 'image' ? 25 : 5,
        speed: 'Starting...',
        eta: 'Calculating...',
        workers:
          existing.typeCategory === 'image'
            ? 1
            : ffmpegManager.getAllocatedThreads(),
      };

      const controller = new AbortController();
      abortControllersRef.current.set(id, controller);

      setQueue((prev) => prev.map((i) => (i.id === id ? updatedItem : i)));

      const updates = await processItemConversion(updatedItem, controller.signal);
      abortControllersRef.current.delete(id);

      setQueue((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));

      if (updates.status === 'completed') {
        recordHistory(updatedItem, updates);
      }
    },
    [globalPreset, processItemConversion, recordHistory, computeFormattedOutputName]
  );

  const handleCancelConversion = useCallback((id: string) => {
    const controller = abortControllersRef.current.get(id);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(id);
    }
    imageWorkerPool.cancelJob(id);
    setQueue((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: 'ready', progress: 0, speed: undefined, eta: undefined }
          : item
      )
    );
  }, []);

  const handleTogglePause = useCallback(() => {
    isPausedRef.current = !isPausedRef.current;
    setIsPaused(isPausedRef.current);
  }, []);

  const handleConvertAll = useCallback(async () => {
    isPausedRef.current = false;
    setIsPaused(false);

    const pending = queueRef.current.filter(
      (item) => (item.status === 'ready' || item.status === 'error') && !item.needsReconnect
    );
    if (pending.length === 0) return;

    const imageItems = pending.filter((i) => i.typeCategory === 'image');
    const avItems = pending.filter((i) => i.typeCategory !== 'image');

    const concurrency = imageWorkerPool.getPoolSize();
    let imageIdx = 0;
    const runNextImage = async (): Promise<void> => {
      while (imageIdx < imageItems.length) {
        if (isPausedRef.current) return;
        const item = imageItems[imageIdx++];
        await runSingleItem(item.id);
      }
    };

    if (imageItems.length > 0) {
      await Promise.all(
        Array.from({ length: Math.min(concurrency, imageItems.length) }, () => runNextImage())
      );
    }

    for (const item of avItems) {
      if (isPausedRef.current) break;
      await runSingleItem(item.id);
    }
  }, [runSingleItem]);

  const exportOutputsZip = useCallback(
    async (itemIds?: string[]) => {
      const candidates = queueRef.current.filter(
        (i) => i.status === 'completed' && i.outputBlob && (!itemIds || itemIds.includes(i.id))
      );
      if (candidates.length === 0) {
        showToast('No completed exports ready to bundle.');
        return;
      }
      const zip = new JSZip();
      for (const item of candidates) {
        const name = item.outputName || computeFormattedOutputName(item.name, item.targetFormat);
        zip.file(name, await item.outputBlob!.arrayBuffer());
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stator_exports_${candidates.length}_files.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Exported ${candidates.length} file${candidates.length === 1 ? '' : 's'} as ZIP`);
    },
    [computeFormattedOutputName, showToast]
  );

  const exportOutputsToFolder = useCallback(
    async (itemIds?: string[]) => {
      const candidates = queueRef.current.filter(
        (i) => i.status === 'completed' && i.outputBlob && (!itemIds || itemIds.includes(i.id))
      );
      if (candidates.length === 0) {
        showToast('No completed exports ready to save.');
        return;
      }

      const picker = (window as any).showDirectoryPicker;
      if (typeof picker !== 'function') {
        showToast('Directory Picker unavailable in this browser — packaging ZIP instead.');
        await exportOutputsZip(itemIds);
        return;
      }

      try {
        const dirHandle = await picker({ mode: 'readwrite' });
        for (const item of candidates) {
          const fileName = item.outputName || computeFormattedOutputName(item.name, item.targetFormat);
          const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(item.outputBlob!);
          await writable.close();
        }
        showToast(`Saved ${candidates.length} converted file${candidates.length === 1 ? '' : 's'} to folder`);
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        showToast('Folder write declined — falling back to ZIP download.');
        await exportOutputsZip(itemIds);
      }
    },
    [computeFormattedOutputName, exportOutputsZip, showToast]
  );

  return {
    queue,
    setQueue,
    wasmStatus,
    wasmLoadProgress,
    history,
    ephemeralMode,
    isPaused,
    globalPreset,
    itemPresets,
    inspectorFileId,
    setInspectorFileId,
    toastMessage,
    canUndoClear,
    showToast,
    canUndoEdit: editStack.canUndo,
    canRedoEdit: editStack.canRedo,
    undoEditLabel: editStack.undoLabel,
    redoEditLabel: editStack.redoLabel,
    clearEditHistory: editStack.clearHistory,
    handleUndoEdit,
    handleRedoEdit,
    handleToggleEphemeralMode,
    handleDeleteHistoryEntry,
    handleClearAllHistory,
    handleWipeAllData,
    handleFilesSelected,
    handleReconnectItemFile,
    handleLoadSampleFiles,
    handleRemoveItem,
    handleReorderItem,
    handleClearQueue,
    handleUndoClearQueue,
    handleUpdateTargetFormat,
    handleBatchUpdateFormat,
    handleUpdatePresetSettings,
    handleApplyPreset,
    handleSplitItemSegment,
    handleMergeClips,
    handleReplaceVideoAudio,
    handleStartConversion: runSingleItem,
    handleCancelConversion,
    handleTogglePause,
    handleConvertAll,
    exportOutputsZip,
    exportOutputsToFolder,
  };
}
