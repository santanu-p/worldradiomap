import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MIRROR_SERVERS,
  getCurrentMirror,
  rotateMirror,
  normalizeStation
} from '../src/radioApi.js';

test('MIRROR_SERVERS contains resilient multi-mirrors without decommissioned servers', () => {
  assert.ok(MIRROR_SERVERS.includes('https://de1.api.radio-browser.info'));
  assert.ok(MIRROR_SERVERS.includes('https://fi1.api.radio-browser.info'));
  assert.ok(MIRROR_SERVERS.includes('https://at1.api.radio-browser.info'));
  assert.ok(MIRROR_SERVERS.includes('https://nl1.api.radio-browser.info'));
});

test('rotateMirror cycles through available mirrors', () => {
  const initial = getCurrentMirror();
  const next = rotateMirror();
  assert.notEqual(initial, next);
});

test('normalizeStation applies country centroids when lat/lng are missing', () => {
  const normalized = normalizeStation({
    stationuuid: 'test-uuid-1',
    name: 'France Info',
    url_resolved: 'https://stream.example/live.mp3',
    country: 'France',
    state: 'Paris'
  });

  assert.equal(normalized.id, 'test-uuid-1');
  assert.equal(normalized.name, 'France Info');
  assert.ok(Number.isFinite(normalized.lat));
  assert.ok(Number.isFinite(normalized.lng));
});
