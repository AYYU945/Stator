import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Video,
  Image as ImageIcon,
  Music,
  Film,
  Layers,
  FilePlus2,
  FolderUp,
  X,
  ArrowRight,
} from 'lucide-react';
import { ProjectType } from '../types/project.ts';
import { STATOR_TRANSITION } from '../lib/motion.ts';

export interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (type: ProjectType) => void;
  onImportProjectJsonClick: () => void;
  onImportMediaClick: () => void;
}

export const PROJECT_STARTER_OPTIONS: Array<{
  type: ProjectType;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}> = [
  {
    type: 'video',
    title: 'Video Studio',
    description: 'Trim, split, resize, captions, and MP4 / WebM transcoding.',
    icon: Video,
  },
  {
    type: 'image',
    title: 'Image Studio',
    description: 'Crop, tone, watermark, WebP / AVIF encoding, and icon packs.',
    icon: ImageIcon,
  },
  {
    type: 'audio',
    title: 'Audio Studio',
    description: 'Waveform trim, -16 LUFS normalization, EQ, and silence cleanup.',
    icon: Music,
  },
  {
    type: 'gif',
    title: 'GIF & Animation',
    description: 'Frame sequence timing, 2-pass palette GIF, and Animated WebP.',
    icon: Film,
  },
  {
    type: 'batch',
    title: 'Batch Queue',
    description: 'Multi-file processing, shared presets, and instant ZIP export.',
    icon: Layers,
  },
  {
    type: 'blank',
    title: 'Blank Workspace',
    description: 'Open a clean canvas and attach any local media afterward.',
    icon: FilePlus2,
  },
];

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onCreateProject,
  onImportProjectJsonClick,
  onImportMediaClick,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="New Project"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={STATOR_TRANSITION.overlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs"
        >
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.985 }}
            transition={STATOR_TRANSITION.overlay}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-xl bg-[var(--stator-surface)] border border-[var(--stator-border-strong)] shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
          >
            <div className="px-6 py-4 border-b border-[var(--stator-border)] flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-[var(--stator-fg)]">
                  New Project
                </h2>
                <p className="text-xs text-[var(--stator-fg-muted)] mt-0.5">
                  Choose a focused studio workspace tailored to your media.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close new project dialog"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] hover:bg-[var(--stator-surface-2)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PROJECT_STARTER_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => {
                      onClose();
                      onCreateProject(opt.type);
                    }}
                    className="group rounded-xl bg-[var(--stator-surface)] hover:bg-[var(--stator-surface-2)] border border-[var(--stator-border)] hover:border-[var(--stator-border-control)] p-4 text-left flex items-start gap-3.5 transition-colors active:scale-[0.99] cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[var(--stator-surface-2)] group-hover:bg-[var(--stator-surface)] border border-[var(--stator-border)] flex items-center justify-center text-[var(--stator-fg)] shrink-0">
                      <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-[var(--stator-fg)]">
                          {opt.title}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-[var(--stator-fg-muted)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                      <p className="text-xs text-[var(--stator-fg-muted)] mt-1 leading-relaxed">
                        {opt.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="px-6 py-3.5 border-t border-[var(--stator-border)] bg-[var(--stator-bg)]/60 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onImportProjectJsonClick();
                }}
                className="text-xs font-medium text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] cursor-pointer"
              >
                Import .stator.json Project
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onImportMediaClick();
                }}
                className="h-9 px-3.5 rounded-lg bg-[var(--stator-cta-bg)] hover:bg-[var(--stator-cta-hover)] text-[var(--stator-cta-fg)] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
              >
                <FolderUp className="w-3.5 h-3.5" />
                <span>Open Media Files Directly</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
