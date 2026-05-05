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

test('uses a Kolkata-specific city video search instead of the Mumbai fallback', () => {
  const video = resolveCityVideoForStation({
    name: 'Kolkata FM',
    country: 'India',
    city: 'Kolkata'
  });

  assert.ok(video, 'expected a Kolkata video result');
  assert.equal(video.matchedBy, 'city-country');
  assert.match(video.embedUrl, /listType=search/);
  assert.match(video.embedUrl, /Kolkata\+India\+4K\+city\+walking\+tour/);
  assert.doesNotMatch(video.embedUrl, /dTxIyhunxbI/);
});

test('resolves Delhi to a Delhi-specific video', () => {
  const video = resolveCityVideoForStation({
    name: 'Delhi Radio',
    country: 'India',
    city: 'New Delhi'
  });

  assert.ok(video, 'expected a Delhi video result');
  assert.equal(video.matchedBy, 'city-country');
  assert.match(video.embedUrl, /NEnzX8BVs2E/);
});
