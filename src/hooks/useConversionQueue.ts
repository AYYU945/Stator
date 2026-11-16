import { useState, useEffect, useRef, useCallback } from 'react';
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

export function useConversionQueue() {
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

  // Load history records on mount (empty state when clean)
  useEffect(() => {
    loadHistoryRecords().then((records) => {
      setHistory(records);
    });
  }, []);

  // Subscribe to FFmpeg status & load progress without blocking initial idle render
  useEffect(() => {
    const unsubStatus = ffmpegManager.subscribe((status) => setWasmStatus(status));
    const unsubProg = ffmpegManager.subscribeLoadProgress((msg) => setWasmLoadProgress(msg));
    return () => {
      unsubStatus();
      unsubProg();
    };
  }, []);

  // Decode #preset= shared link on mount
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
          buildOutputFilename(item.name, item.targetFormat),
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
    [ephemeralMode]
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
    (incomingFiles: File[], openSingleInspector = true) => {
      if (!incomingFiles || incomingFiles.length === 0) return;

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
        const smartPresetSettings: PresetSettings = {
          ...globalSettings,
          imageQuality: currentGlobalPreset.imageQuality,
          imageResize: resizeKey,
          videoResolution: resizeKey === 'custom' ? 'original' : (resizeKey as any),
          stripMetadata: currentGlobalPreset.stripExif,
        };

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
          quality: currentGlobalPreset.imageQuality,
          resolution: currentGlobalPreset.targetResolution,
          stripExif: currentGlobalPreset.stripExif,
          preset: getPresetLabel(smartPresetSettings, typeCategory),
          presetSettings: smartPresetSettings,
          status: 'ready',
          progress: 0,
          outputName: buildOutputFilename(file.name, defaultTarget),
          warningMessage: validation.warning,
          previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        });
      }

      if (rejectedReasons.length > 0) {
        showToast(rejectedReasons[0]);
      }
      if (acceptedItems.length === 0) return;

      setQueue((prev) => [...prev, ...acceptedItems]);

      // Warm up local FFmpeg WASM only if video or audio assets were staged
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
    },
    [showToast]
  );

  const handleLoadSampleFiles = useCallback(async () => {
    try {
      const sampleFiles = await generateSampleMediaFiles();
      handleFilesSelected(sampleFiles, false);
      showToast('Loaded 3 local sample files (PNG & WAV)');
    } catch (err: any) {
      showToast(err?.message || 'Unable to synthesize sample files');
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
    // Abort any running jobs first
    abortControllersRef.current.forEach((c) => c.abort());
    abortControllersRef.current.clear();

    const snapshot = queueRef.current;
    undoQueueRef.current = snapshot;
    setQueue([]);
    showToast(
      `Cleared ${snapshot.length} item${snapshot.length === 1 ? '' : 's'} from queue`,
      true
    );
  }, [showToast]);

  const handleUndoClearQueue = useCallback(() => {
    if (!undoQueueRef.current) return;
    setQueue(undoQueueRef.current);
    undoQueueRef.current = null;
    setToastMessage(null);
    setCanUndoClear(false);
  }, []);

  const handleUpdateTargetFormat = useCallback((id: string, targetFormat: string) => {
    setQueue((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          targetFormat,
          outputName: buildOutputFilename(item.name, targetFormat),
        };
      })
    );
  }, []);

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
            outputName: buildOutputFilename(item.name, targetFormat),
          };
        })
      );
      if (count > 0) {
        showToast(`Updated ${count} ${category} file${count === 1 ? '' : 's'} to ${targetFormat}`);
      }
    },
    [showToast]
  );

  const handleUpdatePresetSettings = useCallback((id: string, settings: PresetSettings) => {
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
  }, []);

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
        handleUpdatePresetSettings(itemId, settings);
        showToast('Preset applied');
      }
    },
    [handleUpdatePresetSettings, showToast]
  );

  const processItemConversion = useCallback(
    async (item: QueueItem, signal: AbortSignal): Promise<Partial<QueueItem>> => {
      if (!item.file) {
        return {
          status: 'error',
          progress: 0,
          errorMessage: 'Source file is missing from memory. Re-drop the file to convert.',
        };
      }

      const effectivePreset = item.presetSettings || itemPresets[item.id] || globalPreset;

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
            outputName: buildOutputFilename(item.name, item.targetFormat),
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
            outputName: transcodeResult.outputName,
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
    [globalPreset, itemPresets]
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
        outputName: buildOutputFilename(existing.name, targetFormat),
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
    [globalPreset, processItemConversion, recordHistory]
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
      (item) => item.status === 'ready' || item.status === 'error'
    );
    if (pending.length === 0) return;

    const imageItems = pending.filter((i) => i.typeCategory === 'image');
    const avItems = pending.filter((i) => i.typeCategory !== 'image');

    // Run parallel worker pool batch for images cleanly capped by hardware concurrency
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

    // Run audio/video strictly sequentially via FFmpeg mutex to respect WASM MEMFS bounds
    for (const item of avItems) {
      if (isPausedRef.current) break;
      await runSingleItem(item.id);
    }
  }, [runSingleItem]);

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
    handleToggleEphemeralMode,
    handleDeleteHistoryEntry,
    handleClearAllHistory,
    handleWipeAllData,
    handleFilesSelected,
    handleLoadSampleFiles,
    handleRemoveItem,
    handleReorderItem,
    handleClearQueue,
    handleUndoClearQueue,
    handleUpdateTargetFormat,
    handleBatchUpdateFormat,
    handleUpdatePresetSettings,
    handleApplyPreset,
    handleStartConversion: runSingleItem,
    handleCancelConversion,
    handleTogglePause,
    handleConvertAll,
  };
}
