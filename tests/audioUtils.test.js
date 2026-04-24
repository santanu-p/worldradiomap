import assert from 'node:assert/strict';
import test from 'node:test';

import { smoothAudioParam } from '../src/audioUtils.js';

test('smoothAudioParam falls back to an explicit audio context when AudioParam.context is unavailable', () => {
  const calls = [];
  const param = {
    value: 0.4,
    cancelScheduledValues(value) {
      calls.push(['cancel', value]);
    },
    setValueAtTime(value, time) {
      calls.push(['set', value, time]);
    },
    linearRampToValueAtTime(value, time) {
      calls.push(['ramp', value, time]);
    }
  };

  smoothAudioParam(param, 0.9, 0.05, { currentTime: 12 });

  assert.deepEqual(calls, [
    ['cancel', 12],
    ['set', 0.4, 12],
    ['ramp', 0.9, 12.05]
  ]);
});
