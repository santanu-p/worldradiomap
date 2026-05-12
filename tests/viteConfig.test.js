import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('production build includes the videos page entry', async () => {
  const config = await readFile(new URL('../vite.config.js', import.meta.url), 'utf8');

  assert.match(config, /videos:\s*resolve\(__dirname,\s*'videos\.html'\)/);
});
