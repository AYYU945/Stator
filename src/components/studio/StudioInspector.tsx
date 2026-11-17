import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  RotateCw,
  FlipHorizontal2,
  RotateCcw,
  AlertTriangle,
  Zap,
  Download,
  Loader2,
  Package,
  Captions,
  Upload,
  Camera,
  Music,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  DEFAULT_ADJUSTMENTS,
  DEFAULT_PRESET_SETTINGS,
  PresetSettings,
  QueueItem,
  RotationDegrees,
  SubtitleCue,
  TARGET_FORMAT_OPTIONS,
} from '../../types/queue.ts';
import {
  applyCompressionGoalToPreset,
  evaluateTargetSizeFeasibility,
} from '../../utils/compressionEngine.ts';
import { probeImageEncoderSupport } from '../../utils/formatCapabilities.ts';
import { parseSubtitlesText, serializeCuesToSrt } from '../../utils/subtitles.ts';
import { ToggleSwitch } from '../ui/Primitives.tsx';

export interface StudioInspectorProps {
  item: QueueItem | null;
  onUpdateTargetFormat: (id: string, format: string) => void;
  onUpdatePresetSettings: (id: string, settings: PresetSettings, label?: string) => void;
  onStartConversion: (id: string) => void;
  onCancelConversion: (id: string) => void;
  onReconnectFile: (id: string, file: File) => void;
  onGenerateIconPack: (item: QueueItem) => void;
  onExtractVideoFrame?: (item: QueueItem) => void;
  onReplaceVideoAudio?: (itemId: string, audioFile: File) => void;
  onToast: (msg: string) => void;
}

