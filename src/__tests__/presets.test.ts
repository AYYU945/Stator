import { describe, it, expect } from 'vitest';
import {
  sanitizePresetSettings,
  encodePresetRecipeUrl,
  decodePresetRecipeFromHash,
} from '../lib/presets.ts';

describe('presets', () => {
  it('sanitizes out-of-bounds numbers and rejects invalid enum strings', () => {
    const cleaned = sanitizePresetSettings({
      imageQuality: 999,
      customWidth: 4,
      customHeight: 16000,
      videoResolution: '16K' as any,
      rotation: 45 as any,
      aspectCrop: '9:16',
      normalizeAudio: true,
      targetMaxSizeMb: 0.001,
    });

    expect(cleaned.imageQuality).toBe(100);
    expect(cleaned.customWidth).toBe(16);
    expect(cleaned.customHeight).toBe(8192);
    expect(cleaned.videoResolution).toBeUndefined();
    expect(cleaned.rotation).toBeUndefined();
    expect(cleaned.aspectCrop).toBe('9:16');
    expect(cleaned.normalizeAudio).toBe(true);
    expect(cleaned.targetMaxSizeMb).toBe(0.05);
  });

  it('roundtrips recipe URLs safely and rejects oversized or malformed hashes', () => {
    const url = encodePresetRecipeUrl({
      name: 'Social Reel 9:16',
      targetFormat: 'MP4',
      settings: {
        aspectCrop: '9:16',
        rotation: 90,
        flipH: true,
        normalizeAudio: true,
        imageQuality: 85,
      },
    });

    const hash = '#' + url.split('#')[1];
    const decoded = decodePresetRecipeFromHash(hash);
    expect(decoded).not.toBeNull();
    expect(decoded?.name).toBe('Social Reel 9:16');
    expect(decoded?.targetFormat).toBe('MP4');
    expect(decoded?.settings.aspectCrop).toBe('9:16');
    expect(decoded?.settings.rotation).toBe(90);
    expect(decoded?.settings.flipH).toBe(true);
    expect(decoded?.settings.normalizeAudio).toBe(true);

    // Oversized hash rejected
    expect(decodePresetRecipeFromHash(`#preset=${'A'.repeat(5000)}`)).toBeNull();
    // Malformed base64 rejected
    expect(decodePresetRecipeFromHash('#preset=%%%invalid%%%')).toBeNull();
  });

  it('sanitizes watermark color hex codes, opacity bounds, and invalid positions', () => {
    const cleaned = sanitizePresetSettings({
      watermark: {
        enabled: true,
        text: '© Stator Release',
        position: 'top-left',
        opacity: 2.5,
        color: '#3C63DB',
      },
    });
    expect(cleaned.watermark).toEqual({
      enabled: true,
      text: '© Stator Release',
      position: 'top-left',
      opacity: 1,
      color: '#3C63DB',
    });

    const rejectedColor = sanitizePresetSettings({
      watermark: {
        enabled: true,
        text: 'Test',
        position: 'invalid-pos' as any,
        opacity: 0.01,
        color: 'javascript:alert(1)',
      },
    });
    expect(rejectedColor.watermark?.position).toBe('bottom-right');
    expect(rejectedColor.watermark?.opacity).toBe(0.1);
    expect(rejectedColor.watermark?.color).toBeUndefined();
  });
});
