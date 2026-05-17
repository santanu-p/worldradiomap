import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getStationColor,
  getStationInitial,
  renderStationLogoMarkup
} from '../src/stationLogoUtils.js';

test('station logo colors are deterministic for a station seed', () => {
  assert.equal(getStationColor('bbc-world-service'), getStationColor('bbc-world-service'));
  assert.notEqual(getStationColor('bbc-world-service'), getStationColor('kcrw-eclectic'));
});

test('station initials are safe and stable', () => {
  assert.equal(getStationInitial('  radio mirchi'), 'R');
  assert.equal(getStationInitial(''), '?');
});

test('station logo markup does not load third-party favicon URLs', () => {
  const markup = renderStationLogoMarkup({
    id: 'evil-station',
    name: '"><img src=x onerror=alert(1)>',
    favicon: 'https://tracker.example/icon.png'
  });

  assert.doesNotMatch(markup, /<img/i);
  assert.doesNotMatch(markup, /tracker\.example/);
  assert.match(markup, /&quot;/);
});
