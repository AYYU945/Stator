import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import JSZip from 'jszip';
import { calculateReductionBadge } from './converter.ts';
import { PresetSettings, StreamMetadataSummary } from '../types/queue.ts';
import {
  buildFFmpegTranscodeArgs,
  computeTelemetryStats,
  parseFFmpegStreamMetadata,
} from './ffmpegArgs.ts';
import { buildOutputFilename, verifyOutputBlob } from './formatCapabilities.ts';
import { serializeCuesToSrt } from './subtitles.ts';

export type WasmStatus = 'loading' | 'active' | 'ready' | 'idle' | 'error';

export interface TranscodeTelemetry {
  speed?: string;
  eta?: string;
  workers?: number;
}

type WasmStatusListener = (status: WasmStatus) => void;
type WasmLoadProgressListener = (message: string | null) => void;

class FFmpegManager {
  private ffmpeg: FFmpeg | null = null;
  private status: WasmStatus = 'idle';
  private coreVariant: 'mt' | 'st' = 'st';
  private loadProgressText: string | null = null;
  private listeners: Set<WasmStatusListener> = new Set();
  private loadProgressListeners: Set<WasmLoadProgressListener> = new Set();
  private loadPromise: Promise<FFmpeg> | null = null;
  private cachedWasmBlobUrls: { mt?: string; st?: string } = {};
  private mutexChain: Promise<void> = Promise.resolve();
  private activeAbortReject: ((reason?: any) => void) | null = null;
  private logRingBuffer: string[] = [];

