import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Netlify headers include a restrictive baseline content security policy', async () => {
  const headers = await readFile(new URL('../public/_headers', import.meta.url), 'utf8');

  assert.match(headers, /Content-Security-Policy:/);
  assert.match(headers, /object-src 'none'/);
  assert.match(headers, /base-uri 'self'/);
  assert.match(headers, /frame-ancestors 'self'/);
});
