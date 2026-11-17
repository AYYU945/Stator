# Third-Party Notices & Open-Source Licenses

Stator (`https://github.com/AYYU945/Stator`) is an open-source, 100% client-side media conversion workspace released under the **MIT License**. All bundled dependencies, fonts, and WebAssembly binaries are self-hosted for offline privacy and deterministic verification.

---

## Core Engine & WebAssembly Binaries

- **FFmpeg & `@ffmpeg/core` / `@ffmpeg/core-mt` (`0.12.6`)**
  - Website: https://ffmpeg.org / https://github.com/ffmpegwasm/ffmpeg.wasm
  - License: **LGPL-2.1-or-later / GPL-2.0-or-later** (depending on linked codec build flags; npm wrapper package is MIT)
  - Linked Codec Libraries:
    - **libx264** — GPL-2.0-or-later (H.264 / AVC software encoder)
    - **libvpx** — BSD-3-Clause (VP8 / VP9 WebM encoder)
    - **libopus** — BSD-3-Clause (Opus audio codec)
    - **libmp3lame** — LGPL-2.0-or-later (MP3 audio encoder)
    - **libvorbis / libogg** — BSD-3-Clause (Ogg Vorbis audio codec)
    - **FLAC** — BSD-3-Clause / Xiph.Org (Lossless audio codec)
  - Self-hosted asset location: `/public/wasm/core-mt/` (multi-threaded SharedArrayBuffer build) and `/public/wasm/core-st/` (single-threaded fallback build).
  - Source availability: Upstream FFmpeg and `@ffmpeg/core` build scripts are publicly distributed via https://github.com/ffmpegwasm/ffmpeg.wasm-core under their respective LGPL/GPL terms.

- **`@ffmpeg/ffmpeg` (`0.12.10`) & `@ffmpeg/util` (`0.12.1`)**
  - License: **MIT License**

---

## Self-Hosted Fonts

- **`@fontsource-variable/plus-jakarta-sans` (`5.3.0`)** — **SIL Open Font License 1.1 (`OFL-1.1`)**
- **`@fontsource-variable/jetbrains-mono` (`5.3.0`)** — **SIL Open Font License 1.1 (`OFL-1.1`)**
- **`@fontsource-variable/fraunces` (`5.3.0`)** — **SIL Open Font License 1.1 (`OFL-1.1`)**

---

## Application & UI Dependencies

- **React & React DOM (`19.x`)** — MIT License
- **Motion (`motion`)** — MIT License
- **Lucide React (`lucide-react`)** — ISC License
- **Canvas Confetti (`canvas-confetti`)** — ISC License
- **JSZip (`jszip`)** — MIT OR GPL-3.0-or-later License
- **Tailwind CSS (`@tailwindcss/vite`)** — MIT License
- **Vite, `@vitejs/plugin-react`, & `vite-plugin-pwa`** — MIT License
- **Vitest** — MIT License