  public subscribe(listener: WasmStatusListener): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => this.listeners.delete(listener);
  }

  public subscribeLoadProgress(listener: WasmLoadProgressListener): () => void {
    this.loadProgressListeners.add(listener);
    listener(this.loadProgressText);
    return () => this.loadProgressListeners.delete(listener);
  }

  private setStatus(status: WasmStatus) {
    this.status = status;
    this.listeners.forEach((listener) => listener(status));
  }

  private setLoadProgress(message: string | null) {
    this.loadProgressText = message;
    this.loadProgressListeners.forEach((listener) => listener(message));
  }

  public getStatus(): WasmStatus {
    return this.status;
  }

  public getCoreVariant(): 'mt' | 'st' {
    return this.coreVariant;
  }

  public getAllocatedThreads(): number {
    if (this.coreVariant !== 'mt') return 1;
    if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) {
      return Math.min(8, Math.max(2, navigator.hardwareConcurrency));
    }
    return 4;
  }

  public getLoadProgressText(): string | null {
    return this.loadProgressText;
  }

  public getRecentLogs(): string[] {
    return [...this.logRingBuffer];
  }

  private pushLog(message: string) {
    if (!message) return;
    this.logRingBuffer.push(message);
    if (this.logRingBuffer.length > 160) {
      this.logRingBuffer.shift();
    }
  }

  private runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.mutexChain.then(fn, fn);
    this.mutexChain = next.then(
      () => undefined,
      () => undefined
    );
    return next;
  }

  private async fetchWasmAsBlobURLWithProgress(
    url: string,
    variant: 'mt' | 'st'
  ): Promise<string> {
    const cached = this.cachedWasmBlobUrls[variant];
    if (cached) return cached;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} fetching local ${url}`);
    }

    if (!response.body) {
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(new Blob([blob], { type: 'application/wasm' }));
      this.cachedWasmBlobUrls[variant] = blobUrl;
      return blobUrl;
    }

    const total = Number(response.headers.get('content-length') || 0);
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let loaded = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        loaded += value.byteLength;
        const loadedMb = (loaded / (1024 * 1024)).toFixed(1);
        if (total > 0) {
          const totalMb = (total / (1024 * 1024)).toFixed(1);
          this.setLoadProgress(`Loading local WASM core (${loadedMb} / ${totalMb} MB)`);
        } else {
          this.setLoadProgress(`Loading local WASM core (${loadedMb} MB)`);
        }
      }
    }

    const blob = new Blob(chunks as BlobPart[], { type: 'application/wasm' });
    const blobUrl = URL.createObjectURL(blob);
    this.cachedWasmBlobUrls[variant] = blobUrl;
    return blobUrl;
  }

  private async loadVariant(variant: 'mt' | 'st'): Promise<FFmpeg> {
    const ffmpeg = new FFmpeg();
    ffmpeg.on('log', ({ message }) => {
      this.pushLog(message);
    });

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const basePath = `${origin}/wasm/${variant === 'mt' ? 'core-mt' : 'core-st'}`;
    const coreURL = `${basePath}/ffmpeg-core.js`;
    const wasmURL = await this.fetchWasmAsBlobURLWithProgress(`${basePath}/ffmpeg-core.wasm`, variant);

    if (variant === 'mt') {
      await ffmpeg.load({
        coreURL,
        wasmURL,
        workerURL: `${basePath}/ffmpeg-core.worker.js`,
      });
    } else {
      await ffmpeg.load({
        coreURL,
        wasmURL,
      });
    }

    return ffmpeg;
  }

  public async load(): Promise<FFmpeg> {
    if (this.ffmpeg && this.status === 'active') {
      return this.ffmpeg;
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.setStatus('loading');
    this.setLoadProgress('Initializing local WASM core...');

    this.loadPromise = (async () => {
      try {
        const supportsMT =
          typeof self !== 'undefined' &&
          Boolean((self as any).crossOriginIsolated) &&
          typeof SharedArrayBuffer !== 'undefined';

        let instance: FFmpeg;
        if (supportsMT) {
          try {
            instance = await this.loadVariant('mt');
            this.coreVariant = 'mt';
          } catch (mtErr) {
            console.warn('Multi-threaded WASM core failed, falling back to single-threaded core:', mtErr);
            instance = await this.loadVariant('st');
            this.coreVariant = 'st';
          }
        } else {
          instance = await this.loadVariant('st');
          this.coreVariant = 'st';
        }

        this.ffmpeg = instance;
        this.setLoadProgress(null);
        this.setStatus('active');
        return instance;
      } catch (err: any) {
        console.error('Failed to load local FFmpeg WASM core:', err);
        this.setLoadProgress(null);
        this.setStatus('error');
        this.loadPromise = null;
        throw new Error(`Failed to initialize local FFmpeg WASM engine: ${err?.message || err}`);
      }
    })();

    return this.loadPromise;
  }

  public cancelActiveJob(): void {
    const rejectFn = this.activeAbortReject;
    this.activeAbortReject = null;

    if (this.ffmpeg) {
      try {
        this.ffmpeg.terminate();
      } catch {}
      this.ffmpeg = null;
      this.loadPromise = null;
      this.setStatus('idle');
    }

    if (rejectFn) {
      rejectFn(new DOMException('Transcoding cancelled by user', 'AbortError'));
    }
  }

  public getMimeType(ext: string): string {
    switch (ext.toLowerCase()) {
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      case 'mp3':
        return 'audio/mpeg';
      case 'mp4':
        return 'video/mp4';
      case 'webm':
        return 'video/webm';
      case 'wav':
        return 'audio/wav';
      case 'aac':
        return 'audio/aac';
      case 'ogg':
        return 'audio/ogg';
      case 'flac':
        return 'audio/flac';
      case 'mkv':
        return 'video/x-matroska';
      case 'mov':
        return 'video/quicktime';
      case 'avi':
        return 'video/x-msvideo';
      default:
        return 'application/octet-stream';
    }
  }

  public async extractVideoFramePng(
    file: File,
    timestampSeconds: number = 0
  ): Promise<{ blob: Blob; file: File }> {
    return this.runExclusive(async () => {
      const ffmpeg = await this.load();
      const inputExt = file.name.split('.').pop()?.toLowerCase() || 'mp4';
      const ts = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const inputName = `frame_in_${ts}.${inputExt}`;
      const outputName = `frame_out_${ts}.png`;

      try {
        await ffmpeg.writeFile(inputName, await fetchFile(file));
        const seek = Math.max(0, timestampSeconds).toFixed(2);
        const exitCode = await ffmpeg.exec([
          '-ss',
          seek,
          '-i',
          inputName,
          '-frames:v',
          '1',
          '-f',
          'image2',
          outputName,
        ]);
        if (exitCode !== 0) {
          throw new Error(`Frame capture failed with FFmpeg exit code ${exitCode}`);
        }
        const data = await ffmpeg.readFile(outputName);
        const rawBytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
        const blob = new Blob([rawBytes.buffer as ArrayBuffer], { type: 'image/png' });
        const check = await verifyOutputBlob(blob, 'PNG');
        if (!check.ok) throw new Error(check.error || 'Frame PNG verification failed');

        const stem = file.name.replace(/\.[^/.]+$/, '');
        const frameFile = new File([blob], `${stem}_frame_${Math.round(timestampSeconds)}s.png`, {
          type: 'image/png',
        });
        return { blob, file: frameFile };
      } finally {
        try {
          await ffmpeg.deleteFile(inputName);
        } catch {}
        try {
          await ffmpeg.deleteFile(outputName);
        } catch {}
      }
    });
  }

  public async transcodeMedia(
    file: File,
    targetFormat: string,
    onProgress: (progress: number, telemetry?: TranscodeTelemetry) => void,
    preset?: PresetSettings,
    signal?: AbortSignal,
    durationSeconds?: number
  ): Promise<{
    blob: Blob;
    url: string;
    sizeBytes: number;
    outputName: string;
    reductionBadge: string;
    duration: string;
    streamMetadata?: StreamMetadataSummary;
  }> {
    if (signal?.aborted) {
      throw new DOMException('Transcoding cancelled by user', 'AbortError');
    }

    return this.runExclusive(async () => {
      if (signal?.aborted) {
        throw new DOMException('Transcoding cancelled by user', 'AbortError');
      }

      const startTime = performance.now();
      const cleanTarget = targetFormat.toUpperCase().split(' ')[0].replace(/[^A-Z0-9]/g, '');
      const ext = cleanTarget.toLowerCase();
      const outputFilename = buildOutputFilename(file.name, cleanTarget);

      const ffmpeg = await this.load();
      if (signal?.aborted) {
        throw new DOMException('Transcoding cancelled by user', 'AbortError');
      }

      const inputExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
      const nonce = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const inputName = `input_${nonce}.${inputExt}`;
      const outputName = `output_${nonce}.${ext}`;
      const subName = `sub_${nonce}.srt`;
      const threads = this.getAllocatedThreads();
      let wroteSubFile = false;

      this.logRingBuffer = [];

      const progressHandler = ({ progress }: { progress: number }) => {
        if (progress > 0 && progress <= 1) {
          const pct = Math.min(99, Math.round(progress * 100));
          const stats = computeTelemetryStats(file.size, progress, performance.now() - startTime);
          onProgress(pct, {
            speed: stats.speed,
            eta: stats.eta,
            workers: threads,
          });
        }
      };

      ffmpeg.on('progress', progressHandler);

      let abortPromiseReject: ((reason?: any) => void) | null = null;
      const abortPromise = new Promise<never>((_resolve, reject) => {
        abortPromiseReject = reject;
        this.activeAbortReject = reject;
      });

      const onSignalAbort = () => {
        this.cancelActiveJob();
      };
      signal?.addEventListener('abort', onSignalAbort, { once: true });

      const execOrAbort = async (args: string[]): Promise<number> => {
        return Promise.race([ffmpeg.exec(args), abortPromise]);
      };

      try {
        const fileData = await fetchFile(file);
        if (signal?.aborted) {
          throw new DOMException('Transcoding cancelled by user', 'AbortError');
        }
        await ffmpeg.writeFile(inputName, fileData);

        const { remuxArgs, transcodeArgs, isAudioOnly } = buildFFmpegTranscodeArgs({
          inputName,
          outputName,
          inputExt,
          targetFormat: cleanTarget,
          preset,
          threads,
          durationSeconds,
        });

        const hasSubtitles =
          !isAudioOnly &&
          cleanTarget !== 'GIF' &&
          (cleanTarget === 'MP4' || cleanTarget === 'MKV' || cleanTarget === 'MOV') &&
          Boolean(preset?.subtitleCues && preset.subtitleCues.length > 0);

        let finalTranscodeArgs = transcodeArgs;
        if (hasSubtitles && preset?.subtitleCues) {
          const srtText = serializeCuesToSrt(preset.subtitleCues);
          await ffmpeg.writeFile(subName, new TextEncoder().encode(srtText));
          wroteSubFile = true;
          const subCodec = cleanTarget === 'MKV' ? 'srt' : 'mov_text';
          const outIdx = finalTranscodeArgs.lastIndexOf(outputName);
          const beforeOut = finalTranscodeArgs.slice(0, outIdx);
          const firstInputIdx = beforeOut.indexOf(inputName);
          if (firstInputIdx !== -1) {
            const head = beforeOut.slice(0, firstInputIdx + 1);
            const tail = beforeOut.slice(firstInputIdx + 1);
            finalTranscodeArgs = [
              ...head,
              '-i',
              subName,
              '-map',
              '0:v:0',
              '-map',
              '0:a?',
              '-map',
              '1:0',
              ...tail,
              '-c:s',
              subCodec,
              outputName,
            ];
          }
        }

        let data: Uint8Array | null = null;

        if (remuxArgs && !wroteSubFile) {
          onProgress(35, { speed: 'Stream copy...', eta: 'Calculating...', workers: threads });
          const remuxCode = await execOrAbort(remuxArgs);
          if (remuxCode === 0) {
            try {
              const raw = await ffmpeg.readFile(outputName);
              if (raw instanceof Uint8Array && raw.length > 0) {
                data = raw;
              }
            } catch {}
          }
        }

        if (!data || data.length === 0) {
          const exitCode = await execOrAbort(finalTranscodeArgs);
          if (exitCode !== 0) {
            const tail = this.logRingBuffer.slice(-6).join(' | ');
            throw new Error(
              `FFmpeg exited with code ${exitCode}${tail ? ` (${tail})` : ''}`
            );
          }

          const rawOut = await ffmpeg.readFile(outputName);
          if (!(rawOut instanceof Uint8Array) || rawOut.length === 0) {
            throw new Error('FFmpeg finished without writing a valid output stream.');
          }
          data = rawOut;
        }

        const mimeType = this.getMimeType(ext);
        const safeCopy = new Uint8Array(data);
        const blob = new Blob([safeCopy.buffer as ArrayBuffer], { type: mimeType });

        const check = await verifyOutputBlob(blob, cleanTarget);
        if (!check.ok) {
          throw new Error(check.error || `Failed container verification for ${cleanTarget}`);
        }

        const url = URL.createObjectURL(blob);
        const elapsedMs = performance.now() - startTime;
        const elapsedSec = (elapsedMs / 1000).toFixed(1);
        const { badge } = calculateReductionBadge(file.size, blob.size);
        const finalStats = computeTelemetryStats(file.size, 1, elapsedMs);
        const streamMetadata = parseFFmpegStreamMetadata(this.logRingBuffer);

        onProgress(100, {
          speed: finalStats.speed,
          eta: 'Done',
          workers: threads,
        });

        return {
          blob,
          url,
          sizeBytes: blob.size,
          outputName: outputFilename,
          reductionBadge: badge,
          duration: `${elapsedSec}s`,
          streamMetadata,
        };
      } finally {
        signal?.removeEventListener('abort', onSignalAbort);
        if (this.activeAbortReject === abortPromiseReject) {
          this.activeAbortReject = null;
        }
        try {
          ffmpeg.off('progress', progressHandler);
        } catch {}
        if (this.ffmpeg === ffmpeg) {
          try {
            await ffmpeg.deleteFile(inputName);
          } catch {}
          try {
            await ffmpeg.deleteFile(outputName);
          } catch {}
          if (wroteSubFile) {
            try {
              await ffmpeg.deleteFile(subName);
            } catch {}
          }
        }
      }
    });
  }

  /**
   * Merges multiple compatible video or audio files sequentially using FFmpeg concat demuxer/filter.
   */
  public async mergeMediaClips(
    files: File[],
    mode: 'video' | 'audio',
    targetFormat: string,
    onProgress?: (pct: number) => void
  ): Promise<{ blob: Blob; url: string; outputName: string; sizeBytes: number }> {
    if (files.length < 2) {
      throw new Error('Select at least 2 clips to merge.');
    }

    return this.runExclusive(async () => {
      onProgress?.(10);
      const ffmpeg = await this.load();
      const nonce = `${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
      const cleanTarget = targetFormat.toUpperCase().split(' ')[0];
      const ext = cleanTarget.toLowerCase();
      const outputName = `merged_${nonce}.${ext}`;
      const listName = `concat_${nonce}.txt`;
      const written: string[] = [];

      try {
        const listLines: string[] = [];
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          const inExt = f.name.split('.').pop()?.toLowerCase() || (mode === 'audio' ? 'wav' : 'mp4');
          const safeName = `clip_${nonce}_${i}.${inExt}`;
          await ffmpeg.writeFile(safeName, await fetchFile(f));
          written.push(safeName);
          listLines.push(`file '${safeName}'`);
          onProgress?.(15 + Math.round(((i + 1) / files.length) * 35));
        }

        await ffmpeg.writeFile(listName, new TextEncoder().encode(listLines.join('\n')));
        written.push(listName);

        const args =
          mode === 'audio'
            ? [
                '-f',
                'concat',
                '-safe',
                '0',
                '-i',
                listName,
                '-c:a',
                ext === 'wav' ? 'pcm_s16le' : ext === 'flac' ? 'flac' : 'libmp3lame',
                outputName,
              ]
            : [
                '-f',
                'concat',
                '-safe',
                '0',
                '-i',
                listName,
                '-c:v',
                'libx264',
                '-preset',
                'fast',
                '-pix_fmt',
                'yuv420p',
                '-c:a',
                'aac',
                outputName,
              ];

        const exitCode = await ffmpeg.exec(args);
        if (exitCode !== 0) {
          throw new Error(
            'Merge failed: clips must share compatible codecs/resolutions for concat, or transcode each clip to MP4/WAV first.'
          );
        }

        onProgress?.(92);
        const raw = await ffmpeg.readFile(outputName);
        const bytes = raw instanceof Uint8Array ? new Uint8Array(raw) : new TextEncoder().encode(String(raw));
        const blob = new Blob([bytes.buffer as ArrayBuffer], { type: this.getMimeType(ext) });
        onProgress?.(100);
        return {
          blob,
          url: URL.createObjectURL(blob),
          outputName: `stator_merged_${files.length}clips.${ext}`,
          sizeBytes: blob.size,
        };
      } finally {
        for (const f of written) {
          try {
            await ffmpeg.deleteFile(f);
          } catch {}
        }
        try {
          await ffmpeg.deleteFile(outputName);
        } catch {}
      }
    });
  }

  /**
   * Replaces a video's audio track with a new local audio file.
   */
  public async replaceVideoAudio(
    videoFile: File,
    audioFile: File,
    targetFormat: string = 'MP4',
    onProgress?: (pct: number) => void
  ): Promise<{ blob: Blob; url: string; outputName: string; sizeBytes: number }> {
    return this.runExclusive(async () => {
      onProgress?.(15);
      const ffmpeg = await this.load();
      const nonce = `${Date.now()}`;
      const vExt = videoFile.name.split('.').pop()?.toLowerCase() || 'mp4';
      const aExt = audioFile.name.split('.').pop()?.toLowerCase() || 'mp3';
      const outExt = targetFormat.toLowerCase();
      const vName = `v_${nonce}.${vExt}`;
      const aName = `a_${nonce}.${aExt}`;
      const outName = `replaced_${nonce}.${outExt}`;

      try {
        await ffmpeg.writeFile(vName, await fetchFile(videoFile));
        await ffmpeg.writeFile(aName, await fetchFile(audioFile));
        onProgress?.(45);
        const exitCode = await ffmpeg.exec([
          '-i',
          vName,
          '-i',
          aName,
          '-map',
          '0:v:0',
          '-map',
          '1:a:0',
          '-c:v',
          'copy',
          '-c:a',
          'aac',
          '-shortest',
          outName,
        ]);
        if (exitCode !== 0) {
          throw new Error(`Audio replacement exited with code ${exitCode}`);
        }
        const raw = await ffmpeg.readFile(outName);
        const bytes = raw instanceof Uint8Array ? new Uint8Array(raw) : new TextEncoder().encode(String(raw));
        const blob = new Blob([bytes.buffer as ArrayBuffer], { type: this.getMimeType(outExt) });
        onProgress?.(100);
        return {
          blob,
          url: URL.createObjectURL(blob),
          outputName: buildOutputFilename(videoFile.name, targetFormat),
          sizeBytes: blob.size,
        };
      } finally {
        try {
          await ffmpeg.deleteFile(vName);
        } catch {}
        try {
          await ffmpeg.deleteFile(aName);
        } catch {}
        try {
          await ffmpeg.deleteFile(outName);
        } catch {}
      }
    });
  }

  /**
   * Exports a video into multiple target resolutions (e.g. 1080p, 720p, 480p) packaged in a single ZIP.
   */
  public async exportMultiResolutionZip(
    file: File,
    resolutions: Array<'1080p' | '720p' | '480p'>,
    basePreset: PresetSettings,
    onProgress?: (label: string, pct: number) => void
  ): Promise<{ blob: Blob; url: string; filename: string; sizeBytes: number }> {
    const zip = new JSZip();
    const stem = file.name.replace(/\.[^/.]+$/, '') || 'video';
    for (let i = 0; i < resolutions.length; i++) {
      const res = resolutions[i];
      onProgress?.(`Encoding ${res} (${i + 1}/${resolutions.length})`, Math.round((i / resolutions.length) * 90));
      const result = await this.transcodeMedia(
        file,
        'MP4',
        (pct) => {
          const overall = Math.round(((i + pct / 100) / resolutions.length) * 90);
          onProgress?.(`Encoding ${res} (${pct}%)`, overall);
        },
        { ...basePreset, videoResolution: res }
      );
      URL.revokeObjectURL(result.url);
      zip.file(`${stem}_${res}.mp4`, await result.blob.arrayBuffer());
    }
    onProgress?.('Packaging multi-resolution ZIP', 95);
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    onProgress?.('Done', 100);
    return {
      blob: zipBlob,
      url: URL.createObjectURL(zipBlob),
      filename: `${stem}_multi_res.zip`,
      sizeBytes: zipBlob.size,
    };
  }

  /**
   * Builds an animated GIF (or animated WebP) from ordered image files with optional per-frame duration, reverse, and boomerang.
   */
  public async createGifFromImages(
    files: Array<{ file: File; durationMs?: number } | File>,
    options: {
      fps: number;
      maxWidth: number;
      dither: 'sierra2_4a' | 'bayer' | 'none';
      loopMode: 'loop' | 'boomerang' | 'reverse';
      outputFormat?: 'GIF' | 'WEBP';
    },
    onProgress?: (progress: number) => void
  ): Promise<{
    blob: Blob;
    url: string;
    sizeBytes: number;
    outputName: string;
    dimensions: string;
  }> {
    if (!files || files.length < 2) {
      throw new Error('Select at least 2 images to compile an animation.');
    }

    const normalized = files.map((entry) =>
      entry instanceof File ? { file: entry, durationMs: undefined } : entry
    );

    return this.runExclusive(async () => {
      onProgress?.(10);
      const ffmpeg = await this.load();
      onProgress?.(25);

      const bitmaps = await Promise.all(normalized.map((item) => createImageBitmap(item.file)));
      const first = bitmaps[0];
      const targetW = Math.max(64, Math.min(options.maxWidth, first.width));
      const evenW = Math.floor(targetW / 2) * 2;
      const rawH = Math.round((first.height / first.width) * evenW);
      const evenH = Math.max(64, Math.floor(rawH / 2) * 2);

      const canvas = document.createElement('canvas');
      canvas.width = evenW;
      canvas.height = evenH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        bitmaps.forEach((b) => b.close());
        throw new Error('Canvas 2D context unavailable.');
      }

      const writtenNames: string[] = [];
      const prefix = `seq_${Date.now()}`;
      const isWebp = options.outputFormat === 'WEBP';
      const outputName = `${prefix}_out.${isWebp ? 'webp' : 'gif'}`;

      try {
        // Expand custom per-frame holds into frame repetitions aligned with target fps
        const frameUnitMs = 1000 / Math.max(1, options.fps);
        const expandedBitmaps: ImageBitmap[] = [];
        normalized.forEach((entry, i) => {
          const bmp = bitmaps[i];
          const repeat = entry.durationMs
            ? Math.max(1, Math.min(20, Math.round(entry.durationMs / frameUnitMs)))
            : 1;
          for (let r = 0; r < repeat; r++) expandedBitmaps.push(bmp);
        });

        let sequenceOrder = expandedBitmaps;
        if (options.loopMode === 'reverse') {
          sequenceOrder = [...expandedBitmaps].reverse();
        } else if (options.loopMode === 'boomerang' && expandedBitmaps.length > 2) {
          sequenceOrder = [...expandedBitmaps, ...expandedBitmaps.slice(1, -1).reverse()];
        }

        for (let idx = 0; idx < sequenceOrder.length; idx++) {
          const bmp = sequenceOrder[idx];
          ctx.clearRect(0, 0, evenW, evenH);
          const scale = Math.min(evenW / bmp.width, evenH / bmp.height);
          const dw = Math.round(bmp.width * scale);
          const dh = Math.round(bmp.height * scale);
          const dx = Math.round((evenW - dw) / 2);
          const dy = Math.round((evenH - dh) / 2);
          ctx.drawImage(bmp, dx, dy, dw, dh);

          const pngBlob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, 'image/png')
          );
          if (!pngBlob) throw new Error(`Failed encoding frame ${idx + 1}`);
          const buf = new Uint8Array(await pngBlob.arrayBuffer());
          const frameName = `${prefix}_${String(idx).padStart(4, '0')}.png`;
          await ffmpeg.writeFile(frameName, buf);
          writtenNames.push(frameName);
          onProgress?.(25 + Math.round(((idx + 1) / sequenceOrder.length) * 35));
        }

        const ditherOpt =
          options.dither === 'none'
            ? 'dither=none'
            : options.dither === 'bayer'
            ? 'dither=bayer:bayer_scale=3'
            : 'dither=sierra2_4a';

        const args = isWebp
          ? [
              '-framerate',
              String(options.fps),
              '-i',
              `${prefix}_%04d.png`,
              '-c:v',
              'libwebp',
              '-lossless',
              '0',
              '-q:v',
              '80',
              '-loop',
              '0',
              outputName,
            ]
          : [
              '-framerate',
              String(options.fps),
              '-i',
              `${prefix}_%04d.png`,
              '-vf',
              `split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse=${ditherOpt}`,
              '-loop',
              '0',
              outputName,
            ];

        const exitCode = await ffmpeg.exec(args);

        if (exitCode !== 0) {
          throw new Error(
            isWebp
              ? `Animated WebP encoder unavailable in this WASM build (code ${exitCode}). Export as GIF instead.`
              : `FFmpeg sequence GIF build failed with code ${exitCode}`
          );
        }

        onProgress?.(90);
        const data = await ffmpeg.readFile(outputName);
        const rawBytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
        const safeCopy = new Uint8Array(rawBytes);
        const blob = new Blob([safeCopy.buffer as ArrayBuffer], {
          type: isWebp ? 'image/webp' : 'image/gif',
        });
        const url = URL.createObjectURL(blob);
        onProgress?.(100);

        return {
          blob,
          url,
          sizeBytes: blob.size,
          outputName: `stator_sequence_${options.fps}fps.${isWebp ? 'webp' : 'gif'}`,
          dimensions: `${evenW} × ${evenH}`,
        };
      } finally {
        bitmaps.forEach((b) => b.close());
        for (const name of writtenNames) {
          try {
            await ffmpeg.deleteFile(name);
          } catch {}
        }
        try {
          await ffmpeg.deleteFile(outputName);
        } catch {}
      }
    });
  }
}

export const ffmpegManager = new FFmpegManager();
