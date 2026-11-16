import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const copies = [
  {
    srcDir: path.join(rootDir, 'node_modules/@ffmpeg/core/dist/esm'),
    destDir: path.join(rootDir, 'public/wasm/core-st'),
    files: ['ffmpeg-core.js', 'ffmpeg-core.wasm'],
  },
  {
    srcDir: path.join(rootDir, 'node_modules/@ffmpeg/core-mt/dist/esm'),
    destDir: path.join(rootDir, 'public/wasm/core-mt'),
    files: ['ffmpeg-core.js', 'ffmpeg-core.wasm', 'ffmpeg-core.worker.js'],
  },
];

for (const { srcDir, destDir, files } of copies) {
  if (!fs.existsSync(srcDir)) {
    console.warn(`[copy-wasm] Source directory not found: ${srcDir}`);
    continue;
  }
  fs.mkdirSync(destDir, { recursive: true });
  for (const file of files) {
    const src = path.join(srcDir, file);
    const dest = path.join(destDir, file);
    if (!fs.existsSync(src)) {
      console.warn(`[copy-wasm] Missing asset: ${src}`);
      continue;
    }
    fs.copyFileSync(src, dest);
  }
}

console.log('[copy-wasm] FFmpeg ST and MT WebAssembly assets synced to public/wasm/');
