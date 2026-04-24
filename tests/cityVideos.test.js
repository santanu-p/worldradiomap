import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveCityVideoForStation } from '../src/cityVideos.js';

test('resolves a country fallback video for stations using "The United States Of America"', () => {
  const video = resolveCityVideoForStation({
    name: 'Radio Paradise Main Mix (EU) 320k AAC',
    country: 'The United States Of America',
    city: 'California'
  });

  assert.ok(video, 'expected a curated video result');
  assert.equal(video.matchedBy, 'country-default');
  assert.match(video.embedUrl, /youtube-nocookie\.com\/embed\//);
});
