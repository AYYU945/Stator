# Stator

Stator is an offline, client-side media conversion engine built with WebAssembly and HTML5 Canvas. All processing runs entirely inside browser memory, ensuring zero network file uploads, zero server egress overhead, and complete data privacy.

---

## Technical Overview

Modern browser capabilities enable performant in-memory media transformations. Stator eliminates server infrastructure costs and privacy liabilities by running conversion workloads locally on client hardware.

* **Local Processing:** Files are processed in virtual memory through WebAssembly and Canvas pipelines. Raw media streams never leave the client environment.
* **Stream Copy Fast-Path:** Container re-muxing (such as MKV to MP4 with compatible H.264 streams) uses stream copy (`-c copy`) without re-encoding, finishing tasks in under two seconds.
* **Algorithmic Upscaling:** Image and video frames scale up to 2K (1440p) and 4K (2160p) using Lanczos-3 interpolation without generative AI models or server-side calls.
* **Isolated Multi-Threading:** WebAssembly execution leverages `SharedArrayBuffer` via strict Cross-Origin Isolation (`COOP`/`COEP`), unlocking multi-core processing.
* **Memory Safety & Sequential Cleanup:** WebAssembly memory is safeguarded with explicit virtual file unlinking (`ffmpeg.deleteFile`) after every run and sequential task execution during batch processing.

---

## Core Capabilities

* **Video and Audio Transcoding:** Convert container formats (MP4, WebM, MKV, MOV, MP3, WAV, FLAC, OGG) with user-defined presets, frame rates, and bitrates.
* **Image Processing:** High-speed format conversion (PNG, JPEG, WebP, AVIF) with customizable compression sliders, EXIF metadata stripping, and resolution scaling.
* **Non-Blocking Error Handling:** Resilient batch processing isolates individual stream errors and continues processing staged queue items without freezing.
* **Metadata Readout:** Immediate natural resolution, duration, and file size extraction before transcoding begins.
* **Neutral Theme Architecture:** Utilitarian, accessible dark and light interface with automatic system preference detection and zero layout shifts.

---

## Technology Stack

* **Core Framework:** React 19, TypeScript, Vite
* **Styling:** Tailwind CSS (Neutral Dark/Light tokens, standard utility geometry)
* **Processing Engines:** FFmpeg WebAssembly, HTML5 Canvas API
* **Icons:** Lucide Icons (SVG only)
* **Fonts:** Local Inter / System UI typography (zero third-party CDN connections)

---

## Project Structure

```text
stator/
├── public/
│   ├── _headers             # Cloudflare Pages / Netlify security headers
│   ├── _redirects           # SPA fallback routing
│   └── favicon.svg          # Geometric industrial favicon
├── src/
│   ├── components/
│   │   ├── converter/       # Drop zone, queue cards, aggregate progress bar
│   │   ├── layout/          # Header, footer, navigation
│   │   └── ui/              # Presets and advanced encoding controls
│   ├── lib/
│   │   ├── ffmpeg.ts        # Memory-safe WebAssembly worker pipeline
│   │   ├── presets.ts       # Global preset store and persistence
│   │   └── theme.ts         # Theme engine and matchMedia listeners
│   ├── pages/
│   │   ├── PrivacyPolicy.tsx
│   │   └── TermsOfService.tsx
│   ├── styles/
│   │   └── fonts.css        # Clean local font definitions
│   ├── App.tsx
│   └── main.tsx
├── vercel.json              # Vercel deployment COOP/COEP headers and rewrites
├── vite.config.ts           # Development server headers and es2022 target
└── package.json
```

## Local Development

### Prerequisites

Node.js 18.x or higher, npm or pnpm.

### Installation

```bash
git clone git@github.com:your-username/stator.git
cd stator
npm install
npm run dev
```

Open http://localhost:3000 in a Chromium-based browser or Firefox.

### Production Security Headers

Multi-threaded WebAssembly requires SharedArrayBuffer, which modern browsers restrict unless Cross-Origin Isolation is active.

Verify your server delivers these exact HTTP response headers:

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

### Verification

Open browser Developer Tools, switch to the Console tab, and run:

```javascript
window.crossOriginIsolated
```

The output must evaluate to true. If false, the WebAssembly engine will fall back to single-threaded mode or fail to allocate memory.

### Production Build

To generate production-ready static assets:

```bash
npm run build
```

The compiled output is located in the `dist/` directory and can be deployed directly to Vercel, Cloudflare Pages, Netlify, or AWS S3/CloudFront.

## Privacy and Regulatory Compliance

* **Zero External Dependencies:** No external font CDNs or analytics trackers are requested at runtime.
* **No Telemetry by Default:** Tracking and telemetry scripts remain completely deactivated.
* **Legal Disclosures:** Dedicated routes are included for Privacy Policy (`/privacy`), Terms of Service (`/terms`), and statutory DMCA notices (`/terms#dmca`).

## License

Proprietary. All rights reserved.
