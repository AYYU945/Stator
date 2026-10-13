import { FileTypeCategory } from './queue.ts';

export interface HistoryEntry {
  id: string;
  originalName: string;
  convertedName: string;
  originalSizeFormatted: string;
  outputSizeFormatted: string;
  savingsPercent: number; // e.g., 42
  typeCategory: FileTypeCategory;
  timestamp: number; // Unix epoch ms
  outputBlobUrl?: string;
  blob?: Blob;
}

export function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  return `${diffDays}d ago`;
}
