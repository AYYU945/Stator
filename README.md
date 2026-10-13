# OmniConvert

OmniConvert is an offline, client-side media conversion utility built with WebAssembly and HTML5 Canvas. All processing runs entirely inside browser memory, ensuring zero network file uploads, zero server egress overhead, and complete data privacy.

---

## Technical Overview

Modern browser capabilities enable performant in-memory media transformations. OmniConvert eliminates server infrastructure costs and privacy liabilities by running conversion workloads on the client hardware.

* **Local Processing:** Files are processed in virtual memory through WebAssembly and Canvas pipelines. Raw media streams never leave the client environment.
* **Stream Copy Fast-Path:** Container re-muxing (such as MKV to MP4 with compatible H.264 streams) uses stream copy (`-c copy`) without re-encoding, finishing tasks in under two seconds.
* **Algorithmic Upscaling:** Image and video frames scale up to 2K (1440p) and 4K (2160p) using Lanczos-3 interpolation without generative AI models or server-side calls.
* **Isolated Multi-Threading:** WebAssembly execution leverages `SharedArrayBuffer` via strict Cross-Origin Isolation (`COOP`/`COEP`), unlocking multi-core processing.

---

## Core Capabilities

* **Video and Audio Transcoding:** Convert container formats (MP4, WebM, MKV, MOV, MP3, WAV, FLAC, OGG) with user-defined presets, frame rates, and bitrates.
* **Image Processing:** High-speed format conversion (PNG, JPEG, WebP, AVIF) with customizable compression sliders, EXIF metadata stripping, and resolution scaling.
* **Parallel Execution:** Off-thread processing uses Web Workers and `OffscreenCanvas` to prevent blocking the main interface thread during intensive conversion queues.
* **Neutral Theme Architecture:** Utilitarian, accessible dark and light interface with automatic system preference detection and zero layout shifts.

---

## Technology Stack

* **Core Framework:** React 18, TypeScript, Vite
* **Styling:** Tailwind CSS (Neutral Dark/Light tokens, standard utility geometry)
* **Processing Engines:** FFmpeg WebAssembly (`@ffmpeg/ffmpeg`, `@ffmpeg/util`), HTML5 Canvas API
* **Icons:** Lucide Icons (SVG only)
* **Fonts:** Self-hosted WOFF2 typography (zero third-party CDN connections)

---

## Project Structure

```text
omniconvert/
├── public/
│   ├── _headers             # Cloudflare Pages / Netlify security headers
│   ├── favicon.svg          # Geometric industrial favicon
│   └── fonts/               # Self-hosted WOFF2 font binaries
├── src/
│   ├── components/
│   │   ├── auth/            # Compliance modals
│   │   ├── converter/       # Drop zone, queue cards, progress bars
│   │   ├── inspector/       # Presets and advanced encoding controls
│   │   ├── layout/          # Header, footer, and navigation
│   │   └── ui/              # Custom select menus, modals, and switches
│   ├── lib/
│   │   ├── ffmpeg.ts        # WebAssembly worker initialization and execution
│   │   ├── imageWorker.ts   # OffscreenCanvas worker pipeline
│   │   ├── license.ts       # License persistence store
│   │   └── theme.ts         # Theme engine and matchMedia listeners
│   ├── pages/
│   │   ├── PrivacyPolicy.tsx
│   │   └── TermsOfService.tsx
│   ├── styles/
│   │   └── fonts.css        # Local @font-face declarations
│   ├── App.tsx
│   └── main.tsx
├── vercel.json              # Vercel deployment COOP/COEP headers
├── vite.config.ts           # Development server headers
└── package.json
