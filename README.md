# Stator

**A privacy-first, open-source media studio that runs entirely in your browser.**

[![Version](https://img.shields.io/badge/release-v1.0.0-292A2D?style=flat-square)](https://github.com/AYYU945/Stator/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-292A2D?style=flat-square)](./LICENSE)
[![Architecture](https://img.shields.io/badge/processing-100%25%20local%20WASM-292A2D?style=flat-square)](#architecture)

Stator converts, compresses, trims, and compares video, audio, images, and animated GIFs directly in browser memory using WebAssembly (`@ffmpeg/core`) and `OffscreenCanvas` Web Workers. There is no backend server, no account system, no telemetry, and no file upload—your media never leaves your device.

[Features](#features) · [Supported Formats](#supported-formats) · [Quick Start](#quick-start) · [Deployment](#deployment--cross-origin-isolation) · [Architecture](#architecture) · [License](#license--attribution)

---

## Why Stator

- **Zero Network Egress:** Media decoding, transcoding, grading, and encoding run client-side. Typography (`@fontsource-variable/*`) and FFmpeg binaries (`/wasm/`) are self-hosted with offline-ready PWA caching via Workbox.
- **Honest Capability Probing:** Browser-dependent encoders (such as native Canvas `AVIF` export) and `SharedArrayBuffer` multi-threading are probed at runtime, automatically falling back or surfacing clear guidance rather than failing silently.
- **Monochrome Luxe Workspace:** Designed around `Soft Ivory` (Light) and `Graphite Black` (Dark) palettes, keyboard-first navigation (`Cmd/Ctrl + K`), density controls, high-contrast focus rings, and full `prefers-reduced-motion` compliance.

---

## Features

### Workspaces & Project Management
- **Home & Batch Queue:** Drag-and-drop staging, clipboard paste (`Cmd/Ctrl + V`), batch format overrides, and customizable output filename templates.
- **Saved Projects:** Persistent project state and snapshot restoration backed by browser `IndexedDB`.
- **Command Palette:** Instant workspace switching, tool launching, and theme/action execution via `Cmd/Ctrl + K`.

### Image Converter, Compressor & Inspector
- **Real-Time Inspection:** Interactive `BeforeAfterSlider` comparison, live `CropOverlayCanvas`, rotation/flip controls, and tonal grading.
- **Smart Compression & Branding:** Goal-based compression profiles (`Smaller`, `Balanced`, `Highest`, `Target MB`), custom-tinted Brand Kit watermarks, and EXIF/container metadata stripping.
- **Specialized Pixel Encoders:** Client-side encoders for multi-size `.ICO`, Favicon/PWA icon pack ZIP archives, baseline `TIFF`, and 24-bit `BMP`.

### Video & Audio Studio
- **Non-Destructive Timeline:** Visual timeline trimmer, split-at-playhead segmenting, and audio track replacement.
- **Subtitles & Multi-Resolution Delivery:** `.SRT` and `.VTT` subtitle editing plus bundled multi-resolution ZIP exports (`1080p`, `720p`, `480p`).
- **Audio Mastering:** EBU R128 `-16 LUFS` loudness normalization, silence gap trimming, and preset EQ filters.

### GIF Studio, Quality Lab & Smart Pipelines
- **GIF & Animation Sequencer:** Frame-by-frame millisecond timing, live loop/boomerang/reverse playback preview, 2-pass FFmpeg `palettegen` + `paletteuse` compilation, Animated WebP export, sprite sheets, and shareable URL recipes.
- **Quality Lab:** Side-by-side codec and bitrate benchmarking to evaluate file size vs. visual fidelity before committing a batch.
- **Smart Pipelines:** Single-pass compilation of chained transformations into reusable studio recipes.

### Privacy & Storage Controls
- **Ephemeral Privacy Mode:** Process files strictly in volatile RAM without writing conversion history or project snapshots to disk.
- **Local History Cache:** Configurable `IndexedDB` history store (`250 MB` LRU cache) with one-click full storage purge.

---

## Supported Formats

| Media Type | Supported Inputs | Export Targets | Notes |
| --- | --- | --- | --- |
| **Images** | `PNG`, `JPG`/`JPEG`, `WEBP`, `AVIF`, `GIF`, `BMP`, `ICO`, `SVG` | `WEBP`, `PNG`, `JPEG`, `AVIF`*, `ICO`, `TIFF`, `BMP`, `GIF`, PWA ZIP | *`AVIF` export depends on browser Canvas support; camera RAW (`CR2`, `NEF`, `ARW`, `DNG`, etc.) must be pre-converted. |
| **Video** | `MP4`, `MOV`, `MKV`, `WEBM`, `AVI`, `M4V`, `FLV`, `TS`, `OGV` | `MP4`, `WEBM`, `MOV`, `MKV`, `AVI`, `GIF`, Multi-Res ZIP | Soft caution above `500 MB`; `~1.8 GB` WASM32 `MEMFS` memory guardrail. |
| **Audio** | `MP3`, `WAV`, `AAC`, `OGG`, `FLAC`, `M4A`, `OPUS`, `WMA` | `MP3`, `WAV`, `AAC`, `OGG`, `FLAC` | Supports `-16 LUFS` normalization, EQ, and silence trimming. |

---

## Quick Start

Stator requires **no backend services, databases, or API keys**.

### Prerequisites
- **Node.js** `18.x` or higher
- **npm**

### Run Locally

```bash
git clone https://github.com/AYYU945/Stator.git
cd Stator
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

### Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Starts the Vite development server on port `3000` with Cross-Origin Isolation headers. |
| `npm run build` | Copies self-hosted WASM cores into `public/wasm/` and builds the production bundle into `dist/`. |
| `npm run preview` | Serves the production `dist/` build locally with required `COOP`/`COEP` headers. |
| `npm run test` | Executes the Vitest unit test suite across presets, FFmpeg arg builders, encoders, and routing. |
| `npm run lint` | Runs strict TypeScript type-checking (`tsc --noEmit`). |
| `npm run copy-wasm` | Syncs `@ffmpeg/core` and `@ffmpeg/core-mt` binaries into `public/wasm/`. |
| `npm run clean` | Removes build artifacts (`dist/`). |

---

## Deployment & Cross-Origin Isolation

Multi-threaded FFmpeg WebAssembly (`@ffmpeg/core-mt`) relies on `SharedArrayBuffer`, which browsers only enable in Cross-Origin Isolated contexts (`window.crossOriginIsolated === true`).

Any static host serving `dist/` should send these HTTP response headers:

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Pre-configured hosting templates are included out of the box:
- **Vercel:** [`vercel.json`](./vercel.json) (COOP/COEP headers + SPA rewrites)
- **Cloudflare Pages / Netlify:** [`public/_headers`](./public/_headers) and [`public/_redirects`](./public/_redirects)

> **Automatic Fallback:** If a host or browser environment does not provide Cross-Origin Isolation, Stator automatically falls back to single-threaded WebAssembly (`@ffmpeg/core`) so conversions continue to work reliably.

---

## Architecture

### Technology Stack

| Layer | Technologies |
| --- | --- |
| **UI & State** | React 19, TypeScript, Vite, Tailwind CSS v4, Motion (`motion/react`), Lucide React |
| **Media Engines** | `@ffmpeg/ffmpeg`, `@ffmpeg/core` & `@ffmpeg/core-mt` (`0.12.6`), `OffscreenCanvas` Worker Pool, Canvas 2D Encoders |
| **Storage & Offline** | Browser `IndexedDB` & `localStorage`, `JSZip`, Workbox (`vite-plugin-pwa`) |
| **Testing & Tooling** | Vitest, Playwright, `tsc` |

### Project Structure

```text
Stator/
├── public/
│   ├── _headers                     # Cloudflare Pages / Netlify COOP & COEP headers
│   ├── _redirects                   # SPA fallback routing
│   ├── wasm/                        # Self-hosted @ffmpeg/core & @ffmpeg/core-mt assets
│   └── favicon.svg
├── scripts/
│   └── copy-wasm.mjs                # Copies FFmpeg WASM cores into public/wasm/
├── src/
│   ├── __tests__/                   # Vitest unit test suites
│   ├── components/
│   │   ├── layout/                  # Sidebar, TopBar
│   │   ├── studio/                  # StatorStudio, StudioInspector, CropOverlayCanvas, AudioWaveformBar, ExportCenterModal
│   │   ├── inspector/               # AdvancedPresetsModal, BeforeAfterSlider
│   │   ├── ui/                      # Accessible primitive controls
│   │   ├── HomeDashboard.tsx        # Dropzone, quick actions, staged queue
│   │   ├── ProjectsView.tsx         # Saved IndexedDB project workspaces
│   │   ├── GifStudioPanel.tsx       # Frame sequencer & animation compiler
│   │   ├── QualityLabView.tsx       # Codec & bitrate comparison lab
│   │   ├── SmartPipelinesView.tsx   # Multi-step recipe builder
│   │   ├── HistoryWorkspaceView.tsx # Local 250 MB LRU conversion history
│   │   ├── SettingsView.tsx         # Theme, density, privacy, and export defaults
│   │   ├── GuideWorkspaceView.tsx   # Help, engine diagnostics, and capabilities
│   │   ├── CommandPalette.tsx       # Cmd/Ctrl+K global launcher
│   │   ├── PrivacyPolicy.tsx        # Client-side privacy documentation (/privacy)
│   │   ├── TermsOfService.tsx       # Software Terms & License (/terms)
│   │   ├── CopyrightNotice.tsx      # Copyright & DMCA Notice (/dmca)
│   │   └── StatusFooter.tsx         # Release badge footer
│   ├── hooks/                       # Queue, project workspace, and undo/redo history hooks
│   ├── lib/                         # Links, motion tokens, presets, pipelines, theme & settings stores
│   ├── types/                       # TypeScript domain definitions
│   ├── utils/                       # FFmpeg manager, pixel encoders, IndexedDB stores, capability probes
│   ├── workers/                     # OffscreenCanvas background image worker
│   ├── App.tsx                      # Root shell & client-side legal routing
│   └── main.tsx
├── vercel.json                      # Vercel headers & SPA rewrites
├── vite.config.ts                   # Dev/preview headers, CSP, and PWA configuration
└── package.json
```

---

## Documentation & Community

- **Release Notes:** [`CHANGELOG.md`](./CHANGELOG.md)
- **Contributing Guide:** [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- **Code of Conduct:** [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md)
- **Security Policy:** [`SECURITY.md`](./SECURITY.md)
- **Bug Reports & Feature Requests:** [GitHub Issues](https://github.com/AYYU945/Stator/issues/new/choose)

---

## License & Attribution

- **Stator Codebase:** Licensed under the **[MIT License](./LICENSE)**.
- **Third-Party Codecs & Assets:** Video and audio processing loads self-hosted `@ffmpeg/core` WebAssembly binaries locally in the browser alongside bundled `OFL-1.1` fonts. See [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md) for full dependency licensing and GPL/LGPL codec boundary details.
- **Maintainer:** [AYYU945](https://github.com/AYYU945) · [github.com/AYYU945/Stator](https://github.com/AYYU945/Stator)
