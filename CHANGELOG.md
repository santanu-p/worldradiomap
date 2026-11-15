# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] - 2026-11-15

### 🚀 Major Architectural Overhaul & Elevation

#### Added
- **Dual-Mode Web Audio DSP Engine (`src/audioEngine.js`)**:
  - Parametric Equalizer with 5 presets: `Normal`, `Bass Boosted` (+15dB at 150Hz), `Tone (Treble)` (+12dB at 4kHz), `Soft` (gentle low-pass), and `Spatial (Atmos Sim)` (spatial binaural simulation).
  - Mode A (DSP Active): Streams routed through Web Audio API node graph with `crossOrigin="anonymous"`.
  - Mode B (Direct Hardware Stream): Real-time zero-amplitude CORS silence detection sampling FFT bins after 1.5s; automatically reconnects directly to hardware output without interrupting playback.
  - Native HLS (`.m3u8`) live radio streaming support powered by `hls.js`.
  - 8-second watchdog timer providing automatic failover suggestions for similar stations in the same country or genre when an endpoint is unreachable.
- **Deterministic Finite State Machines (`src/stateMachine.js`, `src/appStateMachines.js`)**:
  - Zero-dependency, lightweight FSM engine (~140 LOC) supporting entry/exit hooks, transition guards, array branching, and state transition history.
  - `PlaybackFSM`: Unifies playback lifecycles (`idle`, `connecting`, `buffering`, `playing_dsp`, `playing_direct`, `reconnecting`, `error`).
  - `UIOverlayFSM`: Enforces mutual exclusion across modals and drawers (`closed`, `search`, `passport`, `mobile_nav`, `eq_drawer`, `ambient_drawer`, `sleep_drawer`).
  - `CatalogFSM`: Governs cache checking, multi-mirror rotation, and curated station fallback.
  - `CityVideoFSM`: Controls ambient city video lookup, iframe loading, and Cinema Mode transitions.
- **Agent Experience (AX) Runtime Bridge (`window.__WRA__`)**:
  - Full application state introspection via `window.__WRA__.getState()`.
  - Direct event dispatching via `window.__WRA__.dispatch(machine, event)`.
  - Programmatic automation primitives: `playStationById(id)`, `openView(name)`, `setVolume(vol)`, `spinGlobe()`, `pause()`, `resume()`.
  - Transition subscriptions (`__WRA__.subscribe`) and history ring buffer for automated QA and AI agents.
- **Ambient Lo-Fi Mixer ("Night Drive / Time Travel")**:
  - In-dock procedural Web Audio synthesizer with independent sliders for *Rain on windshield*, *Vinyl crackle*, and *City night ambiance*.
- **Live Weather & Local Time (`src/weatherTime.js`)**:
  - Open-Meteo API integration with 15-minute client caching displaying the broadcast city's local time and current weather condition pill.
- **Radio Passport & Favorites Collection (`src/favoritesPassport.js`)**:
  - Gamified travel stamp collection recording unique countries and cities visited.
  - One-click hearting/bookmarking of favorite stations saved to localStorage with instant playback shortcuts.
- **Sleep Timer & Shareable Links (`src/sleepTimer.js`)**:
  - 15, 30, and 60-minute sleep timers with gentle 30-second volume fade-out.
  - URL query parameter deep linking (`?station=<station-uuid>`).
- **Comprehensive Test Suite (`tests/`)**:
  - Expanded test coverage to 42 passing unit tests using native Node.js test runner (`node:test`).

#### Changed
- **Radio Browser API Resilience (`src/radioApi.js`)**:
  - Replaced hardcoded single API endpoint with resilient multi-mirror rotation (`de1.api.radio-browser.info`, `fi1.api.radio-browser.info`, `at1.api.radio-browser.info`, `nl1.api.radio-browser.info`) with 4-second timeout using `AbortController`.
  - Strict filtering with `hidebroken=true&is_https=true`.
  - IndexedDB caching (`WorldRadioAtlasDB`) with 12-hour expiration and background silent refresh.
- **Cartography Upgrades (`src/data.js`, `src/style.css`)**:
  - Switched dark basemap from watermarked Carto tiles to clean Esri World Dark Gray Canvas and OpenStreetMap.
  - Restyled `.btn-surprise` into a sleek glassmorphic pill button.
- **Glassmorphic Persistent Dock**:
  - Upgraded bottom audio player with `backdrop-filter: blur(24px)`, HTML5 Canvas FFT visualizer, and dynamic stream badges.

#### Fixed
- Fixed audio muting caused by missing `Access-Control-Allow-Origin` headers on third-party radio streams.
- Fixed overlapping modal and drawer conflicts by routing all UI triggers through `UIOverlayFSM`.
- Fixed broken station logo icons with deterministic SVG initials and gradient palette hashing.
- Fixed Netlify Content Security Policy headers to permit all required mirrors and Open-Meteo API endpoints.

---

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

---

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
