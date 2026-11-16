import { FileTypeCategory, PresetSettings } from './queue.ts';

export type ProjectType = 'video' | 'image' | 'audio' | 'gif' | 'batch' | 'blank';

export const PROJECT_SCHEMA_VERSION = 3;

export interface ProjectAssetMeta {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  sizeFormatted: string;
  typeCategory: FileTypeCategory;
  formatBadge: string;
  targetFormat: string;
  presetSettings: PresetSettings;
  dimensions?: string;
  duration?: string;
  durationSeconds?: number;
  technicalTag?: string;
  /** True only when the raw source Blob is genuinely cached in IndexedDB project_assets */
  hasCachedBlob: boolean;
  /** Lightweight JPEG/WebP preview thumbnail stored in metadata */
  thumbnailDataUrl?: string;
}

export interface ProjectSnapshot {
  id: string;
  label: string;
  createdAt: number;
  assets: ProjectAssetMeta[];
}

export interface ProjectExportSettings {
  filenameTemplate: string;
  batchZipPreferred: boolean;
  defaultTargetFormat?: string;
}

export interface ProjectRecord {
  schemaVersion: number;
  id: string;
  name: string;
  type: ProjectType;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt: number;
  assets: ProjectAssetMeta[];
  /** Pipeline ID or custom ordered step IDs attached to this project */
  activePipelineId?: string;
  thumbnailDataUrl?: string;
  exportSettings: ProjectExportSettings;
  snapshots: ProjectSnapshot[];
}

export interface ProjectTransferBundle {
  statorProjectBundle: 3;
  exportedAt: number;
  project: ProjectRecord;
  note: string;
}
