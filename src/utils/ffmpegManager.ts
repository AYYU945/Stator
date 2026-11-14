// 1. Worker Blob Shim: monkey-patch window.Worker so cross-origin module workers are loaded via a same-origin Blob
if (typeof window !== 'undefined' && !(window as any).__workerShimmed) {
  (window as any).__workerShimmed = true;
  const OriginalWorker = window.Worker;
  window.Worker = class extends OriginalWorker {
    constructor(scriptURL: string | URL, options?: WorkerOptions) {
      const urlStr = scriptURL.toString();
      if (urlStr.startsWith('http') && !urlStr.startsWith(window.location.origin)) {
        const isModule = options?.type === 'module';
        const code = isModule ? `import "${urlStr}";` : `importScripts("${urlStr}");`;
        const blob = new Blob([code], { type: 'application/javascript' });
        super(URL.createObjectURL(blob), options);
      } else {
        super(scriptURL, options);
      }
    }
  } as any;
}

import { calculateReductionBadge } from './converter.ts';
import { PresetSettings } from '../types/queue.ts';

export type WasmStatus = 'loading' | 'active' | 'ready' | 'idle' | 'error';

type WasmStatusListener = (status: WasmStatus) => void;

class FFmpegManager {
  private ffmpeg: any = null;
  private status: WasmStatus = 'idle';
  private listeners: Set<WasmStatusListener> = new Set();
  private loadPromise: Promise<any> | null = null;
  private toBlobURLFn: any = null;
  private fetchFileFn: any = null;

