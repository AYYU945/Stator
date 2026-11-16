import { createRequire } from 'node:module';
import { spawn, execSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('/usr/local/share/bun-global/node_modules/playwright');

const STUDIO_DIR = path.resolve('scripts/walkthrough');
const PUBLIC_MEDIA_DIR = path.resolve('public/media');
fs.mkdirSync(PUBLIC_MEDIA_DIR, { recursive: true });

const OUTPUT_MP4 = path.join(PUBLIC_MEDIA_DIR, 'stator-walkthrough.mp4');
const OUTPUT_POSTER = path.join(PUBLIC_MEDIA_DIR, 'stator-walkthrough-poster.jpg');

const FPS = 60;
const DURATION_SECONDS = 38;
const TOTAL_FRAMES = FPS * DURATION_SECONDS; // 2280 frames

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.css': 'text/css; charset=utf-8',
};

// Lightweight static server for studio.html and captured PNG assets
const server = http.createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0];
  const relPath = urlPath === '/' ? 'studio.html' : urlPath.replace(/^\/+/, '');
  const fullPath = path.join(STUDIO_DIR, relPath);

  if (!fullPath.startsWith(STUDIO_DIR) || !fs.existsSync(fullPath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const ext = path.extname(fullPath).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
  fs.createReadStream(fullPath).pipe(res);
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const studioUrl = `http://127.0.0.1:${port}/studio.html`;

const executablePath =
  '/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell';

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
});

const page = await context.newPage();
await page.goto(studioUrl, { waitUntil: 'networkidle' });
await page.evaluate(() => window.__studioReady);

console.log(`Rendering ${TOTAL_FRAMES} frames (${DURATION_SECONDS}s @ ${FPS}fps) -> ${OUTPUT_MP4}`);

const ffmpeg = spawn(
  'ffmpeg',
  [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'png',
    '-r', String(FPS),
    '-i', '-',
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '19',
    '-profile:v', 'high',
    '-level:v', '4.2',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    '-an',
    OUTPUT_MP4,
  ],
  { stdio: ['pipe', 'inherit', 'inherit'] }
);

const ffmpegExitPromise = new Promise((resolve, reject) => {
  ffmpeg.on('close', (code) => {
    if (code === 0) resolve();
    else reject(new Error(`ffmpeg exited with code ${code}`));
  });
});

// Render frame-by-frame deterministically
for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
  const t = frame / FPS;
  await page.evaluate((timeSec) => window.__setTime(timeSec), t);
  const pngBuffer = await page.screenshot({ type: 'png' });

  if (!ffmpeg.stdin.write(pngBuffer)) {
    await new Promise((resolve) => ffmpeg.stdin.once('drain', resolve));
  }

  if (frame % 300 === 0 || frame === TOTAL_FRAMES - 1) {
    const pct = Math.round(((frame + 1) / TOTAL_FRAMES) * 100);
    console.log(`Progress: frame ${frame + 1}/${TOTAL_FRAMES} (${pct}%)`);
  }
}

ffmpeg.stdin.end();
await ffmpegExitPromise;

// Extract clean high-resolution poster thumbnail at t=2.2s (Scene 1 hero overview)
execSync(
  `ffmpeg -y -ss 2.2 -i "${OUTPUT_MP4}" -frames:v 1 -q:v 3 "${OUTPUT_POSTER}"`,
  { stdio: 'ignore' }
);

await browser.close();
server.close();

// Verify with ffprobe
const probeOut = execSync(
  `ffprobe -v quiet -print_format json -show_format -show_streams "${OUTPUT_MP4}"`,
  { encoding: 'utf8' }
);
const probe = JSON.parse(probeOut);
const streams = probe.streams || [];
const sizeMb = (Number(probe.format?.size || 0) / (1024 * 1024)).toFixed(2);
console.log('\n=== Video Verification Summary ===');
console.log(`File: ${OUTPUT_MP4} (${sizeMb} MB)`);
console.log(`Streams: ${streams.length} (${streams.map((s) => `${s.codec_type}:${s.codec_name}`).join(', ')})`);
console.log(`Resolution: ${streams[0]?.width}x${streams[0]?.height}`);
console.log(`FPS: ${streams[0]?.r_frame_rate}`);
console.log(`Pixel Format: ${streams[0]?.pix_fmt}`);
console.log(`Duration: ${Number(probe.format?.duration || 0).toFixed(2)}s`);
console.log(`Poster: ${OUTPUT_POSTER}`);
