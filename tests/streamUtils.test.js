import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildFreshStreamUrl,
  isSupportedStreamUrl,
  resetAudioElement
} from '../src/streamUtils.js';

test('buildFreshStreamUrl adds a fresh live marker without dropping existing query params', () => {
  assert.equal(
    buildFreshStreamUrl('https://radio.example/live.mp3?token=abc', 12345),
    'https://radio.example/live.mp3?token=abc&wra_live=12345'
  );
});

test('buildFreshStreamUrl rejects non-http stream schemes', () => {
  assert.equal(isSupportedStreamUrl('javascript:alert(1)'), false);
  assert.equal(isSupportedStreamUrl('data:audio/mp3;base64,AAAA'), false);
  assert.equal(buildFreshStreamUrl('javascript:alert(1)', 12345), null);
});

test('resetAudioElement releases the buffered media source before replay', () => {
  const calls = [];
  const audio = {
    src: 'https://radio.example/live.mp3',
    preload: 'auto',
    pause() {
      calls.push('pause');
    },
    removeAttribute(name) {
      calls.push(['removeAttribute', name]);
      if (name === 'src') this.src = '';
    },
    load() {
      calls.push('load');
    }
  };

  resetAudioElement(audio);

  assert.equal(audio.src, '');
  assert.equal(audio.preload, 'none');
  assert.deepEqual(calls, ['pause', ['removeAttribute', 'src'], 'load']);
});
