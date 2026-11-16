import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('/usr/local/share/bun-global/node_modules/playwright');

const OUT_DIR = path.resolve('scripts/walkthrough/captures');
const TEMP_ASSETS_DIR = '/tmp/stator-demo-assets';

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(TEMP_ASSETS_DIR, { recursive: true });

console.log('Generating sleek dark studio sample media fixtures...');
const sampleMp4 = path.join(TEMP_ASSETS_DIR, 'product-reel.mp4');
// Clean dark studio footage frame with moving accent bar (no jarring SMPTE rainbow bars)
execSync(
  `ffmpeg -y -f lavfi -i "color=c=#121216:s=1280x720:rate=30:d=4,drawbox=x=180:y=120:w=920:h=480:color=#1e1e24:t=fill,drawbox=x=220:y=160:w=840:h=400:color=#27272e:t=2,drawbox=x=260:y=340:w=760:h=40:color=#3f3f46:t=fill,drawbox=x='260+mod(t*180,620)':y=340:w=140:h=40:color=#10b981:t=fill" -c:v libx264 -pix_fmt yuv420p -an "${sampleMp4}"`,
  { stdio: 'ignore' }
);

// Generate 3 distinct large-enough PNG frames so WEBP conversion produces realistic savings metrics
const frameSpecs = [
  { name: 'keyframe-01.png', bg: '#18181b', accent: '#e4e4e7' },
  { name: 'keyframe-02.png', bg: '#1f1f23', accent: '#10b981' },
  { name: 'keyframe-03.png', bg: '#27272a', accent: '#f4f4f5' },
];
const sampleFrames = [];
for (const spec of frameSpecs) {
  const fPath = path.join(TEMP_ASSETS_DIR, spec.name);
  execSync(
    `ffmpeg -y -f lavfi -i "color=c=${spec.bg}:s=1280x720:d=1,drawbox=x=340:y=210:w=600:h=300:color=${spec.accent}:t=4" -frames:v 1 "${fPath}"`,
    { stdio: 'ignore' }
  );
  sampleFrames.push(fPath);
}

const executablePath =
  '/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell';

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const context = await browser.newContext({
  viewport: { width: 1440, height: 810 }, // Exact 16:9 desktop aspect
  deviceScaleFactor: 1.5, // High-DPI 2160x1215 captures
});

const page = await context.newPage();

await page.addInitScript(() => {
  localStorage.setItem('stator_theme', 'dark');
  localStorage.setItem('stator_walkthrough_expanded', 'false');
});

await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

// Clear initial demo queue cleanly
const clearBtn = page.getByRole('button', { name: 'Clear Queue' }).first();
if (await clearBtn.isVisible()) {
  await clearBtn.click();
  await page.waitForTimeout(300);
}

async function hideToasts() {
  await page.evaluate(() => {
    document.querySelectorAll('[role="status"]').forEach((el) => {
      el.style.display = 'none';
    });
  });
}

async function measureBox(locator) {
  const box = await locator.first().boundingBox();
  if (!box) return null;
  return {
    x: Number(((box.x + box.width / 2) / 1440).toFixed(4)),
    y: Number(((box.y + box.height / 2) / 810).toFixed(4)),
    left: Number((box.x / 1440).toFixed(4)),
    top: Number((box.y / 810).toFixed(4)),
    width: Number((box.width / 1440).toFixed(4)),
    height: Number((box.height / 810).toFixed(4)),
  };
}

const coords = {};

// 1. Clean Home (Empty state)
await hideToasts();
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(250);
await page.screenshot({ path: path.join(OUT_DIR, '01_home_empty.png') });
coords.dropZone = await measureBox(page.locator('[role="button"][aria-label*="Drop media files"]'));
coords.gifStudioTab = await measureBox(page.getByRole('tab', { name: 'GIF & Preset Studio' }));
coords.converterTab = await measureBox(page.getByRole('tab', { name: 'Media Converter' }));

// 2. Upload 2 real files (product-reel.mp4 + keyframe-01.png) -> Active Queue Ready state
const fileInput = page.locator('input[type="file"]').first();
await fileInput.setInputFiles([sampleMp4, sampleFrames[0]]);
await page.waitForTimeout(900);
await hideToasts();
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(250);
await page.screenshot({ path: path.join(OUT_DIR, '02_queue_ready.png') });
coords.configureBtn = await measureBox(page.locator('button[title*="Configure"]').first());
coords.convertAllBtn = await measureBox(page.getByRole('button', { name: /Convert All/i }).first());

