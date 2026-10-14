import { useState, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Navbar } from './components/Navbar.tsx';
import { Hero } from './components/Hero.tsx';
import { DropZone } from './components/DropZone.tsx';
import { ActiveQueue } from './components/ActiveQueue.tsx';
import { PresetModal } from './components/PresetModal.tsx';
import { MediaInspectorModal } from './components/MediaInspectorModal.tsx';
import { HistoryDrawer } from './components/HistoryDrawer.tsx';
import { FaqSection } from './components/FaqSection.tsx';
import { StatusFooter } from './components/StatusFooter.tsx';
import { PrivacyPolicy } from './components/PrivacyPolicy.tsx';
import { TermsOfService } from './components/TermsOfService.tsx';
import {
  QueueItem,
  formatFileSize,
  detectTypeCategory,
  PresetSettings,
  DEFAULT_PRESET_SETTINGS,
  getPresetLabel,
} from './types/queue.ts';
import { HistoryEntry } from './types/history.ts';
import {
  loadHistoryRecords,
  saveHistoryRecord,
  deleteHistoryRecord,
  clearAllHistoryRecords,
} from './utils/historyStorage.ts';
import {
  convertClientImage,
  calculateReductionBadge,
} from './utils/converter.ts';
import { ffmpegManager, WasmStatus } from './utils/ffmpegManager.ts';
import { useTheme, ThemeMode } from './lib/theme.ts';
import {
  getStoredGlobalPreset,
  saveGlobalPreset,
  globalPresetToSettings,
  settingsToGlobalPreset,
  resolutionToResizeKey,
  resizeKeyToResolution,
} from './lib/presets.ts';

// Initial demo queue with calibrated byte metrics matching the reference screenshots
const DEMO_QUEUE: QueueItem[] = [
  {
    id: 'demo-1',
    name: 'portrait-shoot.raw',
    sizeFormatted: '42.8 MB',
    sizeBytes: 44879053, // 42.8 MB
    typeCategory: 'image',
    formatBadge: 'SONY ARW',
    metadata: '6000 × 4000 • 14-bit Uncompressed',
    dimensions: '6000 × 4000',
    targetFormat: 'PNG',
    quality: 90,
    resolution: 'Original',
    stripExif: false,
    preset: 'Lossless (90%)',
    presetSettings: {
      ...DEFAULT_PRESET_SETTINGS,
      imageQuality: 90,
      imageResize: 'original',
      stripMetadata: false,
    },
    status: 'ready',
    progress: 0,
    outputName: 'portrait-shoot.png',
    outputSizeBytes: 26004685, // 24.8 MB
    outputSizeFormatted: '24.8 MB',
    reductionBadge: '↓ -42% (24.8 MB)',
    conversionTime: '1.1s',
  },
  {
    id: 'demo-2',
    name: 'screen-recording.mov',
    sizeFormatted: '184.2 MB',
    sizeBytes: 193147699, // 184.2 MB
    typeCategory: 'video',
    formatBadge: 'PRORES 422',
    metadata: '02:14 duration • 1080p @ 60fps',
    dimensions: '1080p @ 60fps',
    targetFormat: 'MP4',
    quality: 90,
    resolution: '1080p',
    stripExif: false,
    preset: 'H.264 High (Auto)',
    presetSettings: {
      ...DEFAULT_PRESET_SETTINGS,
      videoBitrate: 'high',
      videoResolution: '1080p',
      fpsLimiter: '60',
    },
    status: 'converting',
    progress: 68,
    speed: '24.2 MB/s',
    workers: 8,
    eta: '3s remaining',
    pass: 'Pass 1/1',
    outputName: 'screen-recording.mp4',
    outputSizeBytes: 163577856, // 156.0 MB
    outputSizeFormatted: '156.0 MB',
    reductionBadge: '↓ -15% (156 MB)',
    conversionTime: '3.1s',
    codecDetail: 'H.264 / AAC High Profile',
  },
];

