import { useState, useEffect, useCallback } from 'react';
import {
  DEFAULT_STATOR_SETTINGS,
  NavToolId,
  StatorSettings,
} from '../types/settings.ts';
import { getStoredTheme } from './theme.ts';

const SETTINGS_STORAGE_KEY = 'stator_settings_v3';

const VALID_NAV_IDS = new Set<NavToolId>([
  'home',
  'projects',
  'history',
  'converter',
  'compressor',
  'video',
  'images',
  'audio',
  'gif-studio',
  'batch',
  'quality-lab',
  'pipelines',
  'presets',
  'settings',
  'help',
]);

export function sanitizeStatorSettings(raw: unknown): StatorSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_STATOR_SETTINGS, theme: getStoredTheme() };
  }
  const input = raw as Record<string, unknown>;
  const base = { ...DEFAULT_STATOR_SETTINGS };

  if (input.theme === 'system' || input.theme === 'light' || input.theme === 'dark') {
    base.theme = input.theme;
  } else {
    base.theme = getStoredTheme();
  }
  if (input.density === 'comfortable' || input.density === 'compact') {
    base.density = input.density;
  }
  if (input.fontScale === 95 || input.fontScale === 100 || input.fontScale === 105 || input.fontScale === 110) {
    base.fontScale = input.fontScale;
  }
  if (typeof input.sidebarCollapsed === 'boolean') {
    base.sidebarCollapsed = input.sidebarCollapsed;
  }
  if (typeof input.sidebarWidth === 'number' && Number.isFinite(input.sidebarWidth)) {
    base.sidebarWidth = Math.min(300, Math.max(200, Math.round(input.sidebarWidth)));
  }
  if (
    input.motionPreference === 'system' ||
    input.motionPreference === 'full' ||
    input.motionPreference === 'reduced'
  ) {
    base.motionPreference = input.motionPreference;
  }
  if (typeof input.highContrastFocus === 'boolean') {
    base.highContrastFocus = input.highContrastFocus;
  }
  if (Array.isArray(input.pinnedTools)) {
    base.pinnedTools = input.pinnedTools
      .filter((t): t is NavToolId => typeof t === 'string' && VALID_NAV_IDS.has(t as NavToolId))
      .slice(0, 8);
  }
  if (typeof input.autosaveProjects === 'boolean') {
    base.autosaveProjects = input.autosaveProjects;
  }
  if (typeof input.showCheckerboardDefault === 'boolean') {
    base.showCheckerboardDefault = input.showCheckerboardDefault;
  }
  if (typeof input.leftPanelWidth === 'number' && Number.isFinite(input.leftPanelWidth)) {
    base.leftPanelWidth = Math.min(340, Math.max(220, Math.round(input.leftPanelWidth)));
  }
  if (typeof input.rightPanelWidth === 'number' && Number.isFinite(input.rightPanelWidth)) {
    base.rightPanelWidth = Math.min(400, Math.max(280, Math.round(input.rightPanelWidth)));
  }
  if (typeof input.filenameTemplate === 'string' && input.filenameTemplate.trim().length > 0) {
    base.filenameTemplate = input.filenameTemplate.trim().slice(0, 64);
  }
  if (
    input.defaultCompressionGoal === 'smaller' ||
    input.defaultCompressionGoal === 'balanced' ||
    input.defaultCompressionGoal === 'highest'
  ) {
    base.defaultCompressionGoal = input.defaultCompressionGoal;
  }
  if (typeof input.defaultNormalizeAudio === 'boolean') {
    base.defaultNormalizeAudio = input.defaultNormalizeAudio;
  }
  if (typeof input.defaultStripMetadata === 'boolean') {
    base.defaultStripMetadata = input.defaultStripMetadata;
  }
  if (typeof input.maxImageWorkers === 'number' && Number.isFinite(input.maxImageWorkers)) {
    base.maxImageWorkers = Math.min(4, Math.max(1, Math.round(input.maxImageWorkers)));
  }
  if (
    typeof input.cacheSmallMediaThresholdMb === 'number' &&
    Number.isFinite(input.cacheSmallMediaThresholdMb)
  ) {
    base.cacheSmallMediaThresholdMb = Math.min(
      60,
      Math.max(5, Math.round(input.cacheSmallMediaThresholdMb))
    );
  }

  return base;
}

export function loadStatorSettings(): StatorSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_STATOR_SETTINGS };
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return sanitizeStatorSettings(null);
    return sanitizeStatorSettings(JSON.parse(raw));
  } catch {
    return sanitizeStatorSettings(null);
  }
}

export function saveStatorSettings(settings: StatorSettings): void {
  if (typeof window === 'undefined') return;
  try {
    const clean = sanitizeStatorSettings(settings);
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(clean));
    applyDocumentSettings(clean);
  } catch (err) {
    console.warn('Unable to persist Stator settings:', err);
  }
}

export function applyDocumentSettings(settings: StatorSettings): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--stator-font-scale', String(settings.fontScale / 100));
  root.setAttribute('data-density', settings.density);
  root.setAttribute('data-focus-ring', settings.highContrastFocus ? 'high' : 'normal');
}

export function applyFilenameTemplate(
  sourceName: string,
  targetFormat: string,
  template: string,
  resolution?: string
): string {
  const sanitized = (sourceName || 'media')
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, '_')
    .replace(/^\.+/, '')
    .trim();
  const stem = sanitized.replace(/\.[^/.]+$/, '') || 'output';
  const ext = (targetFormat || 'bin')
    .toLowerCase()
    .split(' ')[0]
    .replace(/[^a-z0-9]/g, '') || 'bin';

  const rendered = (template || '{name}')
    .replace(/\{name\}/g, stem)
    .replace(/\{format\}/g, ext)
    .replace(/\{res\}/g, (resolution || 'orig').replace(/[^a-zA-Z0-9]/g, ''))
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, '_');

  return `${rendered || stem}.${ext}`;
}

export function useStatorSettings() {
  const [settings, setSettingsState] = useState<StatorSettings>(() => loadStatorSettings());

  useEffect(() => {
    applyDocumentSettings(settings);
  }, [settings]);

  const updateSettings = useCallback((patch: Partial<StatorSettings>) => {
    setSettingsState((prev) => {
      const next = sanitizeStatorSettings({ ...prev, ...patch });
      saveStatorSettings(next);
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    const fresh = sanitizeStatorSettings(DEFAULT_STATOR_SETTINGS);
    saveStatorSettings(fresh);
    setSettingsState(fresh);
  }, []);

  return {
    settings,
    updateSettings,
    resetSettings,
  };
}
