import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('/usr/local/share/bun-global/node_modules/playwright');

const QA_DIR = '/tmp/stator-qa';
fs.mkdirSync(QA_DIR, { recursive: true });

const executablePath =
  '/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell';

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const consoleErrors = [];
const failedRequests = [];

// 1. Desktop Dark Mode Verification (1440x900)
const desktopCtx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const page = await desktopCtx.newPage();
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('requestfailed', (req) => {
  failedRequests.push(`${req.url()} (${req.failure()?.errorText})`);
});

await page.addInitScript(() => {
  localStorage.setItem('stator_theme', 'dark');
  localStorage.setItem('stator_walkthrough_expanded', 'true');
});

await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
const walkthroughSection = page.locator('section[aria-label="How to use Stator walkthrough"]');
await walkthroughSection.scrollIntoViewIfNeeded();
await page.waitForTimeout(1400);

const videoStats = await page.evaluate(() => {
  const vid = document.querySelector('section[aria-label="How to use Stator walkthrough"] video');
  if (!vid) return { present: false };
  return {
    present: true,
    readyState: vid.readyState,
    videoWidth: vid.videoWidth,
    videoHeight: vid.videoHeight,
    duration: Number(vid.duration?.toFixed(2) || 0),
    currentTime: Number(vid.currentTime?.toFixed(2) || 0),
    paused: vid.paused,
    muted: vid.muted,
    loop: vid.loop,
    src: vid.currentSrc,
  };
});

// Test chapter jump tab click ("02 Crop & Trim")
const cropChapterBtn = page.getByRole('tab', { name: /Crop & Trim/i }).first();
await cropChapterBtn.click();
await page.waitForTimeout(700);
const seekedTime = await page.evaluate(() => {
  const vid = document.querySelector('section[aria-label="How to use Stator walkthrough"] video');
  return vid ? Number(vid.currentTime.toFixed(2)) : -1;
});

await walkthroughSection.scrollIntoViewIfNeeded();
await page.waitForTimeout(250);
await walkthroughSection.screenshot({ path: path.join(QA_DIR, 'live_desktop_dark.png') });

// 2. Desktop Light Mode Check
await page.evaluate(() => {
  localStorage.setItem('stator_theme', 'light');
});
await page.reload({ waitUntil: 'networkidle' });
await walkthroughSection.scrollIntoViewIfNeeded();
await page.waitForTimeout(900);
await walkthroughSection.screenshot({ path: path.join(QA_DIR, 'live_desktop_light.png') });
await desktopCtx.close();

// 3. Mobile Verification (390x844)
const mobileCtx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
const mobilePage = await mobileCtx.newPage();
await mobilePage.addInitScript(() => {
  localStorage.setItem('stator_theme', 'dark');
  localStorage.setItem('stator_walkthrough_expanded', 'true');
});
await mobilePage.goto('http://localhost:3000', { waitUntil: 'networkidle' });
const mobileSection = mobilePage.locator('section[aria-label="How to use Stator walkthrough"]');
await mobileSection.scrollIntoViewIfNeeded();
await mobilePage.waitForTimeout(1000);
await mobileSection.screenshot({ path: path.join(QA_DIR, 'live_mobile_dark.png') });
await mobileCtx.close();

await browser.close();

console.log('Video DOM Stats:', JSON.stringify(videoStats, null, 2));
console.log('Seeked Time after clicking "02 Crop & Trim":', seekedTime);
console.log('Console Errors:', consoleErrors.length);
if (consoleErrors.length) console.log(consoleErrors);
console.log('Failed Requests:', failedRequests.length);
if (failedRequests.length) console.log(failedRequests);
