import assert from 'node:assert/strict';
import test from 'node:test';

import { escapeHtml } from '../src/htmlUtils.js';

test('escapeHtml encodes text and attribute-breaking characters', () => {
  assert.equal(
    escapeHtml('"><img src=x onerror=alert(1)> & Radio'),
    '&quot;&gt;&lt;img src=x onerror=alert(1)&gt; &amp; Radio'
  );
});
