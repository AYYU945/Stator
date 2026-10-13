import React, { useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
}

export const DropZone: React.FC<DropZoneProps> = ({ onFilesSelected }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      onFilesSelected(droppedFiles);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      onFilesSelected(selectedFiles);
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
          isDragging
            ? 'border-zinc-500 bg-zinc-900/70 scale-[0.998] duration-150 ease-out'
            : 'border-zinc-800 bg-[#121214] hover:border-zinc-700 hover:bg-zinc-900/30 duration-200 ease-out'
        }`}
      >
        <div className="flex flex-col items-center">
          {/* Centered upload cloud icon with hover translation */}
          <div className="mb-3.5 flex items-center justify-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
              <UploadCloud
                className="w-6 h-6 sm:w-7 sm:h-7 text-zinc-300 group-hover:-translate-y-0.5 transition-transform duration-200 ease-out"
                strokeWidth={1.8}
              />
            </div>
          </div>

          {/* Clean Primary Copy */}
          <h2 className="text-sm sm:text-base font-medium text-zinc-200">
            Drop files here or click to browse
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Processed entirely on your device via WebAssembly
          </p>
        </div>
      </div>
    </div>
  );
};
