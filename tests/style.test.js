import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('video stage honors hidden attribute so the map remains interactive in map mode', async () => {
  const css = await readFile(new URL('../src/style.css', import.meta.url), 'utf8');

  assert.match(
    css,
    /\.video-stage\[hidden\]\s*\{[\s\S]*?display:\s*none\s*;/,
    'expected an explicit hidden-state rule for the video stage overlay'
  );
});

test('map overlay exposes a collapsed state that gets it out of the way', async () => {
  const css = await readFile(new URL('../src/style.css', import.meta.url), 'utf8');

  assert.match(
    css,
    /\.map-overlay\.is-collapsed\s*\{[\s\S]*?transform:\s*translateY\(/,
    'expected a collapsed map-overlay treatment'
  );
});
