import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  ArrowRight,
  Check,
  Download,
  Video,
  Music,
  FileText,
  RotateCcw,
  RotateCw,
  FlipHorizontal2,
  Camera,
  Loader2,
  Share2,
  Columns2,
  Volume2,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Trash2,
  X,
  Plus,
  SlidersHorizontal,
  List,
  FileImage,
} from 'lucide-react';
import {
  QueueItem,
  PresetSettings,
  DEFAULT_PRESET_SETTINGS,
  RotationDegrees,
  formatFileSize,
} from '../types/queue.ts';
import { STATOR_SPRING, STATOR_TRANSITION } from '../lib/motion.ts';
import { CustomSelect } from './CustomSelect.tsx';
import { resolveOrientedTargetDimensions } from '../utils/imageEncoder.ts';
import { encodePresetRecipeUrl } from '../lib/presets.ts';
import {
  getTargetMimeForFormat,
  probeImageEncoderSupport,
  buildOutputFilename,
} from '../utils/formatCapabilities.ts';
import { ffmpegManager } from '../utils/ffmpegManager.ts';
import { BeforeAfterSlider } from './inspector/BeforeAfterSlider.tsx';
import { ToggleSwitch } from './ui/Primitives.tsx';

export interface CanvasFocusStageProps {
  queue: QueueItem[];
  activeItemId: string | null;
  onSelectActiveItem: (id: string) => void;
  onSwitchToLedger: () => void;
  onUpdateTargetFormat: (id: string, targetFormat: string) => void;
  onUpdatePresetSettings: (id: string, settings: PresetSettings) => void;
  onStartConversion: (
    id: string,
    overrideFormat?: string,
    overrideSettings?: PresetSettings
  ) => void;
  onCancelConversion: (id: string) => void;
  onRemoveItem: (id: string) => void;
  onAddFiles: () => void;
  onFilesDropped?: (files: File[]) => void;
  onAddExtractedFile?: (file: File) => void;
  onToast?: (message: string) => void;
  wasmLoadProgress?: string | null;
}

function getAspectBoxStyle(crop?: PresetSettings['aspectCrop']): React.CSSProperties | null {
  switch (crop) {
    case '9:16':
      return { aspectRatio: '9 / 16', height: '84%', maxWidth: '88%' };
    case '1:1':
      return { aspectRatio: '1 / 1', height: '80%', maxWidth: '80%' };
    case '4:5':
      return { aspectRatio: '4 / 5', height: '82%', maxWidth: '84%' };
    case '16:9':
      return { aspectRatio: '16 / 9', width: '86%', maxHeight: '84%' };
    default:
      return null;
  }
}

