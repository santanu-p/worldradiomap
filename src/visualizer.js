/**
 * HTML5 Canvas Audio Spectrum & Waveform Visualizer
 */

export class AudioVisualizer {
  constructor(canvasElement, audioEngine) {
    this.canvas = canvasElement;
    this.ctx = canvasElement?.getContext('2d');
    this.audioEngine = audioEngine;
    this.animationId = null;
    this.barCount = 16;
    this.phase = 0;
  }

  start() {
    if (this.animationId) return;
    const render = () => {
      this.draw();
      this.animationId = requestAnimationFrame(render);
    };
    render();
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.clear();
  }

  clear() {
    if (!this.ctx || !this.canvas) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  draw() {
    if (!this.ctx || !this.canvas) return;
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    const isPlaying = this.audioEngine.isPlaying;
    const freqData = isPlaying ? this.audioEngine.getFrequencyData() : null;

    const barWidth = Math.max(2, (width / this.barCount) - 2);
    const radius = 2;
    this.phase += 0.08;

    for (let i = 0; i < this.barCount; i++) {
      let normHeight = 0.08; // resting baseline

      if (isPlaying) {
        if (freqData && freqData.length > 0) {
          // Real FFT data
          const binIndex = Math.floor((i / this.barCount) * (freqData.length / 2));
          normHeight = Math.max(0.08, freqData[binIndex] / 255);
        } else {
          // Simulated organic harmonic visualizer (Direct Stream mode)
          const wave1 = Math.sin(this.phase + i * 0.45);
          const wave2 = Math.cos(this.phase * 0.8 + i * 0.3);
          const wave3 = Math.sin(this.phase * 1.5 + i * 0.7);
          const combined = (wave1 * 0.5 + wave2 * 0.3 + wave3 * 0.2 + 1) / 2; // 0..1
          normHeight = Math.max(0.12, combined * 0.85);
        }
      }

      const barHeight = Math.max(3, normHeight * (height - 4));
      const x = i * (barWidth + 2) + 1;
      const y = height - barHeight;

      // Gradient with vibrant cyan/blue/neon accents
      const gradient = this.ctx.createLinearGradient(0, height, 0, 0);
      gradient.addColorStop(0, '#2563eb');
      gradient.addColorStop(0.5, '#38bdf8');
      gradient.addColorStop(1, '#a855f7');

      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      if (typeof this.ctx.roundRect === 'function') {
        this.ctx.roundRect(x, y, barWidth, barHeight, [radius, radius, 0, 0]);
      } else {
        this.ctx.rect(x, y, barWidth, barHeight);
      }
      this.ctx.fill();
    }
  }
}
