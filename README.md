# World Radio Atlas

Vite-powered radio browser with a from-scratch layout, interactive map, search, filters, and live station loading.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Structure

- `index.html` is now a minimal Vite entry.
- `src/main.js` builds the UI and wires the map.
- `src/style.css` defines the new visual system.
- `src/data.js` holds region presets and curated fallback stations.

The app loads live stations from Radio Browser when available and falls back to the curated set if the API is unavailable.
