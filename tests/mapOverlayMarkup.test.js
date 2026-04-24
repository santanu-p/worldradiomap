import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('map stage includes a dedicated overlay toggle control', async () => {
  const mainJs = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');

  assert.match(
    mainJs,
    /id="mapOverlayToggle"/,
    'expected a map overlay toggle button in the map-stage markup'
  );
});
