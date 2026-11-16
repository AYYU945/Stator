# Stator

**Stator 1.0** — 100% client-side, MIT-licensed open-source media conversion, compression, and editing studio.

Stator runs entirely inside browser memory via WebAssembly (`@ffmpeg/core` multi-threaded & single-threaded) and HTML5 Canvas / `OffscreenCanvas` Web Workers—with zero file uploads, zero telemetry, zero API keys, and offline-ready PWA caching.

---

## Key Capabilities

* **Zero Network Egress:** Audio, video, and image files never leave the user's device. Self-hosted typography (`@fontsource-variable/*`) and local `/wasm/` core assets run strictly on-device.
* **Adaptive Studio Workspaces:**
  * **Home & Saved Projects:** Quick file drop, clipboard paste (`⌘V` / `Ctrl+V`), project workspace persistence (`IndexedDB`), and local snapshot restore.
  * **Converter & Compressor Studio:** Real-time `BeforeAfterSlider`, interactive `CropOverlayCanvas`, rotation/flip, tonal grading, custom-tinted watermarks, compression goals (`Smaller`, `Balanced`, `Highest`, `Target MB`), and bulk format batch queue.
  * **Video & Audio Editors:** Visual timeline trimmers, split-at-playhead non-destructive segmenting, audio track replacement, multi-resolution ZIP export (`1080p + 720p + 480p`), `.SRT`/`.VTT` subtitle editing, EBU R128 `-16 LUFS` loudness normalization, silence gap removal, and EQ filters.
  * **GIF & Animation Studio:** Multi-frame sequencer with per-frame millisecond durations, live loop/boomerang/reverse playback preview, FFmpeg 2-pass `palettegen` + `paletteuse` GIF compilation, Animated WebP export, sprite sheets, shareable creator recipes, and local Brand Kit defaults.
  * **Quality Lab & Smart Pipelines:** Side-by-side codec & bitrate benchmarking and single-pass multi-step transformation recipes.
* **Privacy & Storage Controls:** Local IndexedDB conversion history (`250 MB` LRU cache), **Ephemeral Privacy Mode** (volatile RAM only), customizable output filename templates, and one-click local storage wipe.
* **Command Palette & Accessibility:** `Cmd/Ctrl+K` command launcher, `Soft Titanium` (Light) & `Obsidian` (Dark) themes, Comfortable / Compact studio density, font scaling, high-contrast focus rings, and OS/manual reduced-motion preferences.

---

## Technology Stack

* **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Motion (`motion/react`), Lucide Icons
* **Processing Engines:** FFmpeg WebAssembly (`@ffmpeg/core@0.12.6` / `@ffmpeg/core-mt@0.12.6` copied locally into `public/wasm/`), `OffscreenCanvas` Worker Pool, Canvas 2D pixel encoders (`WEBP`, `PNG`, `JPEG`, native `AVIF`, multi-size `.ICO`, `TIFF`, `BMP`)
* **Utilities & Testing:** JSZip, Vitest, Playwright, Workbox (`vite-plugin-pwa`)

---

## Project Structure

```text
stator/
├── public/
│   ├── _headers                 # Cloudflare Pages / Netlify COOP & COEP headers
│   ├── _redirects               # SPA fallback routing
│   ├── wasm/                    # Self-hosted @ffmpeg/core-mt & core-st assets
│   └── favicon.svg
├── scripts/
│   └── copy-wasm.mjs            # Copies @ffmpeg/core WASM bundles into public/wasm/
├── src/
│   ├── __tests__/               # Vitest unit test suites
│   ├── components/
│   │   ├── layout/              # Sidebar, TopBar
│   │   ├── studio/              # StatorStudio, StudioInspector, CropOverlayCanvas, AudioWaveformBar, ExportCenterModal
│   │   ├── inspector/           # AdvancedPresetsModal, BeforeAfterSlider
│   │   ├── ui/                  # Shared accessible UI primitives
│   │   ├── HomeDashboard.tsx
│   │   ├── ProjectsView.tsx
│   │   ├── GifStudioPanel.tsx
│   │   ├── QualityLabView.tsx
│   │   ├── SmartPipelinesView.tsx
│   │   ├── HistoryWorkspaceView.tsx
│   │   ├── SettingsView.tsx
│   │   ├── GuideWorkspaceView.tsx
│   │   ├── CommandPalette.tsx
│   │   ├── PrivacyPolicy.tsx
│   │   ├── TermsOfService.tsx
│   │   └── StatusFooter.tsx
│   ├── hooks/
│   │   ├── useConversionQueue.ts
│   │   ├── useProjectWorkspace.ts
│   │   └── useHistoryStack.ts
│   ├── lib/
│   │   ├── motion.ts            # Shared spring & transition tokens
│   │   ├── pipelineRecipes.ts   # Single-pass Smart Pipeline compiler
│   │   ├── presets.ts           # Global presets, Brand Kit, URL recipe codec
│   │   ├── settingsStore.ts     # Persisted studio preferences & document tokens
│   │   └── theme.ts             # System / Light / Dark theme controller
│   ├── types/                   # Queue, Project, Pipeline, History, and Settings types
│   ├── utils/                   # FFmpeg manager, image/ICO/TIFF/BMP encoders, IndexedDB stores, capability probes
│   ├── workers/
│   │   └── imageWorker.ts       # OffscreenCanvas background image worker
│   ├── App.tsx
│   └── main.tsx
├── vercel.json                  # Vercel COOP/COEP headers & SPA rewrites
├── vite.config.ts               # Dev/preview headers, CSP, and Workbox PWA config
└── package.json
```

---

## Local Development & Verification

Stator requires **no backend server, database, or API keys**.

### Prerequisites

* Node.js 18.x or higher
* npm

### Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

### Test, Typecheck & Build

```bash
npm run test     # Vitest unit test suite
npm run lint     # TypeScript type check (tsc --noEmit)
npm run build    # Copies WASM assets and builds production bundle in dist/
npm run preview  # Serves dist/ locally with COOP/COEP headers
```

### Required Production Headers (`COOP` / `COEP`)

Multi-threaded WebAssembly (`SharedArrayBuffer`) requires Cross-Origin Isolation. Any static host serving `dist/` must send:

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Pre-configured templates are included in `vercel.json` and `public/_headers`. Stator automatically falls back to single-threaded WASM (`core-st`) when `window.crossOriginIsolated` is `false`.

---

## License & Attribution

* **Stator Codebase:** Licensed under the **[MIT License](./LICENSE)**.
* **Third-Party WebAssembly Codecs:** Video/audio transcoding loads self-hosted `@ffmpeg/core` binaries locally in the browser (`LICENSE` and `THIRD_PARTY_NOTICES.md` cover GPL/LGPL codec boundaries such as `libx264`).
* **Support & Contact:** `hanan.ahmed.pak@gmail.com` · Read [`CONTRIBUTING.md`](./CONTRIBUTING.md), [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md), and [`SECURITY.md`](./SECURITY.md).
