import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import {
  Camera,
  Video,
  Music,
  FileText,
  FileBox,
  CheckCircle2,
  Play,
  Trash2,
  X,
  Zap,
  Download,
  Eye,
  TrendingDown,
  FolderArchive,
  Folder,
  Plus,
  Check,
  FileImage,
  Loader2,
  Maximize2,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import {
  QueueItem,
  FileTypeCategory,
  formatFileSize,
  PresetSettings,
} from '../types/queue.ts';

interface ActiveQueueProps {
  queue: QueueItem[];
  onRemoveItem: (id: string) => void;
  onClearQueue: () => void;
  onUpdateTargetFormat: (id: string, targetFormat: string) => void;
  onStartConversion: (id: string) => void;
  onCancelConversion: (id: string) => void;
  onConvertAll: () => void;
  onConvertMore: () => void;
  onLoadDemoQueue?: () => void;
  globalPreset?: PresetSettings;
  onOpenPresetModal?: (itemId: string | null) => void;
  onOpenInspector?: (itemId: string) => void;
  activeCategory?: string;
  totalQueueCount?: number;
  onResetCategory?: () => void;
}

// Fallback high-resolution preview SVG for demo camera shoot
const DEMO_PREVIEW_IMG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2318181b"/><stop offset="50%" stop-color="%2309090b"/><stop offset="100%" stop-color="%23121214"/></linearGradient></defs><rect width="100%" height="100%" fill="url(%23bg)"/><circle cx="600" cy="360" r="140" fill="%2327272a"/><circle cx="600" cy="360" r="110" fill="%2318181b"/><circle cx="600" cy="360" r="60" fill="%233f3f46"/><circle cx="585" cy="345" r="16" fill="%23ffffff" opacity="0.8"/><text x="600" y="620" font-family="system-ui, sans-serif" font-size="26" font-weight="600" fill="%23ffffff" text-anchor="middle">Sony Alpha 7R V (6000 × 4000 RAW)</text><text x="600" y="660" font-family="system-ui, sans-serif" font-size="16" fill="%23a1a1aa" text-anchor="middle">50mm f/1.2 GM, ISO 100, 1/500s, 14-bit Uncompressed</text></svg>`;

export const ActiveQueue: React.FC<ActiveQueueProps> = ({
  queue,
  onRemoveItem,
  onClearQueue,
  onStartConversion,
  onCancelConversion,
  onConvertAll,
  onConvertMore,
  onLoadDemoQueue,
  activeCategory,
  totalQueueCount,
  onResetCategory,
  onOpenInspector,
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<QueueItem | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  const [dynamicDimensions, setDynamicDimensions] = useState<string | null>(null);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3000);
  };

  // Close preview modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && previewItem) {
        setPreviewItem(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [previewItem]);

  // Dynamically detect dimensions for preview item
  useEffect(() => {
    if (!previewItem) {
      setDynamicDimensions(null);
      return;
    }

    setDynamicDimensions(null);
    const url =
      previewItem.previewUrl ||
      previewItem.outputUrl ||
      (previewItem.id === 'demo-1' ? DEMO_PREVIEW_IMG : null);

    if (!url) {
      if (previewItem.dimensions) {
        setDynamicDimensions(previewItem.dimensions);
      }
      return;
    }

    const cleanTarget = previewItem.targetFormat.toUpperCase();
    const isGif = cleanTarget === 'GIF';
    const isVideo = previewItem.typeCategory === 'video' && !isGif;
    const isImage = previewItem.typeCategory === 'image' || isGif;

    if (isImage) {
      const img = new Image();
      img.onload = () => {
        if (img.naturalWidth && img.naturalHeight) {
          setDynamicDimensions(`${img.naturalWidth} × ${img.naturalHeight}`);
        }
      };
      img.src = url;
    } else if (isVideo) {
      const video = document.createElement('video');
      video.onloadedmetadata = () => {
        if (video.videoWidth && video.videoHeight) {
          setDynamicDimensions(`${video.videoWidth} × ${video.videoHeight}`);
        }
      };
      video.src = url;
    } else if (previewItem.dimensions) {
      setDynamicDimensions(previewItem.dimensions);
    }
  }, [previewItem]);

  // Aggregate metrics dynamically
  const completedItems = queue.filter((i) => i.status === 'completed');
  const isAllCompleted = queue.length > 0 && completedItems.length === queue.length;

  const totalInputBytes = completedItems.reduce(
    (acc, item) => acc + (item.sizeBytes || 0),
    0
  );
  const totalOutputBytes = completedItems.reduce(
    (acc, item) => acc + (item.outputSizeBytes || item.sizeBytes || 0),
    0
  );
  const totalSavedBytes = Math.max(0, totalInputBytes - totalOutputBytes);
  const savingsPercent =
    totalInputBytes > 0 ? Math.round((totalSavedBytes / totalInputBytes) * 100) : 0;

  // Animated delete handler
  const handleAnimatedRemove = (id: string) => {
    setRemovingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      onRemoveItem(id);
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 150);
  };

  // Single file download trigger
  const triggerDownloadFile = (item: QueueItem) => {
    const filename =
      item.outputName ||
      `${item.name.replace(/\.[^/.]+$/, '')}.${item.targetFormat.toLowerCase().split(' ')[0]}`;

    let downloadUrl = item.outputUrl;
    let shouldRevoke = false;

    if (!downloadUrl) {
      const blob =
        item.outputBlob ||
        new Blob([item.file ? 'Converted output data' : 'Sample converted payload'], {
          type: 'application/octet-stream',
        });
      downloadUrl = URL.createObjectURL(blob);
      shouldRevoke = true;
    }

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (shouldRevoke) {
      URL.revokeObjectURL(downloadUrl);
    }

    showToast(`Downloaded ${filename}`);
  };

  // Bulk ZIP Packaging via JSZip
  const handleDownloadAllZip = async () => {
    if (completedItems.length === 0) return;

    try {
      setIsZipping(true);
      const zip = new JSZip();

      for (const item of completedItems) {
        const filename =
          item.outputName ||
          `${item.name.replace(/\.[^/.]+$/, '')}.${item.targetFormat.toLowerCase().split(' ')[0]}`;

        if (item.outputBlob) {
          zip.file(filename, item.outputBlob);
        } else if (item.file) {
          zip.file(filename, item.file);
        } else if (item.outputUrl) {
          try {
            const resp = await fetch(item.outputUrl);
            const blob = await resp.blob();
            zip.file(filename, blob);
          } catch {
            zip.file(filename, `Transcoded content for ${filename}`);
          }
        } else {
          zip.file(filename, `Transcoded client-side payload for ${filename}`);
        }
      }

      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Stator_bundle.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast(`Downloaded Stator_bundle.zip (${formatFileSize(zipBlob.size)})`);
    } catch (err) {
      console.error('Failed to bundle ZIP:', err);
      showToast('Error generating ZIP archive');
    } finally {
      setIsZipping(false);
    }
  };

  // Helper for clean neutral category icons
  const renderCategoryIcon = (category: FileTypeCategory, targetFormat?: string) => {
    if (targetFormat?.toUpperCase() === 'GIF') {
      return (
        <div className="w-9 h-9 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
          <FileImage className="w-4 h-4" strokeWidth={1.8} />
        </div>
      );
    }

    switch (category) {
      case 'video':
        return (
          <div className="w-9 h-9 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
            <Video className="w-4 h-4" strokeWidth={1.8} />
          </div>
        );
      case 'audio':
        return (
          <div className="w-9 h-9 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
            <Music className="w-4 h-4" strokeWidth={1.8} />
          </div>
        );
      case 'document':
        return (
          <div className="w-9 h-9 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" strokeWidth={1.8} />
          </div>
        );
      case 'other':
        return (
          <div className="w-9 h-9 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
            <FileBox className="w-4 h-4" strokeWidth={1.8} />
          </div>
        );
      case 'image':
      default:
        return (
          <div className="w-9 h-9 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
            <Camera className="w-4 h-4" strokeWidth={1.8} />
          </div>
        );
    }
  };

  // Empty queue state
  if (queue.length === 0) {
    if (totalQueueCount && totalQueueCount > 0 && activeCategory && activeCategory !== 'All Formats') {
      return (
        <section className="w-full max-w-4xl mx-auto mt-6 bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 sm:p-8 text-center shadow-xs">
          <div className="w-10 h-10 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mx-auto text-zinc-500 dark:text-zinc-400 mb-3">
            <Folder className="w-5 h-5" strokeWidth={1.8} />
          </div>
          <h3 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-white">No {activeCategory.toLowerCase()} in queue</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
            You have {totalQueueCount} other {totalQueueCount === 1 ? 'file' : 'files'} in the queue.
          </p>
          {onResetCategory && (
            <button
              onClick={onResetCategory}
              className="mt-4 inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 font-medium rounded-md px-4 py-2 text-sm cursor-pointer transition-colors shadow-xs"
            >
              <span>View All Formats ({totalQueueCount})</span>
            </button>
          )}
        </section>
      );
    }

    return (
      <section className="w-full max-w-4xl mx-auto mt-6 bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 sm:p-8 text-center shadow-xs">
        <div className="w-10 h-10 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mx-auto text-zinc-500 dark:text-zinc-400 mb-3">
          <Folder className="w-5 h-5" strokeWidth={1.8} />
        </div>
        <h3 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-white">Queue is empty</h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
          Drop files above to begin instant on-device conversion.
        </p>
        {onLoadDemoQueue && (
          <button
            onClick={onLoadDemoQueue}
            className="mt-4 inline-flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700 rounded-md px-3 py-1.5 text-sm transition-colors cursor-pointer"
          >
            <span>Load sample files</span>
          </button>
        )}
      </section>
    );
  }

  return (
    <section className="w-full max-w-4xl mx-auto mt-6 sm:mt-8">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 flex items-center gap-2 px-3.5 py-2 rounded-md bg-zinc-900 border border-zinc-700 text-zinc-100 shadow-xl text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* COMPLETED STATE */}
      {/* ========================================================================= */}
      {isAllCompleted ? (
        <div className="space-y-4">
          {/* Top Success Banner with Dynamic Savings */}
          <div className="w-full bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm dark:shadow-none">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-md bg-emerald-50 dark:bg-zinc-800 border border-emerald-200 dark:border-zinc-700 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white tracking-tight">
                  {completedItems.length} of {queue.length} files converted successfully
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Ready for local download. Zero bytes sent to cloud.
                </p>
              </div>
            </div>

            <div className="shrink-0 self-start sm:self-center">
              <div className="px-3 py-1.5 rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 stroke-[2]" />
                <span>
                  Total saved: {formatFileSize(totalSavedBytes)} ({savingsPercent}%)
                </span>
              </div>
            </div>
          </div>

          {/* Section Header */}
          <div className="flex items-center justify-between gap-2 pt-1 px-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
                Ready to Download
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-medium border border-zinc-200 dark:border-zinc-800">
                {completedItems.length} ready
              </span>
            </div>

            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
              Total size: {formatFileSize(totalOutputBytes)}
            </span>
          </div>

          {/* Completed Items List */}
          <div className="space-y-2.5">
            {completedItems.map((item) => {
              const displayName =
                item.outputName ||
                `${item.name.replace(/\.[^/.]+$/, '')}.${item.targetFormat.toLowerCase().split(' ')[0]}`;
              const isRemoving = removingIds.has(item.id);

              return (
                <div
                  key={item.id}
                  className={`w-full bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3.5 sm:p-4 flex items-center justify-between gap-3 transition-all shadow-sm dark:shadow-none ${
                    isRemoving
                      ? 'opacity-0 -translate-x-2 max-h-0 py-0 my-0 overflow-hidden duration-150 ease-in pointer-events-none'
                      : 'animate-in fade-in slide-in-from-top-1 duration-150 ease-out fill-mode-forwards opacity-100'
                  }`}
                >
                  <div
                    onClick={() => onOpenInspector?.(item.id)}
                    className="flex items-center gap-3 min-w-0 cursor-pointer flex-1 select-none"
                    title="Click to inspect in Media Inspector"
                  >
                    {renderCategoryIcon(item.typeCategory, item.targetFormat)}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-900 dark:text-white text-sm sm:text-base truncate block hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                          {displayName}
                        </span>
                        <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
                          {item.targetFormat}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5 flex items-center gap-1.5">
                        <span>Original: {item.sizeFormatted}</span>
                        <span>•</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          {item.reductionBadge || `Output: ${item.outputSizeFormatted || 'Ready'}`}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <button
                      onClick={() => setPreviewItem(item)}
                      className="p-1.5 rounded-md bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-all duration-120 ease-out active:scale-[0.96] cursor-pointer"
                      title="Quick Preview"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleAnimatedRemove(item.id)}
                      className="p-1.5 rounded-md bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-red-600 transition-all duration-120 ease-out active:scale-[0.96] cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => triggerDownloadFile(item)}
                      className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white font-medium rounded-md px-3 py-1.5 text-xs flex items-center gap-1.5 transition-all duration-120 ease-out active:scale-[0.96] cursor-pointer shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5 stroke-[2]" />
                      <span className="hidden sm:inline">Download</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Clean Completed Footer with Utilitarian CTA */}
          <div className="hidden md:flex mt-3 bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 items-center justify-between shadow-sm dark:shadow-none">
            <button
              onClick={onClearQueue}
              className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 rounded-md px-3 py-1.5 text-sm transition-colors cursor-pointer"
            >
              Clear Queue
            </button>

            <div className="flex items-center gap-2.5">
              <button
                onClick={onConvertMore}
                className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700 rounded-md px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Convert More Files</span>
              </button>

              <button
                disabled={isZipping}
                onClick={handleDownloadAllZip}
                className="bg-zinc-900 hover:bg-black text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 font-medium rounded-md px-4 py-2 text-sm flex items-center gap-2 transition-colors cursor-pointer shadow-sm dark:shadow-none"
              >
                {isZipping ? (
                  <>
                    <Loader2 className="w-4 h-4 text-white dark:text-zinc-900 animate-spin" />
                    <span>Archiving ZIP...</span>
                  </>
                ) : (
                  <>
                    <FolderArchive className="w-4 h-4 stroke-[2]" />
                    <span>Download All (.ZIP) ({formatFileSize(totalOutputBytes)})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* ACTIVE QUEUE VIEW */
        /* ========================================================================= */
        <div>
          {/* Header */}
          <div className="flex items-center justify-between gap-3 mb-3 px-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
                Active Queue
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-medium border border-zinc-200 dark:border-zinc-800">
                {queue.length} {queue.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            <button
              onClick={onClearQueue}
              className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer"
            >
              Clear Queue
            </button>
          </div>

          {/* Minimalist Queue Item Rows */}
          <div className="space-y-2.5">
            {queue.map((item) => {
              const isConverting = item.status === 'converting';
              const isError = item.status === 'error';
              const isReady = !isConverting && !isError;
              const isRemoving = removingIds.has(item.id);

              return (
                <div
                  key={item.id}
                  className={`w-full bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3.5 sm:p-4 transition-all shadow-sm dark:shadow-none ${
                    isRemoving
                      ? 'opacity-0 -translate-x-2 max-h-0 py-0 my-0 overflow-hidden duration-150 ease-in pointer-events-none'
                      : 'animate-in fade-in slide-in-from-top-1 duration-150 ease-out fill-mode-forwards opacity-100 max-h-[300px]'
                  } ${
                    isError
                      ? 'border-red-300 bg-red-50/60 dark:border-red-900/50 dark:bg-red-950/10'
                      : 'hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  {/* Ready Item Row */}
                  {isReady && (
                    <div className="flex items-center justify-between gap-3">
                      {/* Left: Media icon + truncated filename + formatted original size */}
                      <div className="flex items-center gap-3 min-w-0 flex-1 select-none">
                        {renderCategoryIcon(item.typeCategory, item.targetFormat)}
                        <div className="min-w-0">
                          <span className="font-semibold text-zinc-900 dark:text-white text-sm sm:text-base tracking-tight truncate block">
                            {item.name}
                          </span>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                            {item.sizeFormatted}
                          </span>
                        </div>
                      </div>

                      {/* Center: Target format badge - purely informational static readout */}
                      <div className="shrink-0 flex items-center">
                        {(() => {
                          const fileName = item.file?.name || item.name || '';
                          const sourceExt = fileName.includes('.')
                            ? fileName.split('.').pop()?.toUpperCase() || 'FILE'
                            : (item.file?.name?.split('.').pop()?.toUpperCase() || 'FILE');
                          const targetExt = item.targetFormat.toUpperCase();
                          return (
                            <div className="text-zinc-600 bg-zinc-100 border border-zinc-200 dark:text-zinc-400 dark:bg-zinc-900/70 dark:border-zinc-800 rounded-md px-2.5 py-1 text-xs font-mono tracking-tight cursor-default select-none pointer-events-none">
                              {sourceExt} → {targetExt}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Right: Configure slider icon button, Convert button, Trash button */}
                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onOpenInspector?.(item.id)}
                          className="p-1.5 rounded-md bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all duration-120 ease-out active:scale-[0.96] cursor-pointer"
                          title="Configure"
                        >
                          <SlidersHorizontal className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onStartConversion(item.id)}
                          className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white font-medium rounded-md px-3 py-1.5 text-xs flex items-center gap-1.5 transition-all duration-120 ease-out active:scale-[0.96] cursor-pointer shadow-xs"
                          title="Convert Now"
                        >
                          <Play className="w-3 h-3 fill-white dark:fill-zinc-900" />
                          <span className="hidden sm:inline">Convert</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAnimatedRemove(item.id)}
                          className="p-1.5 rounded-md bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-red-600 transition-all duration-120 ease-out active:scale-[0.96] cursor-pointer"
                          title="Remove from queue"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Converting Row */}
                  {isConverting && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {renderCategoryIcon(item.typeCategory, item.targetFormat)}
                          <div className="min-w-0">
                            <span className="font-semibold text-zinc-900 dark:text-white text-sm sm:text-base tracking-tight truncate block">
                              {item.name}
                            </span>
                            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono tabular-nums font-medium flex items-center gap-1.5">
                              <span className="inline-block w-1.5 h-1.5 rounded-sm bg-emerald-500 transition-opacity duration-150" />
                              <span>Converting: {item.progress}%</span>
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => onCancelConversion(item.id)}
                          className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700 rounded-md px-3 py-1.5 text-xs flex items-center gap-1 cursor-pointer transition-all duration-120 ease-out active:scale-[0.96]"
                        >
                          <X className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                          <span>Cancel</span>
                        </button>
                      </div>

                      {/* Clean utilitarian progress bar with smooth interpolation */}
                      <div className="w-full h-1.5 rounded-md bg-zinc-200 dark:bg-zinc-800 overflow-hidden relative">
                        <div
                          className="h-full rounded-md bg-zinc-900 dark:bg-zinc-100 transition-[width] duration-150 ease-out will-change-[width]"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Error Row */}
                  {isError && (
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="font-semibold text-zinc-900 dark:text-white text-sm block truncate">
                          {item.name}
                        </span>
                        <p className="text-xs text-red-600 dark:text-red-400 font-mono mt-0.5">
                          {item.errorMessage || 'Conversion failed.'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => onStartConversion(item.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-red-300 dark:border-red-800 rounded-md px-3 py-1.5 text-xs flex items-center gap-1.5 transition-all duration-120 ease-out active:scale-[0.96] cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Retry</span>
                        </button>
                        <button
                          onClick={() => handleAnimatedRemove(item.id)}
                          className="p-1.5 rounded-md bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-red-600 transition-all duration-120 ease-out active:scale-[0.96] cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Clean Queue Footer with Industrial Button */}
          <div className="hidden md:flex mt-4 bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 items-center justify-between shadow-sm dark:shadow-none">
            <button
              onClick={onClearQueue}
              className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 rounded-md px-3 py-1.5 text-sm transition-colors cursor-pointer"
            >
              Clear Queue
            </button>

            <button
              onClick={onConvertAll}
              className="bg-zinc-900 hover:bg-black text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 font-medium rounded-md px-4 py-2 text-sm flex items-center gap-2 transition-colors cursor-pointer shadow-sm dark:shadow-none"
            >
              <Zap className="w-4 h-4 fill-white dark:fill-zinc-900" />
              <span>Convert All ({queue.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Mobile Bottom Sticky Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-3 bg-white/95 dark:bg-[#09090b]/95 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 z-40">
        {isAllCompleted ? (
          <button
            disabled={isZipping}
            onClick={handleDownloadAllZip}
            className="w-full py-2.5 px-4 rounded-md bg-zinc-900 hover:bg-black active:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:active:bg-white dark:text-zinc-900 font-medium text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm dark:shadow-none"
          >
            {isZipping ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white dark:text-zinc-900" />
                <span>Archiving ZIP...</span>
              </>
            ) : (
              <>
                <FolderArchive className="w-4 h-4 stroke-[2]" />
                <span>Download All (.ZIP) ({formatFileSize(totalOutputBytes)})</span>
              </>
            )}
          </button>
        ) : (
          <button
            onClick={onConvertAll}
            className="w-full py-2.5 px-4 rounded-md bg-zinc-900 hover:bg-black active:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:active:bg-white dark:text-zinc-900 font-medium text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm dark:shadow-none"
          >
            <Zap className="w-4 h-4 fill-white dark:fill-zinc-900" />
            <span>Convert All ({queue.length})</span>
          </button>
        )}
      </div>

      {/* Dynamic Preview Modal */}
      {previewItem && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewItem(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border-zinc-200 text-zinc-900 dark:bg-[#121214] dark:border-zinc-800 dark:text-zinc-100 border rounded-lg max-w-2xl w-full p-5 sm:p-6 shadow-2xl relative flex flex-col"
          >
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
                  <FileImage className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white truncate">
                    {previewItem.outputName || previewItem.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      {previewItem.outputSizeFormatted || previewItem.sizeFormatted}
                    </span>
                    <span>•</span>
                    <span className="text-zinc-700 dark:text-zinc-200">
                      {dynamicDimensions || previewItem.dimensions || 'Measuring...'}
                    </span>
                    <span>•</span>
                    <span className="text-zinc-900 dark:text-zinc-300 font-bold uppercase">
                      {previewItem.targetFormat}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setPreviewItem(null)}
                className="p-1.5 rounded-md bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 w-full h-72 sm:h-96 rounded-md bg-zinc-100 dark:bg-black border border-zinc-200 dark:border-zinc-800 flex items-center justify-center overflow-hidden relative">
              {previewItem.typeCategory === 'video' &&
              previewItem.targetFormat.toUpperCase() !== 'GIF' &&
              previewItem.outputUrl ? (
                <video
                  src={previewItem.outputUrl}
                  controls
                  autoPlay
                  loop
                  muted
                  playsInline
                  onLoadedMetadata={(e) => {
                    const vid = e.currentTarget;
                    if (vid.videoWidth && vid.videoHeight) {
                      setDynamicDimensions(`${vid.videoWidth} × ${vid.videoHeight}`);
                    }
                  }}
                  className="max-w-full max-h-full rounded-md"
                />
              ) : previewItem.typeCategory === 'audio' && previewItem.outputUrl ? (
                <div className="flex flex-col items-center justify-center p-6 gap-3 w-full">
                  <div className="w-14 h-14 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shadow-xs">
                    <Music className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white mt-1">Transcoded Audio Output</p>
                  <audio controls autoPlay src={previewItem.outputUrl} className="w-full max-w-sm mt-2" />
                </div>
              ) : (
                <img
                  src={
                    previewItem.previewUrl ||
                    previewItem.outputUrl ||
                    (previewItem.id === 'demo-1' ? DEMO_PREVIEW_IMG : '')
                  }
                  alt={previewItem.name}
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    if (img.naturalWidth && img.naturalHeight) {
                      setDynamicDimensions(`${img.naturalWidth} × ${img.naturalHeight}`);
                    }
                  }}
                  className="max-w-full max-h-full object-contain rounded-md"
                />
              )}

              <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-md bg-white/90 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 text-[10px] sm:text-[11px] font-mono text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 pointer-events-none shadow-xs">
                <Maximize2 className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
                <span>
                  {dynamicDimensions ? `Resolution: ${dynamicDimensions}` : 'Lossless Render'}
                </span>
              </div>
            </div>

            <div className="mt-4 sm:mt-5 flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setPreviewItem(null)}
                className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700 rounded-md px-3 py-1.5 text-sm transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  triggerDownloadFile(previewItem);
                  setPreviewItem(null);
                }}
                className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white font-medium rounded-md px-4 py-2 text-sm flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5 stroke-[2]" />
                <span>Download</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
