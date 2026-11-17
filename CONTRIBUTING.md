# Contributing to Stator

Thank you for helping improve Stator! Everything in Stator is 100% open source under the MIT License, with zero proprietary tiers or gated features.

---

## Getting Started

1. **Fork & Clone**
   ```bash
   git clone https://github.com/AYYU945/Stator.git
   cd Stator
   npm install
   ```

2. **Start the Development Server**
   ```bash
   npm run dev
   ```
   The Vite server starts on `http://localhost:3000` with `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` enabled for `SharedArrayBuffer`.

3. **Create a Feature Branch**
   ```bash
   git checkout -b feat/your-feature-name
   ```

---

## Code & Architecture Guidelines

* **100% Client-Side Only:** Never introduce server-side media uploads, third-party analytics, tracking pixels, external font CDNs, or API key requirements.
* **No Feature Gating:** All resolutions, frame rates, bitrates, thread allocations, and batch sizes must remain available to every user.
* **TypeScript & Styling:**
  * Use strict TypeScript with top-level imports.
  * Style exclusively with Tailwind CSS utility classes supporting both dark and light themes.
* **Memory Hygiene:** Always unlink temporary virtual files (`ffmpeg.deleteFile`) and revoke unused `ObjectURL` instances after processing so large conversions do not leak browser RAM.

---

## Pull Request Checklist

Before opening a pull request, ensure:

- [ ] `npm run lint` passes with zero TypeScript errors.
- [ ] `npm run build` completes cleanly.
- [ ] New dependencies use permissive open-source licenses compatible with MIT (verify via `npx license-checker --summary`).
- [ ] New media formats or presets work offline/client-side without external API calls.
- [ ] Documentation (`README.md`, `CHANGELOG.md`) is updated if adding new supported formats or configuration options.
