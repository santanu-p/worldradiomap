import assert from 'node:assert/strict';
import test from 'node:test';

import { getInternalNavigationUrl } from '../src/navigationUtils.js';

const origin = 'https://worldradioatlas.netlify.app';

test('getInternalNavigationUrl accepts same-origin absolute and relative URLs', () => {
  assert.equal(getInternalNavigationUrl('/browse.html', origin)?.href, `${origin}/browse.html`);
  assert.equal(getInternalNavigationUrl('videos.html', origin)?.href, `${origin}/videos.html`);
  assert.equal(getInternalNavigationUrl(`${origin}/#about`, origin)?.href, `${origin}/#about`);
});

test('getInternalNavigationUrl rejects protocol-relative and unsafe URLs', () => {
  assert.equal(getInternalNavigationUrl('//evil.example/path', origin), null);
  assert.equal(getInternalNavigationUrl('https://evil.example/path', origin), null);
  assert.equal(getInternalNavigationUrl('javascript:alert(1)', origin), null);
});