export default function App() {
  const { theme, setTheme, toggleTheme } = useTheme();
  const [activeCategory, setActiveCategory] = useState('All Formats');
  const [batchMode, setBatchMode] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>(DEMO_QUEUE);
  const [wasmStatus, setWasmStatus] = useState<WasmStatus>('active');

  // History State
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);

  // Preset State Management - load persisted global preset from localStorage
  const [globalPreset, setGlobalPreset] = useState<PresetSettings>(() => {
    return globalPresetToSettings(getStoredGlobalPreset());
  });
  const [itemPresets, setItemPresets] = useState<Record<string, PresetSettings>>({});
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [activePresetItemId, setActivePresetItemId] = useState<string | null>(null);

  // Global UI Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => {
      setToastMessage((current) => (current === message ? null : current));
    }, 2800);
  };

  // Dedicated Media Inspector Modal State
  const [inspectorFileId, setInspectorFileId] = useState<string | null>(null);

  // View state for legal pages and main converter
  const [currentView, setCurrentView] = useState<'converter' | 'privacy' | 'terms'>('converter');

  // Synchronize initial queue ready items with active global preset on mount and on storage events
  useEffect(() => {
    const syncWithGlobalPreset = () => {
      const currentGlobal = getStoredGlobalPreset();
      const settings = globalPresetToSettings(currentGlobal);
      setGlobalPreset(settings);

      setQueue((prev) =>
        prev.map((item) => {
          if (item.status === 'ready') {
            const updatedSettings: PresetSettings = {
              ...(item.presetSettings || settings),
              imageQuality: currentGlobal.imageQuality,
              imageResize: resolutionToResizeKey(currentGlobal.targetResolution),
              videoResolution:
                resolutionToResizeKey(currentGlobal.targetResolution) === 'custom'
                  ? 'original'
                  : (resolutionToResizeKey(currentGlobal.targetResolution) as any),
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
          }
          return item;
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

  // Handle path-based navigation and popstate
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname.toLowerCase();
      if (path === '/privacy') {
        setCurrentView('privacy');
      } else if (path === '/terms') {
        setCurrentView('terms');
      } else {
        setCurrentView('converter');
      }
    };

    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const navigateTo = (view: 'converter' | 'privacy' | 'terms') => {
    setCurrentView(view);
    const targetPath = view === 'converter' ? '/' : `/${view}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Load persistent history records on mount
  useEffect(() => {
    loadHistoryRecords().then((records) => {
      setHistory(records);
    });
  }, []);

  // Preload and monitor FFmpeg WASM Core status
  useEffect(() => {
    const unsubscribe = ffmpegManager.subscribe((status) => {
      setWasmStatus(status);
    });

    // Initiate background load of WASM engine
    ffmpegManager.load().catch((err) => {
      console.warn('WASM engine load notice:', err);
    });

    return () => unsubscribe();
  }, []);

  // Helper to record an entry into persistent history
  const recordHistory = (item: QueueItem, updates: Partial<QueueItem>) => {
    const originalBytes = item.sizeBytes || 1048576;
    const outputBytes = updates.outputSizeBytes || Math.round(originalBytes * 0.7);
    const savingsPercent = Math.max(
      0,
      Math.round(((originalBytes - outputBytes) / originalBytes) * 100)
    );

    const newRecord: HistoryEntry = {
      id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      originalName: item.name,
      convertedName:
        updates.outputName ||
        item.outputName ||
        `${item.name.replace(/\.[^/.]+$/, '')}.${item.targetFormat.toLowerCase().split(' ')[0]}`,
      originalSizeFormatted: item.sizeFormatted,
      outputSizeFormatted: updates.outputSizeFormatted || formatFileSize(outputBytes),
      savingsPercent,
      typeCategory: item.typeCategory,
      timestamp: Date.now(),
      outputBlobUrl: updates.outputUrl,
      blob: updates.outputBlob,
    };

    saveHistoryRecord(newRecord);
    setHistory((prev) => [newRecord, ...prev.filter((r) => r.id !== newRecord.id)]);
  };

  const handleDeleteHistoryEntry = async (id: string) => {
    await deleteHistoryRecord(id);
    setHistory((prev) => prev.filter((r) => r.id !== id));
  };

  const handleClearAllHistory = async () => {
    await clearAllHistoryRecords();
    setHistory([]);
  };

  const handleOpenPresetModal = (itemId: string | null) => {
    setActivePresetItemId(itemId);
    setIsPresetModalOpen(true);
  };

  const handleApplyPreset = (settings: PresetSettings, itemId: string | null) => {
    if (itemId === null) {
      // 1. Convert settings to GlobalPreset and persist in localStorage
      const newGlobal = settingsToGlobalPreset(settings);
      saveGlobalPreset(newGlobal);
      setGlobalPreset(settings);

      // 2. Immediately update all existing queue items in ready / idle status
      setQueue((prev) =>
        prev.map((item) => {
          if (item.status === 'ready') {
            const updatedSettings: PresetSettings = {
              ...(item.presetSettings || settings),
              imageQuality: newGlobal.imageQuality,
              imageResize: resolutionToResizeKey(newGlobal.targetResolution),
              videoResolution:
                resolutionToResizeKey(newGlobal.targetResolution) === 'custom'
                  ? 'original'
                  : (resolutionToResizeKey(newGlobal.targetResolution) as any),
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
          }
          return item;
        })
      );

      // 3. Trigger UI toast feedback
      showToast('Global preset applied');
    } else {
      setItemPresets((prev) => ({ ...prev, [itemId]: settings }));
      setQueue((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                presetSettings: settings,
                preset: getPresetLabel(settings, item.typeCategory),
                quality: settings.imageQuality,
                resolution: resizeKeyToResolution(settings.imageResize || settings.videoResolution),
                stripExif: settings.stripMetadata,
              }
            : item
        )
      );
      showToast('Preset applied');
    }
  };

  // Connect Drop Zone to accept real files with smart defaults reading from globalPreset
  const handleFilesSelected = (files: File[]) => {
    const currentGlobalPreset = getStoredGlobalPreset();
    const globalSettings = globalPresetToSettings(currentGlobalPreset);

    const newItems: QueueItem[] = files.map((file) => {
      const { typeCategory } = detectTypeCategory(file);
      const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|raw|heic|arw|cr2|nef|dng|tiff?)$/i.test(file.name);
      const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|ogg|aac|flac)$/i.test(file.name);
      const defaultTarget = isImage ? 'PNG' : isAudio ? 'MP3' : 'MP4';

      const id = typeof crypto !== 'undefined' && crypto.randomUUID
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

      const estimatedOutputBytes = Math.max(1024, Math.floor(file.size * 0.65));
      const outputSizeFormatted = formatFileSize(estimatedOutputBytes);
      const { badge } = calculateReductionBadge(file.size, estimatedOutputBytes);

      return {
        id,
        file,
        name: file.name,
        sizeFormatted,
        sizeBytes: file.size,
        typeCategory,
        formatBadge: file.name.split('.').pop()?.toUpperCase() || (isImage ? 'IMG' : 'VIDEO'),
        metadata: file.type || `${typeCategory.toUpperCase()} asset`,
        targetFormat: defaultTarget,
        quality: currentGlobalPreset.imageQuality,
        resolution: currentGlobalPreset.targetResolution,
        stripExif: currentGlobalPreset.stripExif,
        preset: getPresetLabel(smartPresetSettings, typeCategory),
        presetSettings: smartPresetSettings,
        status: 'ready' as const,
        progress: 0,
        outputName: `${file.name.replace(/\.[^/.]+$/, '')}.${defaultTarget.toLowerCase().split(' ')[0]}`,
        outputSizeBytes: estimatedOutputBytes,
        outputSizeFormatted,
        reductionBadge: badge,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      };
    });

    setQueue((prev) => [...prev, ...newItems]);

    // When 1 file is dropped or selected: immediately open the inspector modal
    if (newItems.length === 1) {
      setInspectorFileId(newItems[0].id);
    }
  };

  const handleRemoveItem = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearQueue = () => {
    setQueue([]);
  };

  const handleUpdateTargetFormat = (id: string, targetFormat: string) => {
    setQueue((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const targetClean = targetFormat.toLowerCase().split(' ')[0];
        const newOutputName = `${item.name.replace(/\.[^/.]+$/, '')}.${targetClean}`;

        return {
          ...item,
          targetFormat,
          outputName: newOutputName,
        };
      })
    );
  };

  /**
   * Routes conversion according to user rules with PresetSettings hooked in
   */
  const processItemConversion = async (item: QueueItem): Promise<Partial<QueueItem>> => {
    const effectivePreset = item.presetSettings || itemPresets[item.id] || globalPreset;

    // 1. Image Routing: HTML5 Canvas
    if (item.file && item.typeCategory === 'image') {
      try {
        const result = await convertClientImage(item.file, item.targetFormat, effectivePreset);
        const { badge } = calculateReductionBadge(item.file.size, result.sizeBytes);

        return {
          status: 'completed',
          progress: 100,
          outputBlob: result.blob,
          outputUrl: result.url,
          previewUrl: result.url,
          outputSizeBytes: result.sizeBytes,
          outputSizeFormatted: formatFileSize(result.sizeBytes),
          reductionBadge: badge,
          dimensions: `${result.width} × ${result.height}`,
          conversionTime: '1.2s',
          errorMessage: undefined,
        };
      } catch (err: any) {
        console.error('Canvas conversion error:', err);
        return {
          status: 'error',
          errorMessage: err?.message || 'Image processing failed.',
          progress: 0,
        };
      }
    }

    // 2. Video & Audio Routing: FFmpeg.wasm engine
    if (item.file && (item.typeCategory === 'video' || item.typeCategory === 'audio')) {
      try {
        const transcodeResult = await ffmpegManager.transcodeMedia(
          item.file,
          item.targetFormat,
          (progress, speed) => {
            setQueue((prev) =>
              prev.map((i) =>
                i.id === item.id
                  ? {
                      ...i,
                      progress,
                      speed: speed || i.speed || '24.2 MB/s',
                    }
                  : i
              )
            );
          },
          effectivePreset
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
          conversionTime: transcodeResult.duration || '2.8s',
          codecDetail:
            item.targetFormat.toUpperCase().includes('MP4')
              ? `H.264 / AAC (${effectivePreset.videoBitrate.toUpperCase()})`
              : `${item.targetFormat} Engine`,
          errorMessage: undefined,
        };
      } catch (err: any) {
        console.error('FFmpeg transcode error:', err);
        return {
          status: 'error',
          errorMessage: err?.message || 'FFmpeg transcoding failed.',
          progress: 0,
        };
      }
    }

    // 3. Demo Mock items (item.file is undefined)
    const outputSizeBytes = item.outputSizeBytes || Math.floor((item.sizeBytes || 1048576) * 0.7);
    const { badge } = calculateReductionBadge(item.sizeBytes || 1048576, outputSizeBytes);
    const syntheticBlob = new Blob(['Stator transcoded asset'], {
      type: 'application/octet-stream',
    });

    return {
      status: 'completed',
      progress: 100,
      outputBlob: syntheticBlob,
      outputUrl: URL.createObjectURL(syntheticBlob),
      outputSizeBytes,
      outputSizeFormatted: formatFileSize(outputSizeBytes),
      reductionBadge: item.reductionBadge || badge,
      conversionTime: item.conversionTime || '2.4s',
      errorMessage: undefined,
    };
  };

  const handleStartConversion = async (
    id: string,
    overrideFormat?: string,
    overrideSettings?: PresetSettings
  ) => {
    if (overrideSettings) {
      setItemPresets((prev) => ({ ...prev, [id]: overrideSettings }));
    }

    setQueue((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const targetFormat = overrideFormat || i.targetFormat;
        const presetSettings = overrideSettings || i.presetSettings || globalPreset;
        const cleanExt = targetFormat.toLowerCase().split(' ')[0];
        const newOutputName = `${i.name.replace(/\.[^/.]+$/, '')}.${cleanExt}`;

        return {
          ...i,
          targetFormat,
          presetSettings,
          preset: getPresetLabel(presetSettings, i.typeCategory),
          outputName: newOutputName,
          status: 'ready',
          errorMessage: undefined,
          progress: 0,
        };
      })
    );

    setTimeout(async () => {
      let currentItem: QueueItem | undefined;
      setQueue((prev) => {
        currentItem = prev.find((i) => i.id === id);
        return prev.map((i) =>
          i.id === id
            ? {
                ...i,
                status: 'converting',
                progress: 20,
                speed: '28.2 MB/s',
                workers: 8,
                eta: '2s remaining',
              }
            : i
        );
      });

      if (!currentItem) return;

      const itemToProcess: QueueItem = {
        ...currentItem,
        targetFormat: overrideFormat || currentItem.targetFormat,
        presetSettings: overrideSettings || currentItem.presetSettings || globalPreset,
      };

      const updates = await processItemConversion(itemToProcess);
      setQueue((prev) =>
        prev.map((i) => (i.id === id ? { ...i, ...updates } : i))
      );

      if (updates.status === 'completed') {
        recordHistory(itemToProcess, updates);
      }
    }, 60);
  };

  const handleCancelConversion = (id: string) => {
    setQueue((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'ready', progress: 0 } : item
      )
    );
  };

  const handleConvertAll = async () => {
    const itemsToProcess = queue.filter(
      (item) => item.status === 'ready' || item.status === 'error'
    );
    if (itemsToProcess.length === 0) return;

    // Concurrently process items based on hardwareConcurrency
    const maxConcurrency = Math.max(2, Math.min(4, navigator.hardwareConcurrency || 4));
    let activeIndex = 0;

    const runWorker = async () => {
      while (activeIndex < itemsToProcess.length) {
        const item = itemsToProcess[activeIndex++];
        if (!item) break;

        // Mark as converting in state
        setQueue((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  status: 'converting',
                  progress: 25,
                  speed: '34.8 MB/s',
                  workers: maxConcurrency,
                }
              : i
          )
        );

        const updates = await processItemConversion(item);
        setQueue((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, ...updates } : i))
        );

        if (updates.status === 'completed') {
          recordHistory(item, updates);
        }
      }
    };

    const workers = Array.from({ length: maxConcurrency }, () => runWorker());
    await Promise.all(workers);
  };

  const handleLoadDemoQueue = () => {
    setQueue(DEMO_QUEUE);
  };

  const activeTargetItem = activePresetItemId
    ? queue.find((i) => i.id === activePresetItemId)
    : null;

  return (
    <div className="min-h-screen bg-[#f4f4f5] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-zinc-200 dark:selection:bg-zinc-800 selection:text-zinc-900 dark:selection:text-white">
      {/* Responsive Top Navbar */}
      <Navbar
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        batchMode={batchMode}
        onToggleBatchMode={() => setBatchMode(!batchMode)}
        historyCount={history.length}
        isHistoryOpen={isHistoryDrawerOpen}
        onOpenHistory={() => setIsHistoryDrawerOpen(true)}
        wasmStatus={wasmStatus}
        onOpenPresets={() => handleOpenPresetModal(null)}
        theme={theme}
        onThemeChange={setTheme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content Area or Legal View */}
      {currentView === 'privacy' ? (
        <main className="flex-1 w-full pb-20">
          <PrivacyPolicy onBack={() => navigateTo('converter')} />
        </main>
      ) : currentView === 'terms' ? (
        <main className="flex-1 w-full pb-20">
          <TermsOfService onBack={() => navigateTo('converter')} />
        </main>
      ) : (
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-28 sm:pb-16 flex flex-col items-center">
          {/* Hero Section */}
          <Hero />

          {/* Responsive Drop Zone Card centered directly beneath subtitle */}
          <DropZone onFilesSelected={handleFilesSelected} />

          {/* Responsive Active Queue Component */}
          <ActiveQueue
            queue={queue}
            totalQueueCount={queue.length}
            activeCategory="All Formats"
            onResetCategory={() => {}}
            onRemoveItem={handleRemoveItem}
            onClearQueue={handleClearQueue}
            onUpdateTargetFormat={handleUpdateTargetFormat}
            onStartConversion={handleStartConversion}
            onCancelConversion={handleCancelConversion}
            onConvertAll={handleConvertAll}
            onConvertMore={() => {
              const input = document.querySelector('input[type="file"]') as HTMLInputElement;
              input?.click();
            }}
            onLoadDemoQueue={handleLoadDemoQueue}
            globalPreset={globalPreset}
            onOpenPresetModal={handleOpenPresetModal}
            onOpenInspector={(id) => setInspectorFileId(id)}
          />

          {/* Minimalist Collapsible FAQ Accordion */}
          <FaqSection />
        </main>
      )}

      {/* Dedicated Media Inspector Modal */}
      <MediaInspectorModal
        isOpen={inspectorFileId !== null}
        item={queue.find((i) => i.id === inspectorFileId) || null}
        onClose={() => setInspectorFileId(null)}
        onUpdateTargetFormat={handleUpdateTargetFormat}
        onUpdatePresetSettings={(id, settings) => {
          setItemPresets((prev) => ({ ...prev, [id]: settings }));
          setQueue((prev) =>
            prev.map((item) =>
              item.id === id
                ? {
                    ...item,
                    presetSettings: settings,
                    preset: getPresetLabel(settings, item.typeCategory),
                    quality: settings.imageQuality,
                    resolution: resizeKeyToResolution(settings.imageResize || settings.videoResolution),
                    stripExif: settings.stripMetadata,
                  }
                : item
            )
          );
        }}
        onStartConversion={handleStartConversion}
        onCancelConversion={handleCancelConversion}
      />

      {/* Advanced Conversion Presets Modal */}
      <PresetModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        onApply={handleApplyPreset}
        initialSettings={
          activePresetItemId
            ? itemPresets[activePresetItemId] ||
              activeTargetItem?.presetSettings ||
              globalPreset
            : globalPreset
        }
        activeItemId={activePresetItemId}
        activeItemName={activeTargetItem?.name}
        activeCategory={activeTargetItem?.typeCategory}
      />

      {/* Slide-out Conversion History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        history={history}
        onClearHistory={handleClearAllHistory}
        onDeleteEntry={handleDeleteHistoryEntry}
      />

      {/* Bottom Status Footer */}
      <StatusFooter
        onNavigatePrivacy={() => navigateTo('privacy')}
        onNavigateTerms={() => navigateTo('terms')}
      />

      {/* Subtle Global Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-3.5 py-2 rounded-md bg-zinc-900 border border-zinc-700 text-zinc-100 shadow-xl text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
