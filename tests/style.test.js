import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('video page hides the placeholder once a city video is active', async () => {
  const css = await readFile(new URL('../src/style.css', import.meta.url), 'utf8');

  assert.match(
    css,
    /\.video-player-wrapper\.has-video\s+\.video-placeholder\s*\{[\s\S]*?opacity:\s*0\s*;[\s\S]*?pointer-events:\s*none\s*;/,
    'expected an active video state to hide the placeholder'
  );
});

test('home map controls are layered above the map', async () => {
  const css = await readFile(new URL('../src/style.css', import.meta.url), 'utf8');

  assert.match(
    css,
    /\.map-controls-custom\s*\{[\s\S]*?z-index:\s*10\s*;/,
    'expected custom map controls to be visible above the Leaflet layer'
  );
});
