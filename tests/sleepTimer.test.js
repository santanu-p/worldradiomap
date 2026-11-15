import assert from 'node:assert/strict';
import test from 'node:test';

import { SleepTimer } from '../src/sleepTimer.js';

test('sleep timer initializes, calculates end time and formats countdown', () => {
  let tickData = null;
  const mockAudio = {
    volume: 0.8,
    setVolume(v) { this.volume = v; },
    stop() { this.stopped = true; }
  };

  const timer = new SleepTimer(mockAudio, (data) => {
    tickData = data;
  });

  assert.equal(timer.isActive(), false);
  timer.start(15);
  assert.equal(timer.isActive(), true);
  assert.ok(timer.endTime > Date.now());

  const formatted = timer._formatTime(90000); // 1m 30s
  assert.equal(formatted, '1:30');

  timer.cancel();
  assert.equal(timer.isActive(), false);
  assert.equal(tickData.isActive, false);
});
