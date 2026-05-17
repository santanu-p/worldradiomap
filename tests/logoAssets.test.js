import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('logo and favicon SVGs include the animated broadcast brand system', async () => {
  const logo = await readFile(new URL('../public/logo.svg', import.meta.url), 'utf8');
  const favicon = await readFile(new URL('../public/favicon.svg', import.meta.url), 'utf8');

  for (const svg of [logo, favicon]) {
    assert.match(svg, /world-radio-atlas-mark/);
    assert.match(svg, /@keyframes pulse-ring/);
    assert.match(svg, /@keyframes orbit-spin/);
  }
});
