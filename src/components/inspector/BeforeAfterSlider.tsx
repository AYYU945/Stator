import React, { useState, useRef } from 'react';
import { ZoomIn, ZoomOut, MoveHorizontal } from 'lucide-react';

export interface BeforeAfterSliderProps {
  originalUrl: string;
  convertedUrl: string;
  originalLabel?: string;
  convertedLabel?: string;
  alt?: string;
  heightClass?: string;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  originalUrl,
  convertedUrl,
  originalLabel = 'Original',
  convertedLabel = 'Converted',
  alt = 'Comparison preview',
  heightClass = 'h-[240px] sm:h-[280px]',
}) => {
  const [splitPercent, setSplitPercent] = useState<number>(50);
  const [zoomScale, setZoomScale] = useState<1 | 2>(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<boolean>(false);

  const updateFromClientX = (clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSplitPercent(Math.max(4, Math.min(96, Math.round(pct))));
  };

  return (
    <div className="space-y-2 w-full">
      <div
        ref={containerRef}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          draggingRef.current = true;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          updateFromClientX(e.clientX);
        }}
        onPointerMove={(e) => {
          if (draggingRef.current) {
            updateFromClientX(e.clientX);
          }
        }}
        onPointerUp={(e) => {
          draggingRef.current = false;
          try {
            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
          } catch {}
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            setSplitPercent((p) => Math.max(4, p - 4));
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            setSplitPercent((p) => Math.min(96, p + 4));
          } else if (e.key === 'Home') {
            e.preventDefault();
            setSplitPercent(4);
          } else if (e.key === 'End') {
            e.preventDefault();
            setSplitPercent(96);
          }
        }}
        tabIndex={0}
        role="slider"
        aria-label="Before and after image comparison slider"
        aria-valuemin={4}
        aria-valuemax={96}
        aria-valuenow={splitPercent}
        className={`relative w-full ${heightClass} select-none overflow-hidden rounded-lg stator-checkerboard border border-[var(--stator-stage-border)] cursor-ew-resize touch-none`}
      >
        {/* Underlying Converted Layer */}
        <img
          src={convertedUrl}
          alt={`${alt} converted`}
          draggable={false}
          style={{
            transform: `scale(${zoomScale})`,
            transition: 'transform 160ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />

        {/* Clipped Original Layer */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ clipPath: `inset(0 ${100 - splitPercent}% 0 0)` }}
        >
          <img
            src={originalUrl}
            alt={`${alt} original`}
            draggable={false}
            style={{
              transform: `scale(${zoomScale})`,
              transition: 'transform 160ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Contrast Scrim Labels */}
        <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/80 text-white text-[10px] font-mono tabular-nums pointer-events-none">
          {originalLabel}
        </span>
        <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/80 text-white text-[10px] font-mono tabular-nums pointer-events-none">
          {convertedLabel}
        </span>

        {/* Zoom Fit / 2x Inspection Toggle */}
        <button
          type="button"
          onClick={() => setZoomScale((z) => (z === 1 ? 2 : 1))}
          className="absolute bottom-2.5 right-2.5 px-2 py-1 rounded-md bg-black/80 hover:bg-black text-white text-[10px] font-mono tabular-nums inline-flex items-center gap-1 cursor-pointer transition-colors"
          title={zoomScale === 1 ? 'Zoom 2× for pixel inspection' : 'Reset zoom to Fit'}
        >
          {zoomScale === 1 ? <ZoomIn className="w-3 h-3" /> : <ZoomOut className="w-3 h-3" />}
          <span>{zoomScale === 1 ? 'Fit' : '2×'}</span>
        </button>

        {/* Precision Divider & Handle */}
        <div
          className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_10px_rgba(0,0,0,0.65)] pointer-events-none"
          style={{ left: `${splitPercent}%` }}
        >
          <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[var(--stator-accent)] border-2 border-white text-white flex items-center justify-center shadow-md">
            <MoveHorizontal className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      <p className="text-[11px] font-mono tabular-nums text-[var(--stator-fg-subtle)] flex items-center justify-between">
        <span>Drag divider or use ← / → arrow keys to inspect compression artifacts</span>
        <span>{splitPercent}% split</span>
      </p>
    </div>
  );
};
