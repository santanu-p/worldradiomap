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

test('station lists render skeleton placeholders while the live directory loads', async () => {
  const mainJs = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');

  assert.match(
    mainJs,
    /isDirectoryLoading:\s*true/,
    'expected directory loading to be enabled before live data resolves'
  );
  assert.match(
    mainJs,
    /function getSkeletonCards\(/,
    'expected reusable skeleton card markup for loading lists'
  );
  assert.match(
    mainJs,
    /refs\.stationList\.innerHTML\s*=\s*getSkeletonCards\(STATION_SKELETON_COUNT\)/,
    'expected station list rendering to use skeleton placeholders while loading'
  );
  assert.match(
    mainJs,
    /aria-busy/,
    'expected loading regions to expose aria-busy state'
  );
});
