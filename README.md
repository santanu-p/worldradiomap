# 🌐 World Radio Atlas

[![Netlify Status](https://api.netlify.com/api/v1/badges/329111f5-f7c4-4461-a076-197446744f50/deploy-status)](https://app.netlify.com/projects/worldradioatlas/deploys)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![Vite](https://img.shields.io/badge/bundler-Vite%208-646CFF.svg)](https://vitejs.dev/)
[![PWA Ready](https://img.shields.io/badge/PWA-installable-orange.svg)](https://worldradioatlas.netlify.app/)
[![Tests](https://img.shields.io/badge/tests-42%2F42%20passing-success.svg)](tests/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> **World Radio Atlas** is a global live radio discovery platform, interactive cartography atlas, and installable Progressive Web App (PWA). Tune into **60,000+ live stations** across 200+ countries with an interactive world map, dual-mode Web Audio DSP equalizer, real-time city ambient video sync, procedural lo-fi mixer, and zero-bloat modern web standards.

**Live Application:** [https://worldradioatlas.netlify.app/](https://worldradioatlas.netlify.app/)

---

## Table of Contents

- [Key Features](#-key-features)
- [Audio Engine & DSP Architecture](#-audio-engine--dsp-architecture)
- [Finite State Machines (UX, DX, & AX)](#-finite-state-machines-ux-dx--ax)
- [Agent Experience (AX) Runtime Bridge](#-agent-experience-ax-runtime-bridge)
- [Project Architecture](#-project-architecture)
- [Getting Started](#-getting-started)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [Security & Performance](#-security--performance)
- [Contributing & License](#-contributing--license)

---

## 🌟 Key Features

### 🗺️ Interactive World Cartography
- **Clustered Geo-Navigation:** Powered by Leaflet and MarkerCluster with custom coordinate normalization using country centroids when station metadata lacks precise GPS coordinates.
- **Theme Switching:** Toggle between high-contrast Dark Canvas (Esri World Dark Gray) and Clean Paper (OpenStreetMap) basemaps.
- **Spin the Globe (Surprise Me):** One-click button that dynamically animates the globe to a random verified station anywhere on Earth and starts playback.

### 📻 60,000+ Live Radio Stations
- **Resilient Multi-Mirror Rotation:** Automatically distributes queries across global Radio Browser mirrors (`de1`, `fi1`, `at1`, `nl1`) with 4-second timeouts and automatic retry failover.
- **Smart Client Caching:** IndexedDB local persistence (`WorldRadioAtlasDB`) with automatic 12-hour expiration and background silent refresh to guarantee offline-first resilience.
- **Global Search & Continent Filters:** Fast local substring search paired with live debounced API search, plus instant continent filtering (Africa, Asia, Europe, N. America, S. America, Oceania).

### 🎛️ Dual-Mode Web Audio DSP Engine
- **Mode A (DSP Active):** Streams routed through a Web Audio API graph featuring biquad filtering for 5 custom presets:
  - `Normal` — Transparent studio bypass.
  - `Bass Boosted` — +15dB low-shelf boost at 150 Hz.
  - `Tone (Treble)` — +12dB high-shelf boost at 4,000 Hz.
  - `Soft` — Gentle low-pass for relaxing listening.
  - `Spatial (Atmos Sim)` — Stereo spread with balanced high/low curve.
- **Mode B (Direct Hardware Fallback):** Real-time silent-amplitude detection (sampling FFT bins after 1.5s). If a station blocks CORS or transmits silent audio packets through Web Audio, the engine instantly reconnects without `crossOrigin` directly to hardware destination without interrupting user experience.
- **HLS (.m3u8) Native Playback:** Seamlessly detects and plays HTTP Live Streaming (HLS) radio feeds via `hls.js`.
- **Automatic Failover Watchdog:** 8-second watchdog timer that triggers helpful failover recommendations (same country or genre) if a stream fails to connect.

### 🏙️ City Ambiance Video Sync & Cinema Mode
- **Audio-Visual Atmosphere:** Matches the currently playing station's city or country with ambient YouTube footage (walking tours, drone views, night drives).
- **Cinema Mode:** One-click fullscreen ambient city video background with floating glassmorphic radio controls.

### 🌧️ "Night Drive / Time Travel" Lo-Fi Ambient Mixer
- Independent procedural Web Audio sound synthesizer right inside the bottom dock:
  - 🌧️ *Rain on Windshield* (filtered pink noise + resonant biquad filtering)
  - 📻 *Vinyl Crackle* (randomized impulse generator)
  - 🌃 *City Night Ambiance* (low-frequency urban rumble)

### ☀️ Live City Weather & Local Time
- Integration with the free Open-Meteo API (no API key required) with 15-minute client caching.
- Displays the station's broadcast city local time and weather condition pill (e.g. `05:41 PM Local Time • Day ☀️ (25°C Clear Sky)`).

### 🛂 Radio Passport & Favorites
- **Passport Collection:** Gamified record tracking how many unique countries and cities you have explored across the globe.
- **Favorites Collection:** One-click hearting of stations stored in localStorage with instant playback shortcuts.

### 🌙 Sleep Timer & Shareable Links
- **Sleep Timer:** 15, 30, and 60-minute countdowns with a gentle 30-second volume fade-out.
- **Deep Linking:** Share any live station via URL query parameters (`?station=<station-uuid>`).

---

## 🎛️ Audio Engine & DSP Architecture

```
                  ┌──────────────────────────────────────────────┐
                  │            Stream URL Detection              │
                  │        (.m3u8 ➔ HLS.js | MP3/AAC ➔ Audio)     │
                  └──────────────────────┬───────────────────────┘
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   ▼                                           ▼
         [ Mode A: Web Audio DSP ]                   [ Mode B: Direct Stream ]
       (crossOrigin="anonymous")                     (Hardware Output Fallback)
                   │                                           │
         ┌─────────┴─────────┐                                 │
         │ Biquad: Low-Shelf │                                 │
         │      (Bass)       │                                 │
         └─────────┬─────────┘                                 │
                   │                                           │
         ┌─────────┴─────────┐                                 │
         │ Biquad: High-Shelf│                                 │
         │     (Treble)      │                                 │
         └─────────┬─────────┘                                 │
                   │                                           │
         ┌─────────┴─────────┐                                 │
         │ AnalyserNode(FFT) │                                 │
         │ (Canvas Visualizer│                                 │
         └─────────┬─────────┘                                 │
                   │                                           │
     [ CORS Mute / Zero Output? ] ──(Auto-Fallback)────────────┘
                   │
                   ▼
          AudioDestinationNode (Hardware Output)
```

---

## ⚙️ Finite State Machines (UX, DX, & AX)

The entire application state is modeled with explicit, zero-dependency Finite State Machines ([src/stateMachine.js](src/stateMachine.js)):

| Machine | States | Key Purpose |
| :--- | :--- | :--- |
| **`PlaybackFSM`** | `idle`, `connecting`, `buffering`, `playing_dsp`, `playing_direct`, `reconnecting`, `error` | Eliminates playback race conditions, guarantees zero-amplitude CORS fallback, and handles stream failovers. |
| **`UIOverlayFSM`** | `closed`, `search`, `passport`, `mobile_nav`, `eq_drawer`, `ambient_drawer`, `sleep_drawer` | Enforces strict mutual exclusion across all modals and drawers; prevents trapped keyboard focus and overlapping panels. |
| **`CatalogFSM`** | `idle`, `checking_cache`, `fetching_network`, `rotating_mirror`, `fallback_curated`, `ready` | Manages progressive station ingestion, mirror rotation, and cached fallback delivery. |
| **`CityVideoFSM`** | `idle_prompt`, `resolving`, `loading_iframe`, `active`, `cinema_mode` | Manages video lookup, cancellation of superseded requests, iframe loading, and Cinema Mode toggling. |

---

## 🤖 Agent Experience (AX) Runtime Bridge

To support automated testing, headless verification, and AI agents (such as Google DeepMind Antigravity, Playwright, or Puppeteer bots), World Radio Atlas exposes `window.__WRA__` with complete runtime observability and programmatic control without brittle DOM scraping:

```javascript
// 1. Inspect live application state snapshot
const state = window.__WRA__.getState();
console.log(state.playback.value);    // 'playing_dsp' | 'playing_direct' | 'connecting' | 'idle'
console.log(state.catalog.value);     // 'ready'
console.log(state.ui.value);          // 'closed' | 'search' | 'passport' | ...
console.log(state.audio.volume);      // 0.8

// 2. Programmatic control primitives
window.__WRA__.playStationById('bbc-world-service');
window.__WRA__.setVolume(0.75);
window.__WRA__.openView('passport'); // Open Passport modal
window.__WRA__.openView('closed');   // Close any open drawer or modal
window.__WRA__.spinGlobe();          // Random station jump

// 3. Dispatch raw typed events to state machines
window.__WRA__.dispatch('playback', { type: 'PAUSE' });
window.__WRA__.dispatch('cityVideo', { type: 'TOGGLE_CINEMA' });

// 4. Trace transition history for diagnostics
const history = window.__WRA__.getHistory('playback');

// 5. Subscribe to reactive state updates
const unsubscribe = window.__WRA__.subscribe((state, transition) => {
  console.log(`[${transition.machine}] ${transition.from} ➔ ${transition.to}`);
});
```

---

## 📁 Project Architecture

### System Flowchart

```mermaid
%% Generated by https://gitdiagram.com/santanu-p/worldradiomap
flowchart TD

subgraph group_discovery["Radio Discovery"]
  node_app["Atlas Interface<br/>[main.js]"]
  node_catalog["Station Catalog<br/>[radioApi.js]"]
  node_stationdata["Station &amp; Region Data<br/>[data.js]"]
  node_radioapi{{"Radio Browser Mirrors"}}
  node_catalogcache[("IndexedDB Catalog Cache<br/>[radioApi.js]")]
end

subgraph group_listening["Listening Experience"]
  node_audio["Audio Engine<br/>[audioEngine.js]"]
  node_stream["Stream Utilities<br/>[streamUtils.js]"]
  node_audioutils["Audio Utilities<br/>[audioUtils.js]"]
  node_hls{{"HLS.js"}}
  node_visualizer["Audio Visualizer<br/>[visualizer.js]"]
  node_sleep["Sleep Timer<br/>[sleepTimer.js]"]
  node_ambientmixer["Lo-fi Ambient Mixer<br/>[audioEngine.js]"]
end

subgraph group_ambience["Station Ambience"]
  node_cityvideo["City Video Matching<br/>[cityVideos.js]"]
  node_videoproviders{{"Video Search Providers"}}
  node_weather["Weather &amp; Local Time<br/>[weatherTime.js]"]
  node_openmeteo{{"Open-Meteo API"}}
end

subgraph group_personal["Personal Features"]
  node_collections["Favorites &amp; Passport"]
  node_localstorage[("Browser Local Storage")]
end

subgraph group_runtime["App Runtime"]
  node_machines["App State Machines"]
  node_fsmcore["State Machine Engine<br/>[stateMachine.js]"]
  node_pwa["PWA Support<br/>[pwa.js]"]
  node_serviceworker["Service Worker<br/>[service-worker.js]"]
end

node_listener(("Listener"))

node_listener -->|"uses"| node_app
node_app -->|"fetches and searches"| node_catalog
node_catalog -->|"uses fallback data"| node_stationdata
node_catalog -->|"queries mirrors"| node_radioapi
node_catalog -->|"reads and writes"| node_catalogcache
node_app -->|"plays selected stations"| node_audio
node_audio -->|"builds stream URLs"| node_stream
node_audio -->|"smooths audio"| node_audioutils
node_audio -->|"plays HLS feeds"| node_hls
node_app -->|"starts visualizer"| node_visualizer
node_app -->|"sets up timer"| node_sleep
node_app -->|"offers lo-fi mixing"| node_ambientmixer
node_app -->|"resolves station videos"| node_cityvideo
node_cityvideo -->|"searches for videos"| node_videoproviders
node_app -->|"fetches station weather"| node_weather
node_weather -->|"requests forecast data"| node_openmeteo
node_app -->|"toggles favorites"| node_collections
node_collections -->|"persists collections"| node_localstorage
node_audio -->|"creates playback machine"| node_machines
node_machines -->|"creates machines"| node_fsmcore
node_app -.->|"initializes PWA support"| node_pwa
node_pwa -.->|"registers worker"| node_serviceworker

click node_app "https://github.com/santanu-p/worldradiomap/blob/main/src/main.js"
click node_catalog "https://github.com/santanu-p/worldradiomap/blob/main/src/radioApi.js"
click node_stationdata "https://github.com/santanu-p/worldradiomap/blob/main/src/data.js"
click node_catalogcache "https://github.com/santanu-p/worldradiomap/blob/main/src/radioApi.js"
click node_audio "https://github.com/santanu-p/worldradiomap/blob/main/src/audioEngine.js"
click node_stream "https://github.com/santanu-p/worldradiomap/blob/main/src/streamUtils.js"
click node_audioutils "https://github.com/santanu-p/worldradiomap/blob/main/src/audioUtils.js"
click node_visualizer "https://github.com/santanu-p/worldradiomap/blob/main/src/visualizer.js"
click node_sleep "https://github.com/santanu-p/worldradiomap/blob/main/src/sleepTimer.js"
click node_ambientmixer "https://github.com/santanu-p/worldradiomap/blob/main/src/audioEngine.js"
click node_cityvideo "https://github.com/santanu-p/worldradiomap/blob/main/src/cityVideos.js"
click node_weather "https://github.com/santanu-p/worldradiomap/blob/main/src/weatherTime.js"
click node_collections "https://github.com/santanu-p/worldradiomap/blob/main/src/favoritesPassport.js"
click node_machines "https://github.com/santanu-p/worldradiomap/blob/main/src/appStateMachines.js"
click node_fsmcore "https://github.com/santanu-p/worldradiomap/blob/main/src/stateMachine.js"
click node_pwa "https://github.com/santanu-p/worldradiomap/blob/main/src/pwa.js"
click node_serviceworker "https://github.com/santanu-p/worldradiomap/blob/main/public/service-worker.js"

classDef toneNeutral fill:#f8fafc,stroke:#334155,stroke-width:1.5px,color:#0f172a
classDef toneBlue fill:#dbeafe,stroke:#2563eb,stroke-width:1.5px,color:#172554
classDef toneAmber fill:#fef3c7,stroke:#d97706,stroke-width:1.5px,color:#78350f
classDef toneMint fill:#dcfce7,stroke:#16a34a,stroke-width:1.5px,color:#14532d
classDef toneRose fill:#ffe4e6,stroke:#e11d48,stroke-width:1.5px,color:#881337
classDef toneIndigo fill:#e0e7ff,stroke:#4f46e5,stroke-width:1.5px,color:#312e81
classDef toneTeal fill:#ccfbf1,stroke:#0f766e,stroke-width:1.5px,color:#134e4a
class node_app,node_catalog,node_stationdata,node_radioapi,node_catalogcache toneBlue
class node_audio,node_stream,node_audioutils,node_hls,node_visualizer,node_sleep,node_ambientmixer toneAmber
class node_cityvideo,node_videoproviders,node_weather,node_openmeteo toneMint
class node_collections,node_localstorage toneRose
class node_machines,node_fsmcore,node_pwa,node_serviceworker,node_listener toneIndigo
```

### Directory Structure

```
worldradiomap/
├── public/
│   ├── _headers               # Production CSP, security, and cache headers
│   ├── favicon.svg            # Animated brand favicon
│   ├── logo.svg               # Vector brand logo
│   ├── manifest.json          # PWA web app manifest
│   └── service-worker.js      # App shell caching and offline service worker
├── src/
│   ├── appStateMachines.js    # Explicit Playback, Catalog, UI, and Video FSMs
│   ├── audioEngine.js         # Dual-mode Web Audio API engine & ambient synth
│   ├── audioUtils.js          # AudioParam smoothing helpers
│   ├── cityVideos.js          # City video resolution & YouTube embed builders
│   ├── data.js                # Curated fallback catalog & continent coordinates
│   ├── favoritesPassport.js   # Favorites bookmarking & passport entry storage
│   ├── htmlUtils.js           # XSS-safe HTML string escaper
│   ├── main.js                # Application entry point, Leaflet wiring, & AX bridge
│   ├── navigationUtils.js     # Same-origin safe navigation utilities
│   ├── pwa.js                 # Service worker lifecycle manager
│   ├── radioApi.js            # Multi-mirror Radio Browser API client & IndexedDB
│   ├── sleepTimer.js          # Sleep timer with exponential volume fade
│   ├── stateMachine.js        # Deterministic lightweight FSM engine (~140 LOC)
│   ├── stationLogoUtils.js    # Deterministic station initials & palette hashing
│   ├── streamUtils.js         # Stream URL validation and live bust helpers
│   ├── style.css              # Glassmorphic visual system & responsive layout
│   ├── visualizer.js          # HTML5 Canvas real-time FFT / simulated visualizer
│   └── weatherTime.js         # Open-Meteo local weather & time client
├── tests/
│   ├── audioEngine.test.js    # Equalizer presets and HLS detection tests
│   ├── audioUtils.test.js     # Web Audio parameter interpolation tests
│   ├── cityVideos.test.js     # Video resolution fallback tests
│   ├── favoritesPassport.test.js # Storage and travel stamp verification tests
│   ├── htmlUtils.test.js      # Sanitization tests
│   ├── logoAssets.test.js     # Vector branding tests
│   ├── mapOverlayMarkup.test.js # Leaflet DOM layering tests
│   ├── navigationUtils.test.js # URL boundary safety tests
│   ├── pwa.test.js            # Localhost vs production service worker tests
│   ├── radioApi.test.js       # Mirror rotation and centroid fallback tests
│   ├── securityHeaders.test.js# CSP header policy tests
│   ├── serviceWorkerPolicy.test.js # Cross-origin cache isolation tests
│   ├── sleepTimer.test.js     # Countdown calculation tests
│   ├── stateMachine.test.js   # FSM lifecycle, guards, and transition tests
│   ├── stationLogoUtils.test.js # Deterministic color seed tests
│   ├── storagePolicy.test.js  # IndexedDB preservation policy tests
│   ├── streamUtils.test.js    # Stream protocol and scheme validation tests
│   ├── style.test.js          # CSS class layout tests
│   └── viteConfig.test.js     # Build pipeline tests
├── browse.html                # Station directory & filter view
├── index.html                 # Interactive map view
├── videos.html                # Ambient city video player view
├── 404.html                   # Static fallback page
├── vite.config.js             # Multi-page Vite configuration
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v20.0.0 or higher.
- `npm` (comes with Node.js).

### Installation
```bash
# Clone the repository
git clone https://github.com/santanu-p/worldradiomap.git
cd worldradiomap

# Install dependencies
npm install
```

### Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build
```bash
# Typecheck, bundle, and minify assets
npm run build

# Preview production build locally
npm run preview
```

---

## 🧪 Testing & Quality Assurance

The test suite runs on Node.js built-in native test runner (`node:test`) for instant execution without extra test runner dependencies:

```bash
npm test
```

### Test Coverage Highlights:
- **42 Unit Tests** verifying:
  - Audio equalizer parameters and HLS stream detection.
  - Multi-mirror failover and IndexedDB caching behavior.
  - FSM transitions, guards, array targets, and entry/exit lifecycles.
  - Security headers, CSP compliance, and CORS protection.
  - PWA service worker isolation and cache policies.
  - Safe internal URL navigation and XSS escaping.

---

## 🔒 Security & Performance

- **Zero Runtime Framework Overhead:** Built with vanilla ES6+ and modern CSS, avoiding heavy dependencies like React, Vue, Redux, or XState.
- **Strict Content Security Policy (`_headers`):** Enforces explicit `connect-src`, `media-src`, `script-src`, and `frame-src` directives.
- **No Third-Party Tracker Bloat:** Stations, logos, and ambient audio are generated or served securely without invasive tracking scripts or third-party cookies.
- **Service Worker Isolation:** The Service Worker only caches same-origin static assets; live audio streams and external mirrors are never inappropriately cached in cache storage.

---

## 🤝 Contributing & License

Contributions, feature suggestions, and bug reports are welcome! Please open an issue or submit a Pull Request.

Distributed under the **MIT License**. See `LICENSE` for more information.

---

*Crafted with passion for global culture, live audio, and the open web.* 📻🌍✨
