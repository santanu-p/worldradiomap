# Contributing to World Radio Atlas

Thank you for your interest in contributing to **World Radio Atlas**! This guide outlines our development workflow and contribution guidelines.

---

## 🛠️ Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/santanu-p/worldradiomap.git
   cd worldradiomap
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start local dev server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## 🧪 Testing Guidelines

We use Node.js's native test runner (`node:test`) to avoid test runner bloat.

- **Run all unit tests:**
  ```bash
  npm test
  ```
- All pull requests must pass all unit tests with 0 failures before being merged.
- When introducing new features or refactoring modules:
  - Add corresponding unit tests under the `tests/` directory.
  - Ensure that `const IDB_VERSION = 2;` and required map overlay markup classes (`.map-controls-custom`, `.city-videos-overlay`) are maintained as tested in `tests/storagePolicy.test.js` and `tests/mapOverlayMarkup.test.js`.

---

## 🏗️ Code Architecture & Standards

- **Zero Runtime Bloat:** Avoid adding large third-party framework dependencies (e.g. React, Vue, Redux, or XState). Keep code modular using ES6+ JavaScript and modern CSS.
- **State Machines:** UI overlays, playback, catalog loading, and city videos are governed by deterministic Finite State Machines in `src/appStateMachines.js` via `src/stateMachine.js`. Do not manipulate overlay states with arbitrary DOM classes outside the `UIOverlayFSM`.
- **Agent Experience (AX):** Maintain the `window.__WRA__` runtime bridge in `src/main.js` so automated tools and AI agents can continue to inspect state and dispatch actions programmatically.
- **Audio DSP Graph:** Preserve dual-mode audio support (`Mode A` with Web Audio DSP; `Mode B` hardware fallback on CORS error or zero-amplitude detection).

---

## 🚀 Pull Request Process

1. Fork the repository and create your branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Verify production build:
   ```bash
   npm run build
   ```
3. Run the test suite:
   ```bash
   npm test
   ```
4. Commit your changes with clear, descriptive commit messages.
5. Push to your fork and submit a Pull Request to `main`.
