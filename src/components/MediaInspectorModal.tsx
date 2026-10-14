import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  SlidersHorizontal,
  Play,
  Check,
  Download,
  Video,
  Music,
  FileText,
  RotateCcw,
  Loader2,
  Lock,
} from 'lucide-react';
import {
  QueueItem,
  PresetSettings,
  DEFAULT_PRESET_SETTINGS,
} from '../types/queue';
import { CustomSelect } from './CustomSelect.tsx';
import { calculateTargetDimensions } from '../utils/converter.ts';
import { resolutionToResizeKey } from '../lib/presets.ts';
import { useLicense } from '../lib/license.ts';

interface MediaInspectorModalProps {
  isOpen: boolean;
  item: QueueItem | null;
  onClose: () => void;
  onUpdateTargetFormat: (id: string, targetFormat: string) => void;
  onUpdatePresetSettings: (id: string, settings: PresetSettings) => void;
  onStartConversion: (id: string, overrideFormat?: string, overrideSettings?: PresetSettings) => void;
  onCancelConversion: (id: string) => void;
}

// Fallback high-resolution preview SVG for demo camera shoot
const DEMO_PREVIEW_IMG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2318181b"/><stop offset="50%" stop-color="%2309090b"/><stop offset="100%" stop-color="%23121214"/></linearGradient></defs><rect width="100%" height="100%" fill="url(%23bg)"/><circle cx="600" cy="360" r="140" fill="%2327272a"/><circle cx="600" cy="360" r="110" fill="%2318181b"/><circle cx="600" cy="360" r="60" fill="%233f3f46"/><circle cx="585" cy="345" r="16" fill="%23ffffff" opacity="0.8"/><text x="600" y="620" font-family="system-ui, sans-serif" font-size="26" font-weight="600" fill="%23ffffff" text-anchor="middle">Sony Alpha 7R V (6000 × 4000 RAW)</text><text x="600" y="660" font-family="system-ui, sans-serif" font-size="16" fill="%23a1a1aa" text-anchor="middle">50mm f/1.2 GM, ISO 100, 1/500s, 14-bit Uncompressed</text></svg>`;

function calculateAspectRatio(w: number, h: number): string {
  if (!w || !h) return 'N/A';
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(w, h);
  const ratioW = w / divisor;
  const ratioH = h / divisor;

  // Recognizable standard ratios
  if ((ratioW === 16 && ratioH === 9) || (w === 1920 && h === 1080) || (w === 3840 && h === 2160)) return '16:9';
  if ((ratioW === 4 && ratioH === 3) || (w === 1024 && h === 768)) return '4:3';
  if ((ratioW === 3 && ratioH === 2) || (w === 1200 && h === 800) || (w === 6000 && h === 4000)) return '3:2';
  if (ratioW === 1 && ratioH === 1) return '1:1';
  if (ratioW === 9 && ratioH === 16) return '9:16 (Vertical)';

  if (ratioW <= 30 && ratioH <= 30) {
    return `${ratioW}:${ratioH}`;
  }
  return `${(w / h).toFixed(2)}:1`;
}

