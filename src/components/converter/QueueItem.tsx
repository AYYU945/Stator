import React from 'react';
import { SlidersHorizontal, Play, Trash2 } from 'lucide-react';
import { QueueItem as QueueItemType } from '../../types/queue.ts';

export interface QueueItemProps {
  item: QueueItemType;
  onOpenInspector?: (id: string) => void;
  onStartConversion?: (id: string) => void;
  onRemoveItem?: (id: string) => void;
  renderIcon?: (category: QueueItemType['typeCategory'], targetFormat?: string) => React.ReactNode;
}

export const QueueItem: React.FC<QueueItemProps> = ({
  item,
  onOpenInspector,
  onStartConversion,
  onRemoveItem,
  renderIcon,
}) => {
  const fileName = item.file?.name || item.name || '';
  const sourceExt = fileName.includes('.')
    ? fileName.split('.').pop()?.toUpperCase() || 'FILE'
    : (item.file?.name?.split('.').pop()?.toUpperCase() || 'FILE');
  const targetExt = item.targetFormat.toUpperCase();

  return (
    <div className="w-full bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3.5 sm:p-4 transition-all shadow-sm dark:shadow-none hover:border-zinc-300 dark:hover:border-zinc-700">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Media icon + truncated filename + formatted size */}
        <div className="flex items-center gap-3 min-w-0 flex-1 select-none">
          {renderIcon && renderIcon(item.typeCategory, item.targetFormat)}
          <div className="min-w-0">
            <span className="font-semibold text-zinc-900 dark:text-white text-sm sm:text-base tracking-tight truncate block">
              {item.name}
            </span>
            <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500 block truncate">
              {item.technicalTag || item.sizeFormatted}
            </span>
          </div>
        </div>

        {/* Center: Target format badge - purely informational, non-clickable readout */}
        <div className="shrink-0 flex items-center">
          <div className="text-zinc-600 bg-zinc-100 border border-zinc-200 dark:text-zinc-400 dark:bg-zinc-900/70 dark:border-zinc-800 rounded-md px-2.5 py-1 text-xs font-mono tracking-tight cursor-default select-none pointer-events-none">
            {sourceExt} → {targetExt}
          </div>
        </div>

        {/* Right: Sliders button (single explicit trigger for presets), Convert button, Remove button */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onOpenInspector?.(item.id)}
            className="p-1.5 rounded-md bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all duration-120 ease-out active:scale-[0.96] cursor-pointer"
            title="Encoding Presets & Settings"
            aria-label="Encoding Presets & Settings"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          {onStartConversion && (
            <button
              type="button"
              onClick={() => onStartConversion(item.id)}
              className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white font-medium rounded-md px-3 py-1.5 text-xs flex items-center gap-1.5 transition-all duration-120 ease-out active:scale-[0.96] cursor-pointer shadow-xs"
              title="Convert Now"
            >
              <Play className="w-3 h-3 fill-white dark:fill-zinc-900" />
              <span className="hidden sm:inline">Convert</span>
            </button>
          )}

          {onRemoveItem && (
            <button
              type="button"
              onClick={() => onRemoveItem(item.id)}
              className="p-1.5 rounded-md bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-red-600 transition-all duration-120 ease-out active:scale-[0.96] cursor-pointer"
              title="Remove from queue"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
