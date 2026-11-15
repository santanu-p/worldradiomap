# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.0.x   | :white_check_mark: |
| < 2.0.0 | :x:                |

---

## Reporting a Vulnerability

If you discover a security vulnerability in **World Radio Atlas**, please report it responsibly:

1. **Do not** open a public GitHub issue for sensitive security disclosures.
2. Email the maintainer directly or submit a private security advisory through GitHub Security Advisories.
3. Please include:
   - A clear description of the vulnerability.
   - Steps to reproduce or proof-of-concept code.
   - The affected component (e.g. Content Security Policy headers, stream sanitization, service worker cache policy).

We will review reports promptly and publish patches in a timely release.

---

## Security Architecture Highlights

- **Content Security Policy (`public/_headers`):** Restricts script, connect, and media sources to prevent unauthorized third-party code execution.
- **Service Worker Cache Isolation:** Caches only same-origin static assets; cross-origin media streams are excluded from permanent storage.
- **HTML Sanitization (`src/htmlUtils.js`):** All dynamic strings, station names, and location metadata are escaped prior to DOM injection.
- **Stream Scheme Validation (`src/streamUtils.js`):** Rejects invalid or dangerous schemes (such as `file:`, `javascript:`, or `data:`) before initiating playback.
