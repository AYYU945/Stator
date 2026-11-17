# Security Policy

## Client-Side Security Architecture

Stator executes all media inspection and transcoding strictly within local browser sandboxes:

* **Zero Server Processing:** User media files are never uploaded or processed on remote servers.
* **No Secrets or API Keys:** The frontend bundle contains zero private credentials, OAuth secrets, or backend tokens.
* **Cross-Origin Isolation:** Production configurations enforce `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` to safely isolate WebAssembly `SharedArrayBuffer` memory.
* **Metadata Hygiene:** Image pipelines strip EXIF metadata by default to prevent unintentional disclosure of GPS or camera identifiers.

---

## Supported Versions

| Version | Supported |
| ------- | --------- |
| `1.x`   | Yes       |

---

## Reporting a Vulnerability

If you discover a security issue (such as Cross-Site Scripting, unsafe HTML/SVG handling, dependency vulnerabilities, or WebAssembly memory isolation bypasses), please **do not open a public GitHub issue**.

Instead, report it privately via:

* **Email:** `hanan.ahmed.pak@gmail.com`
* **GitHub Security Advisories:** [Report a vulnerability](https://github.com/AYYU945/Stator/security/advisories) on `AYYU945/Stator`.

Please include:
1. A clear description of the vulnerability and potential impact.
2. Minimal reproduction steps or sample payload (without sensitive personal files).
3. Affected browser/environment versions.

You can expect an initial acknowledgment within 72 hours and a coordinated fix/disclosure timeline once verified.
