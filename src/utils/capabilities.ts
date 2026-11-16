import { probeImageEncoderSupport } from './formatCapabilities.ts';

export interface BrowserCapabilitiesReport {
  crossOriginIsolated: boolean;
  sharedArrayBuffer: boolean;
  offscreenCanvas: boolean;
  webCodecsVideo: boolean;
  webCodecsAudio: boolean;
  fileSystemAccess: boolean;
  avifEncode: boolean;
  webpEncode: boolean;
  hardwareConcurrency: number;
  storageUsageBytes?: number;
  storageQuotaBytes?: number;
  storagePersisted?: boolean;
}

export async function probeBrowserCapabilities(): Promise<BrowserCapabilitiesReport> {
  const [avifEncode, webpEncode] = await Promise.all([
    probeImageEncoderSupport('image/avif'),
    probeImageEncoderSupport('image/webp'),
  ]);

  let storageUsageBytes: number | undefined;
  let storageQuotaBytes: number | undefined;
  let storagePersisted: boolean | undefined;

  if (typeof navigator !== 'undefined' && navigator.storage) {
    try {
      if (navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        storageUsageBytes = est.usage;
        storageQuotaBytes = est.quota;
      }
      if (navigator.storage.persisted) {
        storagePersisted = await navigator.storage.persisted();
      }
    } catch {}
  }

  return {
    crossOriginIsolated: typeof self !== 'undefined' && Boolean((self as any).crossOriginIsolated),
    sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
    offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
    webCodecsVideo: typeof (globalThis as any).VideoEncoder !== 'undefined',
    webCodecsAudio: typeof (globalThis as any).AudioEncoder !== 'undefined',
    fileSystemAccess:
      typeof window !== 'undefined' && typeof (window as any).showDirectoryPicker === 'function',
    avifEncode,
    webpEncode,
    hardwareConcurrency:
      typeof navigator !== 'undefined' && navigator.hardwareConcurrency
        ? navigator.hardwareConcurrency
        : 4,
    storageUsageBytes,
    storageQuotaBytes,
    storagePersisted,
  };
}
