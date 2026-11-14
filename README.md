# Stator

**100% client-side, MIT-licensed open-source media conversion engine.**

Stator runs entirely inside browser memory via WebAssembly (`@ffmpeg/core`) and HTML5 Canvas / `OffscreenCanvas` Web Workers—with zero file uploads, zero telemetry, zero API keys, and zero gated features.

---

## Key Capabilities

All features are unlocked by default for every user and self-hosted deployment:

* **Zero Network Egress:** Media streams never leave the user's device. Inspect the browser Network tab during conversion to verify zero media payload transmission.
* **Video & Audio Conversion (`FFmpeg` WebAssembly):**
  * **Video Containers:** `MP4`, `WEBM`, `MOV`, `MKV`, `GIF`, `AVI`
  * **Audio Extraction & Conversion:** `MP3`, `WAV`, `FLAC`, `OGG`, `AAC`, `M4A`
  * **Full Controls Unlocked:** Up to **4K (2160p)** & **2K (1440p)** scaling, **120 FPS (Ultra Smooth)** frame rate output, **320 kbps / 256 kbps / 192 kbps / 128 kbps / 64 kbps** audio bitrates, Mute Track (`-an`), and **Lossless Copy** container remuxing (`-c copy`).
* **Image Processing (`OffscreenCanvas` Web Worker Pool):**
  * **Formats:** `WEBP`, `PNG`, `JPEG`, `AVIF`, `ICO` (multi-size icon packaging), `TIFF`, `BMP`
  * **Controls:** Custom lossy compression sliders, proportional Lanczos-style aspect scaling up to 4K/Original, and automatic EXIF metadata stripping.
* **Uncapped Batch Queue & Multi-Threading:** Unlimited concurrent batch items processed sequentially with explicit virtual filesystem cleanup (`ffmpeg.deleteFile`) and full `navigator.hardwareConcurrency` thread utilization via `SharedArrayBuffer`.
* **Neutral Dark/Light UI:** Self-hosted typography, accessible high-contrast tokens, and IndexedDB local conversion history.

---

## Technology Stack

* **Frontend:** React 19, TypeScript, Vite, Tailwind CSS
* **Processing Engines:** FFmpeg WebAssembly (`@ffmpeg/core@0.12.6` loaded at runtime), HTML5 Canvas & `OffscreenCanvas` Workers
* **Utilities:** JSZip (batch archive exports), Lucide Icons (SVG)

---

## Project Structure

```text
stator/
├── .github/
│   ├── FUNDING.yml              # Optional community sponsorship links
│   └── ISSUE_TEMPLATE/          # Bug report and feature request templates
├── public/
│   ├── _headers                 # Cloudflare Pages / Netlify COOP & COEP headers
│   ├── _redirects               # SPA fallback routing
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── inspector/           # Advanced presets modal & controls
│   │   ├── layout/              # Header (GitHub, Sponsor, theme, drawers)
│   │   ├── DropZone.tsx         # Drag-and-drop file intake
│   │   ├── ActiveQueue.tsx      # Sequential conversion queue & progress UI
│   │   ├── MediaInspectorModal.tsx
│   │   ├── HelpDrawer.tsx
│   │   ├── HistoryDrawer.tsx
│   │   ├── PrivacyPolicy.tsx
│   │   └── TermsOfService.tsx
│   ├── lib/
│   │   ├── ffmpeg.ts            # Thread allocation & virtual FS cleanup helpers
│   │   ├── license.ts           # Open-source unlimited capability profile
│   │   ├── presets.ts           # Global preset store and persistence
│   │   └── theme.ts             # Dark/light theme state
│   ├── types/
│   │   └── queue.ts             # Queue items, formats, and presets
│   ├── utils/
│   │   ├── converter.ts         # Image conversion, ICO/TIFF/BMP encoders
│   │   ├── ffmpegManager.ts     # WebAssembly FFmpeg lifecycle & commands
│   │   ├── historyStorage.ts    # IndexedDB conversion history persistence
│   │   ├── imageWorkerPool.ts   # OffscreenCanvas worker pool
│   │   └── metadataExtractor.ts # Local media metadata inspection
│   ├── workers/
│   │   └── imageWorker.ts
│   ├── App.tsx
│   └── main.tsx
├── vercel.json                  # Vercel COOP/COEP headers & SPA rewrites
├── vite.config.ts               # Dev server headers & build config
└── package.json
```

---

## Local Development & Self-Hosting

Stator requires **no database, backend server, paid services, or API keys**.

### Prerequisites

* Node.js 18.x or higher
* npm or pnpm

### Run Locally

```bash
git clone https://github.com/stator-media/stator.git
cd stator
npm install
npm run dev
```

Open `http://localhost:3000` in Chrome, Edge, Firefox, or Safari.

### Build & Verify

```bash
npm run lint    # TypeScript type check (tsc --noEmit)
npm run build   # Production static bundle in dist/
npm run preview # Preview production build locally
```

### Required Production Headers (`COOP` / `COEP`)

Multi-threaded WebAssembly (`SharedArrayBuffer`) requires Cross-Origin Isolation. Any static host serving `dist/` (Vercel, Cloudflare Pages, Netlify, Nginx, Caddy) must send these HTTP response headers:

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Pre-configured templates are already included in `vercel.json` and `public/_headers`. Verify in DevTools Console that `window.crossOriginIsolated === true`.

---

## License & Dependency Compatibility

* **Stator Codebase:** Licensed under the **[MIT License](./LICENSE)**.
* **Runtime WebAssembly Engine:** Video/audio transcoding dynamically fetches `@ffmpeg/core` at runtime in the browser. Standard `@ffmpeg/core` distributions include GPL-licensed codecs (such as `libx264`). See [`LICENSE`](./LICENSE) for full boundary details.
* **Verify npm Dependency Licenses:**

```bash
npx license-checker --summary
```

All bundled JavaScript/TypeScript dependencies (`react`, `lucide-react`, `jszip`, `motion`, `canvas-confetti`, `tailwindcss`, `vite`) use permissive MIT, ISC, or BSD licenses compatible with MIT distribution.

---

## Contributing & Support

Contributions are welcome! Read [`CONTRIBUTING.md`](./CONTRIBUTING.md), [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md), and [`SECURITY.md`](./SECURITY.md) before submitting a pull request.

Optional non-gating sponsorships are configured in [`.github/FUNDING.yml`](./.github/FUNDING.yml)—all features in Stator remain 100% free and open source for everyone.
