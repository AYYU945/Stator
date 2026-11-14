# Changelog

All notable changes to Stator will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-14

### Changed
* **Transitioned to MIT Open Source:** Released Stator application codebase under the permissive MIT License with transparent third-party attribution for dynamically loaded `@ffmpeg/core` WebAssembly codecs.
* **Unlocked All Capabilities for Everyone:**
  * Removed 3-file batch queue limit; unlimited batch queuing is now active by default.
  * Unlocked **4K (2160p)**, **2K (1440p)**, and **Original** (>1080p) resolution scaling across video and image pipelines.
  * Unlocked **120 FPS (Ultra Smooth)** frame rate output.
  * Unlocked **320 kbps**, **256 kbps**, and **192 kbps** audio bitrates alongside **128 kbps**, **64 kbps**, and **Mute Track**.
  * Unlocked full `navigator.hardwareConcurrency` CPU thread allocation for WebAssembly encoding.
* **Header & Navigation:** Replaced commercial waitlist UI with direct **GitHub** repository and non-gating **Sponsor** links.
* **Dependencies & Docs:** Removed unused server/AI dependencies (`@google/genai`, `express`, `dotenv`) from `package.json` and `.env.example`; added `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, and GitHub issue/funding templates.

### Removed
* Removed `ProWaitlistModal`, `ProUpgradeModal`, local license key validation (`STTR-*`), and all paywall/beta lock prompts across `DropZone`, `MediaInspectorModal`, `AdvancedPresetsModal`, `HelpDrawer`, `FaqSection`, `PrivacyPolicy`, and `TermsOfService`.
