import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('service worker does not cache cross-origin runtime requests', async () => {
  const sw = await readFile(new URL('../public/service-worker.js', import.meta.url), 'utf8');

  assert.match(
    sw,
    /if\s*\(\s*url\.origin\s*!==\s*self\.location\.origin\s*\)\s*\{\s*return false;\s*\}/,
    'expected the service worker cache policy to reject cross-origin requests'
  );
  assert.doesNotMatch(
    sw,
    /freshResponse\.type\s*===\s*['"]opaque['"]/,
    'expected opaque third-party responses to stay out of Cache Storage'
  );
});
