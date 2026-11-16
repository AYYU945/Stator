import React, { useState, useRef } from 'react';
import {
  Workflow,
  Play,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { SmartPipelineRecipe, PipelineStep } from '../types/pipeline.ts';
import { PresetSettings, QueueItem } from '../types/queue.ts';
import {
  loadSmartPipelines,
  saveSmartPipelines,
  compilePipelineToPreset,
  isPipelineCompatibleWithCategory,
} from '../lib/pipelineRecipes.ts';
import { ToggleSwitch } from './ui/Primitives.tsx';

export interface SmartPipelinesViewProps {
  queue: QueueItem[];
  onApplyPipelineToQueue: (
    recipe: SmartPipelineRecipe,
    compiledPreset: PresetSettings
  ) => void;
  onToast: (msg: string) => void;
}

export const SmartPipelinesView: React.FC<SmartPipelinesViewProps> = ({
  queue,
  onApplyPipelineToQueue,
  onToast,
}) => {
  const [pipelines, setPipelines] = useState<SmartPipelineRecipe[]>(() => loadSmartPipelines());
  const [activeId, setActiveId] = useState<string>(pipelines[0]?.id || '');
  const importRef = useRef<HTMLInputElement>(null);

  const activePipeline = pipelines.find((p) => p.id === activeId) || pipelines[0] || null;

  const persist = (next: SmartPipelineRecipe[]) => {
    setPipelines(next);
    saveSmartPipelines(next);
  };

  const toggleStep = (stepId: string) => {
    if (!activePipeline) return;
    const next = pipelines.map((p) =>
      p.id !== activePipeline.id
        ? p
        : {
            ...p,
            steps: p.steps.map((s) => (s.id === stepId ? { ...s, enabled: !s.enabled } : s)),
          }
    );
    persist(next);
  };

  const moveStep = (idx: number, delta: -1 | 1) => {
    if (!activePipeline) return;
    const targetIdx = idx + delta;
    if (targetIdx < 0 || targetIdx >= activePipeline.steps.length) return;
    const nextSteps = [...activePipeline.steps];
    const [moved] = nextSteps.splice(idx, 1);
    nextSteps.splice(targetIdx, 0, moved);
    persist(
      pipelines.map((p) => (p.id === activePipeline.id ? { ...p, steps: nextSteps } : p))
    );
  };

  const handleCreateCustom = () => {
    const id = `pipe-custom-${Date.now()}`;
    const newRecipe: SmartPipelineRecipe = {
      id,
      name: 'Custom Web Compression Recipe',
      category: 'batch',
      targetFormat: 'WEBP',
      description: 'Single-pass resize + strip metadata + balanced quality compression.',
      createdAt: Date.now(),
      steps: [
        {
          id: `${id}-s1`,
          kind: 'resize',
          label: 'Constrain Max 1080p',
          enabled: true,
          summary: '1080p HD bound',
          patch: { imageResize: '1080p', videoResolution: '1080p' },
        },
        {
          id: `${id}-s2`,
          kind: 'compress-encode',
          label: 'Balanced Encode & Strip EXIF',
          enabled: true,
          summary: '84% · CRF 23 · clean metadata',
          patch: { imageQuality: 84, videoBitrate: 'balanced', stripMetadata: true },
        },
      ],
    };
    persist([newRecipe, ...pipelines]);
    setActiveId(id);
    onToast('Created new Smart Pipeline');
  };

  const handleDeleteCustom = (id: string) => {
    const next = pipelines.filter((p) => p.id !== id);
    persist(next);
    if (activeId === id) setActiveId(next[0]?.id || '');
    onToast('Pipeline removed');
  };

  const handleExportRecipe = (recipe: SmartPipelineRecipe) => {
    const blob = new Blob([JSON.stringify(recipe, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${recipe.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pipeline.json`;
    a.click();
    URL.revokeObjectURL(url);
    onToast('Exported pipeline JSON');
  };

  const handleImportRecipe = async (file: File) => {
    try {
      const raw = JSON.parse(await file.text());
      if (!raw || typeof raw.name !== 'string' || !Array.isArray(raw.steps)) {
        onToast('Invalid pipeline JSON format.');
        return;
      }
      const imported: SmartPipelineRecipe = {
        ...raw,
        id: `pipe-${Date.now()}`,
        isBuiltIn: false,
        createdAt: Date.now(),
      };
      persist([imported, ...pipelines]);
      setActiveId(imported.id);
      onToast(`Imported pipeline "${imported.name}"`);
    } catch {
      onToast('Could not parse pipeline JSON.');
    }
  };

  const compatibleCount = activePipeline
    ? queue.filter((q) => isPipelineCompatibleWithCategory(activePipeline, q.typeCategory)).length
    : 0;

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <input
        ref={importRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleImportRecipe(f);
          e.target.value = '';
        }}
      />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-[var(--stator-border)]">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-[var(--stator-fg-subtle)] mb-1 inline-flex items-center gap-1.5">
            <Workflow className="w-3.5 h-3.5 text-[var(--stator-accent-fg)]" />
            <span>Single-Pass Compiled Recipes</span>
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--stator-fg)]">
            Smart Pipelines
          </h2>
          <p className="text-xs sm:text-sm text-[var(--stator-fg-muted)] mt-1">
            Chain crop, scaling, loudness normalization, and compression into a single-pass execution recipe to prevent generational quality loss.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => importRef.current?.click()}
            className="h-9 px-3 rounded-lg bg-[var(--stator-surface)] hover:bg-[var(--stator-surface-2)] border border-[var(--stator-border)] text-xs font-medium text-[var(--stator-fg)] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import JSON</span>
          </button>
          <button
            type="button"
            onClick={handleCreateCustom}
            className="h-9 px-3.5 rounded-lg bg-[var(--stator-accent)] hover:bg-[var(--stator-accent-hover)] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Pipeline</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left List */}
        <div className="lg:col-span-4 rounded-xl bg-[var(--stator-surface)] border border-[var(--stator-border)] divide-y divide-[var(--stator-border)] overflow-hidden">
          {pipelines.map((p) => {
            const isSelected = p.id === activePipeline?.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setActiveId(p.id)}
                className={`w-full p-4 text-left transition-colors cursor-pointer ${
                  isSelected ? 'bg-[var(--stator-accent-soft)]' : 'hover:bg-[var(--stator-surface-2)]/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[var(--stator-fg)] truncate">
                    {p.name}
                  </span>
                  <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-[var(--stator-surface-2)] border border-[var(--stator-border)] text-[var(--stator-fg-muted)]">
                    {p.category} → {p.targetFormat}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--stator-fg-muted)] mt-1 line-clamp-2">
                  {p.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Right Pipeline Step Editor */}
        {activePipeline && (
          <div className="lg:col-span-8 rounded-xl bg-[var(--stator-surface)] border border-[var(--stator-border)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--stator-border)] flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-[var(--stator-fg)]">
                  {activePipeline.name}
                </h3>
                <p className="text-xs text-[var(--stator-fg-muted)] mt-0.5">
                  Target: <span className="font-mono">{activePipeline.targetFormat}</span> ·{' '}
                  {activePipeline.steps.filter((s) => s.enabled).length} active steps (compiled into 1 pass)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExportRecipe(activePipeline)}
                  className="h-8 px-3 rounded-lg bg-[var(--stator-surface-2)] border border-[var(--stator-border)] text-xs font-medium text-[var(--stator-fg)] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>
                {!activePipeline.isBuiltIn && (
                  <button
                    type="button"
                    onClick={() => handleDeleteCustom(activePipeline.id)}
                    className="h-8 w-8 rounded-lg bg-[var(--stator-surface-2)] border border-[var(--stator-border)] flex items-center justify-center text-[var(--stator-fg-muted)] hover:text-[var(--stator-danger)] cursor-pointer"
                    aria-label="Delete pipeline"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="divide-y divide-[var(--stator-border)]">
              {activePipeline.steps.map((step: PipelineStep, idx: number) => (
                <div
                  key={step.id}
                  className="px-5 py-3.5 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-md bg-[var(--stator-surface-2)] border border-[var(--stator-border)] font-mono text-[11px] flex items-center justify-center text-[var(--stator-fg-muted)] shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p
                        className={`text-xs font-semibold ${
                          step.enabled ? 'text-[var(--stator-fg)]' : 'text-[var(--stator-fg-subtle)] line-through'
                        }`}
                      >
                        {step.label}
                      </p>
                      <p className="text-[11px] font-mono text-[var(--stator-fg-subtle)]">
                        {step.summary}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveStep(idx, -1)}
                      aria-label="Move step up"
                      className="p-1.5 rounded text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === activePipeline.steps.length - 1}
                      onClick={() => moveStep(idx, 1)}
                      aria-label="Move step down"
                      className="p-1.5 rounded text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <ToggleSwitch
                      checked={step.enabled}
                      onChange={() => toggleStep(step.id)}
                      ariaLabel={`Toggle ${step.label}`}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-4 border-t border-[var(--stator-border)] bg-[var(--stator-surface-2)]/40 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs flex items-center gap-2">
                {queue.length === 0 ? (
                  <span className="text-[var(--stator-fg-muted)]">
                    Stage files in Studio first to run this pipeline.
                  </span>
                ) : compatibleCount > 0 ? (
                  <span className="text-[var(--stator-success)] inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Ready for {compatibleCount} compatible file{compatibleCount === 1 ? '' : 's'} in Studio
                  </span>
                ) : (
                  <span className="text-[var(--stator-warning)] inline-flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    No {activePipeline.category} files currently staged in Studio
                  </span>
                )}
              </div>

              <button
                type="button"
                disabled={compatibleCount === 0}
                onClick={() => {
                  const compiled = compilePipelineToPreset(activePipeline);
                  onApplyPipelineToQueue(activePipeline, compiled);
                }}
                className="h-9 px-4 rounded-lg bg-[var(--stator-accent)] hover:bg-[var(--stator-accent-hover)] disabled:opacity-45 text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Apply &amp; Stage in Studio</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
