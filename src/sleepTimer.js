/**
 * Sleep Timer with gentle volume fade-out
 */

export class SleepTimer {
  constructor(audioEngine, onTick, onEnd) {
    this.audioEngine = audioEngine;
    this.onTick = onTick;
    this.onEnd = onEnd;

    this.timerId = null;
    this.intervalId = null;
    this.endTime = null;
    this.totalDurationMs = 0;
    this.initialVolume = 0.8;
  }

  start(minutes) {
    this.cancel();
    if (!minutes || minutes <= 0) return;

    this.totalDurationMs = minutes * 60 * 1000;
    this.endTime = Date.now() + this.totalDurationMs;
    this.initialVolume = this.audioEngine.volume;

    this.intervalId = setInterval(() => {
      const remainingMs = Math.max(0, this.endTime - Date.now());

      // If in final 30 seconds, fade volume smoothly
      if (remainingMs <= 30000 && remainingMs > 0) {
        const factor = remainingMs / 30000;
        this.audioEngine.setVolume(this.initialVolume * factor);
      }

      if (this.onTick) {
        this.onTick({
          remainingMs,
          formatted: this._formatTime(remainingMs),
          isActive: true
        });
      }

      if (remainingMs <= 0) {
        this._finish();
      }
    }, 1000);
  }

  cancel() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.endTime = null;
    if (this.onTick) {
      this.onTick({ remainingMs: 0, formatted: '', isActive: false });
    }
  }

  _finish() {
    this.cancel();
    if (this.audioEngine) {
      this.audioEngine.stop({ clearStation: false });
      this.audioEngine.setVolume(this.initialVolume); // restore volume
    }
    if (this.onEnd) {
      this.onEnd();
    }
  }

  _formatTime(ms) {
    const totalSeconds = Math.ceil(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  isActive() {
    return this.endTime !== null && Date.now() < this.endTime;
  }
}
