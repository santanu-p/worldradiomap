# Changelog

All notable changes to this project are documented in this file.

## [1.2.0] - 2026-05-12

### Added
- Comprehensive SEO, AEO, GEO, SXO, and AIO audit and implementation.
- Rich structured data (JSON-LD) for `WebSite`, `Organization`, `WebApplication`, `BreadcrumbList`, `FAQPage`, and `VideoObject`.
- `SpeakableSpecification` for AI voice assistant and answer engine optimization (AEO).
- Generative Engine Optimization (GEO) support by allowing AI bots (GPTBot, ClaudeBot, etc.) in `robots.txt`.
- Sitelinks Searchbox support via `SearchAction` schema.
- Image sitemap integration for enhanced visual discovery.
- Breadcrumb navigation for improved search experience (SXO).
- Canonical tags and rich Open Graph/Twitter metadata across all pages.
- `videos.html` added to sitemap and cache rules.

### Changed
- Refactored `robots.txt` to balance AI bot access with security.
- Updated `sitemap.xml` with priority levels and image metadata.
- Optimized heading hierarchy (`h1`-`h6`) for better semantic indexing.

### Fixed
- Missing `videos.html` in sitemap and cache headers.
- Hidden `h1` issues on the home page.
- Inconsistent meta descriptions and robots tags.

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
