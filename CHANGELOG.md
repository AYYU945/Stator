# Changelog

All notable changes to Stator will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-16 — Stator 1.0 (First Public Release)

### Added
* **Multi-Workspace Studio Architecture:** Unified persistent sidebar (`Sidebar`), contextual workspace header (`TopBar`), Home dashboard, Saved Projects (`IndexedDB`), Adaptive Studio (`StatorStudio`), GIF & Animation Studio, Quality Lab, Smart Pipelines, History & Cache, Settings, and Command Palette (`Cmd/Ctrl+K`).
* **Client-Side Image & Animation Tooling:** OffscreenCanvas Web Worker pool supporting `WEBP`, `PNG`, `JPEG`, native browser `AVIF`, multi-size `.ICO` packaging, baseline `TIFF`, 24-bit `BMP`, custom-tinted watermarks, sprite sheet generation, and Favicon/PWA icon pack ZIP exports.
* **WebAssembly Video & Audio Studio:** Self-hosted `@ffmpeg/core@0.12.6` (multi-threaded `core-mt` with automatic single-threaded `core-st` fallback), timeline trim/split, multi-resolution ZIP export, `.SRT`/`.VTT` subtitle editor, `-16 LUFS` loudness normalization, silence removal, EQ profiles, and 2-pass `palettegen` GIF / Animated WebP compilation.
* **Privacy & Accessibility:** Ephemeral Privacy Mode (volatile RAM only), automatic EXIF/container metadata stripping option, `Soft Ivory` (Light) & `Graphite Black` (Dark) Monochrome Luxe themes, Comfortable/Compact density modes, font scaling, high-contrast keyboard focus rings, and OS/manual reduced-motion compliance.
* **Honest Browser Codec Probing:** Runtime encoder probing disables unsupported browser-dependent targets (such as native AVIF canvas encoding where absent) with clear capability feedback instead of silent fallbacks.

### Fixed
* Wired default compression goals, audio normalization, and metadata-stripping preferences from Settings directly into newly staged conversion queue items.
* Fixed responsive mobile inspector sizing below the `lg` breakpoint and added a horizontal mobile asset switcher strip when inspecting multi-file batches.
* Wired Brand Kit accent colors directly into watermark canvas rendering and live CropOverlay previews.
