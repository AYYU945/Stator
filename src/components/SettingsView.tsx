import React, { useEffect, useState } from 'react';
import {
  Palette,
  Sliders,
  Cpu,
  HardDrive,
  Accessibility,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Code2,
  ExternalLink,
} from 'lucide-react';
import { StatorSettings } from '../types/settings.ts';
import { ThemeMode } from '../lib/theme.ts';
import { probeBrowserCapabilities, BrowserCapabilitiesReport } from '../utils/capabilities.ts';
import { getProjectStorageFootprint } from '../utils/projectStorage.ts';
import { formatFileSize } from '../types/queue.ts';
import { getStoredGlobalPreset, saveGlobalPreset } from '../lib/presets.ts';
import {
  LegalRoute,
  STATOR_ISSUES_URL,
  STATOR_LICENSE_URL,
  STATOR_RELEASES_URL,
  STATOR_REPO_URL,
  STATOR_THIRD_PARTY_NOTICES_URL,
} from '../lib/links.ts';
import { ToggleSwitch } from './ui/Primitives.tsx';

export interface SettingsViewProps {
  settings: StatorSettings;
  onUpdateSettings: (patch: Partial<StatorSettings>) => void;
  onResetSettings: () => void;
  theme: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  ephemeralMode: boolean;
  onToggleEphemeralMode: (enabled: boolean) => void;
  onWipeAllData: () => void;
  onToast: (msg: string) => void;
  onNavigateLegal?: (route: Exclude<LegalRoute, 'none'>) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onResetSettings,
  theme,
  onThemeChange,
  ephemeralMode,
  onToggleEphemeralMode,
  onWipeAllData,
  onToast,
  onNavigateLegal,
}) => {
  const [caps, setCaps] = useState<BrowserCapabilitiesReport | null>(null);
  const [footprint, setFootprint] = useState<{
    projectCount: number;
    cachedAssetBytes: number;
    cachedAssetCount: number;
  } | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);

  useEffect(() => {
    probeBrowserCapabilities().then(setCaps);
    getProjectStorageFootprint().then(setFootprint);
  }, []);

  const requestPersistentStorage = async () => {
    if (!navigator.storage?.persist) {
      onToast('Persistent storage API is not exposed in this browser.');
      return;
    }
    const granted = await navigator.storage.persist();
    onToast(
      granted
        ? 'Browser granted persistent local storage protection'
        : 'Browser kept best-effort storage policy'
    );
    probeBrowserCapabilities().then(setCaps);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-[var(--stator-border)]">
        <div>
          <p className="text-xs font-medium text-[var(--stator-fg-muted)] mb-1">
            Local workspace preferences
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--stator-fg)]">Settings</h2>
          <p className="text-xs sm:text-sm text-[var(--stator-fg-muted)] mt-1">
            Configure themes, studio layout defaults, naming templates, worker concurrency, and local IndexedDB privacy.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            onResetSettings();
            onThemeChange('system');
            onToast('Restored default Stator settings');
          }}
          className="h-9 px-3.5 rounded-lg bg-[var(--stator-surface)] hover:bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-xs font-medium text-[var(--stator-fg)] inline-flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Defaults</span>
        </button>
      </div>

      {/* 1. Appearance */}
      <section className="rounded-xl bg-[var(--stator-surface)] border border-[var(--stator-border)] p-5 space-y-4">
        <h3 className="text-sm font-medium text-[var(--stator-fg)] flex items-center gap-2">
          <Palette className="w-4 h-4 text-[var(--stator-fg-muted)]" />
          <span>Appearance &amp; Interface</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="stator-theme-select" className="block text-xs font-medium text-[var(--stator-fg)] mb-1.5">
              Color Theme
            </label>
            <select
              id="stator-theme-select"
              value={theme}
              onChange={(e) => {
                const next = e.target.value as ThemeMode;
                onThemeChange(next);
                onUpdateSettings({ theme: next });
              }}
              className="w-full h-9 px-2.5 rounded-lg bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-xs text-[var(--stator-fg)] cursor-pointer"
            >
              <option value="system">System Preference</option>
              <option value="light">Light — Soft Ivory</option>
              <option value="dark">Dark — Graphite Black</option>
            </select>
          </div>

          <div>
            <label htmlFor="stator-density-select" className="block text-xs font-medium text-[var(--stator-fg)] mb-1.5">
              Interface Density
            </label>
            <select
              id="stator-density-select"
              value={settings.density}
              onChange={(e) => onUpdateSettings({ density: e.target.value as any })}
              className="w-full h-9 px-2.5 rounded-lg bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-xs text-[var(--stator-fg)] cursor-pointer"
            >
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact Studio</option>
            </select>
          </div>

          <div>
            <label htmlFor="stator-fontscale-select" className="block text-xs font-medium text-[var(--stator-fg)] mb-1.5">
              UI Font Scale
            </label>
            <select
              id="stator-fontscale-select"
              value={settings.fontScale}
              onChange={(e) => onUpdateSettings({ fontScale: Number(e.target.value) as any })}
              className="w-full h-9 px-2.5 rounded-lg bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-xs font-mono text-[var(--stator-fg)] cursor-pointer"
            >
              <option value={95}>95%</option>
              <option value={100}>100% (Default)</option>
              <option value={105}>105%</option>
              <option value={110}>110% (Large)</option>
            </select>
          </div>
        </div>
      </section>

      {/* 2. Studio & Conversion Defaults */}
      <section className="rounded-xl bg-[var(--stator-surface)] border border-[var(--stator-border)] p-5 space-y-4">
        <h3 className="text-sm font-medium text-[var(--stator-fg)] flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[var(--stator-fg-muted)]" />
          <span>Studio &amp; Conversion Defaults</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--stator-fg)] mb-1.5">
              Default Output Filename Template
            </label>
            <input
              type="text"
              value={settings.filenameTemplate}
              onChange={(e) => onUpdateSettings({ filenameTemplate: e.target.value })}
              placeholder="{name}"
              className="w-full h-9 px-3 rounded-lg bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-xs font-mono text-[var(--stator-fg)]"
            />
            <p className="text-[11px] text-[var(--stator-fg-subtle)] mt-1">
              Tokens: <code>{'{name}'}</code>, <code>{'{format}'}</code>, <code>{'{res}'}</code>
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--stator-fg)] mb-1.5">
              Default Compression Goal
            </label>
            <select
              value={settings.defaultCompressionGoal}
              onChange={(e) => onUpdateSettings({ defaultCompressionGoal: e.target.value as any })}
              className="w-full h-9 px-2.5 rounded-lg bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-xs text-[var(--stator-fg)] cursor-pointer"
            >
              <option value="smaller">Smaller File</option>
              <option value="balanced">Balanced (Recommended)</option>
              <option value="highest">Highest Quality</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[var(--stator-border)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[var(--stator-fg)]">Autosave Local Projects</p>
              <p className="text-[11px] text-[var(--stator-fg-subtle)]">
                Persist project edits &amp; presets to IndexedDB automatically
              </p>
            </div>
            <ToggleSwitch
              checked={settings.autosaveProjects}
              onChange={(v) => onUpdateSettings({ autosaveProjects: v })}
              ariaLabel="Autosave local projects"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[var(--stator-fg)]">Checkerboard Transparency Grid</p>
              <p className="text-[11px] text-[var(--stator-fg-subtle)]">
                Show alpha grid behind transparent PNG/WebP previews
              </p>
            </div>
            <ToggleSwitch
              checked={settings.showCheckerboardDefault}
              onChange={(v) => onUpdateSettings({ showCheckerboardDefault: v })}
              ariaLabel="Show alpha checkerboard grid"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[var(--stator-fg)]">Strip EXIF &amp; Container Metadata</p>
              <p className="text-[11px] text-[var(--stator-fg-subtle)]">
                Default privacy hygiene on newly added images and video
              </p>
            </div>
            <ToggleSwitch
              checked={settings.defaultStripMetadata}
              onChange={(v) => {
                onUpdateSettings({ defaultStripMetadata: v });
                saveGlobalPreset({ ...getStoredGlobalPreset(), stripExif: v });
              }}
              ariaLabel="Strip EXIF and container metadata by default"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[var(--stator-fg)]">Normalize Audio (-16 LUFS)</p>
              <p className="text-[11px] text-[var(--stator-fg-subtle)]">
                Apply EBU R128 loudness normalization by default on A/V files
              </p>
            </div>
            <ToggleSwitch
              checked={settings.defaultNormalizeAudio}
              onChange={(v) => onUpdateSettings({ defaultNormalizeAudio: v })}
              ariaLabel="Normalize audio to -16 LUFS by default"
            />
          </div>
        </div>
      </section>

      {/* 4. Performance & Hardware Probes */}
      <section className="rounded-xl bg-[var(--stator-surface)] border border-[var(--stator-border)] p-5 space-y-4">
        <h3 className="text-sm font-medium text-[var(--stator-fg)] flex items-center gap-2">
          <Cpu className="w-4 h-4 text-[var(--stator-fg-muted)]" />
          <span>Local Workers &amp; Browser Capabilities</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--stator-fg)] mb-1.5">
              Max Parallel Image Workers ({settings.maxImageWorkers})
            </label>
            <input
              type="range"
              min={1}
              max={4}
              value={settings.maxImageWorkers}
              onChange={(e) => onUpdateSettings({ maxImageWorkers: Number(e.target.value) })}
              className="w-full stator-slider"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--stator-fg)] mb-1.5">
              Per-Asset Local Cache Threshold ({settings.cacheSmallMediaThresholdMb} MB)
            </label>
            <input
              type="range"
              min={5}
              max={60}
              step={5}
              value={settings.cacheSmallMediaThresholdMb}
              onChange={(e) =>
                onUpdateSettings({ cacheSmallMediaThresholdMb: Number(e.target.value) })
              }
              className="w-full stator-slider"
            />
          </div>
        </div>

        {caps && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-[var(--stator-border)] text-[11px] font-mono">
            {[
              { label: 'COOP/COEP MT', ok: caps.crossOriginIsolated && caps.sharedArrayBuffer },
              { label: 'OffscreenCanvas', ok: caps.offscreenCanvas },
              { label: 'WebP Encode', ok: caps.webpEncode },
              { label: 'AVIF Encode', ok: caps.avifEncode },
              { label: 'WebCodecs Video', ok: caps.webCodecsVideo },
              { label: 'Folder Picker', ok: caps.fileSystemAccess },
              { label: `${caps.hardwareConcurrency} CPU Threads`, ok: true },
              { label: caps.storagePersisted ? 'Storage Persisted' : 'Best-Effort Quota', ok: Boolean(caps.storagePersisted) },
            ].map((diag) => (
              <div
                key={diag.label}
                className="px-2.5 py-2 rounded-lg bg-[var(--stator-surface-2)] border border-[var(--stator-border)] flex items-center gap-1.5"
              >
                {diag.ok ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--stator-success)] shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-[var(--stator-fg-subtle)] shrink-0" />
                )}
                <span className="truncate text-[var(--stator-fg)]">{diag.label}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. Storage & Privacy */}
      <section className="rounded-xl bg-[var(--stator-surface)] border border-[var(--stator-border)] p-5 space-y-4">
        <h3 className="text-sm font-medium text-[var(--stator-fg)] flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-[var(--stator-fg-muted)]" />
          <span>Storage &amp; Privacy</span>
        </h3>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[var(--stator-success)] mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-[var(--stator-fg)]">Ephemeral Privacy Mode</p>
              <p className="text-[11px] text-[var(--stator-fg-muted)]">
                Keep everything strictly in volatile RAM; never write conversion history or project caches to IndexedDB.
              </p>
            </div>
          </div>
          <ToggleSwitch
            checked={ephemeralMode}
            onChange={onToggleEphemeralMode}
            ariaLabel="Ephemeral Privacy Mode"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--stator-border)]">
          <div className="text-xs font-mono text-[var(--stator-fg-muted)]">
            {footprint
              ? `${footprint.projectCount} saved projects · ${footprint.cachedAssetCount} cached blobs (${formatFileSize(
                  footprint.cachedAssetBytes
                )})`
              : 'Calculating IndexedDB footprint…'}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={requestPersistentStorage}
              className="h-8 px-3 rounded-lg bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-xs font-medium text-[var(--stator-fg)] cursor-pointer"
            >
              Request Persistent Storage
            </button>

            {confirmWipe ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onWipeAllData();
                    setConfirmWipe(false);
                    getProjectStorageFootprint().then(setFootprint);
                  }}
                  className="h-8 px-3 rounded-lg bg-[#9B2C3E] hover:bg-[#822333] text-white text-xs font-medium cursor-pointer"
                >
                  Confirm Full Wipe
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmWipe(false)}
                  className="h-8 px-2.5 rounded-lg bg-[var(--stator-surface-2)] text-xs text-[var(--stator-fg)] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmWipe(true)}
                className="h-8 px-3 rounded-lg bg-[var(--stator-danger-soft)] border border-[var(--stator-danger)]/35 text-xs font-medium text-[var(--stator-danger)] cursor-pointer"
              >
                Wipe All Local Data
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 6. Keyboard & Accessibility */}
      <section className="rounded-xl bg-[var(--stator-surface)] border border-[var(--stator-border)] p-5 space-y-4">
        <h3 className="text-sm font-medium text-[var(--stator-fg)] flex items-center gap-2">
          <Accessibility className="w-4 h-4 text-[var(--stator-fg-muted)]" />
          <span>Motion &amp; Accessibility</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div>
            <label className="block text-xs font-medium text-[var(--stator-fg)] mb-1.5">
              Motion Preference
            </label>
            <select
              value={settings.motionPreference}
              onChange={(e) => onUpdateSettings({ motionPreference: e.target.value as any })}
              className="w-full h-9 px-2.5 rounded-lg bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-xs text-[var(--stator-fg)] cursor-pointer"
            >
              <option value="system">Follow OS Reduced Motion</option>
              <option value="full">Full Studio Transitions</option>
              <option value="reduced">Reduced Motion (Always)</option>
            </select>
          </div>

          <div className="flex items-center justify-between pt-2 md:pt-5">
            <div>
              <p className="text-xs font-medium text-[var(--stator-fg)]">High-Contrast Keyboard Focus</p>
              <p className="text-[11px] text-[var(--stator-fg-subtle)]">
                Enhance focus outlines across all controls (Ctrl/Cmd+K palette always active)
              </p>
            </div>
            <ToggleSwitch
              checked={settings.highContrastFocus}
              onChange={(v) => onUpdateSettings({ highContrastFocus: v })}
              ariaLabel="High-contrast keyboard focus outlines"
            />
          </div>
        </div>
      </section>

      {/* 7. Open Source, License & Legal */}
      <section className="rounded-xl bg-[var(--stator-surface)] border border-[var(--stator-border)] p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-[var(--stator-fg)] flex items-center gap-2">
            <Code2 className="w-4 h-4 text-[var(--stator-fg-muted)]" />
            <span>Open Source, License &amp; Legal</span>
          </h3>
          <span className="text-[11px] font-mono text-[var(--stator-fg-muted)]">
            Stator v1.0.0 · MIT License
          </span>
        </div>

        <p className="text-xs text-[var(--stator-fg-muted)]">
          Free, open-source software running locally in your browser. Inspect source code, review
          codec attributions, or report issues on GitHub.
        </p>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-xs">
          <a
            href={STATOR_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-[var(--stator-fg)] hover:opacity-80 underline underline-offset-4"
          >
            <span>AYYU945/Stator</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href={STATOR_RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] underline underline-offset-4"
          >
            Releases
          </a>
          <a
            href={STATOR_ISSUES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] underline underline-offset-4"
          >
            Report a Bug
          </a>
          <a
            href={STATOR_LICENSE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] underline underline-offset-4"
          >
            MIT License
          </a>
          <a
            href={STATOR_THIRD_PARTY_NOTICES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] underline underline-offset-4"
          >
            Third-Party Notices
          </a>
          {onNavigateLegal && (
            <>
              <button
                type="button"
                onClick={() => onNavigateLegal('privacy')}
                className="text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] underline underline-offset-4 cursor-pointer"
              >
                Privacy Policy
              </button>
              <button
                type="button"
                onClick={() => onNavigateLegal('terms')}
                className="text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] underline underline-offset-4 cursor-pointer"
              >
                Software Terms &amp; License
              </button>
              <button
                type="button"
                onClick={() => onNavigateLegal('dmca')}
                className="text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] underline underline-offset-4 cursor-pointer"
              >
                Copyright &amp; DMCA Notice
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
};