export const CanvasFocusStage: React.FC<CanvasFocusStageProps> = ({
  queue,
  activeItemId,
  onSelectActiveItem,
  onSwitchToLedger,
  onUpdateTargetFormat,
  onUpdatePresetSettings,
  onStartConversion,
  onCancelConversion,
  onRemoveItem,
  onAddFiles,
  onFilesDropped,
  onAddExtractedFile,
  onToast,
  wasmLoadProgress,
}) => {
  const item = queue.find((q) => q.id === activeItemId) || queue[0] || null;

  const [localSettings, setLocalSettings] = useState<PresetSettings>(DEFAULT_PRESET_SETTINGS);
  const [localFormat, setLocalFormat] = useState<string>('WEBP');
  const [sourceWidth, setSourceWidth] = useState<number | null>(null);
  const [sourceHeight, setSourceHeight] = useState<number | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [fileObjectUrl, setFileObjectUrl] = useState<string | null>(null);
  const [compareBeforeAfter, setCompareBeforeAfter] = useState(false);
  const [zoomScale, setZoomScale] = useState<1 | 2>(1);
  const [showAdvancedShelf, setShowAdvancedShelf] = useState(false);
  const [isCapturingFrame, setIsCapturingFrame] = useState(false);
  const [isDragOverStage, setIsDragOverStage] = useState(false);
  const [avifSupported, setAvifSupported] = useState<boolean>(true);
  const [webpSupported, setWebpSupported] = useState<boolean>(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSyncedRef = useRef<{ id: string | null; status: string | null }>({
    id: null,
    status: null,
  });

  useEffect(() => {
    probeImageEncoderSupport('image/avif').then(setAvifSupported);
    probeImageEncoderSupport('image/webp').then(setWebpSupported);
  }, []);

  useEffect(() => {
    if (!item?.file) {
      setFileObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(item.file);
    setFileObjectUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [item?.id, item?.file]);

  useEffect(() => {
    if (!item) return;

    const itemChanged = item.id !== lastSyncedRef.current.id;
    const justCompleted =
      item.status === 'completed' &&
      lastSyncedRef.current.status !== 'completed' &&
      item.id === lastSyncedRef.current.id;

    if (itemChanged) {
      setZoomScale(1);
      setCompareBeforeAfter(
        item.typeCategory === 'image' &&
          item.status === 'completed' &&
          Boolean(item.previewUrl) &&
          Boolean(item.outputUrl)
      );

      const mergedSettings: PresetSettings = {
        ...DEFAULT_PRESET_SETTINGS,
        ...(item.presetSettings || {}),
      };
      if (item.quality !== undefined) {
        mergedSettings.imageQuality = item.quality;
      }
      if (item.stripExif !== undefined) {
        mergedSettings.stripMetadata = item.stripExif;
      }

      setLocalSettings(mergedSettings);
      setLocalFormat(
        item.targetFormat ||
          (item.typeCategory === 'image' ? 'WEBP' : item.typeCategory === 'video' ? 'MP4' : 'MP3')
      );

      const rawDim = item.dimensions || '';
      const rawTag = item.technicalTag || '';
      const match =
        rawDim.match(/(\d{2,5})\s*[x×]\s*(\d{2,5})/i) ||
        rawTag.match(/(\d{2,5})\s*[x×]\s*(\d{2,5})/i);
      if (match) {
        setSourceWidth(parseInt(match[1], 10));
        setSourceHeight(parseInt(match[2], 10));
      } else {
        setSourceWidth(null);
        setSourceHeight(null);
      }

      if (item.file) {
        if (item.typeCategory === 'image') {
          const url = URL.createObjectURL(item.file);
          const img = new Image();
          img.onload = () => {
            setSourceWidth(img.naturalWidth);
            setSourceHeight(img.naturalHeight);
            URL.revokeObjectURL(url);
          };
          img.onerror = () => URL.revokeObjectURL(url);
          img.src = url;
        } else if (item.typeCategory === 'video') {
          const video = document.createElement('video');
          video.preload = 'metadata';
          const url = URL.createObjectURL(item.file);
          video.onloadedmetadata = () => {
            if (video.videoWidth && video.videoHeight) {
              setSourceWidth(video.videoWidth);
              setSourceHeight(video.videoHeight);
            }
            URL.revokeObjectURL(url);
          };
          video.onerror = () => URL.revokeObjectURL(url);
          video.src = url;
        }
      }
    } else if (justCompleted) {
      if (item.typeCategory === 'image' && item.previewUrl && item.outputUrl) {
        setCompareBeforeAfter(true);
      }
    }

    lastSyncedRef.current = { id: item.id, status: item.status };
  }, [item]);

  if (!item) return null;

  const activeIndex = queue.findIndex((q) => q.id === item.id);
  const prevItem = activeIndex > 0 ? queue[activeIndex - 1] : null;
  const nextItem =
    activeIndex >= 0 && activeIndex < queue.length - 1 ? queue[activeIndex + 1] : null;

  const handleFormatSelect = (fmt: string) => {
    if (fmt === 'AVIF' && !avifSupported) {
      onToast?.('AVIF native Canvas encoding is not supported in this browser.');
      return;
    }
    if (fmt === 'WEBP' && !webpSupported) {
      onToast?.('WebP native Canvas encoding is not supported in this browser.');
      return;
    }
    setLocalFormat(fmt);
    onUpdateTargetFormat(item.id, fmt);
  };

  const updateSetting = <K extends keyof PresetSettings>(key: K, value: PresetSettings[K]) => {
    const updated = { ...localSettings, [key]: value };
    setLocalSettings(updated);
    onUpdatePresetSettings(item.id, updated);
  };

  const handleConvertNow = () => {
    onUpdateTargetFormat(item.id, localFormat);
    onUpdatePresetSettings(item.id, localSettings);
    onStartConversion(item.id, localFormat, localSettings);
  };

  const handleCaptureFrame = async () => {
    if (!item.file || item.typeCategory !== 'video') return;
    try {
      setIsCapturingFrame(true);
      const t = videoRef.current?.currentTime || 0;
      const { file } = await ffmpegManager.extractVideoFramePng(item.file, t);
      onAddExtractedFile?.(file);
      onToast?.(`Captured frame at ${t.toFixed(1)}s -> staged ${file.name}`);
    } catch (err: any) {
      onToast?.(err?.message || 'Failed to extract PNG frame');
    } finally {
      setIsCapturingFrame(false);
    }
  };

  const handleDownload = () => {
    if (!item.outputUrl && !item.outputBlob) return;
    const filename = item.outputName || buildOutputFilename(item.name, localFormat);
    let url = item.outputUrl;
    let shouldRevoke = false;
    if (!url && item.outputBlob) {
      url = URL.createObjectURL(item.outputBlob);
      shouldRevoke = true;
    }
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (shouldRevoke) URL.revokeObjectURL(url);
    onToast?.(`Downloaded ${filename}`);
  };

  const previewSource =
    item.outputUrl ||
    item.previewUrl ||
    (item.file && item.file.type.startsWith('image/') ? fileObjectUrl : null);

  const canCompareImages =
    item.typeCategory === 'image' &&
    Boolean(item.previewUrl) &&
    Boolean(item.outputUrl) &&
    item.previewUrl !== item.outputUrl;

  const videoSource = item.outputUrl || fileObjectUrl;
  const audioSource = item.outputUrl || fileObjectUrl;
  const targetMime = getTargetMimeForFormat(localFormat);

  const isAudioExtraction =
    item.typeCategory === 'video' && (localFormat === 'MP3' || localFormat === 'WAV');

  const rotation = (localSettings.rotation || 0) as RotationDegrees;
  const flipH = Boolean(localSettings.flipH);

  const cropBoxStyle = !isAudioExtraction ? getAspectBoxStyle(localSettings.aspectCrop) : null;

  const effectiveRes =
    item.typeCategory === 'image' ? localSettings.imageResize : localSettings.videoResolution;
  const baseW = sourceWidth || (item.typeCategory === 'video' ? 1920 : 1280);
  const baseH = sourceHeight || (item.typeCategory === 'video' ? 1080 : 720);
  const targetDims = resolveOrientedTargetDimensions(
    baseW,
    baseH,
    effectiveRes,
    rotation,
    localSettings.customWidth,
    localSettings.customHeight
  );

  const isConverting = item.status === 'converting';
  const isCompleted = item.status === 'completed';
  const isError = item.status === 'error';
  const isReady = item.status === 'ready' || (!isConverting && !isCompleted && !isError);

  const qualityPercentage = ((localSettings.imageQuality - 10) / 90) * 100;

  const savedPercent =
    isCompleted &&
    typeof item.sizeBytes === 'number' &&
    item.sizeBytes > 0 &&
    typeof item.outputSizeBytes === 'number'
      ? Math.round(((item.sizeBytes - item.outputSizeBytes) / item.sizeBytes) * 100)
      : null;

  const formatChoices =
    item.typeCategory === 'image'
      ? ['WEBP', 'AVIF', 'PNG', 'JPEG', 'ICO', 'TIFF', 'BMP']
      : item.typeCategory === 'video'
      ? ['MP4', 'WEBM', 'MOV', 'MKV', 'GIF', 'AVI', 'MP3', 'WAV']
      : ['MP3', 'WAV', 'AAC', 'OGG', 'FLAC'];

  return (
    <section
      aria-label="Canvas Focus Studio"
      onDragOver={(e) => {
        e.preventDefault();
        if (!isDragOverStage) setIsDragOverStage(true);
      }}
      onDragLeave={(e) => {
        const related = e.relatedTarget as Node | null;
        if (related && e.currentTarget.contains(related)) return;
        setIsDragOverStage(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOverStage(false);
        const dropped = Array.from(e.dataTransfer.files || []);
        if (dropped.length > 0) {
          onFilesDropped?.(dropped);
        }
      }}
      className={`w-full rounded-2xl border bg-[var(--stator-surface)] overflow-hidden transition-colors ${
        isDragOverStage
          ? 'border-[var(--stator-accent)] ring-2 ring-[var(--stator-accent-soft)]'
          : 'border-[var(--stator-border)]'
      }`}
    >
      {/* Top Metadata & File Strip */}
      <div className="px-4 sm:px-6 py-3 border-b border-[var(--stator-border)] bg-[var(--stator-surface)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {queue.length > 1 && (
            <button
              type="button"
              onClick={onSwitchToLedger}
              className="h-8 px-2.5 rounded-lg bg-[var(--stator-surface-2)] hover:bg-[var(--stator-border)] border border-[var(--stator-border)] text-xs font-medium text-[var(--stator-fg)] inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0 active:scale-[0.98]"
              title="Return to batch ledger table"
            >
              <List className="w-3.5 h-3.5 text-[var(--stator-accent-fg)]" />
              <span>Ledger ({queue.length})</span>
            </button>
          )}

          <div className="min-w-0 flex items-center gap-2 text-xs">
            <span className="font-semibold text-[var(--stator-fg)] text-sm truncate">
              {item.name}
            </span>
            <span aria-hidden="true" className="text-[var(--stator-border-strong)]">
              ·
            </span>
            <span className="font-mono tabular-nums text-[var(--stator-fg-muted)] whitespace-nowrap">
              {sourceWidth && sourceHeight
                ? `${sourceWidth}×${sourceHeight}`
                : item.dimensions || item.formatBadge}
            </span>
            <span aria-hidden="true" className="hidden sm:inline text-[var(--stator-border-strong)]">
              ·
            </span>
            <span className="hidden sm:inline font-mono tabular-nums text-[var(--stator-fg-muted)] whitespace-nowrap">
              {item.sizeFormatted}
            </span>
            <span aria-hidden="true" className="hidden md:inline text-[var(--stator-border-strong)]">
              ·
            </span>
            <span className="hidden md:inline font-mono tabular-nums text-[var(--stator-fg-subtle)] whitespace-nowrap">
              {isAudioExtraction
                ? `Target: ${localFormat}`
                : `Target: ${targetDims.w}×${targetDims.h} (${targetMime})`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {queue.length > 1 && (
            <div className="flex items-center gap-1 mr-1">
              <button
                type="button"
                disabled={!prevItem}
                onClick={() => prevItem && onSelectActiveItem(prevItem.id)}
                aria-label="Previous file"
                className="w-8 h-8 rounded-lg border border-[var(--stator-border)] bg-[var(--stator-surface-2)] text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] disabled:opacity-35 flex items-center justify-center cursor-pointer active:scale-[0.96]"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-1.5 text-[11px] font-mono tabular-nums text-[var(--stator-fg-muted)]">
                {activeIndex + 1}/{queue.length}
              </span>
              <button
                type="button"
                disabled={!nextItem}
                onClick={() => nextItem && onSelectActiveItem(nextItem.id)}
                aria-label="Next file"
                className="w-8 h-8 rounded-lg border border-[var(--stator-border)] bg-[var(--stator-surface-2)] text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] disabled:opacity-35 flex items-center justify-center cursor-pointer active:scale-[0.96]"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onAddFiles}
            className="h-8 px-3 rounded-lg bg-[var(--stator-surface-2)] hover:bg-[var(--stator-border)] border border-[var(--stator-border)] text-xs font-medium text-[var(--stator-fg)] inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5 text-[var(--stator-accent-fg)]" />
            <span>Add Files</span>
          </button>

          <button
            type="button"
            onClick={() => onRemoveItem(item.id)}
            className="w-8 h-8 rounded-lg bg-[var(--stator-surface-2)] hover:bg-rose-500/10 border border-[var(--stator-border)] text-[var(--stator-fg-subtle)] hover:text-[var(--stator-danger)] flex items-center justify-center cursor-pointer transition-colors active:scale-[0.96]"
            title="Remove file"
            aria-label={`Remove ${item.name}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* FULL-WIDTH DARKROOM MEDIA STAGE */}
      <div className="bg-[var(--stator-stage)] text-[#F3F4F6] relative flex flex-col justify-between min-h-[360px] sm:min-h-[450px] lg:min-h-[500px]">
        {/* Top Floating Stage Overlays */}
        <div className="px-4 sm:px-6 pt-4 flex flex-wrap items-center justify-between gap-2 z-10">
          <div className="flex items-center gap-1.5 flex-wrap">
            {item.typeCategory === 'image' && !compareBeforeAfter && (
              <button
                type="button"
                onClick={() => setZoomScale((z) => (z === 1 ? 2 : 1))}
                className="h-7 px-2.5 rounded-md border border-[#2C313C] hover:border-[#464D5E] bg-[#14171D]/90 text-[#E6E8ED] text-xs font-mono tabular-nums inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap active:scale-[0.97]"
              >
                {zoomScale === 1 ? (
                  <ZoomIn className="w-3.5 h-3.5" />
                ) : (
                  <ZoomOut className="w-3.5 h-3.5" />
                )}
                <span>{zoomScale === 1 ? 'Fit' : '2× Zoom'}</span>
              </button>
            )}

            {canCompareImages && (
              <button
                type="button"
                onClick={() => setCompareBeforeAfter((prev) => !prev)}
                className={`h-7 px-3 rounded-md border text-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap active:scale-[0.97] ${
                  compareBeforeAfter
                    ? 'bg-[#2563EB] border-transparent text-white font-medium'
                    : 'bg-[#14171D]/90 border-[#2C313C] hover:border-[#464D5E] text-[#E6E8ED]'
                }`}
              >
                <Columns2 className="w-3.5 h-3.5" />
                <span>{compareBeforeAfter ? '50/50 Split Active' : 'Compare Before / After'}</span>
              </button>
            )}

            {(item.typeCategory === 'image' ||
              (item.typeCategory === 'video' && !isAudioExtraction)) && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    updateSetting('rotation', (((rotation + 90) % 360) as RotationDegrees))
                  }
                  className="h-7 px-2.5 rounded-md border border-[#2C313C] hover:border-[#464D5E] bg-[#14171D]/90 text-[#E6E8ED] text-xs inline-flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap active:scale-[0.97]"
                  title="Rotate 90° clockwise"
                >
                  <RotateCw className="w-3 h-3" />
                  <span className="font-mono tabular-nums">{rotation}°</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateSetting('flipH', !flipH)}
                  className={`h-7 px-2.5 rounded-md border text-xs inline-flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap active:scale-[0.97] ${
                    flipH
                      ? 'bg-[#2563EB] border-transparent text-white'
                      : 'bg-[#14171D]/90 border-[#2C313C] hover:border-[#464D5E] text-[#E6E8ED]'
                  }`}
                  title="Mirror horizontally"
                >
                  <FlipHorizontal2 className="w-3 h-3" />
                  <span>Flip</span>
                </button>
              </>
            )}

            {item.typeCategory === 'video' && item.file && (
              <>
                <button
                  type="button"
                  disabled={isCapturingFrame}
                  onClick={handleCaptureFrame}
                  className="h-7 px-2.5 rounded-md border border-[#2C313C] hover:border-[#464D5E] bg-[#14171D]/90 text-[#E6E8ED] text-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors whitespace-nowrap active:scale-[0.97]"
                >
                  {isCapturingFrame ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Camera className="w-3 h-3 text-[#60A5FA]" />
                  )}
                  <span>Capture PNG Frame</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFormatSelect('MP3')}
                  className={`h-7 px-2.5 rounded-md border text-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap active:scale-[0.97] ${
                    localFormat === 'MP3'
                      ? 'bg-[#2563EB] border-transparent text-white font-medium'
                      : 'bg-[#14171D]/90 border-[#2C313C] hover:border-[#464D5E] text-[#E6E8ED]'
                  }`}
                >
                  <Music className="w-3 h-3" />
                  <span>Extract MP3</span>
                </button>
              </>
            )}
          </div>

          <AnimatePresence>
            {isCompleted && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4 }}
                transition={STATOR_SPRING.tactile}
                className="inline-flex items-baseline gap-2 px-3 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-[#34D399] text-xs font-mono tabular-nums"
              >
                {savedPercent !== null && (
                  <span className="font-serif italic text-base font-semibold">
                    {savedPercent >= 0 ? `-${savedPercent}%` : `+${Math.abs(savedPercent)}%`}
                  </span>
                )}
                <span>
                  {item.sizeFormatted} →{' '}
                  {item.outputSizeFormatted || formatFileSize(item.outputSizeBytes || 0)}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Center Unobstructed Media Viewport with Crossfade File Transitions */}
        <div className="flex-1 px-4 sm:px-8 py-4 flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              transition={STATOR_TRANSITION.view}
              className="w-full max-w-4xl flex items-center justify-center"
            >
              {compareBeforeAfter && canCompareImages && item.previewUrl && item.outputUrl ? (
                <div className="w-full">
                  <BeforeAfterSlider
                    originalUrl={item.previewUrl}
                    convertedUrl={item.outputUrl}
                    originalLabel={`Source · ${item.sizeFormatted}`}
                    convertedLabel={`${localFormat} · ${item.outputSizeFormatted || ''}`}
                    alt={item.name}
                    heightClass="h-[310px] sm:h-[380px] lg:h-[420px]"
                  />
                </div>
              ) : (
                <div className="relative w-full h-[290px] sm:h-[360px] lg:h-[400px] rounded-xl stator-checkerboard border border-[var(--stator-stage-border)] flex items-center justify-center overflow-hidden p-4">
                  {item.typeCategory === 'image' && previewSource ? (
                    <motion.img
                      src={previewSource}
                      alt={item.name}
                      animate={{
                        rotate: rotation,
                        scaleX: flipH ? -zoomScale : zoomScale,
                        scaleY: zoomScale,
                      }}
                      transition={STATOR_SPRING.tactile}
                      className="max-h-full w-auto max-w-full object-contain rounded-sm shadow-2xl"
                    />
                  ) : item.typeCategory === 'video' ? (
                    videoSource ? (
                      <motion.video
                        ref={videoRef}
                        src={videoSource}
                        controls
                        animate={{
                          rotate: rotation,
                          scaleX: flipH ? -1 : 1,
                        }}
                        transition={STATOR_SPRING.tactile}
                        className="max-h-full w-full rounded-sm object-contain bg-black"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center">
                        <Video className="w-8 h-8 text-[#A1A8B5] mb-2" strokeWidth={1.5} />
                        <span className="text-sm font-medium text-[#F3F4F6]">Video Stream</span>
                      </div>
                    )
                  ) : item.typeCategory === 'audio' ? (
                    <div className="flex flex-col items-center justify-center py-8 w-full max-w-md px-4">
                      <div className="w-14 h-14 rounded-xl bg-[#151820] border border-[#272B35] flex items-center justify-center text-[#60A5FA] mb-4">
                        <Music className="w-6 h-6" strokeWidth={1.75} />
                      </div>
                      <p className="text-sm font-medium text-[#F3F4F6] mb-1 truncate max-w-full">
                        {item.name}
                      </p>
                      <p className="text-xs font-mono tabular-nums text-[#7F8796] mb-4">
                        {item.technicalTag || item.sizeFormatted}
                      </p>
                      {audioSource && <audio src={audioSource} controls className="w-full h-10" />}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      <FileText className="w-8 h-8 text-[#A1A8B5] mb-2" strokeWidth={1.5} />
                      <span className="text-sm font-medium text-[#F3F4F6]">{item.formatBadge}</span>
                    </div>
                  )}

                  <AnimatePresence>
                    {cropBoxStyle && (
                      <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={STATOR_SPRING.gentle}
                        aria-hidden="true"
                        style={cropBoxStyle}
                        className="pointer-events-none absolute border-2 border-dashed border-[#60A5FA] shadow-[0_0_0_9999px_rgba(0,0,0,0.48)] flex items-end justify-end p-2"
                      >
                        <span className="px-1.5 py-0.5 rounded bg-black/85 text-white text-[10px] font-mono tabular-nums">
                          {localSettings.aspectCrop}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Interactive Darkroom Filmstrip (when 2+ files are staged) */}
        {queue.length > 1 && (
          <div className="px-4 sm:px-6 pb-3 pt-1 flex items-center gap-2 overflow-x-auto no-scrollbar border-t border-[#181B22]">
            {queue.map((q) => {
              const isSelected = q.id === item.id;
              const thumb = q.typeCategory === 'image' ? q.outputUrl || q.previewUrl : undefined;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => onSelectActiveItem(q.id)}
                  className={`relative h-10 px-2 rounded-lg flex items-center gap-2 shrink-0 cursor-pointer transition-colors ${
                    isSelected
                      ? 'text-white bg-[#171A23]'
                      : 'text-[#8E95A5] hover:text-[#E6E8ED] hover:bg-[#13151C]'
                  }`}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="stator-filmstrip-active"
                      transition={STATOR_SPRING.tactile}
                      aria-hidden="true"
                      className="absolute inset-0 rounded-lg border border-[#3B82F6] pointer-events-none"
                    />
                  )}
                  <div className="w-6 h-6 rounded bg-[#0E1015] border border-[#242834] overflow-hidden flex items-center justify-center shrink-0">
                    {thumb ? (
                      <img src={thumb} alt="" className="w-full h-full object-cover" />
                    ) : q.typeCategory === 'video' ? (
                      <Video className="w-3 h-3" />
                    ) : q.typeCategory === 'audio' ? (
                      <Music className="w-3 h-3" />
                    ) : (
                      <FileImage className="w-3 h-3" />
                    )}
                  </div>
                  <span className="text-[11px] font-medium max-w-[110px] truncate">{q.name}</span>
                  <span className="text-[10px] font-mono text-[#60A5FA]">
                    {q.status === 'completed' ? '✓' : q.targetFormat}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* HORIZONTAL FLOATING HUD CONTROL DOCK */}
      <div className="border-t border-[var(--stator-border)] bg-[var(--stator-surface)] px-4 sm:px-6 py-4 space-y-4">
        {isError && (
          <p className="text-xs font-mono text-[var(--stator-danger)]">
            {item.errorMessage || 'Transcode failed cleanly'}
          </p>
        )}

        {isConverting && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono tabular-nums">
              <span className="text-[var(--stator-fg)] font-medium">
                {wasmLoadProgress && item.progress <= 25
                  ? wasmLoadProgress
                  : `Encoding ${item.progress}%`}
              </span>
              <span className="text-[var(--stator-fg-subtle)]">
                {[item.speed, item.eta].filter(Boolean).join(' · ') || 'Local WebAssembly'}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-[var(--stator-surface-2)] overflow-hidden">
              <div
                className="h-full w-full origin-left bg-[var(--stator-accent)] transition-transform duration-150 ease-out"
                style={{
                  transform: `scaleX(${Math.max(0.04, Math.min(1, item.progress / 100))})`,
                }}
              />
            </div>
          </div>
        )}

        {/* Primary Horizontal Control Strip */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* 1. Output Format Pill Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            <span className="text-xs font-medium text-[var(--stator-fg-muted)] whitespace-nowrap">
              Format
            </span>
            <div className="flex flex-wrap items-center gap-1">
              {formatChoices.map((fmt) => {
                const disabled =
                  item.typeCategory === 'image' &&
                  ((fmt === 'AVIF' && !avifSupported) || (fmt === 'WEBP' && !webpSupported));
                return (
                  <button
                    key={fmt}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleFormatSelect(fmt)}
                    title={
                      disabled
                        ? `${fmt} native Canvas encoding unavailable in this browser`
                        : `Convert to ${fmt}`
                    }
                    className={`h-8 px-2.5 rounded-md text-xs font-mono transition-colors active:scale-[0.97] ${
                      disabled
                        ? 'opacity-40 cursor-not-allowed bg-[var(--stator-surface-2)] text-[var(--stator-fg-subtle)] border border-[var(--stator-border)]'
                        : localFormat === fmt
                        ? 'bg-[var(--stator-accent)] text-white font-medium cursor-pointer'
                        : 'bg-[var(--stator-surface-2)] hover:border-[var(--stator-border-strong)] text-[var(--stator-fg)] border border-[var(--stator-border)] cursor-pointer'
                    }`}
                  >
                    {fmt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Contextual Primary Parameter */}
          <div className="flex-1 max-w-md">
            {item.typeCategory === 'image' &&
              (localFormat === 'WEBP' || localFormat === 'JPEG' || localFormat === 'AVIF') && (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-[var(--stator-fg-muted)] whitespace-nowrap">
                    Quality
                  </span>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="1"
                    value={localSettings.imageQuality}
                    onChange={(e) => updateSetting('imageQuality', Number(e.target.value))}
                    style={{
                      background: `linear-gradient(to right, var(--stator-accent) ${qualityPercentage}%, var(--stator-border) ${qualityPercentage}%)`,
                    }}
                    className="flex-1 stator-slider"
                    aria-label="Image quality"
                  />
                  <span className="text-xs font-mono tabular-nums text-[var(--stator-accent-fg)] font-semibold w-10 text-right">
                    {localSettings.imageQuality}%
                  </span>
                </div>
              )}

            {item.typeCategory === 'video' && !isAudioExtraction && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-medium text-[var(--stator-fg-muted)] mr-1">
                  Profile
                </span>
                {[
                  { id: 'lossless', label: 'Copy' },
                  { id: 'high', label: 'High (CRF 18)' },
                  { id: 'balanced', label: 'Balanced (CRF 23)' },
                  { id: 'compact', label: 'Compact (CRF 28)' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => updateSetting('videoBitrate', p.id as any)}
                    className={`h-8 px-2.5 rounded-md text-xs font-mono border cursor-pointer transition-colors whitespace-nowrap active:scale-[0.97] ${
                      localSettings.videoBitrate === p.id
                        ? 'bg-[var(--stator-accent-soft)] border-[var(--stator-accent)] text-[var(--stator-fg)] font-medium'
                        : 'bg-[var(--stator-surface-2)] border-[var(--stator-border)] text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}

            {(item.typeCategory === 'audio' || isAudioExtraction) && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-[var(--stator-fg-muted)] whitespace-nowrap">
                  Bitrate
                </span>
                <div className="flex-1">
                  <CustomSelect
                    value={localSettings.audioBitrate}
                    onChange={(bitrate) => updateSetting('audioBitrate', bitrate as any)}
                    options={[
                      { value: '320k', label: '320 kbps · Studio Master' },
                      { value: '256k', label: '256 kbps · High Fidelity' },
                      { value: '192k', label: '192 kbps · Standard' },
                      { value: '128k', label: '128 kbps · Web' },
                      { value: '64k', label: '64 kbps · Voice Compact' },
                    ]}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3. Progressive Disclosure Shelf Trigger + Primary Action CTA */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => setShowAdvancedShelf((prev) => !prev)}
              aria-expanded={showAdvancedShelf}
              className={`min-h-[40px] px-3.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap active:scale-[0.98] ${
                showAdvancedShelf
                  ? 'bg-[var(--stator-accent-soft)] border-[var(--stator-accent)] text-[var(--stator-accent-fg)]'
                  : 'bg-[var(--stator-surface-2)] hover:bg-[var(--stator-border)] border-[var(--stator-border)] text-[var(--stator-fg)]'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Framing &amp; Options</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const url = encodePresetRecipeUrl({
                  name: `${localFormat} Preset`,
                  targetFormat: localFormat,
                  settings: localSettings,
                });
                navigator.clipboard
                  ?.writeText(url)
                  .then(() => {
                    setCopiedLink(true);
                    window.setTimeout(() => setCopiedLink(false), 2000);
                  })
                  .catch(() => {});
              }}
              className="min-h-[40px] px-3 rounded-lg bg-[var(--stator-surface-2)] hover:bg-[var(--stator-border)] border border-[var(--stator-border)] text-xs font-medium text-[var(--stator-fg)] inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap active:scale-[0.98]"
              title="Copy shareable preset URL"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[var(--stator-success)]" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Share</span>
                </>
              )}
            </button>

            {isReady && (
              <button
                type="button"
                onClick={handleConvertNow}
                className="min-h-[40px] px-5 rounded-lg bg-[var(--stator-accent)] hover:bg-[var(--stator-accent-hover)] text-white text-[13px] font-medium inline-flex items-center gap-2 cursor-pointer transition-colors shadow-xs whitespace-nowrap active:scale-[0.98]"
              >
                {item.typeCategory === 'image' ? (
                  <ArrowRight className="w-4 h-4" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-white" />
                )}
                <span>Convert to {localFormat}</span>
              </button>
            )}

            {isConverting && (
              <button
                type="button"
                onClick={() => onCancelConversion(item.id)}
                className="min-h-[40px] px-4 rounded-lg bg-[var(--stator-surface-2)] hover:bg-[var(--stator-border)] border border-[var(--stator-border)] text-[var(--stator-fg)] text-[13px] font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap active:scale-[0.98]"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
            )}

            {isCompleted && (
              <>
                <button
                  type="button"
                  onClick={handleConvertNow}
                  className="min-h-[40px] px-3.5 rounded-lg bg-[var(--stator-surface-2)] hover:bg-[var(--stator-border)] border border-[var(--stator-border)] text-xs font-medium text-[var(--stator-fg)] cursor-pointer transition-colors whitespace-nowrap active:scale-[0.98]"
                >
                  Re-encode
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="min-h-[40px] px-5 rounded-lg bg-[var(--stator-accent)] hover:bg-[var(--stator-accent-hover)] text-white text-[13px] font-medium inline-flex items-center gap-2 cursor-pointer transition-colors shadow-xs whitespace-nowrap active:scale-[0.98]"
                >
                  <Download className="w-4 h-4" />
                  <span>Download {localFormat}</span>
                </button>
              </>
            )}

            {isError && (
              <button
                type="button"
                onClick={handleConvertNow}
                className="min-h-[40px] px-4 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-[var(--stator-danger)] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap active:scale-[0.98]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            )}
          </div>
        </div>

        {/* Animated Progressive-Disclosure Shelf */}
        <AnimatePresence initial={false}>
          {showAdvancedShelf && (
            <motion.div
              key="advanced-shelf"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={STATOR_TRANSITION.drawer}
              className="overflow-hidden"
            >
              <div className="pt-4 border-t border-[var(--stator-border)] grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
                {/* Column 1: Resolution Scaling or Audio Channels */}
                <div>
                  {item.typeCategory === 'image' ||
                  (item.typeCategory === 'video' && !isAudioExtraction) ? (
                    <>
                      <span className="font-medium text-[var(--stator-fg)] block mb-2">
                        Resolution Scale
                      </span>
                      <div className="grid grid-cols-5 gap-1">
                        {[
                          { id: 'original', label: 'Orig' },
                          { id: '4K', label: '4K' },
                          { id: '2K', label: '2K' },
                          { id: '1080p', label: '1080p' },
                          { id: '720p', label: '720p' },
                        ].map((res) => {
                          const activeVal =
                            item.typeCategory === 'image'
                              ? localSettings.imageResize
                              : localSettings.videoResolution;
                          return (
                            <button
                              key={res.id}
                              type="button"
                              onClick={() =>
                                updateSetting(
                                  item.typeCategory === 'image' ? 'imageResize' : 'videoResolution',
                                  res.id as any
                                )
                              }
                              className={`py-1.5 font-mono rounded-md border transition-colors cursor-pointer active:scale-[0.97] ${
                                activeVal === res.id
                                  ? 'bg-[var(--stator-accent)] text-white border-transparent font-medium'
                                  : 'bg-[var(--stator-surface-2)] text-[var(--stator-fg)] border-[var(--stator-border)]'
                              }`}
                            >
                              {res.label}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="font-medium text-[var(--stator-fg)] block mb-2">
                        Audio Channels
                      </span>
                      <CustomSelect
                        value={localSettings.audioChannels || 'stereo'}
                        onChange={(ch) => updateSetting('audioChannels', ch as any)}
                        options={[
                          { value: 'stereo', label: 'Stereo (2 Channels)' },
                          { value: 'mono', label: 'Mono (1 Channel)' },
                        ]}
                      />
                    </>
                  )}
                </div>

                {/* Column 2: Aspect Crop & Video Trim or Max Size Budget */}
                <div>
                  {item.typeCategory === 'video' && !isAudioExtraction ? (
                    <div className="space-y-2.5">
                      <div>
                        <span className="font-medium text-[var(--stator-fg)] block mb-1.5">
                          Aspect Crop &amp; Trim (s)
                        </span>
                        <div className="grid grid-cols-5 gap-1 mb-2">
                          {[
                            { id: 'original', label: 'Orig' },
                            { id: '9:16', label: '9:16' },
                            { id: '1:1', label: '1:1' },
                            { id: '4:5', label: '4:5' },
                            { id: '16:9', label: '16:9' },
                          ].map((crop) => (
                            <button
                              key={crop.id}
                              type="button"
                              onClick={() => updateSetting('aspectCrop', crop.id as any)}
                              className={`py-1 font-mono rounded-md border cursor-pointer transition-colors active:scale-[0.97] ${
                                (localSettings.aspectCrop || 'original') === crop.id
                                  ? 'bg-[var(--stator-accent)] text-white border-transparent font-medium'
                                  : 'bg-[var(--stator-surface-2)] text-[var(--stator-fg)] border-[var(--stator-border)]'
                              }`}
                            >
                              {crop.label}
                            </button>
                          ))}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="number"
                            min={0}
                            step={0.5}
                            placeholder="Start (s)"
                            value={localSettings.trimStart ?? 0}
                            onChange={(e) =>
                              updateSetting('trimStart', Math.max(0, Number(e.target.value)))
                            }
                            className="h-8 px-2 rounded-md bg-[var(--stator-surface-2)] border border-[var(--stator-border)] font-mono text-[var(--stator-fg)]"
                          />
                          <input
                            type="number"
                            min={0}
                            step={0.5}
                            placeholder="End (Full)"
                            value={localSettings.trimEnd ?? ''}
                            onChange={(e) =>
                              updateSetting(
                                'trimEnd',
                                e.target.value === ''
                                  ? undefined
                                  : Math.max(0, Number(e.target.value))
                              )
                            }
                            className="h-8 px-2 rounded-md bg-[var(--stator-surface-2)] border border-[var(--stator-border)] font-mono text-[var(--stator-fg)]"
                          />
                          <input
                            type="number"
                            min={0.5}
                            step={1}
                            placeholder="Max MB"
                            value={localSettings.targetMaxSizeMb ?? ''}
                            onChange={(e) =>
                              updateSetting(
                                'targetMaxSizeMb',
                                e.target.value === ''
                                  ? undefined
                                  : Math.max(0.5, Number(e.target.value))
                              )
                            }
                            className="h-8 px-2 rounded-md bg-[var(--stator-surface-2)] border border-[var(--stator-border)] font-mono text-[var(--stator-fg)]"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="font-medium text-[var(--stator-fg)] block">
                        Target Max Size Budget (MB, optional)
                      </label>
                      <input
                        type="number"
                        min={0.05}
                        step={0.1}
                        placeholder="Auto (Unconstrained)"
                        value={localSettings.targetMaxSizeMb ?? ''}
                        onChange={(e) =>
                          updateSetting(
                            'targetMaxSizeMb',
                            e.target.value === ''
                              ? undefined
                              : Math.max(0.05, Number(e.target.value))
                          )
                        }
                        className="w-full h-8 px-2.5 rounded-md bg-[var(--stator-surface-2)] border border-[var(--stator-border)] font-mono tabular-nums text-[var(--stator-fg)]"
                      />
                    </div>
                  )}
                </div>

                {/* Column 3: Privacy EXIF, Alpha & Audio Normalization Toggles */}
                <div className="space-y-2.5 flex flex-col justify-center">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--stator-fg)]">
                      Strip EXIF &amp; Container Metadata
                    </span>
                    <ToggleSwitch
                      checked={Boolean(localSettings.stripMetadata)}
                      onChange={(next) => updateSetting('stripMetadata', next)}
                      ariaLabel="Strip Metadata"
                    />
                  </div>

                  {item.typeCategory === 'image' && (
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--stator-fg)]">Preserve Alpha Channel</span>
                      <ToggleSwitch
                        checked={Boolean(localSettings.preserveTransparency)}
                        onChange={(next) => updateSetting('preserveTransparency', next)}
                        ariaLabel="Preserve Alpha Channel"
                      />
                    </div>
                  )}

                  {(item.typeCategory === 'video' || item.typeCategory === 'audio') && (
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--stator-fg)] inline-flex items-center gap-1.5">
                        <Volume2 className="w-3.5 h-3.5 text-[var(--stator-accent-fg)]" />
                        <span>Loudness Normalize (-16 LUFS)</span>
                      </span>
                      <ToggleSwitch
                        checked={Boolean(localSettings.normalizeAudio)}
                        onChange={(next) => updateSetting('normalizeAudio', next)}
                        ariaLabel="Loudness Normalize"
                      />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};
