import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clearCityVideoSearchCache,
  extractVideoId,
  resolveCityVideoForStation
} from '../src/cityVideos.js';

test('resolves a country fallback video for stations using "The United States Of America"', async () => {
  clearCityVideoSearchCache();
  const video = await resolveCityVideoForStation({
    name: 'Radio Paradise Main Mix (EU) 320k AAC',
    country: 'The United States Of America',
    city: 'California'
  }, { fetcher: async () => ({ ok: false }) });

  assert.ok(video, 'expected a curated video result');
  assert.equal(video.matchedBy, 'country-default');
  assert.match(video.embedUrl, /youtube-nocookie\.com\/embed\//);
});

test('fetches a Kolkata city video without the YouTube Data API or deprecated search embeds', async () => {
  clearCityVideoSearchCache();
  const calls = [];
  const video = await resolveCityVideoForStation({
    name: 'Kolkata FM',
    country: 'India',
    city: 'Kolkata'
  }, {
    fetcher: async (url) => {
      calls.push(url);
      return {
        ok: true,
        json: async () => ({
          contents: JSON.stringify({
            items: [
              {
                title: 'Kolkata India 4K city walking tour',
                url: '/watch?v=abc123XYZ11',
                duration: 1800
              }
            ]
          })
        })
      };
    }
  });

  assert.ok(video, 'expected a Kolkata video result');
  assert.match(video.matchedBy, /^youtube-search:/);
  assert.match(calls[0], /api\.allorigins\.win\/get\?url=.*Kolkata%2520India/);
  assert.match(video.embedUrl, /youtube-nocookie\.com\/embed\/abc123XYZ11/);
  assert.doesNotMatch(video.embedUrl, /listType=search/);
  assert.doesNotMatch(video.embedUrl, /dTxIyhunxbI/);
});

test('resolves Delhi to a Delhi-specific video', async () => {
  clearCityVideoSearchCache();
  const video = await resolveCityVideoForStation({
    name: 'Delhi Radio',
    country: 'India',
    city: 'New Delhi'
  }, { fetcher: async () => ({ ok: false }) });

  assert.ok(video, 'expected a Delhi video result');
  assert.equal(video.matchedBy, 'city-country');
  assert.match(video.embedUrl, /NEnzX8BVs2E/);
});

test('extracts YouTube video IDs from watch and embed URLs', () => {
  assert.equal(extractVideoId('https://www.youtube.com/watch?v=abc123XYZ11'), 'abc123XYZ11');
  assert.equal(extractVideoId('https://www.youtube-nocookie.com/embed/NEnzX8BVs2E'), 'NEnzX8BVs2E');
});
