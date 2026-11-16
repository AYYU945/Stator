import { describe, it, expect } from 'vitest';
import {
  calculateTargetDimensions,
  resolveOrientedTargetDimensions,
  rgbaToBmpBlob,
  rgbaToTiffBlob,
  pngBuffersToIcoBlob,
} from '../utils/imageEncoder.ts';

describe('imageEncoder', () => {
  it('calculates downscale presets while preserving aspect ratio and even dimensions', () => {
    const res = calculateTargetDimensions(3840, 2160, '1080p');
    expect(res).toEqual({ w: 1920, h: 1080 });

    // Does not upscale smaller source for downscale-only presets
    const small = calculateTargetDimensions(800, 600, '1080p');
    expect(small).toEqual({ w: 800, h: 600 });

    // Custom dimensions clamp to minimum of 2px
    const custom = calculateTargetDimensions(1000, 500, 'custom', 640, 360);
    expect(custom).toEqual({ w: 640, h: 360 });
  });

  it('swaps oriented width and height for 90 and 270 degree rotations', () => {
    const portrait = resolveOrientedTargetDimensions(1920, 1080, 'original', 90);
    expect(portrait).toEqual({ w: 1080, h: 1920 });

    const upsideDown = resolveOrientedTargetDimensions(1920, 1080, 'original', 180);
    expect(upsideDown).toEqual({ w: 1920, h: 1080 });

    const rotated270 = resolveOrientedTargetDimensions(1920, 1080, 'original', 270);
    expect(rotated270).toEqual({ w: 1080, h: 1920 });
  });

  it('encodes valid 24-bit bottom-up BMP containers with padded scanlines', async () => {
    // 1x1 pixel requires 3 bytes + 1 byte row padding = 4 bytes pixel data + 54 header = 58 bytes
    const rgba = new Uint8ClampedArray([255, 10, 20, 255]);
    const blob = rgbaToBmpBlob(rgba, 1, 1);
    expect(blob.type).toBe('image/bmp');
    expect(blob.size).toBe(58);

    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(bytes[0]).toBe(0x42); // 'B'
    expect(bytes[1]).toBe(0x4d); // 'M'
    // BGR order in BMP
    expect(bytes[54]).toBe(20);
    expect(bytes[55]).toBe(10);
    expect(bytes[56]).toBe(255);
  });

  it('encodes valid uncompressed baseline little-endian TIFF blobs', async () => {
    const rgba = new Uint8ClampedArray(2 * 2 * 4).fill(200);
    const blob = rgbaToTiffBlob(rgba, 2, 2);
    expect(blob.type).toBe('image/tiff');

    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(bytes[0]).toBe(0x49); // 'I'
    expect(bytes[1]).toBe(0x49); // 'I'
    expect(bytes[2]).toBe(42);
    expect(bytes[3]).toBe(0);
  });

  it('packages multi-resolution PNG buffers into a valid Windows ICO container', async () => {
    const fake16 = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2]);
    const fake32 = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 3, 4, 5]);
    const blob = pngBuffersToIcoBlob([
      { size: 16, data: fake16 },
      { size: 32, data: fake32 },
    ]);
    expect(blob.type).toBe('image/x-icon');
    expect(blob.size).toBe(6 + 2 * 16 + fake16.length + fake32.length);

    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(bytes[0]).toBe(0);
    expect(bytes[1]).toBe(0);
    expect(bytes[2]).toBe(1); // Type 1 = ICO
    expect(bytes[3]).toBe(0);
    expect(bytes[4]).toBe(2); // 2 images
  });
});
