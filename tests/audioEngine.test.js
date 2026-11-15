import assert from 'node:assert/strict';
import test from 'node:test';

import { AudioEngine, EQ_PRESETS } from '../src/audioEngine.js';

test('EQ presets define expected frequency parameters', () => {
  assert.ok(EQ_PRESETS.normal);
  assert.ok(EQ_PRESETS.bass);
  assert.ok(EQ_PRESETS.tone);
  assert.ok(EQ_PRESETS.soft);
  assert.ok(EQ_PRESETS.atmos);

  assert.equal(EQ_PRESETS.bass.bass, 15);
  assert.equal(EQ_PRESETS.tone.treble, 12);
  assert.equal(EQ_PRESETS.atmos.spatial, true);
});

test('audioEngine detects HLS stream URLs accurately', () => {
  const engine = new AudioEngine({
    addEventListener() {},
    removeAttribute() {},
    setAttribute() {}
  });

  assert.equal(engine._isHlsStream('https://radio.example/stream.m3u8'), true);
  assert.equal(engine._isHlsStream('https://radio.example/playlist.m3u8?token=xyz'), true);
  assert.equal(engine._isHlsStream('https://radio.example/live.mp3'), false);
  assert.equal(engine._isHlsStream('https://radio.example/stream.aac'), false);
});
