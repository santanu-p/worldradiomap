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


test('flex rows do not use negative margins that can push content off page', async () => {
  const css = await readFile(new URL('../src/style.css', import.meta.url), 'utf8');

  assert.doesNotMatch(
    css,
    /margin-left:\s*-[\d.]+px/,
    'expected shared flex rows to stay within their parent width'
  );
});

test('mobile topbar wraps region controls instead of clipping text horizontally', async () => {
  const css = await readFile(new URL('../src/style.css', import.meta.url), 'utf8');

  assert.match(
    css,
    /@media\s*\(max-width:\s*960px\)[\s\S]*?\.topbar-links\s*\{[\s\S]*?flex-wrap:\s*wrap\s*;/,
    'expected mobile navigation links to wrap within the viewport'
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*960px\)[\s\S]*?\.topbar-link-button\s*\{[\s\S]*?white-space:\s*normal\s*;/,
    'expected mobile navigation labels to wrap instead of being clipped'
  );
});

test('directory skeleton loading styles are present', async () => {
  const css = await readFile(new URL('../src/style.css', import.meta.url), 'utf8');

  assert.match(
    css,
    /\.skeleton-card\s*\{[\s\S]*?animation:\s*atlas-rise/,
    'expected skeleton cards to have a loading presentation'
  );
  assert.match(
    css,
    /@keyframes\s+skeleton-sweep/,
    'expected a shimmer animation for skeleton loading cards'
  );
  assert.match(
    css,
    /\.is-directory-loading\s+\.map-stage::before/,
    'expected the map stage to show a loading skeleton overlay'
  );
});

test('futuristic globe hero styles provide responsive canvas and sci-fi glow shell', async () => {
  const css = await readFile(new URL('../src/style.css', import.meta.url), 'utf8');

  assert.match(
    css,
    /\.globe-hero-canvas\s*\{[\s\S]*?inset:\s*-14%/,
    'expected the globe canvas to bleed safely inside the hero shell'
  );
  assert.match(
    css,
    /\.orbital-console\s*\{[\s\S]*?radial-gradient\(circle at 28% 30%, rgba\(87, 118, 255/,
    'expected a dark sci-fi glow shell behind the Three.js globe'
  );
});
