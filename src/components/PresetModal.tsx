import React, { useState, useEffect } from 'react';
import {
  Sliders,
  X,
  Image as ImageIcon,
  Video,
  ShieldCheck,
  RotateCcw,
  Check,
} from 'lucide-react';
import { PresetSettings, DEFAULT_PRESET_SETTINGS, FileTypeCategory } from '../types/queue.ts';
import { CustomSelect } from './CustomSelect.tsx';

interface PresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (settings: PresetSettings, itemId: string | null) => void;
  initialSettings?: PresetSettings;
  activeItemId: string | null;
  activeItemName?: string;
  activeCategory?: FileTypeCategory;
}

export const PresetModal: React.FC<PresetModalProps> = ({
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
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

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

  // Sync settings when modal opens or active item changes
  useEffect(() => {
    if (isOpen) {
      setSettings(initialSettings || DEFAULT_PRESET_SETTINGS);
      if (activeCategory === 'video' || activeCategory === 'audio') {
        setActiveTab('video');
      } else {
        setActiveTab('image');
      }
    }
  }, [isOpen, initialSettings, activeCategory]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isRendered) return null;

  const handleReset = () => {
    setSettings(DEFAULT_PRESET_SETTINGS);
  };

  const handleSave = () => {
    onApply(settings, activeItemId);
    onClose();
  };

  const getQualityLabel = (val: number) => {
    if (val >= 95) return `${val}% (Lossless Pro)`;
    if (val >= 85) return `${val}% (High Quality)`;
    if (val >= 70) return `${val}% (Balanced)`;
    return `${val}% (Compact)`;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-state={isVisible ? 'open' : 'closed'}
      onClick={onClose}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity duration-200 ease-out opacity-0 data-[state=open]:opacity-100 ${
        isVisible ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        data-state={isVisible ? 'open' : 'closed'}
        className="bg-[#121214] border border-zinc-800 rounded-lg p-5 sm:p-6 max-w-lg w-full text-white shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] transition-all duration-200 opacity-0 scale-[0.98] data-[state=open]:opacity-100 data-[state=open]:scale-100"
        style={{
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center justify-center shrink-0">
              <Sliders className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                Advanced Encoding Presets
              </h3>
              <p className="text-xs text-zinc-400 truncate">
                {activeItemName
                  ? `Configuring: ${activeItemName}`
                  : 'Global Preset (Applied to all queue items)'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="mt-4 flex bg-zinc-900 p-1 rounded-md border border-zinc-800">
          <button
            onClick={() => setActiveTab('image')}
            className={`flex-1 py-1.5 text-xs sm:text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'image'
                ? 'bg-zinc-100 text-zinc-900 font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Image Settings</span>
          </button>

          <button
            onClick={() => setActiveTab('video')}
            className={`flex-1 py-1.5 text-xs sm:text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'video'
                ? 'bg-zinc-100 text-zinc-900 font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Video and Audio Settings</span>
          </button>
        </div>

        {/* Scrollable Body Controls */}
        <div className="mt-5 space-y-6 overflow-y-auto no-scrollbar pr-1 pb-20 flex-1">
          {activeTab === 'image' ? (
            /* IMAGE CONTROLS */
            <div className="space-y-5">
              {/* Quality Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-medium text-zinc-300">Compression Quality</span>
                  <span className="font-mono font-medium text-zinc-200">
                    {getQualityLabel(settings.imageQuality)}
                  </span>
                </div>

                {(() => {
                  const percentage = ((settings.imageQuality - 10) / (100 - 10)) * 100;
                  return (
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="1"
                      value={settings.imageQuality}
                      onChange={(e) =>
                        setSettings({ ...settings, imageQuality: parseInt(e.target.value) })
                      }
                      style={{
                        background: `linear-gradient(to right, #f4f4f5 ${percentage}%, #27272a ${percentage}%)`,
                      }}
                      className="w-full h-2 rounded-md cursor-pointer appearance-none outline-none transition-[background] duration-100 ease-out [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-zinc-100 [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-100 [&::-webkit-slider-thumb]:active:scale-110 [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(255,255,255,0.4)] [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-zinc-100 [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:duration-100 [&::-moz-range-thumb]:active:scale-110"
                    />
                  );
                })()}

                <div className="flex justify-between items-center text-[10px] text-zinc-400 font-mono pt-0.5">
                  <span>10% (Maximum Compression)</span>
                  <span className="text-zinc-500">90% Default</span>
                  <span>100% (Lossless Pro)</span>
                </div>
              </div>

              {/* Resolution Scaling */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-medium text-zinc-300">
                    Target Resolution Scaling
                  </label>
                  {(settings.imageResize === '4K' || settings.imageResize === '2K') && (
                    <span className="text-[11px] font-mono text-zinc-300">
                      {settings.imageResize === '4K' ? '4K UHD (Lanczos)' : '2K QHD (Lanczos)'}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'original', label: 'Original' },
                    { id: '4K', label: '4K (2160p)' },
                    { id: '2K', label: '2K (1440p)' },
                    { id: '1080p', label: '1080p' },
                    { id: '720p', label: '720p' },
                  ].map((res) => (
                    <button
                      key={res.id}
                      type="button"
                      onClick={() => setSettings({ ...settings, imageResize: res.id as any })}
                      className={`py-2 px-2.5 rounded-md text-xs font-medium border transition-colors text-center cursor-pointer ${
                        settings.imageResize === res.id
                          ? 'bg-zinc-100 text-zinc-900 border-zinc-100 font-semibold'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                      }`}
                    >
                      {res.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Privacy Toggle: Strip Metadata */}
              <div className="p-3.5 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold text-white">
                      Strip EXIF Metadata
                    </h4>
                    <p className="text-[11px] text-zinc-400 leading-tight mt-0.5">
                      Removes GPS locations, camera serials, and timestamp tags.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  data-state={settings.stripMetadata ? 'checked' : 'unchecked'}
                  aria-checked={settings.stripMetadata}
                  onClick={() =>
                    setSettings({ ...settings, stripMetadata: !settings.stripMetadata })
                  }
                  className={`w-9 h-5 flex items-center rounded-md p-0.5 cursor-pointer transition-colors duration-150 ease-out shrink-0 ${
                    settings.stripMetadata ? 'bg-zinc-100' : 'bg-zinc-700'
                  }`}
                >
                  <div
                    data-state={settings.stripMetadata ? 'checked' : 'unchecked'}
                    className="w-4 h-4 rounded-sm bg-zinc-900 transition-transform duration-150 ease-out translate-x-0 data-[state=checked]:translate-x-4"
                  />
                </button>
              </div>
            </div>
          ) : (
            /* VIDEO & AUDIO CONTROLS */
            <div className="space-y-5">
              {/* Encoding Profile */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-zinc-300">
                  Video Encoding Profile (CRF / Bitrate)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'lossless', label: 'Lossless Pro', sub: 'Original Stream' },
                    { id: 'high', label: 'High Quality', sub: 'CRF 18, Pristine' },
                    { id: 'balanced', label: 'Balanced', sub: 'CRF 23, Recommended' },
                    { id: 'compact', label: 'Compact Web', sub: 'CRF 28, Small File' },
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
                      className={`p-2.5 text-left rounded-md border transition-colors cursor-pointer ${
                        settings.videoBitrate === p.id
                          ? 'bg-zinc-800 border-zinc-600 text-white font-semibold'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                      }`}
                    >
                      <div className="text-xs font-semibold text-white flex items-center justify-between">
                        <span>{p.label}</span>
                        {settings.videoBitrate === p.id && (
                          <Check className="w-3.5 h-3.5 text-zinc-200" />
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono mt-0.5">{p.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Video Resolution Scaling */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-medium text-zinc-300">
                    Target Max Video Resolution
                  </label>
                  {(settings.videoResolution === '4K' || settings.videoResolution === '2K') && (
                    <span className="text-[11px] font-mono text-zinc-300">
                      {settings.videoResolution === '4K' ? '4K UHD (Lanczos)' : '2K QHD (Lanczos)'}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'original', label: 'Original' },
                    { id: '4K', label: '4K (2160p)' },
                    { id: '2K', label: '2K (1440p)' },
                    { id: '1080p', label: '1080p' },
                    { id: '720p', label: '720p' },
                  ].map((res) => (
                    <button
                      key={res.id}
                      type="button"
                      onClick={() => setSettings({ ...settings, videoResolution: res.id as any })}
                      className={`py-2 px-2.5 rounded-md text-xs font-medium border transition-colors text-center cursor-pointer ${
                        settings.videoResolution === res.id
                          ? 'bg-zinc-100 text-zinc-900 border-zinc-100 font-semibold'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                      }`}
                    >
                      {res.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Frame Rate & Audio Bitrate Side-by-Side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Frame Rate (FPS)</label>
                  <CustomSelect
                    value={settings.fpsLimiter}
                    onChange={(val) =>
                      setSettings({
                        ...settings,
                        fpsLimiter: val as PresetSettings['fpsLimiter'],
                      })
                    }
                    options={[
                      { value: 'original', label: 'Source FPS', description: 'Preserve input frame rate' },
                      { value: '60', label: '60 fps (Smooth)', description: 'High framerate' },
                      { value: '30', label: '30 fps (Standard)', description: 'Standard playback' },
                      { value: '24', label: '24 fps (Cinematic)', description: 'Motion picture rate' },
                    ]}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Audio Bitrate</label>
                  <CustomSelect
                    value={settings.audioBitrate}
                    onChange={(val) =>
                      setSettings({
                        ...settings,
                        audioBitrate: val as PresetSettings['audioBitrate'],
                      })
                    }
                    options={[
                      { value: '128k', label: '128 kbps', description: 'Standard fidelity' },
                      { value: '192k', label: '192 kbps', description: 'High fidelity audio' },
                      { value: '320k', label: '320 kbps', description: 'Studio master' },
                    ]}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Defaults</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-md px-3 py-1.5 text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="bg-zinc-100 text-zinc-900 hover:bg-white font-medium rounded-md px-4 py-2 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Apply Preset</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
