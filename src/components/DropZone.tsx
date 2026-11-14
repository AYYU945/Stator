import React, { useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { GlobalPreset } from '../lib/presets.ts';

export interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  globalPreset?: GlobalPreset;
  currentQueueLength?: number;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFilesSelected,
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processIncomingFiles = (rawFiles: File[]) => {
    if (!rawFiles || rawFiles.length === 0) return;
    onFilesSelected(rawFiles);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      processIncomingFiles(droppedFiles);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      processIncomingFiles(selectedFiles);
      e.target.value = '';
    }
  };

  const triggerBrowse = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Utilitarian Industrial Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerBrowse}
        className={`group w-full rounded-lg p-8 sm:p-12 text-center select-none cursor-pointer border border-dashed transition-all ${
          isDragActive
            ? 'bg-zinc-100/90 border-zinc-500 shadow-md dark:bg-zinc-900/80 dark:border-zinc-400 dark:shadow-md scale-[0.998] duration-150 ease-out'
            : 'bg-white dark:bg-[#121214] border-zinc-300 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-700 shadow-sm dark:shadow-none duration-200 ease-out'
        }`}
      >
        <div className="flex flex-col items-center">
          {/* Centered upload cloud icon with hover translation */}
          <div className="mb-3.5 flex items-center justify-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 shadow-sm">
              <UploadCloud
                className="w-6 h-6 sm:w-7 sm:h-7 text-zinc-700 dark:text-zinc-300 group-hover:-translate-y-0.5 transition-transform duration-200 ease-out"
                strokeWidth={1.8}
              />
            </div>
          </div>

          {/* Clean Primary Copy */}
          <h2 className="text-sm sm:text-base font-medium text-zinc-900 dark:text-zinc-200">
            {isDragActive ? 'Drop files to stage in local queue' : 'Drop files here or click to browse'}
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            {isDragActive
              ? 'Release to stage files in local queue'
              : 'Processed entirely on your device via WebAssembly'}
          </p>
        </div>
      </div>
    </div>
  );
};