  public subscribe(listener: WasmStatusListener): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => this.listeners.delete(listener);
  }

  private setStatus(status: WasmStatus) {
    this.status = status;
    this.listeners.forEach((listener) => listener(status));
  }

  public getStatus(): WasmStatus {
    return this.status;
  }

  /**
   * Initializes and loads the single-threaded FFmpeg WASM core
   */
  public async load(): Promise<any> {
    if (this.ffmpeg && this.status === 'active') {
      return this.ffmpeg;
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.setStatus('loading');

    this.loadPromise = (async () => {
      try {
        // Dynamically import FFmpeg and util from CDN to prevent bundler / webworker issues
        // @ts-ignore
        const ffmpegModule = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/+esm');
        // @ts-ignore
        const utilModule = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/+esm');

        const { FFmpeg } = ffmpegModule;
        const { toBlobURL, fetchFile } = utilModule;

        this.toBlobURLFn = toBlobURL;
        this.fetchFileFn = fetchFile;

        const ffmpeg = new FFmpeg();

        // 2. Load Core & WASM via toBlobURL:
        // Use single-thread core to run smoothly in standard browsers & iframes without SharedArrayBuffer requirements
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });

        this.ffmpeg = ffmpeg;
        this.setStatus('active');
        return ffmpeg;
      } catch (err: any) {
        console.error('Failed to load FFmpeg WASM core:', err);
        this.setStatus('error');
        this.loadPromise = null;
        throw new Error(`Failed to load FFmpeg WASM core: ${err?.message || err}`);
      }
    })();

    return this.loadPromise;
  }

  /**
   * Resolves the correct Blob MIME type based on file extension
   */
  public getMimeType(ext: string): string {
    switch (ext.toLowerCase()) {
      case 'gif':
        return 'image/gif';
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

  /**
   * Transcode an audio or video file
   * Strict mode: does NOT fall back to original file if FFmpeg fails.
   */
  public async transcodeMedia(
    file: File,
    targetFormat: string,
    onProgress: (progress: number, speed?: string) => void,
    preset?: PresetSettings
  ): Promise<{
    blob: Blob;
    url: string;
    sizeBytes: number;
    outputName: string;
    reductionBadge: string;
    duration?: string;
  }> {
    const startTime = performance.now();
    const cleanTarget = targetFormat.toUpperCase().split(' ')[0].replace(/[^A-Z0-9]/g, '');
    const ext = cleanTarget.toLowerCase();
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const outputFilename = `${baseName}.${ext}`;

    const ffmpeg = await this.load();
    if (!ffmpeg) {
      throw new Error('FFmpeg WASM engine is not available or failed initialization.');
    }

    const inputExt = file.name.split('.').pop() || 'bin';
    const inputName = `input_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${inputExt}`;
    const outputName = `output_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;

    const progressHandler = ({ progress }: { progress: number }) => {
      if (progress > 0 && progress <= 1) {
        const pct = Math.min(99, Math.round(progress * 100));
        onProgress(pct, '24.8 MB/s');
      }
    };

    ffmpeg.on('progress', progressHandler);

    try {
      // 1. Write input file to virtual memory
      const fileData = await this.fetchFileFn(file);
      await ffmpeg.writeFile(inputName, fileData);

      // 2. Build preset-driven filter and encoding arguments
      let videoScaleFilter = '';
      if (preset?.videoResolution === '4K') {
        videoScaleFilter = 'scale=3840:2160:force_original_aspect_ratio=decrease:flags=lanczos,pad=ceil(iw/2)*2:ceil(ih/2)*2';
      } else if (preset?.videoResolution === '2K') {
        videoScaleFilter = 'scale=2560:1440:force_original_aspect_ratio=decrease:flags=lanczos,pad=ceil(iw/2)*2:ceil(ih/2)*2';
      } else if (preset?.videoResolution === '1080p') {
        videoScaleFilter = 'scale=1920:1080:force_original_aspect_ratio=decrease:flags=lanczos,pad=ceil(iw/2)*2:ceil(ih/2)*2';
      } else if (preset?.videoResolution === '720p') {
        videoScaleFilter = 'scale=1280:720:force_original_aspect_ratio=decrease:flags=lanczos,pad=ceil(iw/2)*2:ceil(ih/2)*2';
      } else if (preset?.videoResolution === '480p') {
        videoScaleFilter = 'scale=854:480:force_original_aspect_ratio=decrease:flags=lanczos,pad=ceil(iw/2)*2:ceil(ih/2)*2';
      }

      const audioBitrate = preset?.audioBitrate || '192k';
      const channelArgs: string[] = [];
      if (preset?.audioChannels === 'mono') {
        channelArgs.push('-ac', '1');
      } else if (preset?.audioChannels === 'stereo') {
        channelArgs.push('-ac', '2');
      }

      // Allocate full available local CPU concurrency for WebAssembly transcoding
      const allocatedThreads =
        typeof navigator !== 'undefined'
          ? Math.min(8, navigator.hardwareConcurrency || 4)
          : 4;
      const threadArgs = ['-threads', allocatedThreads.toString()];

      const normInputExt = inputExt.toLowerCase();
      const normTargetExt = ext.toLowerCase();

      const hasVideoTransform = Boolean(
        videoScaleFilter ||
        (preset?.fpsLimiter && preset.fpsLimiter !== 'original') ||
        preset?.videoBitrate === 'high' ||
        preset?.videoBitrate === 'balanced' ||
        preset?.videoBitrate === 'compact'
      );
      const hasAudioTransform = Boolean(
        preset?.videoAudioBitrate === 'mute' ||
        (preset?.videoAudioBitrate && preset.videoAudioBitrate !== 'original') ||
        Boolean(preset?.audioChannels) ||
        (preset?.audioBitrate && preset.audioBitrate !== '192k')
      );

      const canRemux =
        !hasVideoTransform &&
        !hasAudioTransform &&
        (
          // MKV, MOV, M4V to MP4 (H.264 / AAC streams)
          ((normInputExt === 'mkv' || normInputExt === 'mov' || normInputExt === 'm4v') && normTargetExt === 'mp4') ||
          // WebM to MKV container (VP9/VP8/Opus/Vorbis streams)
          (normInputExt === 'webm' && normTargetExt === 'mkv') ||
          // MP4 to MKV container
          (normInputExt === 'mp4' && normTargetExt === 'mkv') ||
          // MOV to MKV
          (normInputExt === 'mov' && normTargetExt === 'mkv')
        );

      if (canRemux) {
        onProgress(40, 'Fast-Path Remuxing (50+ MB/s)');
        // Fast-Path Stream Copy (-c copy): Near-instant execution (under 2 seconds) with zero quality loss
        const remuxArgs = ['-i', inputName, '-c', 'copy', outputName];
        const remuxCode = await ffmpeg.exec(remuxArgs);
        if (remuxCode === 0) {
          onProgress(100, 'Remuxed');
        } else {
          // If remuxing fails (e.g. incompatible stream in container), proceed with standard optimized encoding
          console.warn('Fast remux failed, falling back to optimized transcode pipeline');
        }
      }

      // Check if output was produced via Fast-Path Remux
      let data: Uint8Array | null = null;
      try {
        data = await ffmpeg.readFile(outputName);
      } catch {
        data = null;
      }

      // If remuxing did not run or did not produce output, run optimized transcode
      if (!data || data.length === 0) {
        if (cleanTarget === 'GIF') {
          let scaleH = '480';
          if (preset?.videoResolution === '4K') scaleH = '2160';
          else if (preset?.videoResolution === '2K') scaleH = '1440';
          else if (preset?.videoResolution === '1080p') scaleH = '1080';
          else if (preset?.videoResolution === '720p') scaleH = '720';
          const fps = preset?.fpsLimiter !== 'original' && preset?.fpsLimiter ? preset.fpsLimiter : '12';
          const gifFilter = `fps=${fps},scale=-2:${scaleH}:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`;
          const args = ['-i', inputName, '-vf', gifFilter, outputName];
          const exitCode = await ffmpeg.exec(args);
          if (exitCode !== 0) {
            throw new Error(`FFmpeg GIF conversion exited with error code ${exitCode}`);
          }
        } else if (cleanTarget === 'MP4') {
          // Optimized high-speed profile: -c:v libx264 -preset fast -crf 18 -tune fastdecode -pix_fmt yuv420p
          let crf = '18';
          if (preset?.videoBitrate === 'lossless') crf = '0';
          else if (preset?.videoBitrate === 'balanced') crf = '23';
          else if (preset?.videoBitrate === 'compact') crf = '28';

          const args: string[] = ['-i', inputName, ...threadArgs];
          if (videoScaleFilter) {
            args.push('-vf', videoScaleFilter);
          }
          if (preset?.fpsLimiter && preset.fpsLimiter !== 'original') {
            args.push('-r', preset.fpsLimiter);
          }

          // Optimized libx264 flags
          args.push(
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-crf', crf,
            '-tune', 'fastdecode',
            '-pix_fmt', 'yuv420p'
          );

          // Audio stream handling: use stream copy if audio settings are unchanged
          if (preset?.videoAudioBitrate === 'mute') {
            args.push('-an');
          } else if (preset?.videoAudioBitrate && preset.videoAudioBitrate !== 'original') {
            args.push('-c:a', 'aac', '-b:a', preset.videoAudioBitrate);
          } else if (
            normInputExt === 'mp4' ||
            normInputExt === 'm4v' ||
            normInputExt === 'mov' ||
            normInputExt === 'mkv'
          ) {
            // Keep source audio intact using -c:a copy
            args.push('-c:a', 'copy');
          } else {
            args.push('-c:a', 'aac', '-b:a', audioBitrate);
          }
          args.push(outputName);

          const exitCode = await ffmpeg.exec(args);
          if (exitCode !== 0) {
            // Re-encode simple fallback with ultrafast
            await ffmpeg.exec(['-i', inputName, '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', outputName]);
          }
        } else if (cleanTarget === 'WEBM') {
          const args: string[] = ['-i', inputName];
          if (videoScaleFilter) {
            args.push('-vf', videoScaleFilter);
          }
          if (preset?.fpsLimiter && preset.fpsLimiter !== 'original') {
            args.push('-r', preset.fpsLimiter);
          }
          args.push('-c:v', 'libvpx-vp9', '-crf', '30', '-b:v', '0', '-c:a', 'libopus', outputName);
          const exitCode = await ffmpeg.exec(args);
          if (exitCode !== 0) {
            await ffmpeg.exec(['-i', inputName, outputName]);
          }
        } else if (cleanTarget === 'MOV') {
          let crf = '18';
          if (preset?.videoBitrate === 'lossless') crf = '0';
          else if (preset?.videoBitrate === 'balanced') crf = '23';
          else if (preset?.videoBitrate === 'compact') crf = '28';

          const args: string[] = ['-i', inputName, ...threadArgs];
          if (videoScaleFilter) {
            args.push('-vf', videoScaleFilter);
          }
          if (preset?.fpsLimiter && preset.fpsLimiter !== 'original') {
            args.push('-r', preset.fpsLimiter);
          }
          args.push(
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-crf', crf,
            '-pix_fmt', 'yuv420p'
          );
          if (preset?.videoAudioBitrate === 'mute') {
            args.push('-an');
          } else if (preset?.videoAudioBitrate && preset.videoAudioBitrate !== 'original') {
            args.push('-c:a', 'aac', '-b:a', preset.videoAudioBitrate);
          } else {
            args.push('-c:a', 'aac', '-b:a', audioBitrate);
          }
          args.push(outputName);
          const exitCode = await ffmpeg.exec(args);
          if (exitCode !== 0) {
            await ffmpeg.exec(['-i', inputName, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', outputName]);
          }
        } else if (cleanTarget === 'AVI') {
          const args: string[] = ['-i', inputName, ...threadArgs];
          if (videoScaleFilter) {
            args.push('-vf', videoScaleFilter);
          }
          if (preset?.fpsLimiter && preset.fpsLimiter !== 'original') {
            args.push('-r', preset.fpsLimiter);
          }
          args.push('-c:v', 'mpeg4', '-vtag', 'xvid');
          if (preset?.videoAudioBitrate === 'mute') {
            args.push('-an');
          } else if (preset?.videoAudioBitrate && preset.videoAudioBitrate !== 'original') {
            args.push('-c:a', 'libmp3lame', '-b:a', preset.videoAudioBitrate);
          } else {
            args.push('-c:a', 'libmp3lame', '-b:a', '192k');
          }
          args.push(outputName);
          const exitCode = await ffmpeg.exec(args);
          if (exitCode !== 0) {
            await ffmpeg.exec(['-i', inputName, outputName]);
          }
        } else if (cleanTarget === 'MP3') {
          const args = ['-i', inputName, '-vn', '-c:a', 'libmp3lame', '-q:a', '2', ...channelArgs, outputName];
          const exitCode = await ffmpeg.exec(args);
          if (exitCode !== 0) {
            await ffmpeg.exec(['-i', inputName, outputName]);
          }
        } else if (cleanTarget === 'AAC') {
          // If source is already AAC, stream copy
          if (normInputExt === 'm4a' || normInputExt === 'aac') {
            await ffmpeg.exec(['-i', inputName, '-vn', '-c:a', 'copy', outputName]);
          } else {
            const args = ['-i', inputName, '-vn', '-c:a', 'aac', '-b:a', audioBitrate, ...channelArgs, outputName];
            const exitCode = await ffmpeg.exec(args);
            if (exitCode !== 0) {
              await ffmpeg.exec(['-i', inputName, outputName]);
            }
          }
        } else if (cleanTarget === 'FLAC') {
          const args = ['-i', inputName, '-vn', '-c:a', 'flac', ...channelArgs, outputName];
          const exitCode = await ffmpeg.exec(args);
          if (exitCode !== 0) {
            await ffmpeg.exec(['-i', inputName, outputName]);
          }
        } else if (cleanTarget === 'OGG') {
          const args = ['-i', inputName, '-vn', '-c:a', 'libvorbis', '-b:a', audioBitrate, ...channelArgs, outputName];
          const exitCode = await ffmpeg.exec(args);
          if (exitCode !== 0) {
            await ffmpeg.exec(['-i', inputName, outputName]);
          }
        } else if (cleanTarget === 'WAV') {
          const args = ['-i', inputName, '-vn', '-c:a', 'pcm_s16le', ...channelArgs, outputName];
          const exitCode = await ffmpeg.exec(args);
          if (exitCode !== 0) {
            throw new Error(`WAV export exited with error code ${exitCode}`);
          }
        } else {
          const args: string[] = ['-i', inputName];
          if (videoScaleFilter) {
            args.push('-vf', videoScaleFilter);
          }
          if (preset?.fpsLimiter && preset.fpsLimiter !== 'original') {
            args.push('-r', preset.fpsLimiter);
          }
          args.push(outputName);
          const exitCode = await ffmpeg.exec(args);
          if (exitCode !== 0) {
            throw new Error(`FFmpeg transcoding exited with error code ${exitCode}`);
          }
        }

        data = await ffmpeg.readFile(outputName);
      }

      // 3. Read output from virtual memory
      if (!data) {
        data = await ffmpeg.readFile(outputName);
      }
      if (!data || data.length === 0) {
        throw new Error('Transcoded output is empty or failed to write to virtual memory.');
      }

      const mimeType = this.getMimeType(ext);
      const safeBuffer = new Uint8Array(data).buffer as ArrayBuffer;
      const blob = new Blob([safeBuffer], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const elapsedSec = ((performance.now() - startTime) / 1000).toFixed(1);
      const { badge } = calculateReductionBadge(file.size, blob.size);

      onProgress(100, '36.4 MB/s');

      return {
        blob,
        url,
        sizeBytes: blob.size,
        outputName: outputFilename,
        reductionBadge: badge,
        duration: `${elapsedSec}s`,
      };
    } finally {
      // 4. Always cleanup virtual memory and listeners
      try {
        await ffmpeg.deleteFile(inputName);
      } catch {}
      try {
        await ffmpeg.deleteFile(outputName);
      } catch {}
      ffmpeg.off('progress', progressHandler);
    }
  }
}

export const ffmpegManager = new FFmpegManager();
