# Changelog

All notable changes to this project are documented in this file.

## [1.1.0] - 2026-04-18

### Added
- Hash deep-link support for filter and region URLs (for example `#news`, `#talk`, `#electronic`, `#europe`).
- Hash-change listener to update state when URL fragments change in-place.
- Social share PNG fallback at `/og-image.png` for broader card compatibility.
- Netlify redirect rules for stale locale paths (`/de`, `/fr`, `/es`, etc.).
- Build validation workflow for GitHub Actions.

### Changed
- Project version bumped to `1.1.0`.
- Open Graph and Twitter metadata now prefer PNG social image fallback.
- Sitemap now lists only real crawlable URLs and points to current social image.
- Release metadata and branding aligned with World Radio Atlas naming.

### Fixed
- Deep links loading default state instead of requested filter/region.
- Missing sitemap and robots in deploy output path.
- Custom 404 page not being published in `dist` for Netlify.
