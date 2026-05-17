import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('startup storage cleanup does not delete the station IndexedDB on every session', async () => {
  const mainJs = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');

  assert.doesNotMatch(mainJs, /deleteDatabase\(['"]WorldRadioAtlasDB['"]\)/);
  assert.match(mainJs, /const IDB_VERSION = 2;/);
});