export const MediaInspectorModal: React.FC<MediaInspectorModalProps> = ({
  isOpen,
  item,
  onClose,
  onUpdateTargetFormat,
  onUpdatePresetSettings,
  onStartConversion,
  onCancelConversion,
}) => {
  const { isPro, openProModal } = useLicense();
  const [localSettings, setLocalSettings] = useState<PresetSettings>(DEFAULT_PRESET_SETTINGS);
  const [localFormat, setLocalFormat] = useState<string>('WEBP');
  const [naturalWidth, setNaturalWidth] = useState<number | null>(null);
  const [naturalHeight, setNaturalHeight] = useState<number | null>(null);
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      const timer = setTimeout(() => setIsVisible(true), 15);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setIsRendered(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Sync state when item changes or modal opens
  useEffect(() => {
    if (item) {
      const mergedSettings: PresetSettings = {
        ...DEFAULT_PRESET_SETTINGS,
        ...(item.presetSettings || {}),
      };
      if (item.quality !== undefined) {
        mergedSettings.imageQuality = item.quality;
      }
      if (item.resolution !== undefined) {
        const resizeKey = resolutionToResizeKey(item.resolution);
        mergedSettings.imageResize = resizeKey;
        mergedSettings.videoResolution = resizeKey === 'custom' ? 'original' : (resizeKey as any);
      }
      if (item.stripExif !== undefined) {
        mergedSettings.stripMetadata = item.stripExif;
      }

      setLocalSettings(mergedSettings);
      setLocalFormat(item.targetFormat || (item.typeCategory === 'image' ? 'WEBP' : item.typeCategory === 'video' ? 'MP4' : 'MP3'));

      // If dimensions exist on item, parse them
      if (item.dimensions) {
        const parts = item.dimensions.split('×').map((s) => parseInt(s.trim(), 10));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          setNaturalWidth(parts[0]);
          setNaturalHeight(parts[1]);
        }
      } else {
        setNaturalWidth(null);
        setNaturalHeight(null);
      }
    }
  }, [item]);

  // Dynamically calculate natural dimensions for images or videos
  useEffect(() => {
    if (!item) return;

    if (item.typeCategory === 'image') {
      const previewSrc =
        item.previewUrl ||
        (item.file && item.file.type.startsWith('image/') ? URL.createObjectURL(item.file) : null) ||
        (item.name.toLowerCase().includes('portrait') || item.name.toLowerCase().includes('raw') ? DEMO_PREVIEW_IMG : null);

      if (previewSrc) {
        const img = new Image();
        img.onload = () => {
          setNaturalWidth(img.naturalWidth);
          setNaturalHeight(img.naturalHeight);
        };
        img.src = previewSrc;
      }
    } else if (item.typeCategory === 'video') {
      if (item.file) {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          setNaturalWidth(video.videoWidth || 3840);
          setNaturalHeight(video.videoHeight || 2160);
        };
        video.src = URL.createObjectURL(item.file);
      } else {
        setNaturalWidth(3840);
        setNaturalHeight(2160);
      }
    }
  }, [item]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isRendered || !item) return null;

  const handleFormatSelect = (fmt: string) => {
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

  const handleDownload = () => {
    if (!item.outputUrl) return;
    const a = document.createElement('a');
    a.href = item.outputUrl;
    a.download = item.outputName || `${item.name.replace(/\.[^/.]+$/, '')}.${localFormat.toLowerCase()}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const previewSource =
    item.outputUrl ||
    item.previewUrl ||
    (item.file && item.file.type.startsWith('image/') ? URL.createObjectURL(item.file) : null) ||
    DEMO_PREVIEW_IMG;

  const videoSource = item.file ? URL.createObjectURL(item.file) : item.outputUrl;
  const audioSource = item.file ? URL.createObjectURL(item.file) : item.outputUrl;

  const mimeType = item.file?.type || (
    item.typeCategory === 'image'
      ? `image/${item.name.split('.').pop()?.toLowerCase() || 'jpeg'}`
      : item.typeCategory === 'video'
      ? `video/${item.name.split('.').pop()?.toLowerCase() || 'mp4'}`
      : item.typeCategory === 'audio'
      ? `audio/${item.name.split('.').pop()?.toLowerCase() || 'mpeg'}`
      : 'application/octet-stream'
  );

  const aspectRatio =
    naturalWidth && naturalHeight ? calculateAspectRatio(naturalWidth, naturalHeight) : 'N/A';

  const is4K =
    (item.typeCategory === 'image' && localSettings.imageResize === '4K') ||
    (item.typeCategory === 'video' && localSettings.videoResolution === '4K');
  const is2K =
    (item.typeCategory === 'image' && localSettings.imageResize === '2K') ||
    (item.typeCategory === 'video' && localSettings.videoResolution === '2K');

  const effectiveRes =
    item.typeCategory === 'image'
      ? localSettings.imageResize
      : localSettings.videoResolution;
  const baseW = naturalWidth || (item.typeCategory === 'video' ? 1920 : 1280);
  const baseH = naturalHeight || (item.typeCategory === 'video' ? 1080 : 720);
  const targetDims = calculateTargetDimensions(
    baseW,
    baseH,
    effectiveRes,
    localSettings.customWidth,
    localSettings.customHeight
  );

  const isConverting = item.status === 'converting';
  const isCompleted = item.status === 'completed';
  const isError = item.status === 'error';
  const isReady = item.status === 'ready' || (!isConverting && !isCompleted && !isError);

  const isDarkMode =
    typeof document !== 'undefined'
      ? document.documentElement.classList.contains('dark')
      : true;

  return (
    <div
      ref={backdropRef}
      role="dialog"
      aria-modal="true"
      data-state={isVisible ? 'open' : 'closed'}
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 dark:bg-black/80 backdrop-blur-sm transition-opacity duration-200 ease-out opacity-0 data-[state=open]:opacity-100 ${
        isVisible ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
    >
      <div
        data-state={isVisible ? 'open' : 'closed'}
        className="relative w-full max-w-4xl bg-white border-zinc-200 text-zinc-900 dark:bg-[#121214] dark:border-zinc-800 dark:text-zinc-100 border rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-all duration-200 opacity-0 scale-[0.98] data-[state=open]:opacity-100 data-[state=open]:scale-100"
        style={{
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121214]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-white whitespace-nowrap">
                Media Inspector
              </h2>
              <span className="px-2.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-700 dark:text-zinc-300 truncate max-w-[200px] sm:max-w-xs">
                {item.name}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Two-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-200 dark:divide-zinc-800 overflow-y-auto flex-1">
          {/* ========================================================================= */}
          {/* LEFT COLUMN: Live Preview & File Specs */}
          {/* ========================================================================= */}
          <div className="p-5 sm:p-6 flex flex-col space-y-4 bg-white dark:bg-[#121214]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Live Source Preview
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 uppercase">
                {item.typeCategory}
              </span>
            </div>

            {/* Live Preview Viewport */}
            <div className="relative w-full rounded-md overflow-hidden border border-zinc-200 dark:border-zinc-800 flex items-center justify-center min-h-[220px] max-h-[280px] p-2 bg-zinc-100 dark:bg-[#09090b]">
              {item.typeCategory === 'image' ? (
                <img
                  src={previewSource}
                  alt={item.name}
                  className="max-h-[260px] w-auto max-w-full object-contain rounded-md shadow-md"
                />
              ) : item.typeCategory === 'video' ? (
                videoSource ? (
                  <video
                    src={videoSource}
                    controls
                    className="max-h-[260px] w-full rounded-md object-contain bg-black"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-14 h-14 rounded-md bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 mb-2">
                      <Video className="w-7 h-7" />
                    </div>
                    <span className="text-sm font-semibold text-zinc-900 dark:text-white">Video Master</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">3840 × 2160, 60 fps</span>
                  </div>
                )
              ) : item.typeCategory === 'audio' ? (
                <div className="flex flex-col items-center justify-center py-6 w-full">
                  <div className="w-14 h-14 rounded-md bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 mb-3 shadow-md">
                    <Music className="w-7 h-7" />
                  </div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">Audio Stream</p>
                  {audioSource && (
                    <audio src={audioSource} controls className="w-full mt-1 h-9" />
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10">
                  <div className="w-14 h-14 rounded-md bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400 mb-2">
                    <FileText className="w-7 h-7" />
                  </div>
                  <span className="text-sm font-semibold text-zinc-900 dark:text-white">{item.formatBadge} Document</span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">{item.sizeFormatted}</span>
                </div>
              )}
            </div>

            {/* Metadata Footer beneath preview */}
            <div className="rounded-md bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-500 dark:text-zinc-400">Source Resolution</span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200 font-medium">
                  {naturalWidth && naturalHeight ? `${naturalWidth} × ${naturalHeight}` : item.dimensions || 'Dynamic Audio/Vector'}
                </span>
              </div>
              {(item.typeCategory === 'image' || item.typeCategory === 'video') && (
                <div className="flex items-center justify-between pb-1.5 border-b border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-500 dark:text-zinc-400">Target Output</span>
                  <div className="flex items-center gap-1.5">
                    {is4K && (
                      <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-[10px] font-medium">
                        4K UHD (Lanczos)
                      </span>
                    )}
                    {is2K && (
                      <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-[10px] font-medium">
                        2K QHD (Lanczos)
                      </span>
                    )}
                    <span className="font-mono text-zinc-800 dark:text-zinc-200 font-medium">
                      {targetDims.w} × {targetDims.h}
                    </span>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between pb-1.5 border-b border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-500 dark:text-zinc-400">Aspect Ratio</span>
                <span className="font-mono text-zinc-900 dark:text-white font-medium">{aspectRatio}</span>
              </div>
              <div className="flex items-center justify-between pb-1.5 border-b border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-500 dark:text-zinc-400">File Size</span>
                <span className="font-mono text-zinc-900 dark:text-white font-medium">{item.sizeFormatted}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">MIME Type</span>
                <span className="font-mono text-zinc-800 dark:text-zinc-300 font-medium truncate max-w-[200px]" title={mimeType}>
                  {mimeType}
                </span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RIGHT COLUMN: Format & Quality Controls */}
          {/* ========================================================================= */}
          <div className="p-5 sm:p-6 flex flex-col justify-between space-y-5 bg-white dark:bg-[#121214]">
            <div className="space-y-5">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Encoding & Quality Controls
                </span>
              </div>

              {/* IMAGE CONTROLS */}
              {item.typeCategory === 'image' && (
                <div className="space-y-4">
                  {/* Target format */}
                  <div>
                    <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-300 block mb-2">
                      Target Format
                    </label>
                    <div className="grid grid-cols-4 gap-2 p-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md">
                      {['WEBP', 'PNG', 'JPEG', 'AVIF'].map((fmt) => (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => handleFormatSelect(fmt)}
                          className={`py-1.5 text-xs font-medium rounded-md transition-colors text-center cursor-pointer ${
                            localFormat === fmt
                              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold shadow-xs'
                              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800'
                          }`}
                        >
                          {fmt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quality slider */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">Quality Factor</span>
                      <span className="font-mono text-zinc-900 dark:text-zinc-200 font-medium">
                        {localSettings.imageQuality}% ({localSettings.imageQuality >= 90 ? 'Lossless Pro' : localSettings.imageQuality >= 75 ? 'Balanced' : 'High Compression'})
                      </span>
                    </div>
                    {(() => {
                      const percentage = ((localSettings.imageQuality - 10) / (100 - 10)) * 100;
                      return (
                        <input
                          type="range"
                          min="10"
                          max="100"
                          step="1"
                          value={localSettings.imageQuality}
                          onChange={(e) => updateSetting('imageQuality', Number(e.target.value))}
                          style={{
                            background: isDarkMode
                              ? `linear-gradient(to right, #f4f4f5 ${percentage}%, #27272a ${percentage}%)`
                              : `linear-gradient(to right, #18181b ${percentage}%, #e4e4e7 ${percentage}%)`,
                          }}
                          className="w-full h-2 rounded-md cursor-pointer appearance-none outline-none transition-[background] duration-100 ease-out [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-zinc-900 dark:[&::-webkit-slider-thumb]:bg-zinc-100 [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-100 [&::-webkit-slider-thumb]:active:scale-110 [&::-webkit-slider-thumb]:shadow-sm [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-zinc-900 dark:[&::-moz-range-thumb]:bg-zinc-100 [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:duration-100 [&::-moz-range-thumb]:active:scale-110"
                        />
                      );
                    })()}
                    <div className="flex justify-between items-center text-[10px] text-zinc-500 dark:text-zinc-400 font-mono mt-1">
                      <span>10% (Maximum Compression)</span>
                      <span className="text-zinc-400 dark:text-zinc-500">90% Default</span>
                      <span>100% (Lossless Pro)</span>
                    </div>
                  </div>

                  {/* Resolution scaler */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-300">
                        Resolution Scaling
                      </span>
                      {(localSettings.imageResize === '4K' || localSettings.imageResize === '2K') && (
                        <span className="text-[11px] font-mono text-zinc-700 dark:text-zinc-300">
                          {localSettings.imageResize === '4K' ? '4K UHD (Lanczos)' : '2K QHD (Lanczos)'}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                      {[
                        { id: 'original', label: 'Original', isGated: false },
                        { id: '4K', label: '4K (2160p)', isGated: true },
                        { id: '2K', label: '2K (1440p)', isGated: true },
                        { id: '1080p', label: '1080p', isGated: false },
                        { id: '720p', label: '720p', isGated: false },
                      ].map((res) => {
                        const isLocked = !isPro && res.isGated;
                        const handleSelect = () => {
                          if (isLocked) {
                            openProModal('Resolution upscaling beyond 1080p requires Stator Pro.');
                            return;
                          }
                          updateSetting('imageResize', res.id as any);
                        };

                        return (
                          <button
                            key={res.id}
                            type="button"
                            onClick={handleSelect}
                            className={`py-1.5 px-1 text-xs font-medium rounded-md border transition-colors cursor-pointer text-center flex items-center justify-center ${
                              localSettings.imageResize === res.id
                                ? 'bg-zinc-900 text-white font-semibold border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100 shadow-xs'
                                : isLocked
                                ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:border-zinc-800'
                            }`}
                          >
                            <span>{res.label}</span>
                            {isLocked && (
                              <Lock className="w-3 h-3 ml-1.5 inline-block text-zinc-400 dark:text-zinc-500 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between p-2.5 rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                      <div>
                        <span className="text-xs font-semibold text-zinc-900 dark:text-white block">Strip Metadata (EXIF)</span>
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400">Remove GPS coordinates, camera serial, and timestamps</span>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        data-state={localSettings.stripMetadata ? 'checked' : 'unchecked'}
                        aria-checked={localSettings.stripMetadata}
                        onClick={() => updateSetting('stripMetadata', !localSettings.stripMetadata)}
                        className={`w-9 h-5 rounded-md transition-colors duration-150 ease-out relative cursor-pointer p-0.5 ${
                          localSettings.stripMetadata ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-zinc-300 dark:bg-zinc-700'
                        }`}
                      >
                        <div
                          data-state={localSettings.stripMetadata ? 'checked' : 'unchecked'}
                          className="w-4 h-4 rounded-sm bg-white dark:bg-zinc-900 transition-transform duration-150 ease-out translate-x-0 data-[state=checked]:translate-x-4 shadow-xs"
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                      <div>
                        <span className="text-xs font-semibold text-zinc-900 dark:text-white block">Preserve Transparency</span>
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400">Keep alpha channel for PNG/WEBP outputs</span>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        data-state={localSettings.preserveTransparency ? 'checked' : 'unchecked'}
                        aria-checked={localSettings.preserveTransparency}
                        onClick={() => updateSetting('preserveTransparency', !localSettings.preserveTransparency)}
                        className={`w-9 h-5 rounded-md transition-colors duration-150 ease-out relative cursor-pointer p-0.5 ${
                          localSettings.preserveTransparency ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-zinc-300 dark:bg-zinc-700'
                        }`}
                      >
                        <div
                          data-state={localSettings.preserveTransparency ? 'checked' : 'unchecked'}
                          className="w-4 h-4 rounded-sm bg-white dark:bg-zinc-900 transition-transform duration-150 ease-out translate-x-0 data-[state=checked]:translate-x-4 shadow-xs"
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* VIDEO CONTROLS */}
              {item.typeCategory === 'video' && (
                <div className="space-y-4">
                  {/* Target format */}
                  <div>
                    <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-300 block mb-2">
                      Target Format
                    </label>
                    <div className="grid grid-cols-4 gap-2 p-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md">
                      {['MP4', 'WEBM', 'MKV', 'GIF'].map((fmt) => (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => handleFormatSelect(fmt)}
                          className={`py-1.5 text-xs font-medium rounded-md transition-colors text-center cursor-pointer ${
                            localFormat === fmt
                              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold shadow-xs'
                              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800'
                          }`}
                        >
                          {fmt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Preset profile */}
                  <div>
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-300 block mb-1.5">
                      Preset Profile
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'lossless', label: 'Lossless Pro' },
                        { id: 'high', label: 'High Quality' },
                        { id: 'balanced', label: 'Balanced' },
                        { id: 'compact', label: 'Compact' },
                      ].map((prof) => (
                        <button
                          key={prof.id}
                          type="button"
                          onClick={() => updateSetting('videoBitrate', prof.id as any)}
                          className={`py-1.5 px-2 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                            localSettings.videoBitrate === prof.id
                              ? 'bg-zinc-900 text-white font-semibold border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100 shadow-xs'
                              : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:border-zinc-800'
                          }`}
                        >
                          {prof.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Resolution scale */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-300">
                        Resolution Scaling
                      </span>
                      {(localSettings.videoResolution === '4K' || localSettings.videoResolution === '2K') && (
                        <span className="text-[11px] font-mono text-zinc-700 dark:text-zinc-300">
                          {localSettings.videoResolution === '4K' ? '4K UHD (Lanczos)' : '2K QHD (Lanczos)'}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                      {[
                        { id: 'original', label: 'Original', isGated: false },
                        { id: '4K', label: '4K (2160p)', isGated: true },
                        { id: '2K', label: '2K (1440p)', isGated: true },
                        { id: '1080p', label: '1080p', isGated: false },
                        { id: '720p', label: '720p', isGated: false },
                      ].map((res) => {
                        const isLocked = !isPro && res.isGated;
                        const handleSelect = () => {
                          if (isLocked) {
                            openProModal('Resolution upscaling beyond 1080p requires Stator Pro.');
                            return;
                          }
                          updateSetting('videoResolution', res.id as any);
                        };

                        return (
                          <button
                            key={res.id}
                            type="button"
                            onClick={handleSelect}
                            className={`py-1.5 px-1 text-xs font-medium rounded-md border transition-colors cursor-pointer text-center flex items-center justify-center ${
                              localSettings.videoResolution === res.id
                                ? 'bg-zinc-900 text-white font-semibold border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100 shadow-xs'
                                : isLocked
                                ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:border-zinc-800'
                            }`}
                          >
                            <span>{res.label}</span>
                            {isLocked && (
                              <Lock className="w-3 h-3 ml-1.5 inline-block text-zinc-400 dark:text-zinc-500 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Frame rate cap */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-300 block">
                      Frame Rate Cap
                    </span>
                    <CustomSelect
                      value={localSettings.fpsLimiter}
                      onChange={(fps) => updateSetting('fpsLimiter', fps as any)}
                      options={[
                        { value: 'original', label: 'Source FPS', description: 'Preserve input frame rate' },
                        { value: '60', label: '60 fps (Smooth)', description: 'High framerate' },
                        { value: '30', label: '30 fps (Standard)', description: 'Standard playback' },
                        { value: '24', label: '24 fps (Cinematic)', description: 'Motion picture rate' },
                      ]}
                    />
                  </div>

                  {/* Audio bitrate */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-300 block">
                      Audio Stream Bitrate
                    </span>
                    <CustomSelect
                      value={localSettings.videoAudioBitrate || 'original'}
                      onChange={(ab) => updateSetting('videoAudioBitrate', ab as any)}
                      options={[
                        { value: 'original', label: 'Keep Original Audio Stream' },
                        { value: '320k', label: '320 kbps (Studio Master)' },
                        { value: '192k', label: '192 kbps (High Fidelity)' },
                        { value: '128k', label: '128 kbps (Standard)' },
                        { value: 'mute', label: 'Mute Audio Track' },
                      ]}
                    />
                  </div>
                </div>
              )}

              {/* AUDIO CONTROLS */}
              {item.typeCategory === 'audio' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-300 block mb-2">
                      Target Audio Format
                    </label>
                    <div className="grid grid-cols-5 gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md">
                      {['MP3', 'WAV', 'AAC', 'OGG', 'FLAC'].map((fmt) => (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => handleFormatSelect(fmt)}
                          className={`py-1.5 text-xs font-medium rounded-md transition-colors text-center cursor-pointer ${
                            localFormat === fmt
                              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold shadow-xs'
                              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800'
                          }`}
                        >
                          {fmt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-300 block">
                      Audio Bitrate
                    </span>
                    <CustomSelect
                      value={localSettings.audioBitrate}
                      onChange={(bitrate) => updateSetting('audioBitrate', bitrate as any)}
                      options={[
                        { value: '320k', label: '320 kbps (Studio Master)' },
                        { value: '256k', label: '256 kbps (Very High Quality)' },
                        { value: '192k', label: '192 kbps (High Fidelity)' },
                        { value: '128k', label: '128 kbps (Standard)' },
                      ]}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-300 block">
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
                  </div>
                </div>
              )}

              {/* DOCUMENT / OTHER FALLBACK */}
              {item.typeCategory !== 'image' && item.typeCategory !== 'video' && item.typeCategory !== 'audio' && (
                <div className="space-y-4">
                  <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-300 block mb-2">
                    Target Format
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md">
                    {['PDF', 'TXT'].map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => handleFormatSelect(fmt)}
                        className={`py-1.5 text-xs font-medium rounded-md transition-colors text-center cursor-pointer ${
                          localFormat === fmt
                            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold shadow-xs'
                            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800'
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Left: Cancel button + dynamic output dimensions & badge */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700 rounded-md px-3 py-1.5 text-sm transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                {(item.typeCategory === 'image' || item.typeCategory === 'video') && (
                  <div className="flex items-center gap-2">
                    {is4K && (
                      <span className="px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium">
                        4K UHD (Lanczos)
                      </span>
                    )}
                    {is2K && (
                      <span className="px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium">
                        2K QHD (Lanczos)
                      </span>
                    )}
                    <span className="text-xs font-mono text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-900 px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-800">
                      Output: {targetDims.w} × {targetDims.h}
                    </span>
                  </div>
                )}
              </div>

              {/* Right: Convert Now utilitarian action button */}
              {isReady && (
                <button
                  type="button"
                  onClick={handleConvertNow}
                  className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white font-medium rounded-md px-4 py-2 text-sm flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
                >
                  <Play className="w-4 h-4 fill-white dark:fill-zinc-900" />
                  <span>Convert Now</span>
                </button>
              )}

              {isConverting && (
                <div className="flex items-center gap-3">
                  <div className="text-xs text-zinc-700 dark:text-zinc-300 font-mono font-medium flex items-center gap-1.5">
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-500 dark:text-zinc-400" />
                    <span>Converting: {item.progress}%</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onCancelConversion(item.id)}
                    className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700 rounded-md px-3 py-1.5 text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {isCompleted && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    <span>Converted</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white font-medium rounded-md px-4 py-2 text-sm flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5 stroke-[2]" />
                    <span>Download</span>
                  </button>
                </div>
              )}

              {isError && (
                <button
                  type="button"
                  onClick={handleConvertNow}
                  className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-red-300 dark:border-red-800 rounded-md px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
