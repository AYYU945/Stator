import { FileTypeCategory, PresetSettings } from './queue.ts';

export type PipelineStepKind =
  | 'trim'
  | 'crop-rotate'
  | 'resize'
  | 'tone-adjust'
  | 'watermark'
  | 'audio-fade'
  | 'audio-cleanup'
  | 'normalize-lufs'
  | 'speed'
  | 'compress-encode';

export interface PipelineStep {
  id: string;
  kind: PipelineStepKind;
  label: string;
  enabled: boolean;
  summary: string;
  patch: Partial<PresetSettings>;
}

export interface SmartPipelineRecipe {
  id: string;
  name: string;
  category: FileTypeCategory | 'batch';
  targetFormat: string;
  description: string;
  steps: PipelineStep[];
  createdAt: number;
  isBuiltIn?: boolean;
}
