import { describe, it, expect } from 'vitest';
import {
  validateIncomingFile,
  sanitizeFilename,
  buildOutputFilename,
  getTargetMimeForFormat,
  verifyOutputBlob,
  LARGE_FILE_WARNING_BYTES,
  HARD_MEMFS_LIMIT_BYTES,
} from '../utils/formatCapabilities.ts';

describe('formatCapabilities', () => {
  it('sanitizes unsafe path characters and leading dots from filenames', () => {
    expect(sanitizeFilename('..//secret:file*name?.png')).toBe('__secret_file_name_.png');
    expect(sanitizeFilename('   ')).toBe('media_file');
  });

  it('builds deterministic output filenames matching target format extensions', () => {
    expect(buildOutputFilename('vacation.photo.JPG', 'WEBP')).toBe('vacation.photo.webp');
    expect(buildOutputFilename('clip.mov', 'MP4 (H.264)')).toBe('clip.mp4');
    expect(buildOutputFilename('track', 'FLAC')).toBe('track.flac');
  });

  it('maps formats to strict MIME types', () => {
    expect(getTargetMimeForFormat('PNG')).toBe('image/png');
    expect(getTargetMimeForFormat('AVIF')).toBe('image/avif');
    expect(getTargetMimeForFormat('ICO')).toBe('image/x-icon');
    expect(getTargetMimeForFormat('MP3')).toBe('audio/mpeg');
    expect(getTargetMimeForFormat('MP4')).toBe('video/mp4');
  });

  it('rejects 0-byte, camera RAW, document/archive, and oversized >1.8GB files at intake', () => {
    const empty = new File([], 'empty.png', { type: 'image/png' });
    expect(validateIncomingFile(empty).valid).toBe(false);

    const raw = new File([new Uint8Array(128)], 'sensor_capture.CR2', { type: 'application/octet-stream' });
    const rawRes = validateIncomingFile(raw);
    expect(rawRes.valid).toBe(false);
    expect(rawRes.reason).toContain('RAW');

    const pdf = new File([new Uint8Array(128)], 'contract.pdf', { type: 'application/pdf' });
    expect(validateIncomingFile(pdf).valid).toBe(false);

    const oversized = { name: 'huge.mkv', size: HARD_MEMFS_LIMIT_BYTES + 1024, type: 'video/x-matroska' } as File;
    const sizeRes = validateIncomingFile(oversized);
    expect(sizeRes.valid).toBe(false);
    expect(sizeRes.reason).toContain('1.8 GB');
  });

  it('allows valid media files and attaches soft warning at >=500MB', () => {
    const validPng = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2])], 'icon.png', {
      type: 'image/png',
    });
    const res = validateIncomingFile(validPng);
    expect(res.valid).toBe(true);
    expect(res.warning).toBeUndefined();

    const largeVideo = {
      name: '4k_master.mp4',
      size: LARGE_FILE_WARNING_BYTES + 1024,
      type: 'video/mp4',
    } as File;
    const largeRes = validateIncomingFile(largeVideo);
    expect(largeRes.valid).toBe(true);
    expect(largeRes.warning).toContain('500 MB');
  });

  it('detects silent PNG fallback when AVIF is requested and validates magic bytes', async () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const wrongFallback = new Blob([pngBytes], { type: 'image/png' });
    const avifCheck = await verifyOutputBlob(wrongFallback, 'AVIF');
    expect(avifCheck.ok).toBe(false);
    expect(avifCheck.error).toContain('image/png');

    const validPngCheck = await verifyOutputBlob(wrongFallback, 'PNG');
    expect(validPngCheck.ok).toBe(true);

    const corruptPng = new Blob([new Uint8Array([0x00, 0x01, 0x02, 0x03])], { type: 'image/png' });
    expect((await verifyOutputBlob(corruptPng, 'PNG')).ok).toBe(false);
  });
});
