import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sliders,
  X,
  Image as ImageIcon,
  Video,
  RotateCcw,
  Check,
} from 'lucide-react';
import { PresetSettings, DEFAULT_PRESET_SETTINGS, FileTypeCategory } from '../../types/queue.ts';
import { STATOR_SPRING, STATOR_TRANSITION } from '../../lib/motion.ts';
import { CustomSelect } from '../CustomSelect.tsx';
import { ToggleSwitch } from '../ui/Primitives.tsx';

export interface AdvancedPresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (settings: PresetSettings, itemId: string | null) => void;
  initialSettings?: PresetSettings;
  activeItemId: string | null;
  activeItemName?: string;
  activeCategory?: FileTypeCategory;
}

export const GATED_RESOLUTIONS: string[] = [];
export const GATED_AUDIO_BITRATES: string[] = [];

export const AdvancedPresetsModal: React.FC<AdvancedPresetsModalProps> = ({
  isOpen,
  onClose,
  onApply,
  initialSettings = DEFAULT_PRESET_SETTINGS,
  activeItemId,
  activeItemName,
  activeCategory,
}) => {
  const [settings, setSettings] = useState<PresetSettings>(initialSettings);
  const [activeTab, setActiveTab] = useState<'image' | 'video'>(
    activeCategory === 'video' || activeCategory === 'audio' ? 'video' : 'image'
  );

  useEffect(() => {
    if (isOpen) {
      setSettings(initialSettings);
      if (activeCategory === 'video' || activeCategory === 'audio') {
        setActiveTab('video');
      } else {
        setActiveTab('image');
      }
    }
  }, [isOpen, initialSettings, activeCategory]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSave = () => {
    onApply(settings, activeItemId);
    onClose();
  };

  const handleReset = () => {
    setSettings(DEFAULT_PRESET_SETTINGS);
  };

  const getQualityLabel = (quality: number) => {
    if (quality >= 100) return `${quality}% (Lossless)`;
    if (quality >= 92) return `${quality}% (High Quality)`;
    if (quality >= 85) return `${quality}% (Balanced)`;
    return `${quality}% (Compact)`;
  };

  const handleResolutionClick = (_resLabel: string, resKey: string, isVideo: boolean) => {
    if (isVideo) {
      setSettings((prev) => {
        const next = { ...prev, videoResolution: resKey as any };
        if (prev.videoBitrate === 'lossless' && resKey !== 'original') {
          next.videoBitrate = 'high';
        }
        return next;
      });
    } else {
      setSettings((prev) => ({ ...prev, imageResize: resKey as any }));
    }
  };

  const RESOLUTION_OPTIONS = [
    { id: 'original', label: 'Original' },
    { id: '4K', label: '4K (2160p)' },
    { id: '2K', label: '2K (1440p)' },
    { id: '1080p', label: '1080p' },
    { id: '720p', label: '720p' },
  ];

  const qualityPercentage = ((settings.imageQuality - 10) / 90) * 100;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Advanced Encoding Presets"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={STATOR_TRANSITION.overlay}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.985 }}
            transition={STATOR_TRANSITION.overlay}
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--stator-surface)] border-[var(--stator-border-strong)] text-[var(--stator-fg)] border rounded-xl p-5 sm:p-6 max-w-lg w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[var(--stator-border)]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-[var(--stator-surface-2)] border border-[var(--stator-border)] text-[var(--stator-fg)] flex items-center justify-center shrink-0">
                  <Sliders className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-sans text-lg font-semibold text-[var(--stator-fg)] tracking-tight truncate">
                    Encoding Presets
                  </h3>
                  <p className="text-xs text-[var(--stator-fg-muted)] truncate">
                    {activeItemName
                      ? `Configuring: ${activeItemName}`
                      : 'Global defaults applied to new & ready items'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-lg text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] hover:bg-[var(--stator-surface-2)] flex items-center justify-center transition-colors cursor-pointer shrink-0 active:scale-[0.96]"
                title="Close (Esc)"
                aria-label="Close Encoding Presets"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab Switcher with Shared Spring Pill */}
            <div
              role="tablist"
              aria-label="Preset media category"
              className="mt-4 flex bg-[var(--stator-surface-2)] p-1 rounded-xl border border-[var(--stator-border)]"
            >
              {(
                [
                  { id: 'image', label: 'Image Settings', icon: ImageIcon },
                  { id: 'video', label: 'Video & Audio', icon: Video },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex-1 py-1.5 px-3 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'text-[var(--stator-fg)]'
                        : 'text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)]'
                    }`}
                  >
                    {isSelected && (
                      <motion.span
                        layoutId="stator-preset-tab"
                        transition={STATOR_SPRING.tactile}
                        aria-hidden="true"
                        className="absolute inset-0 rounded-lg bg-[var(--stator-surface)] border border-[var(--stator-border)] shadow-2xs"
                      />
                    )}
                    <Icon className="relative z-10 w-3.5 h-3.5 text-[var(--stator-fg)]" />
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Scrollable Body Controls */}
            <div className="mt-5 space-y-5 overflow-y-auto no-scrollbar pr-1 pb-2 flex-1">
              <AnimatePresence mode="wait">
                {activeTab === 'image' ? (
                  <motion.div
                    key="preset-image-tab"
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 6 }}
                    transition={STATOR_TRANSITION.micro}
                    className="space-y-5"
                  >
                    {/* Quality Slider */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-[var(--stator-fg)]">Compression Quality</span>
                        <span className="font-mono tabular-nums font-medium text-[var(--stator-fg)]">
                          {getQualityLabel(settings.imageQuality)}
                        </span>
                      </div>

                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="1"
                        value={settings.imageQuality}
                        onChange={(e) =>
                          setSettings({ ...settings, imageQuality: parseInt(e.target.value, 10) })
                        }
                        style={{
                          background: `linear-gradient(to right, var(--stator-cta-bg) ${qualityPercentage}%, var(--stator-border-control) ${qualityPercentage}%)`,
                        }}
                        className="w-full stator-slider"
                      />

                      <div className="flex justify-between items-center text-[10px] text-[var(--stator-fg-subtle)] font-mono tabular-nums pt-0.5">
                        <span>10% Compact</span>
                        <span>85% Balanced</span>
                        <span>92% High</span>
                        <span>100% Lossless</span>
                      </div>
                    </div>

                    {/* Resolution Scaling */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-[var(--stator-fg)]">
                          Target Resolution Scaling
                        </label>
                        {(settings.imageResize === '4K' || settings.imageResize === '2K') && (
                          <span className="text-[11px] font-mono tabular-nums text-[var(--stator-fg-muted)]">
                            {settings.imageResize === '4K' ? '4K UHD (Lanczos)' : '2K QHD (Lanczos)'}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                        {RESOLUTION_OPTIONS.map((res) => (
                          <button
                            key={res.id}
                            type="button"
                            onClick={() => handleResolutionClick(res.label, res.id, false)}
                            className={`py-2 px-2 rounded-lg text-xs font-medium border transition-colors text-center cursor-pointer flex items-center justify-center active:scale-[0.97] ${
                              res.id === 'original' ? 'font-sans' : 'font-mono tabular-nums'
                            } ${
                              settings.imageResize === res.id
                                ? 'bg-[var(--stator-cta-bg)] text-[var(--stator-cta-fg)] border-transparent'
                                : 'bg-[var(--stator-surface-2)] text-[var(--stator-fg)] hover:border-[var(--stator-border-strong)] border-[var(--stator-border-control)]'
                            }`}
                          >
                            {res.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Privacy Toggle */}
                    <div className="pt-3 border-t border-[var(--stator-border)] flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="text-xs font-medium text-[var(--stator-fg)]">
                          Strip Metadata (EXIF)
                        </h4>
                        <p className="text-[11px] text-[var(--stator-fg-subtle)] leading-tight mt-0.5">
                          Remove GPS coordinates, camera serials, and timestamps
                        </p>
                      </div>

                      <ToggleSwitch
                        checked={settings.stripMetadata}
                        onChange={(next) => setSettings({ ...settings, stripMetadata: next })}
                        ariaLabel="Strip Metadata (EXIF)"
                      />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="preset-video-tab"
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={STATOR_TRANSITION.micro}
                    className="space-y-5"
                  >
                    {/* Encoding Profile */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-[var(--stator-fg)] block">
                        Video Encoding Profile (CRF / Bitrate)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'lossless', label: 'Lossless Copy', sub: 'Original Stream' },
                          { id: 'high', label: 'High Quality', sub: 'CRF 18 · Pristine' },
                          { id: 'balanced', label: 'Balanced', sub: 'CRF 23 · Recommended' },
                          { id: 'compact', label: 'Compact Web', sub: 'CRF 28 · Small File' },
                        ].map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() =>
                              setSettings({
                                ...settings,
                                videoBitrate: p.id as PresetSettings['videoBitrate'],
                              })
                            }
                            className={`p-2.5 text-left rounded-xl border transition-colors cursor-pointer active:scale-[0.98] ${
                              settings.videoBitrate === p.id
                                ? 'bg-[var(--stator-surface-2)] border-[var(--stator-cta-bg)] text-[var(--stator-fg)]'
                                : 'bg-[var(--stator-surface-2)]/50 border-[var(--stator-border)] text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] hover:border-[var(--stator-border-strong)]'
                            }`}
                          >
                            <div className="text-xs font-medium text-[var(--stator-fg)] flex items-center justify-between">
                              <span>{p.label}</span>
                              {settings.videoBitrate === p.id && (
                                <Check className="w-3.5 h-3.5 text-[var(--stator-fg)]" />
                              )}
                            </div>
                            <div className="text-[10px] text-[var(--stator-fg-subtle)] font-mono tabular-nums mt-0.5">
                              {p.sub}
                            </div>
                          </button>
                        ))}
                      </div>
                      {settings.videoBitrate === 'lossless' && (
                        <p className="text-[11px] text-[var(--stator-fg-muted)] leading-relaxed pt-0.5">
                          Lossless Copy keeps source streams untouched. Selecting a scaled resolution
                          automatically switches to High Quality (CRF 18).
                        </p>
                      )}
                    </div>

                    {/* Video Resolution Scaling */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-[var(--stator-fg)]">
                          Target Max Video Resolution
                        </label>
                        {(settings.videoResolution === '4K' || settings.videoResolution === '2K') && (
                          <span className="text-[11px] font-mono tabular-nums text-[var(--stator-fg-muted)]">
                            {settings.videoResolution === '4K'
                              ? '4K UHD (Lanczos)'
                              : '2K QHD (Lanczos)'}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                        {RESOLUTION_OPTIONS.map((res) => (
                          <button
                            key={res.id}
                            type="button"
                            onClick={() => handleResolutionClick(res.label, res.id, true)}
                            className={`py-2 px-2 rounded-lg text-xs font-medium border transition-colors text-center cursor-pointer flex items-center justify-center active:scale-[0.97] ${
                              res.id === 'original' ? 'font-sans' : 'font-mono tabular-nums'
                            } ${
                              settings.videoResolution === res.id
                                ? 'bg-[var(--stator-cta-bg)] text-[var(--stator-cta-fg)] border-transparent'
                                : 'bg-[var(--stator-surface-2)] text-[var(--stator-fg)] hover:border-[var(--stator-border-strong)] border-[var(--stator-border-control)]'
                            }`}
                          >
                            {res.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Frame Rate & Audio Bitrate */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[var(--stator-fg)] block">
                          Frame Rate (FPS)
                        </label>
                        <CustomSelect
                          value={settings.fpsLimiter}
                          onChange={(val) =>
                            setSettings({
                              ...settings,
                              fpsLimiter: val as PresetSettings['fpsLimiter'],
                            })
                          }
                          options={[
                            { value: 'original', label: 'Source FPS', description: 'Preserve input rate' },
                            {
                              value: '120',
                              label: '120 fps (Ultra Smooth)',
                              description: 'High refresh rate',
                            },
                            { value: '60', label: '60 fps (Smooth)', description: 'Smooth playback' },
                            { value: '30', label: '30 fps (Standard)', description: 'Standard playback' },
                            {
                              value: '24',
                              label: '24 fps (Cinematic)',
                              description: 'Motion picture rate',
                            },
                          ]}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-[var(--stator-fg)]">
                            Audio Bitrate
                          </label>
                          <span className="text-[11px] font-mono tabular-nums text-[var(--stator-fg-subtle)]">
                            {settings.audioBitrate}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[
                            { id: '64k', label: '64k' },
                            { id: '128k', label: '128k' },
                            { id: '192k', label: '192k' },
                            { id: '320k', label: '320k' },
                          ].map((bitrate) => (
                            <button
                              key={bitrate.id}
                              type="button"
                              onClick={() =>
                                setSettings((prev) => ({
                                  ...prev,
                                  audioBitrate: bitrate.id as PresetSettings['audioBitrate'],
                                }))
                              }
                              className={`h-9 rounded-lg text-xs font-mono tabular-nums border transition-colors text-center cursor-pointer flex items-center justify-center active:scale-[0.97] ${
                                settings.audioBitrate === bitrate.id
                                  ? 'bg-[var(--stator-cta-bg)] text-[var(--stator-cta-fg)] border-transparent font-medium'
                                  : 'bg-[var(--stator-surface-2)] text-[var(--stator-fg)] hover:border-[var(--stator-border-strong)] border-[var(--stator-border-control)]'
                              }`}
                            >
                              {bitrate.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-4 border-t border-[var(--stator-border)] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Defaults</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[36px] bg-[var(--stator-surface-2)] hover:bg-[var(--stator-border)] text-[var(--stator-fg)] border border-[var(--stator-border-control)] rounded-lg px-3.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  className="min-h-[36px] bg-[var(--stator-cta-bg)] hover:bg-[var(--stator-cta-hover)] text-[var(--stator-cta-fg)] font-medium rounded-lg px-4 text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap active:scale-[0.98]"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.25]" />
                  <span>Apply Preset</span>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
