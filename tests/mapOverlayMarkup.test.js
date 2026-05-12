import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('home map includes custom controls and city video prompt', async () => {
  const mainJs = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');

  assert.match(
    mainJs,
    /class="map-controls-custom"/,
    'expected custom map controls in the home map markup'
  );
  assert.match(
    mainJs,
    /class="city-videos-overlay"/,
    'expected the home map to advertise the city video feature'
  );
});
