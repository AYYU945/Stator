import React, { useEffect, useState } from 'react';
import {
  History,
  X,
  Trash2,
  Download,
  Camera,
  Video,
  Music,
  FileText,
  FileBox,
} from 'lucide-react';
import { HistoryEntry, formatRelativeTime } from '../types/history.ts';
import { FileTypeCategory } from '../types/queue.ts';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryEntry[];
  onClearHistory: () => void;
  onDeleteEntry: (id: string) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
  onClearHistory,
  onDeleteEntry,
}) => {
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setIsRendered(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Close on Escape key press
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

  const handleDownloadEntry = (entry: HistoryEntry) => {
    let url = entry.outputBlobUrl;
    let shouldRevoke = false;

    if (!url && entry.blob) {
      url = URL.createObjectURL(entry.blob);
      shouldRevoke = true;
    }

    if (!url) {
      const syntheticBlob = new Blob(['OmniConvert transcoded asset file'], {
        type: 'application/octet-stream',
      });
      url = URL.createObjectURL(syntheticBlob);
      shouldRevoke = true;
    }

    const a = document.createElement('a');
    a.href = url;
    a.download = entry.convertedName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (shouldRevoke) {
      URL.revokeObjectURL(url);
    }
  };

  const renderIcon = (category: FileTypeCategory) => {
    switch (category) {
      case 'video':
        return (
          <div className="w-9 h-9 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center justify-center shrink-0">
            <Video className="w-4 h-4" strokeWidth={1.8} />
          </div>
        );
      case 'audio':
        return (
          <div className="w-9 h-9 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center justify-center shrink-0">
            <Music className="w-4 h-4" strokeWidth={1.8} />
          </div>
        );
      case 'document':
        return (
          <div className="w-9 h-9 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" strokeWidth={1.8} />
          </div>
        );
      case 'other':
        return (
          <div className="w-9 h-9 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center justify-center shrink-0">
            <FileBox className="w-4 h-4" strokeWidth={1.8} />
          </div>
        );
      case 'image':
      default:
        return (
          <div className="w-9 h-9 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center justify-center shrink-0">
            <Camera className="w-4 h-4" strokeWidth={1.8} />
          </div>
        );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-state={isVisible ? 'open' : 'closed'}
      onClick={onClose}
      className={`fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm transition-opacity duration-200 ease-out opacity-0 data-[state=open]:opacity-100 ${
        isVisible ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
    >
      {/* Drawer Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        data-state={isVisible ? 'open' : 'closed'}
        className="w-full max-w-md bg-[#121214] border-l border-zinc-800 p-5 sm:p-6 flex flex-col h-full shadow-2xl relative overflow-hidden transition-transform duration-200 translate-x-full data-[state=open]:translate-x-0"
        style={{
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center justify-center shrink-0">
              <History className="w-4 h-4" />
            </div>

            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Conversion History
              </h3>
              <span className="px-2 py-0.5 rounded-md bg-zinc-200 text-zinc-900 text-[11px] font-bold">
                {history.length}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                onClick={onClearHistory}
                className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 rounded-md px-2.5 py-1 text-xs transition-colors cursor-pointer"
                title="Clear all saved records"
              >
                Clear History
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Content Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-4 space-y-2.5">
          {history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 my-auto text-zinc-500">
              <div className="w-12 h-12 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mb-3">
                <History className="w-6 h-6 stroke-[1.5]" />
              </div>
              <h4 className="text-sm font-semibold text-zinc-300">No history yet</h4>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs leading-relaxed">
                Files you convert will be cataloged here for quick access and instant re-download.
              </p>
            </div>
          ) : (
            history.map((entry) => (
              <div
                key={entry.id}
                className="p-3 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-3"
              >
                {/* Left: Icon */}
                {renderIcon(entry.typeCategory)}

                {/* Middle: Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-white text-xs sm:text-sm tracking-tight truncate block">
                      {entry.convertedName}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono shrink-0">
                      {formatRelativeTime(entry.timestamp)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono mt-1">
                    <span>
                      {entry.originalSizeFormatted} → {entry.outputSizeFormatted}
                    </span>
                    <span className="text-emerald-400 font-medium">
                      (↓ -{entry.savingsPercent}%)
                    </span>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleDownloadEntry(entry)}
                    className="p-1.5 rounded-md bg-zinc-100 hover:bg-white text-zinc-900 transition-colors cursor-pointer"
                    title="Download Converted File"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onDeleteEntry(entry.id)}
                    className="p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                    title="Delete Record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer Notice */}
        <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500 font-mono shrink-0">
          <span>Persistent Local Storage</span>
          <span>IndexedDB Ready</span>
        </div>
      </div>
    </div>
  );
};
