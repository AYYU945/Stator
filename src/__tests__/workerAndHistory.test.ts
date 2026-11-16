import { describe, it, expect, afterEach } from 'vitest';
import { enforceHistoryBlobQuota } from '../utils/historyStorage.ts';
import { HistoryEntry } from '../types/history.ts';

function makeEntry(id: string, timestamp: number, blobBytes: number): HistoryEntry {
  return {
    id,
    originalName: `${id}.png`,
    convertedName: `${id}.webp`,
    originalSizeFormatted: '1.0 MB',
    outputSizeFormatted: `${blobBytes} B`,
    savingsPercent: -50,
    typeCategory: 'image',
    timestamp,
    blob: new Blob([new Uint8Array(blobBytes)], { type: 'image/webp' }),
    outputBlobUrl: `blob:mock/${id}`,
  };
}

describe('workerAndHistory', () => {
  const originalWorker = globalThis.Worker;
  const originalOffscreen = (globalThis as any).OffscreenCanvas;
  const originalURL = globalThis.URL;

  afterEach(() => {
    globalThis.Worker = originalWorker;
    (globalThis as any).OffscreenCanvas = originalOffscreen;
    globalThis.URL = originalURL;
  });

  it('evicts cached history blobs strictly chronologically once byte quota is exceeded', () => {
    const entries: HistoryEntry[] = [
      makeEntry('oldest-tiny', 100, 10),
      makeEntry('middle-large', 200, 700),
      makeEntry('newest-fit', 300, 500),
    ];

    const { retained, evictedIds, totalBlobBytes } = enforceHistoryBlobQuota(entries, 1000);

    // Sorted newest -> oldest: newest-fit (500) fits; middle-large (700) exceeds -> evict;
    // once quotaReached=true, oldest-tiny is also evicted strictly chronologically!
    expect(totalBlobBytes).toBe(500);
    expect(evictedIds).toEqual(['middle-large', 'oldest-tiny']);
    expect(retained[0].id).toBe('newest-fit');
    expect(retained[0].blob).toBeDefined();
    expect(retained[1].blob).toBeUndefined();
    expect(retained[2].blob).toBeUndefined();
  });

  it('rejects pending conversion on worker crash, respawns replacement, and supports cancelJob', async () => {
    const spawnedWorkers: any[] = [];

    class MockWorker {
      public onmessage: ((e: MessageEvent) => void) | null = null;
      public onerror: ((e: ErrorEvent) => void) | null = null;
      public terminated = false;
      public postedMessages: any[] = [];

      constructor() {
        spawnedWorkers.push(this);
      }

      postMessage(data: any) {
        this.postedMessages.push(data);
      }

      terminate() {
        this.terminated = true;
      }
    }

    globalThis.Worker = MockWorker as any;
    (globalThis as any).OffscreenCanvas = class {};
    (globalThis as any).URL = class extends URL {
      static createObjectURL() {
        return 'blob:mock/result';
      }
      static revokeObjectURL() {}
    } as any;

    const { imageWorkerPool } = await import('../utils/imageWorkerPool.ts');

    const file = new Blob([new Uint8Array(16)], { type: 'image/png' });
    const job1Promise = imageWorkerPool.convertImage(file, 'WEBP', undefined, undefined, 'job-crash-1');

    // Find which worker actually received 'job-crash-1'
    const assignedWorker = spawnedWorkers.find((w) =>
      w.postedMessages.some((m: any) => m.id === 'job-crash-1')
    );
    expect(assignedWorker).toBeDefined();

    // Simulate uncaught worker crash
    assignedWorker.onerror({ message: 'Simulated WASM/Canvas OOM crash' });

    await expect(job1Promise).rejects.toThrow('Simulated WASM/Canvas OOM crash');
    expect(assignedWorker.terminated).toBe(true);
    expect(imageWorkerPool.getActiveCount()).toBe(0);

    // Ensure pool respawned and handles cancellation cleanly
    const abortController = new AbortController();
    const job2Promise = imageWorkerPool.convertImage(
      file,
      'WEBP',
      undefined,
      abortController.signal,
      'job-cancel-2'
    );
    abortController.abort();
    await expect(job2Promise).rejects.toThrow(/cancelled/i);
    expect(imageWorkerPool.getActiveCount()).toBe(0);
  });
});