export const StudioInspector: React.FC<StudioInspectorProps> = ({
  item,
  onUpdateTargetFormat,
  onUpdatePresetSettings,
  onStartConversion,
  onCancelConversion,
  onReconnectFile,
  onGenerateIconPack,
  onExtractVideoFrame,
  onReplaceVideoAudio,
  onToast,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showTonePanel, setShowTonePanel] = useState(false);
  const [showWatermarkPanel, setShowWatermarkPanel] = useState(false);
  const [showSubtitlesPanel, setShowSubtitlesPanel] = useState(false);
  const [avifSupported, setAvifSupported] = useState(true);
  const [webpSupported, setWebpSupported] = useState(true);

  const reconnectInputRef = useRef<HTMLInputElement>(null);
  const subtitleInputRef = useRef<HTMLInputElement>(null);
  const replaceAudioInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    probeImageEncoderSupport('image/avif').then(setAvifSupported);
    probeImageEncoderSupport('image/webp').then(setWebpSupported);
  }, []);

  if (!item) {
    return (
      <div className="p-5 text-center space-y-2">
        <p className="text-xs font-medium text-[var(--stator-fg)]">No active asset</p>
        <p className="text-[11px] text-[var(--stator-fg-muted)]">
          Select or drop a media file to inspect its compression, crop, filter, and output settings.
        </p>
      </div>
    );
  }

  const preset: PresetSettings = item.presetSettings || { ...DEFAULT_PRESET_SETTINGS };
  const adjustments = preset.adjustments || { ...DEFAULT_ADJUSTMENTS };
  const watermark = preset.watermark || {
    enabled: false,
    text: '',
    position: 'bottom-right' as const,
    opacity: 0.75,
  };
  const formats = TARGET_FORMAT_OPTIONS[item.typeCategory] || [];

  const updatePreset = (patch: Partial<PresetSettings>, label: string) => {
    onUpdatePresetSettings(item.id, { ...preset, ...patch }, label);
  };

  const feasibility = evaluateTargetSizeFeasibility(
    item.typeCategory,
    preset.targetMaxSizeMb,
    item.durationSeconds,
    item.sizeBytes
  );

  const handleImportSubtitles = async (file: File) => {
    const text = await file.text();
    const parsed = parseSubtitlesText(text);
    if (parsed.length === 0) {
      onToast('No valid SRT or VTT cues found in that file.');
      return;
    }
    updatePreset({ subtitleCues: parsed }, 'Import subtitle cues');
    onToast(`Loaded ${parsed.length} subtitle cue${parsed.length === 1 ? '' : 's'}`);
  };

  const addManualSubtitleCue = () => {
    const existing = preset.subtitleCues || [];
    const lastEnd = existing.length > 0 ? existing[existing.length - 1].endSec : 0;
    const nextCue: SubtitleCue = {
      id: `cue-${Date.now()}`,
      startSec: Number(lastEnd.toFixed(1)),
      endSec: Number((lastEnd + 3).toFixed(1)),
      text: 'New caption',
    };
    updatePreset({ subtitleCues: [...existing, nextCue] }, 'Add subtitle cue');
  };

  return (
    <div className="flex flex-col h-full">
      <input
        ref={reconnectInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onReconnectFile(item.id, f);
          e.target.value = '';
        }}
      />
      <input
        ref={subtitleInputRef}
        type="file"
        accept=".srt,.vtt,text/plain"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleImportSubtitles(f);
          e.target.value = '';
        }}
      />
      <input
        ref={replaceAudioInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f && onReplaceVideoAudio) onReplaceVideoAudio(item.id, f);
          e.target.value = '';
        }}
      />

      {/* Scrollable Inspector Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Missing / Reconnect Banner */}
        {item.needsReconnect && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-2">
            <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Source File Not Cached</p>
                <p className="text-[11px] opacity-90 mt-0.5">
                  Large files are referenced cleanly without bloating IndexedDB. Reconnect{' '}
                  <span className="font-mono">{item.name}</span> to edit or export.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => reconnectInputRef.current?.click()}
              className="w-full h-8 rounded-md bg-amber-500 hover:bg-amber-600 text-black text-xs font-semibold cursor-pointer"
            >
              Reconnect Source File
            </button>
          </div>
        )}

        {/* Essential: Output Format & Compression Goal */}
        <section className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-[var(--stator-fg-muted)] mb-1.5">
              Output Format
            </label>
            <select
              value={item.targetFormat}
              onChange={(e) => onUpdateTargetFormat(item.id, e.target.value)}
              aria-label="Target output format"
              className="w-full h-9 px-2.5 rounded-lg bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-xs font-mono font-medium text-[var(--stator-fg)] cursor-pointer"
            >
              {formats.map((fmt) => {
                const disabled =
                  (fmt === 'AVIF' && !avifSupported) || (fmt === 'WEBP' && !webpSupported);
                return (
                  <option key={fmt} value={fmt} disabled={disabled}>
                    {fmt}
                    {disabled ? ' (Browser unsupported)' : ''}
                  </option>
                );
              })}
            </select>
            {item.typeCategory === 'image' && (!avifSupported || !webpSupported) && (
              <p className="mt-1 text-[11px] text-[var(--stator-fg-subtle)] leading-snug">
                {!avifSupported && !webpSupported
                  ? 'Native AVIF and WebP canvas encoding are unavailable in this browser.'
                  : !avifSupported
                  ? 'Native AVIF encoding is unavailable in this browser runtime; WebP, PNG, and JPEG remain full-speed.'
                  : 'Native WebP canvas encoding is unavailable in this browser runtime.'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[var(--stator-fg-muted)] mb-1.5">
              Compression Goal
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  { id: 'smaller', label: 'Smaller File' },
                  { id: 'balanced', label: 'Balanced' },
                  { id: 'highest', label: 'Highest Quality' },
                  { id: 'target-size', label: 'Target MB' },
                ] as const
              ).map((g) => {
                const active = (preset.compressionGoal || 'balanced') === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() =>
                      onUpdatePresetSettings(
                        item.id,
                        applyCompressionGoalToPreset(preset, g.id, item.typeCategory),
                        `Compression: ${g.label}`
                      )
                    }
                    className={`h-8 px-2 rounded-lg text-[11px] font-medium border cursor-pointer transition-colors ${
                      active
                        ? 'bg-[var(--stator-cta-bg)] border-transparent text-[var(--stator-cta-fg)]'
                        : 'bg-[var(--stator-surface-2)] border-[var(--stator-border-control)] text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)]'
                    }`}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>

            {preset.compressionGoal === 'target-size' && (
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0.5}
                    max={1500}
                    step={0.5}
                    value={preset.targetMaxSizeMb ?? 10}
                    onChange={(e) =>
                      updatePreset(
                        { targetMaxSizeMb: Math.max(0.5, Number(e.target.value) || 1) },
                        'Target size budget'
                      )
                    }
                    aria-label="Target maximum size in MB"
                    className="w-24 h-8 px-2 rounded-md bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-xs font-mono tabular-nums text-[var(--stator-fg)]"
                  />
                  <span className="text-xs font-mono text-[var(--stator-fg-muted)]">MB max</span>
                </div>
                {!feasibility.feasible && feasibility.warning && (
                  <p className="text-[11px] text-[var(--stator-warning)] leading-snug">
                    {feasibility.warning}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* IMAGE CONTROLS */}
        {item.typeCategory === 'image' && (
          <section className="space-y-3 pt-3 border-t border-[var(--stator-border)]">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-[var(--stator-fg-muted)] mb-1">
                  Resize
                </label>
                <select
                  value={preset.imageResize}
                  onChange={(e) => updatePreset({ imageResize: e.target.value as any }, 'Resize preset')}
                  className="w-full h-8 px-2 rounded-md bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-xs text-[var(--stator-fg)] cursor-pointer"
                >
                  <option value="original">Original</option>
                  <option value="4K">4K (2160p)</option>
                  <option value="2K">2K (1440p)</option>
                  <option value="1080p">1080p HD</option>
                  <option value="720p">720p Web</option>
                  <option value="custom">Custom W×H</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[var(--stator-fg-muted)] mb-1">
                  Aspect Crop
                </label>
                <select
                  value={preset.aspectCrop || 'original'}
                  onChange={(e) => updatePreset({ aspectCrop: e.target.value as any }, 'Aspect crop')}
                  className="w-full h-8 px-2 rounded-md bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-xs text-[var(--stator-fg)] cursor-pointer"
                >
                  <option value="original">Original</option>
                  <option value="1:1">1:1 Square</option>
                  <option value="4:5">4:5 Portrait</option>
                  <option value="9:16">9:16 Vertical</option>
                  <option value="16:9">16:9 Wide</option>
                </select>
              </div>
            </div>

            {preset.imageResize === 'custom' && (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={2}
                  max={8192}
                  value={preset.customWidth || 1920}
                  onChange={(e) => updatePreset({ customWidth: Number(e.target.value) || 1920 }, 'Custom width')}
                  placeholder="Width px"
                  aria-label="Custom width"
                  className="h-8 px-2 rounded-md bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-xs font-mono text-[var(--stator-fg)]"
                />
                <input
                  type="number"
                  min={2}
                  max={8192}
                  value={preset.customHeight || 1080}
                  onChange={(e) => updatePreset({ customHeight: Number(e.target.value) || 1080 }, 'Custom height')}
                  placeholder="Height px"
                  aria-label="Custom height"
                  className="h-8 px-2 rounded-md bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-xs font-mono text-[var(--stator-fg)]"
                />
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const nextRot = (((preset.rotation || 0) + 90) % 360) as RotationDegrees;
                  updatePreset({ rotation: nextRot }, 'Rotate 90°');
                }}
                className="flex-1 h-8 px-2.5 rounded-md bg-[var(--stator-surface-2)] hover:bg-[var(--stator-border)] border border-[var(--stator-border-control)] text-xs text-[var(--stator-fg)] inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Rotate ({preset.rotation || 0}°)</span>
              </button>
              <button
                type="button"
                onClick={() => updatePreset({ flipH: !preset.flipH }, 'Flip horizontal')}
                className={`flex-1 h-8 px-2.5 rounded-md border text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  preset.flipH
                    ? 'bg-[var(--stator-cta-bg)] border-transparent text-[var(--stator-cta-fg)]'
                    : 'bg-[var(--stator-surface-2)] border-[var(--stator-border-control)] text-[var(--stator-fg)]'
                }`}
              >
                <FlipHorizontal2 className="w-3.5 h-3.5" />
                <span>Flip H</span>
              </button>
            </div>

            {/* Tone & Filters Accordion */}
            <div className="rounded-lg border border-[var(--stator-border)] overflow-hidden">
              <button
                type="button"
                onClick={() => setShowTonePanel((v) => !v)}
                className="w-full px-3 py-2 bg-[var(--stator-surface-2)]/60 flex items-center justify-between text-xs font-medium text-[var(--stator-fg)] cursor-pointer"
              >
                <span>Tone &amp; Filters</span>
                {showTonePanel ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
              {showTonePanel && (
                <div className="p-3 space-y-2.5 text-[11px]">
                  {(
                    [
                      { key: 'exposure', label: 'Exposure', min: -50, max: 50 },
                      { key: 'contrast', label: 'Contrast', min: -50, max: 50 },
                      { key: 'saturation', label: 'Saturation', min: -100, max: 100 },
                      { key: 'temperature', label: 'Temperature', min: -50, max: 50 },
                      { key: 'sharpen', label: 'Sharpen', min: 0, max: 100 },
                      { key: 'blur', label: 'Blur (px)', min: 0, max: 12 },
                    ] as const
                  ).map((slider) => (
                    <div key={slider.key} className="space-y-0.5">
                      <div className="flex justify-between font-mono text-[var(--stator-fg-muted)]">
                        <span>{slider.label}</span>
                        <span>{adjustments[slider.key]}</span>
                      </div>
                      <input
                        type="range"
                        min={slider.min}
                        max={slider.max}
                        value={adjustments[slider.key]}
                        onChange={(e) =>
                          updatePreset(
                            {
                              adjustments: {
                                ...adjustments,
                                [slider.key]: Number(e.target.value),
                              },
                            },
                            `Adjust ${slider.label}`
                          )
                        }
                        className="w-full stator-slider"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Watermark Accordion */}
            <div className="rounded-lg border border-[var(--stator-border)] overflow-hidden">
              <button
                type="button"
                onClick={() => setShowWatermarkPanel((v) => !v)}
                className="w-full px-3 py-2 bg-[var(--stator-surface-2)]/60 flex items-center justify-between text-xs font-medium text-[var(--stator-fg)] cursor-pointer"
              >
                <span>Watermark {watermark.enabled && watermark.text ? '· Active' : ''}</span>
                {showWatermarkPanel ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
              {showWatermarkPanel && (
                <div className="p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--stator-fg-muted)]">Enable watermark</span>
                    <ToggleSwitch
                      checked={watermark.enabled}
                      onChange={(enabled) =>
                        updatePreset({ watermark: { ...watermark, enabled } }, 'Toggle watermark')
                      }
                      ariaLabel="Enable watermark"
                    />
                  </div>
                  <input
                    type="text"
                    value={watermark.text}
                    onChange={(e) =>
                      updatePreset(
                        { watermark: { ...watermark, enabled: true, text: e.target.value } },
                        'Edit watermark text'
                      )
                    }
                    placeholder="© Your Name / Brand"
                    className="w-full h-8 px-2.5 rounded-md bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-xs text-[var(--stator-fg)]"
                  />
                  <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                    <select
                      value={watermark.position}
                      onChange={(e) =>
                        updatePreset(
                          { watermark: { ...watermark, position: e.target.value as any } },
                          'Watermark position'
                        )
                      }
                      className="h-8 px-2 rounded-md bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-xs text-[var(--stator-fg)]"
                    >
                      <option value="bottom-right">Bottom Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="top-right">Top Right</option>
                      <option value="top-left">Top Left</option>
                      <option value="center">Center</option>
                    </select>
                    <input
                      type="color"
                      value={watermark.color || '#FFFFFF'}
                      onChange={(e) =>
                        updatePreset(
                          { watermark: { ...watermark, enabled: true, color: e.target.value } },
                          'Watermark color'
                        )
                      }
                      aria-label="Watermark tint color"
                      title="Watermark text color"
                      className="w-9 h-8 p-0.5 rounded-md bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-[var(--stator-fg-subtle)]">
                      Opacity {Math.round((watermark.opacity ?? 0.75) * 100)}%
                    </span>
                    <input
                      type="range"
                      min={0.15}
                      max={1}
                      step={0.05}
                      value={watermark.opacity}
                      onChange={(e) =>
                        updatePreset(
                          { watermark: { ...watermark, opacity: Number(e.target.value) } },
                          'Watermark opacity'
                        )
                      }
                      className="flex-1 stator-slider"
                      aria-label="Watermark opacity"
                    />
                  </div>
                </div>
              )}
            </div>

            {item.file && (
              <button
                type="button"
                onClick={() => onGenerateIconPack(item)}
                className="w-full h-8 px-3 rounded-lg bg-[var(--stator-surface-2)] hover:bg-[var(--stator-border)] border border-[var(--stator-border-control)] text-xs font-medium text-[var(--stator-fg)] inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Package className="w-3.5 h-3.5 text-[var(--stator-fg)]" />
                <span>Generate Favicon &amp; PWA Icon Pack ZIP</span>
              </button>
            )}
          </section>
        )}

        {/* VIDEO CONTROLS */}
        {item.typeCategory === 'video' && (
          <section className="space-y-3 pt-3 border-t border-[var(--stator-border)]">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-[var(--stator-fg-muted)] mb-1">
                  Resolution
                </label>
                <select
                  value={preset.videoResolution}
                  onChange={(e) => updatePreset({ videoResolution: e.target.value as any }, 'Video resolution')}
                  className="w-full h-8 px-2 rounded-md bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-xs text-[var(--stator-fg)]"
                >
                  <option value="original">Original</option>
                  <option value="4K">4K (2160p)</option>
                  <option value="2K">2K (1440p)</option>
                  <option value="1080p">1080p HD</option>
                  <option value="720p">720p</option>
                  <option value="480p">480p</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[var(--stator-fg-muted)] mb-1">
                  Frame Rate
                </label>
                <select
                  value={preset.fpsLimiter}
                  onChange={(e) => updatePreset({ fpsLimiter: e.target.value as any }, 'Frame rate')}
                  className="w-full h-8 px-2 rounded-md bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-xs text-[var(--stator-fg)]"
                >
                  <option value="original">Original FPS</option>
                  <option value="60">60 fps</option>
                  <option value="30">30 fps</option>
                  <option value="24">24 fps</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-[var(--stator-fg-muted)] mb-1">
                  Playback Speed
                </label>
                <select
                  value={String(preset.playbackSpeed || 1)}
                  onChange={(e) => updatePreset({ playbackSpeed: Number(e.target.value) }, 'Video speed')}
                  className="w-full h-8 px-2 rounded-md bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-xs font-mono text-[var(--stator-fg)]"
                >
                  <option value="0.5">0.5× Slow</option>
                  <option value="0.75">0.75×</option>
                  <option value="1">1.0× Normal</option>
                  <option value="1.25">1.25×</option>
                  <option value="1.5">1.5×</option>
                  <option value="2">2.0× Fast</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[var(--stator-fg-muted)] mb-1">
                  Aspect Crop
                </label>
                <select
                  value={preset.aspectCrop || 'original'}
                  onChange={(e) => updatePreset({ aspectCrop: e.target.value as any }, 'Video aspect crop')}
                  className="w-full h-8 px-2 rounded-md bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-xs text-[var(--stator-fg)]"
                >
                  <option value="original">Original</option>
                  <option value="9:16">9:16 Vertical</option>
                  <option value="1:1">1:1 Square</option>
                  <option value="4:5">4:5 Portrait</option>
                  <option value="16:9">16:9 Wide</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-xs text-[var(--stator-fg-muted)]">Audio Track · -16 LUFS</span>
              <ToggleSwitch
                checked={Boolean(preset.normalizeAudio)}
                onChange={(v) => updatePreset({ normalizeAudio: v }, 'Normalize audio')}
                ariaLabel="Normalize audio to -16 LUFS"
              />
            </div>

            {/* Subtitles SRT/VTT Drawer */}
            <div className="rounded-lg border border-[var(--stator-border)] overflow-hidden">
              <button
                type="button"
                onClick={() => setShowSubtitlesPanel((v) => !v)}
                className="w-full px-3 py-2 bg-[var(--stator-surface-2)]/60 flex items-center justify-between text-xs font-medium text-[var(--stator-fg)] cursor-pointer"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Captions className="w-3.5 h-3.5 text-[var(--stator-fg)]" />
                  Subtitles ({preset.subtitleCues?.length || 0} cues)
                </span>
                {showSubtitlesPanel ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
              {showSubtitlesPanel && (
                <div className="p-3 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => subtitleInputRef.current?.click()}
                      className="flex-1 h-7 px-2 rounded bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-[11px] font-medium text-[var(--stator-fg)] inline-flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3 h-3" />
                      Import .SRT / .VTT
                    </button>
                    <button
                      type="button"
                      onClick={addManualSubtitleCue}
                      className="h-7 px-2 rounded bg-[var(--stator-cta-bg)] hover:bg-[var(--stator-cta-hover)] text-[var(--stator-cta-fg)] text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Add Cue
                    </button>
                  </div>

                  {(preset.subtitleCues || []).length > 0 && (
                    <>
                      <div className="max-h-36 overflow-y-auto space-y-1.5">
                        {(preset.subtitleCues || []).map((cue, idx) => (
                          <div
                            key={cue.id}
                            className="p-2 rounded bg-[var(--stator-surface-2)] border border-[var(--stator-border)] space-y-1"
                          >
                            <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  step="0.5"
                                  value={cue.startSec}
                                  onChange={(e) => {
                                    const next = [...(preset.subtitleCues || [])];
                                    next[idx] = { ...cue, startSec: Number(e.target.value) || 0 };
                                    updatePreset({ subtitleCues: next }, 'Edit cue start');
                                  }}
                                  className="w-12 px-1 py-0.5 rounded bg-[var(--stator-surface)] border border-[var(--stator-border)]"
                                />
                                <span>→</span>
                                <input
                                  type="number"
                                  step="0.5"
                                  value={cue.endSec}
                                  onChange={(e) => {
                                    const next = [...(preset.subtitleCues || [])];
                                    next[idx] = { ...cue, endSec: Number(e.target.value) || 1 };
                                    updatePreset({ subtitleCues: next }, 'Edit cue end');
                                  }}
                                  className="w-12 px-1 py-0.5 rounded bg-[var(--stator-surface)] border border-[var(--stator-border)]"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const next = (preset.subtitleCues || []).filter((c) => c.id !== cue.id);
                                  updatePreset({ subtitleCues: next }, 'Remove cue');
                                }}
                                className="text-[var(--stator-fg-subtle)] hover:text-[var(--stator-danger)] cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            <input
                              type="text"
                              value={cue.text}
                              onChange={(e) => {
                                const next = [...(preset.subtitleCues || [])];
                                next[idx] = { ...cue, text: e.target.value };
                                updatePreset({ subtitleCues: next }, 'Edit caption text');
                              }}
                              className="w-full px-1.5 py-1 rounded bg-[var(--stator-surface)] border border-[var(--stator-border)] text-[11px] text-[var(--stator-fg)]"
                            />
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const srt = serializeCuesToSrt(preset.subtitleCues || []);
                          const blob = new Blob([srt], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${item.name.replace(/\.[^/.]+$/, '')}.srt`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="w-full h-7 rounded border border-[var(--stator-border)] text-[11px] text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] cursor-pointer"
                      >
                        Download .SRT Subtitles
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {item.file && (
              <div className="grid grid-cols-2 gap-1.5">
                {onExtractVideoFrame && (
                  <button
                    type="button"
                    onClick={() => onExtractVideoFrame(item)}
                    className="h-8 px-2 rounded-lg bg-[var(--stator-surface-2)] hover:bg-[var(--stator-border)] border border-[var(--stator-border-control)] text-[11px] font-medium text-[var(--stator-fg)] inline-flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-[var(--stator-fg)]" />
                    <span>Capture PNG</span>
                  </button>
                )}
                {onReplaceVideoAudio && (
                  <button
                    type="button"
                    onClick={() => replaceAudioInputRef.current?.click()}
                    className="h-8 px-2 rounded-lg bg-[var(--stator-surface-2)] hover:bg-[var(--stator-border)] border border-[var(--stator-border-control)] text-[11px] font-medium text-[var(--stator-fg)] inline-flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Music className="w-3.5 h-3.5 text-[var(--stator-fg)]" />
                    <span>Replace Audio</span>
                  </button>
                )}
              </div>
            )}
          </section>
        )}

        {/* AUDIO CONTROLS */}
        {item.typeCategory === 'audio' && (
          <section className="space-y-3 pt-3 border-t border-[var(--stator-border)]">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--stator-fg-muted)]">Normalize (-16 LUFS)</span>
              <ToggleSwitch
                checked={Boolean(preset.normalizeAudio)}
                onChange={(v) => updatePreset({ normalizeAudio: v }, 'Normalize audio')}
                ariaLabel="Normalize audio to -16 LUFS"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--stator-fg-muted)]">Remove Silence Gaps</span>
              <ToggleSwitch
                checked={Boolean(preset.removeSilence)}
                onChange={(v) => updatePreset({ removeSilence: v }, 'Silence removal')}
                ariaLabel="Remove silence gaps"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--stator-fg-muted)]">Rumble / High-Pass Filter</span>
              <ToggleSwitch
                checked={Boolean(preset.noiseReduce)}
                onChange={(v) => updatePreset({ noiseReduce: v }, 'Noise filter')}
                ariaLabel="High-pass noise reduction"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--stator-fg-muted)]">Dynamic Compressor</span>
              <ToggleSwitch
                checked={Boolean(preset.dynamicCompress)}
                onChange={(v) => updatePreset({ dynamicCompress: v }, 'Dynamic compressor')}
                ariaLabel="Dynamic range compression"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-[var(--stator-fg-muted)] mb-1">
                  Fade In (s)
                </label>
                <input
                  type="number"
                  min={0}
                  max={15}
                  step={0.5}
                  value={preset.audioFadeInSec || 0}
                  onChange={(e) => updatePreset({ audioFadeInSec: Number(e.target.value) || 0 }, 'Fade in')}
                  className="w-full h-8 px-2 rounded-md bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-xs font-mono text-[var(--stator-fg)]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[var(--stator-fg-muted)] mb-1">
                  Fade Out (s)
                </label>
                <input
                  type="number"
                  min={0}
                  max={15}
                  step={0.5}
                  value={preset.audioFadeOutSec || 0}
                  onChange={(e) => updatePreset({ audioFadeOutSec: Number(e.target.value) || 0 }, 'Fade out')}
                  className="w-full h-8 px-2 rounded-md bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-xs font-mono text-[var(--stator-fg)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-[var(--stator-fg-muted)] mb-1">
                  EQ Profile
                </label>
                <select
                  value={preset.eqPreset || 'flat'}
                  onChange={(e) => updatePreset({ eqPreset: e.target.value as any }, 'Audio EQ')}
                  className="w-full h-8 px-2 rounded-md bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-xs text-[var(--stator-fg)]"
                >
                  <option value="flat">Flat</option>
                  <option value="voice">Voice Clarity</option>
                  <option value="bass">Bass Boost</option>
                  <option value="treble">Treble Crisp</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[var(--stator-fg-muted)] mb-1">
                  Volume ({preset.volumePercent ?? 100}%)
                </label>
                <input
                  type="range"
                  min={20}
                  max={200}
                  step={5}
                  value={preset.volumePercent ?? 100}
                  onChange={(e) => updatePreset({ volumePercent: Number(e.target.value) }, 'Volume gain')}
                  className="w-full stator-slider mt-2"
                />
              </div>
            </div>
          </section>
        )}

        {/* Progressive Disclosure: Advanced Technical Section */}
        <section className="pt-3 border-t border-[var(--stator-border)]">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="w-full flex items-center justify-between text-xs font-medium text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] cursor-pointer"
          >
            <span>Advanced Technical</span>
            {showAdvanced ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          {showAdvanced && (
            <div className="mt-3 space-y-3 text-xs">
              {item.typeCategory === 'image' && (
                <div>
                  <div className="flex justify-between font-mono text-[11px] text-[var(--stator-fg-muted)] mb-1">
                    <span>Encoder Quality</span>
                    <span>{preset.imageQuality}%</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={preset.imageQuality}
                    onChange={(e) => updatePreset({ imageQuality: Number(e.target.value) }, 'Image quality')}
                    className="w-full stator-slider"
                  />
                </div>
              )}

              {item.typeCategory === 'video' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-[var(--stator-fg-muted)] mb-1">
                      CRF / Bitrate
                    </label>
                    <select
                      value={preset.videoBitrate}
                      onChange={(e) => updatePreset({ videoBitrate: e.target.value as any }, 'Video bitrate')}
                      className="w-full h-8 px-2 rounded-md bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-xs text-[var(--stator-fg)]"
                    >
                      <option value="high">High (CRF 18)</option>
                      <option value="balanced">Balanced (CRF 23)</option>
                      <option value="compact">Compact (CRF 28)</option>
                      <option value="lossless">Lossless</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[var(--stator-fg-muted)] mb-1">
                      Video Audio
                    </label>
                    <select
                      value={preset.videoAudioBitrate || 'original'}
                      onChange={(e) => updatePreset({ videoAudioBitrate: e.target.value as any }, 'Video audio bitrate')}
                      className="w-full h-8 px-2 rounded-md bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-xs text-[var(--stator-fg)]"
                    >
                      <option value="original">Keep / AAC</option>
                      <option value="320k">320 kbps</option>
                      <option value="192k">192 kbps</option>
                      <option value="128k">128 kbps</option>
                      <option value="mute">Mute Audio</option>
                    </select>
                  </div>
                </div>
              )}

              {item.typeCategory === 'audio' && (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-[var(--stator-fg-muted)] mb-1">
                        Bitrate
                      </label>
                      <select
                        value={preset.audioBitrate}
                        onChange={(e) => updatePreset({ audioBitrate: e.target.value as any }, 'Audio bitrate')}
                        className="w-full h-8 px-2 rounded-md bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-xs font-mono text-[var(--stator-fg)]"
                      >
                        <option value="320k">320 kbps</option>
                        <option value="256k">256 kbps</option>
                        <option value="192k">192 kbps</option>
                        <option value="128k">128 kbps</option>
                        <option value="64k">64 kbps</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[var(--stator-fg-muted)] mb-1">
                        Sample Rate
                      </label>
                      <select
                        value={preset.audioSampleRate || 'original'}
                        onChange={(e) => updatePreset({ audioSampleRate: e.target.value as any }, 'Sample rate')}
                        className="w-full h-8 px-2 rounded-md bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-xs font-mono text-[var(--stator-fg)]"
                      >
                        <option value="original">Original</option>
                        <option value="48000">48 kHz</option>
                        <option value="44100">44.1 kHz</option>
                        <option value="22050">22.05 kHz</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-medium text-[var(--stator-fg-muted)]">
                      ID3 / Container Tags
                    </label>
                    <input
                      type="text"
                      value={preset.audioMetaTitle || ''}
                      onChange={(e) => updatePreset({ audioMetaTitle: e.target.value }, 'Track title')}
                      placeholder="Track Title"
                      className="w-full h-7 px-2 rounded bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-[11px] text-[var(--stator-fg)]"
                    />
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        value={preset.audioMetaArtist || ''}
                        onChange={(e) => updatePreset({ audioMetaArtist: e.target.value }, 'Artist')}
                        placeholder="Artist"
                        className="h-7 px-2 rounded bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-[11px] text-[var(--stator-fg)]"
                      />
                      <input
                        type="text"
                        value={preset.audioMetaAlbum || ''}
                        onChange={(e) => updatePreset({ audioMetaAlbum: e.target.value }, 'Album')}
                        placeholder="Album"
                        className="h-7 px-2 rounded bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-[11px] text-[var(--stator-fg)]"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-[var(--stator-fg-muted)]">Strip EXIF / Metadata</span>
                <ToggleSwitch
                  checked={Boolean(preset.stripMetadata)}
                  onChange={(v) => updatePreset({ stripMetadata: v }, 'Strip metadata')}
                  ariaLabel="Strip EXIF and container metadata"
                />
              </div>

              <button
                type="button"
                onClick={() => onUpdatePresetSettings(item.id, { ...DEFAULT_PRESET_SETTINGS }, 'Reset item edits')}
                className="w-full h-7 rounded-md bg-[var(--stator-surface-2)] hover:bg-[var(--stator-border)] border border-[var(--stator-border)] text-[11px] font-mono text-[var(--stator-fg-muted)] inline-flex items-center justify-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Item Edits</span>
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Bottom Sticky Action Footer */}
      <div className="p-3.5 border-t border-[var(--stator-border)] bg-[var(--stator-surface)] space-y-2 shrink-0">
        {item.status === 'error' && item.errorMessage && (
          <div className="p-2.5 rounded-lg bg-[var(--stator-danger-soft)] border border-[var(--stator-danger)]/30 text-[11px] text-[var(--stator-danger)] flex items-start justify-between gap-2">
            <span className="leading-snug">{item.errorMessage}</span>
            <button
              type="button"
              onClick={() => onStartConversion(item.id)}
              className="shrink-0 font-semibold underline cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}
        {item.status === 'converting' ? (
          <button
            type="button"
            onClick={() => onCancelConversion(item.id)}
            className="w-full h-9 rounded-lg bg-[#9B2C3E] hover:bg-[#822333] text-white text-xs font-medium inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Cancel ({item.progress}%)</span>
          </button>
        ) : (
          <button
            type="button"
            disabled={item.needsReconnect}
            onClick={() => onStartConversion(item.id)}
            className="w-full h-9 rounded-lg bg-[var(--stator-cta-bg)] hover:bg-[var(--stator-cta-hover)] disabled:opacity-45 text-[var(--stator-cta-fg)] text-xs font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>
              {item.status === 'completed'
                ? `Re-Encode ${item.targetFormat}`
                : item.status === 'error'
                ? `Retry ${item.targetFormat}`
                : `Convert to ${item.targetFormat}`}
            </span>
          </button>
        )}

        {item.status === 'completed' && item.outputUrl && (
          <a
            href={item.outputUrl}
            download={item.outputName || item.name}
            className="w-full h-8 rounded-lg bg-[#2F6846] hover:bg-[#255438] text-white text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Output ({item.outputSizeFormatted})</span>
          </a>
        )}
      </div>
    </div>
  );
};