// 3. Open Media Inspector Modal on product-reel.mp4
await page.locator('button[title*="Configure"]').first().click();
await page.waitForTimeout(450);
// Ensure Social Aspect Crop & Clip Trim block is scrolled comfortably above sticky footer
await page.locator('button:has-text("9:16")').first().scrollIntoViewIfNeeded();
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(OUT_DIR, '03_inspector_open.png') });
coords.crop916Btn = await measureBox(page.getByRole('button', { name: '9:16', exact: true }).first());
coords.trimStartInput = await measureBox(page.locator('input[type="number"]').nth(0));
coords.trimEndInput = await measureBox(page.locator('input[type="number"]').nth(1));
coords.convertNowBtn = await measureBox(page.getByRole('button', { name: 'Convert Now' }).first());
coords.sharePresetBtn = await measureBox(page.getByRole('button', { name: /Share Preset/i }).first());

// 4. Select 9:16 crop & fill Trim Start = 1, Trim End = 3 inside Media Inspector
await page.getByRole('button', { name: '9:16', exact: true }).first().click();
await page.locator('input[type="number"]').nth(0).fill('1');
await page.locator('input[type="number"]').nth(1).fill('3');
await page.waitForTimeout(250);
await page.screenshot({ path: path.join(OUT_DIR, '04_inspector_configured.png') });

// Close Inspector Modal
await page.getByRole('button', { name: 'Close Media Inspector' }).first().click();
await page.waitForTimeout(300);

// 5. Capture real Converting layout via sample demo queue (includes active 68% converting row)
await page.getByRole('button', { name: 'Clear Queue' }).first().click();
await page.waitForTimeout(250);
await page.getByRole('button', { name: 'Load sample files' }).first().click();
await page.waitForTimeout(350);
await hideToasts();
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(OUT_DIR, '05_queue_converting.png') });

// 6. Capture genuine 100% Completed state ("Ready to Download" banner + Total saved + Download All .ZIP)
// Upload 2 real PNG frames, set both to WEBP for real compression savings, and click Convert All
await page.getByRole('button', { name: 'Clear Queue' }).first().click();
await page.waitForTimeout(200);
await page.locator('input[type="file"]').first().setInputFiles([sampleFrames[0], sampleFrames[1]]);
await page.waitForTimeout(500);
// Set first image target to WEBP via Inspector
await page.locator('button[title*="Configure"]').nth(0).click();
await page.waitForTimeout(250);
await page.getByRole('button', { name: 'WEBP', exact: true }).first().click();
await page.getByRole('button', { name: 'Close Media Inspector' }).first().click();
await page.waitForTimeout(200);
// Set second image target to WEBP via Inspector
await page.locator('button[title*="Configure"]').nth(1).click();
await page.waitForTimeout(250);
await page.getByRole('button', { name: 'WEBP', exact: true }).first().click();
await page.getByRole('button', { name: 'Close Media Inspector' }).first().click();
await page.waitForTimeout(250);
await page.getByRole('button', { name: /Convert All/i }).first().click();
await page.waitForTimeout(800);
await hideToasts();
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(250);
await page.screenshot({ path: path.join(OUT_DIR, '06_queue_completed.png') });
coords.downloadZipBtn = await measureBox(page.getByRole('button', { name: /Download All/i }).first());

// 7. Switch to GIF & Preset Studio tab & stage real PNG frames
await page.getByRole('tab', { name: 'GIF & Preset Studio' }).first().click();
await page.waitForTimeout(450);
await page.locator('input[type="file"][accept="image/*"]').first().setInputFiles(sampleFrames);
await page.waitForTimeout(450);
await hideToasts();
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(250);
await page.screenshot({ path: path.join(OUT_DIR, '07_gif_studio.png') });
coords.buildGifBtn = await measureBox(page.getByRole('button', { name: /Build Animated GIF/i }).first());
coords.applyRecipeBtn = await measureBox(page.getByRole('button', { name: 'Apply to Queue' }).first());

fs.writeFileSync(path.join(OUT_DIR, 'coords.json'), JSON.stringify(coords, null, 2));
console.log('Captured all UI screenshots and bounding boxes to', OUT_DIR);
console.log('Coordinates:', JSON.stringify(coords, null, 2));

await browser.close();
