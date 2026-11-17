import { ThemeMode } from '../lib/theme.ts';
import { ProjectType } from './project.ts';

export type UiDensity = 'comfortable' | 'compact';
export type MotionPreference = 'system' | 'full' | 'reduced';
export type NavToolId =
  | 'home'
  | 'projects'
  | 'history'
  | 'converter'
  | 'compressor'
  | 'video'
  | 'images'
  | 'audio'
  | 'gif-studio'
  | 'batch'
  | 'quality-lab'
  | 'pipelines'
  | 'presets'
  | 'settings'
  | 'help';

export interface StatorSettings {
  // Appearance
  theme: ThemeMode;
  density: UiDensity;
  fontScale: 95 | 100 | 105 | 110;
  sidebarCollapsed: boolean;
  sidebarWidth: number; // 200..300
  motionPreference: MotionPreference;
  highContrastFocus: boolean;

  // Studio
  pinnedTools: NavToolId[];
  recentTools: NavToolId[];
  recentProjectTypes: ProjectType[];
  autosaveProjects: boolean;
  showCheckerboardDefault: boolean;
  leftPanelWidth: number;
  rightPanelWidth: number;

  // Conversion
  filenameTemplate: string; // e.g. "{name}", "{name}_stator", "{name}_{format}"
  defaultCompressionGoal: 'smaller' | 'balanced' | 'highest';
  defaultNormalizeAudio: boolean;
  defaultStripMetadata: boolean;

  // Performance
  maxImageWorkers: number; // 1..4
  cacheSmallMediaThresholdMb: number; // 5..60 MB per file cached in IndexedDB
}

export const DEFAULT_STATOR_SETTINGS: StatorSettings = {
  theme: 'system',
  density: 'comfortable',
  fontScale: 100,
  sidebarCollapsed: false,
  sidebarWidth: 224,
  motionPreference: 'system',
  highContrastFocus: false,
  pinnedTools: ['converter', 'compressor', 'images', 'video', 'audio'],
  recentTools: ['video', 'images', 'audio'],
  recentProjectTypes: ['video', 'image', 'audio'],
  autosaveProjects: true,
  showCheckerboardDefault: true,
  leftPanelWidth: 256,
  rightPanelWidth: 320,
  filenameTemplate: '{name}',
  defaultCompressionGoal: 'balanced',
  defaultNormalizeAudio: false,
  defaultStripMetadata: true,
  maxImageWorkers: 4,
  cacheSmallMediaThresholdMb: 35,
};
