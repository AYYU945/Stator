import React, { useRef, useState } from 'react';
import { Crop, ZoomIn, ZoomOut, Grid, RotateCcw } from 'lucide-react';
import {
  MediaAdjustments,
  NormalizedCropRect,
  RotationDegrees,
  WatermarkConfig,
} from '../../types/queue.ts';

export interface CropOverlayCanvasProps {
  imageUrl: string;
  alt: string;
  cropRect?: NormalizedCropRect;
  onChangeCropRect: (next?: NormalizedCropRect) => void;
  rotation?: RotationDegrees;
  flipH?: boolean;
  adjustments?: MediaAdjustments;
  watermark?: WatermarkConfig;
  showCheckerboard: boolean;
  onToggleCheckerboard: () => void;
}

export const CropOverlayCanvas: React.FC<CropOverlayCanvasProps> = ({
  imageUrl,
  alt,
  cropRect,
  onChangeCropRect,
  rotation = 0,
  flipH = false,
  adjustments,
  watermark,
  showCheckerboard,
  onToggleCheckerboard,
}) => {
  const [cropMode, setCropMode] = useState(false);
  const [zoom, setZoom] = useState<1 | 1.5 | 2>(1);
  const frameRef = useRef<HTMLDivElement>(null);

  const activeCrop = cropRect || { x: 0.08, y: 0.08, w: 0.84, h: 0.84 };

  const filterCss = adjustments
    ? `brightness(${Math.max(0.2, 1 + (adjustments.exposure || 0) / 100)}) contrast(${Math.max(
        0.2,
        1 + (adjustments.contrast || 0) / 100
      )}) saturate(${Math.max(0, 1 + (adjustments.saturation || 0) / 100)}) ${
        adjustments.blur > 0 ? `blur(${adjustments.blur}px)` : ''
      }`
    : undefined;

  const startHandleDrag = (
    edge: 'move' | 'nw' | 'ne' | 'sw' | 'se',
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const box = frameRef.current?.getBoundingClientRect();
    if (!box || box.width <= 0 || box.height <= 0) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const init = { ...activeCrop };

    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / box.width;
      const dy = (ev.clientY - startY) / box.height;
      let { x, y, w, h } = init;

      if (edge === 'move') {
        x = Math.max(0, Math.min(1 - w, init.x + dx));
        y = Math.max(0, Math.min(1 - h, init.y + dy));
      } else {
        if (edge.includes('w')) {
          const maxDx = init.w - 0.1;
          const clampedDx = Math.max(-init.x, Math.min(maxDx, dx));
          x = init.x + clampedDx;
          w = init.w - clampedDx;
        }
        if (edge.includes('e')) {
          w = Math.max(0.1, Math.min(1 - init.x, init.w + dx));
        }
        if (edge.includes('n')) {
          const maxDy = init.h - 0.1;
          const clampedDy = Math.max(-init.y, Math.min(maxDy, dy));
          y = init.y + clampedDy;
          h = init.h - clampedDy;
        }
        if (edge.includes('s')) {
          h = Math.max(0.1, Math.min(1 - init.y, init.h + dy));
        }
      }

      onChangeCropRect({
        x: Number(x.toFixed(3)),
        y: Number(y.toFixed(3)),
        w: Number(w.toFixed(3)),
        h: Number(h.toFixed(3)),
      });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const watermarkStylePos: Record<WatermarkConfig['position'], string> = {
    'bottom-right': 'bottom-3 right-3 text-right',
    'bottom-left': 'bottom-3 left-3 text-left',
    'top-right': 'top-3 right-3 text-right',
    'top-left': 'top-3 left-3 text-left',
    center: 'inset-0 flex items-center justify-center text-center',
  };

  return (
    <div className="space-y-2.5 w-full">
      {/* Canvas Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              const next = !cropMode;
              setCropMode(next);
              if (next && !cropRect) {
                onChangeCropRect({ x: 0.08, y: 0.08, w: 0.84, h: 0.84 });
              }
            }}
            className={`h-7 px-2.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer border transition-colors ${
              cropMode || cropRect
                ? 'bg-[#EEEDE9] text-[#191A1D] border-transparent'
                : 'bg-[#1B1C1F] text-[#E4E4E7] border-[#313338] hover:text-white'
            }`}
          >
            <Crop className="w-3.5 h-3.5" />
            <span>{cropMode ? 'Editing Crop' : cropRect ? 'Crop Active' : 'Crop Area'}</span>
          </button>

          {cropRect && (
            <button
              type="button"
              onClick={() => {
                onChangeCropRect(undefined);
                setCropMode(false);
              }}
              className="h-7 px-2 rounded-md bg-[#1B1C1F] border border-[#313338] text-[11px] font-mono text-[#B4B5B8] hover:text-white inline-flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear Crop</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleCheckerboard}
            title="Toggle transparency grid"
            className={`h-7 px-2 rounded-md border text-[11px] font-mono inline-flex items-center gap-1 cursor-pointer ${
              showCheckerboard
                ? 'bg-[#292A2D] border-[#46484F] text-white'
                : 'bg-[#1B1C1F] border-[#313338] text-[#B4B5B8]'
            }`}
          >
            <Grid className="w-3 h-3" />
            <span>Alpha</span>
          </button>

          <button
            type="button"
            onClick={() => setZoom((z) => (z === 1 ? 1.5 : z === 1.5 ? 2 : 1))}
            className="h-7 px-2 rounded-md bg-[#1B1C1F] border border-[#313338] text-[11px] font-mono text-[#E4E4E7] inline-flex items-center gap-1 cursor-pointer"
          >
            {zoom === 1 ? <ZoomIn className="w-3 h-3" /> : <ZoomOut className="w-3 h-3" />}
            <span>{zoom === 1 ? 'Fit' : `${zoom}×`}</span>
          </button>
        </div>
      </div>

      {/* Interactive Image Frame */}
      <div
        className={`relative w-full h-[290px] sm:h-[360px] rounded-xl border border-[#313338] overflow-hidden flex items-center justify-center ${
          showCheckerboard ? 'stator-checkerboard' : 'bg-[#101112]'
        }`}
      >
        <div
          ref={frameRef}
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg) scaleX(${flipH ? -1 : 1})`,
            transition: 'transform 160ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className="relative max-w-full max-h-full flex items-center justify-center"
        >
          <img
            src={imageUrl}
            alt={alt}
            draggable={false}
            style={{ filter: filterCss }}
            className="max-h-[270px] sm:max-h-[340px] max-w-full object-contain select-none"
          />

          {watermark?.enabled && watermark.text.trim() && (
            <div
              style={{
                opacity: watermark.opacity,
                color: watermark.color && /^#[0-9a-fA-F]{3,8}$/.test(watermark.color) ? watermark.color : '#FFFFFF',
              }}
              className={`absolute pointer-events-none px-2.5 py-1 rounded bg-black/45 text-xs font-semibold tracking-tight ${watermarkStylePos[watermark.position]}`}
            >
              {watermark.text}
            </div>
          )}

          {(cropMode || cropRect) && (
            <div
              onPointerDown={(e) => startHandleDrag('move', e)}
              style={{
                left: `${activeCrop.x * 100}%`,
                top: `${activeCrop.y * 100}%`,
                width: `${activeCrop.w * 100}%`,
                height: `${activeCrop.h * 100}%`,
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.54)',
              }}
              className="absolute border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.75)] cursor-move touch-none"
            >
              <div
                onPointerDown={(e) => startHandleDrag('nw', e)}
                className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 rounded-sm bg-white border border-[#191A1D] cursor-nwse-resize"
              />
              <div
                onPointerDown={(e) => startHandleDrag('ne', e)}
                className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-sm bg-white border border-[#191A1D] cursor-nesw-resize"
              />
              <div
                onPointerDown={(e) => startHandleDrag('sw', e)}
                className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 rounded-sm bg-white border border-[#191A1D] cursor-nesw-resize"
              />
              <div
                onPointerDown={(e) => startHandleDrag('se', e)}
                className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 rounded-sm bg-white border border-[#191A1D] cursor-nwse-resize"
              />
              <span className="absolute top-1 left-1.5 px-1.5 py-0.5 rounded bg-black/75 text-white text-[10px] font-mono tabular-nums pointer-events-none">
                {Math.round(activeCrop.w * 100)}% × {Math.round(activeCrop.h * 100)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
