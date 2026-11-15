import Hls from 'hls.js';
import { smoothAudioParam } from './audioUtils.js';
import { buildFreshStreamUrl, isSupportedStreamUrl, resetAudioElement } from './streamUtils.js';
import { createPlaybackStateMachine } from './appStateMachines.js';

export const EQ_PRESETS = {
  normal: { name: 'Normal', bass: 0, treble: 0, spatial: false },
  bass: { name: 'Bass Boosted', bass: 15, treble: 0, spatial: false },
  tone: { name: 'Tone (Treble)', bass: 0, treble: 12, spatial: false },
  soft: { name: 'Soft', bass: 5, treble: -10, spatial: false },
  atmos: { name: 'Spatial (Atmos Sim)', bass: 8, treble: 8, spatial: true }
};

export class AudioEngine {
  constructor(audioElement) {
    this.audio = audioElement || new Audio();
    this.audio.preload = 'none';

    this.audioCtx = null;
    this.audioSource = null;
    this.filters = {
      bass: null,
      treble: null
    };
    this.analyser = null;
    this.hlsInstance = null;

    this.currentStation = null;
    this.isPlaying = false;
    this.isDirectStream = false; // True when CORS bypassed DSP
    this.currentPreset = 'normal';
    this.volume = 0.8;
    this.lastNonZeroVolume = 0.8;

    this.connectionWatchdogTimer = null;
    this.watchdogTimeoutMs = 8000;

    // Ambient mixer nodes
    this.ambientNodes = {
      rainGain: null,
      vinylGain: null,
      cityGain: null,
      initialized: false
    };

    // Event callbacks
    this.onStateChange = null;
    this.onModeChange = null; // (isDirectStream) => {}
    this.onFailoverSuggested = null; // (station) => {}
    this.onToast = null; // (msg, isPersistent, action) => {}

    // Explicit Playback Finite State Machine
    this.fsm = createPlaybackStateMachine();

    this._bindAudioEvents();
  }

  _bindAudioEvents() {
    this.audio.addEventListener('waiting', () => {
      this.fsm.send('AUDIO_WAITING');
      this._emitToast('Buffering stream...', false);
    });

    this.audio.addEventListener('playing', () => {
      this._clearWatchdog();
      this.isPlaying = true;
      this.fsm.send(this.isDirectStream ? 'AUDIO_PLAYING_DIRECT' : 'AUDIO_PLAYING');
      this._emitStateChange();
      this._checkAudioOutputLevel();
    });

    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.fsm.send('PAUSE');
      this._emitStateChange();
    });

    this.audio.addEventListener('error', (e) => {
      console.warn('Audio element error event:', e);
      this._handleStreamError();
    });

    this.audio.addEventListener('stalled', () => {
      if (this.isPlaying && this.currentStation) {
        this.fsm.send('STALLED');
        this._emitToast('Stream connection stalled. Reconnecting...', false);
      }
    });
  }

  _emitStateChange() {
    if (this.onStateChange) {
      this.onStateChange({
        isPlaying: this.isPlaying,
        currentStation: this.currentStation,
        volume: this.volume,
        currentPreset: this.currentPreset,
        isDirectStream: this.isDirectStream
      });
    }
  }

  _emitToast(msg, persistent = false, action = null) {
    if (this.onToast) {
      this.onToast(msg, persistent, action);
    }
  }

  _startWatchdog() {
    this._clearWatchdog();
    this.connectionWatchdogTimer = setTimeout(() => {
      if (!this.isPlaying) {
        console.warn('Stream connection watchdog timed out after 8s');
        this.fsm.send({ type: 'WATCHDOG_EXPIRED', message: 'Stream timed out' });
        this.stop({ clearStation: false });
        this._emitToast('Stream timed out. Station may be offline.', false);
        if (this.onFailoverSuggested && this.currentStation) {
          this.onFailoverSuggested(this.currentStation);
        }
      }
    }, this.watchdogTimeoutMs);
  }

  _clearWatchdog() {
    if (this.connectionWatchdogTimer) {
      clearTimeout(this.connectionWatchdogTimer);
      this.connectionWatchdogTimer = null;
    }
  }

  _initAudioContext(anonymous = true) {
    if (this.audioCtx) return true;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return false;

    try {
      this.audioCtx = new AudioContextClass();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.8;

      this.filters.bass = this.audioCtx.createBiquadFilter();
      this.filters.bass.type = 'lowshelf';
      this.filters.bass.frequency.value = 150;
      this.filters.bass.gain.value = 0;

      this.filters.treble = this.audioCtx.createBiquadFilter();
      this.filters.treble.type = 'highshelf';
      this.filters.treble.frequency.value = 4000;
      this.filters.treble.gain.value = 0;

      // Note: createMediaElementSource will fail or mute if crossOrigin is not set or blocked
      try {
        this.audioSource = this.audioCtx.createMediaElementSource(this.audio);
        this.audioSource.connect(this.filters.bass);
        this.filters.bass.connect(this.filters.treble);
        this.filters.treble.connect(this.analyser);
        this.analyser.connect(this.audioCtx.destination);
        return true;
      } catch (err) {
        console.warn('Could not create MediaElementSource (already created or restricted):', err);
        return false;
      }
    } catch (err) {
      console.warn('AudioContext initialization failed:', err);
      return false;
    }
  }

  /**
   * Monitor output level to detect silent CORS playback
   */
  _checkAudioOutputLevel() {
    if (this.isDirectStream || !this.analyser || !this.audioCtx) return;

    // Wait 1.5 seconds into playback, then sample the frequency data
    setTimeout(() => {
      if (!this.isPlaying || this.isDirectStream || !this.analyser) return;

      const buffer = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(buffer);

      let sum = 0;
      for (let i = 0; i < buffer.length; i++) sum += buffer[i];

      // If playing but total amplitude is 0 across all bins, stream is CORS muted!
      if (sum === 0 && this.audio.volume > 0 && !this.audio.muted) {
        console.info('Detected zero-amplitude audio output (CORS mute). Switching to Direct Stream...');
        this.fsm.send('CORS_MUTE_DETECTED');
        this.fallbackToDirectStream();
      }
    }, 1500);
  }

  /**
   * Graceful fallback when CORS / DSP fails
   */
  fallbackToDirectStream() {
    if (!this.currentStation) return;
    this.isDirectStream = true;
    this.fsm.send('FALLBACK_TO_DIRECT');

    // Disconnect crossOrigin and play directly through hardware output
    const station = this.currentStation;
    const streamUrl = buildFreshStreamUrl(station.url);

    this._cleanupHls();
    resetAudioElement(this.audio);
    this.audio.removeAttribute('crossorigin');
    this.audio.preload = 'none';
    this.audio.volume = this.volume;

    if (this.onModeChange) {
      this.onModeChange({ isDirectStream: true });
    }
    this._emitToast('Direct Stream (EQ bypassed by station)', false);

    if (this._isHlsStream(streamUrl)) {
      this._playHls(streamUrl);
    } else {
      this.audio.src = streamUrl;
      this.audio.play().catch((err) => {
        console.warn('Direct stream replay error:', err);
      });
    }
  }

  _handleStreamError() {
    this._clearWatchdog();

    // If we were attempting DSP / anonymous mode and failed, try Direct Stream fallback first
    if (!this.isDirectStream && this.currentStation) {
      console.warn('Playback error with crossOrigin. Retrying in Direct Stream mode...');
      this.fallbackToDirectStream();
      return;
    }

    // Both modes failed or direct stream failed
    this.fsm.send({ type: 'MEDIA_ERROR', message: 'Stream offline' });
    this.stop({ clearStation: false });
    this._emitToast(
      `Stream error for ${this.currentStation?.name || 'station'}. Stream offline.`,
      false
    );

    if (this.onFailoverSuggested && this.currentStation) {
      this.onFailoverSuggested(this.currentStation);
    }
  }

  _isHlsStream(url) {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.includes('.m3u8') || lower.includes('/playlist.m3u8') || lower.includes('format=hls');
  }

  _cleanupHls() {
    if (this.hlsInstance) {
      this.hlsInstance.destroy();
      this.hlsInstance = null;
    }
  }

  _playHls(url) {
    if (Hls.isSupported()) {
      this._cleanupHls();
      this.hlsInstance = new Hls({
        enableWorker: true,
        lowLatencyMode: true
      });
      this.hlsInstance.loadSource(url);
      this.hlsInstance.attachMedia(this.audio);
      this.hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
        this.audio.play().catch(() => {});
      });
      this.hlsInstance.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('HLS Network Error, attempting recovery...');
              this.hlsInstance.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('HLS Media Error, attempting recovery...');
              this.hlsInstance.recoverMediaError();
              break;
            default:
              this._cleanupHls();
              this._handleStreamError();
              break;
          }
        }
      });
    } else if (this.audio.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari HLS
      this.audio.src = url;
      this.audio.play().catch(() => {});
    } else {
      this._emitToast('HLS playback not supported by this browser.', false);
    }
  }

  playStation(station, forceDirect = false) {
    if (!station || !isSupportedStreamUrl(station.url)) {
      this._emitToast('Unsupported stream URL. Try another station.', false);
      return;
    }

    // Toggle if same station is playing
    if (this.currentStation && this.currentStation.id === station.id && this.isPlaying) {
      this.stop();
      return;
    }

    this._clearWatchdog();
    this._cleanupHls();

    this.currentStation = station;
    this.isDirectStream = forceDirect;
    this.isPlaying = false;

    this.fsm.send({
      type: 'PLAY_STATION',
      station,
      streamUrl: station.url,
      forceDirect
    });

    const streamUrl = buildFreshStreamUrl(station.url);
    if (!streamUrl) {
      this._emitToast('Invalid stream address.', false);
      return;
    }

    resetAudioElement(this.audio);

    if (forceDirect) {
      this.audio.removeAttribute('crossorigin');
    } else {
      this.audio.setAttribute('crossorigin', 'anonymous');
      this._initAudioContext(true);
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    }

    this.audio.preload = 'none';
    this.audio.volume = this.volume;

    this._emitToast(`Connecting to: ${station.name}...`, true);
    this._emitStateChange();
    if (this.onModeChange) {
      this.onModeChange({ isDirectStream: this.isDirectStream });
    }

    this._startWatchdog();

    if (this._isHlsStream(streamUrl)) {
      this._playHls(streamUrl);
    } else {
      this.audio.src = streamUrl;
      const playPromise = this.audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.isPlaying = true;
            this._clearWatchdog();
            this._emitToast(`Playing: ${station.name}`, false);
            this._emitStateChange();
          })
          .catch((err) => {
            if (err.name === 'AbortError') return;
            console.warn('Initial play promise rejected:', err);
            // If anonymous play failed, attempt direct stream
            if (!this.isDirectStream) {
              this.fallbackToDirectStream();
            } else {
              this._handleStreamError();
            }
          });
      }
    }
  }

  stop({ clearStation = false } = {}) {
    this._clearWatchdog();
    this._cleanupHls();
    resetAudioElement(this.audio);
    this.isPlaying = false;
    this.fsm.send('STOP');

    if (clearStation) {
      this.currentStation = null;
    }

    this._emitStateChange();
  }

  togglePlayPause() {
    if (!this.currentStation) return;
    if (this.isPlaying) {
      this.stop();
    } else {
      this.playStation(this.currentStation, this.isDirectStream);
    }
  }

  setVolume(vol) {
    const clamped = Math.max(0, Math.min(1, Number(vol)));
    this.volume = clamped;
    this.audio.volume = clamped;
    if (clamped > 0) {
      this.lastNonZeroVolume = clamped;
    }
    this._emitStateChange();
  }

  toggleMute() {
    if (this.volume > 0) {
      this.setVolume(0);
    } else {
      this.setVolume(this.lastNonZeroVolume || 0.8);
    }
  }

  applyPreset(presetKey) {
    const preset = EQ_PRESETS[presetKey] || EQ_PRESETS.normal;
    this.currentPreset = presetKey;

    if (this._initAudioContext()) {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      if (this.filters.bass) {
        smoothAudioParam(this.filters.bass.gain, preset.bass, 0.1, this.audioCtx);
      }
      if (this.filters.treble) {
        smoothAudioParam(this.filters.treble.gain, preset.treble, 0.1, this.audioCtx);
      }
    }

    this._emitToast(`Audio Style: ${preset.name}`, false);
    this._emitStateChange();
  }

  getFrequencyData() {
    if (this.analyser && this.audioCtx && this.audioCtx.state === 'running' && !this.isDirectStream) {
      const buffer = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(buffer);
      return buffer;
    }
    return null;
  }

  /**
   * Procedural Lo-Fi Ambient Sound Generator (Rain, Vinyl, City Night)
   */
  initAmbientMixer() {
    if (this.ambientNodes.initialized || !this._initAudioContext()) return;

    try {
      const ctx = this.audioCtx;

      // Master ambient gain
      const ambientMaster = ctx.createGain();
      ambientMaster.gain.value = 1.0;
      ambientMaster.connect(ctx.destination);

      // --- 1. Rain Synthesizer (Filtered White/Pink Noise with randomized rain modulation) ---
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02; // Pink noise approx
        lastOut = output[i];
        output[i] *= 3.5;
      }

      const rainSource = ctx.createBufferSource();
      rainSource.buffer = noiseBuffer;
      rainSource.loop = true;

      const rainFilter = ctx.createBiquadFilter();
      rainFilter.type = 'lowpass';
      rainFilter.frequency.value = 1200;

      const rainGain = ctx.createGain();
      rainGain.gain.value = 0; // Off by default

      rainSource.connect(rainFilter);
      rainFilter.connect(rainGain);
      rainGain.connect(ambientMaster);
      rainSource.start(0);

      // --- 2. Vinyl Crackle Synthesizer (Random impulses & scratch generator) ---
      const vinylBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const vinylData = vinylBuffer.getChannelData(0);
      for (let i = 0; i < vinylData.length; i++) {
        const r = Math.random();
        if (r > 0.9996) {
          vinylData[i] = (Math.random() * 2 - 1) * 0.8;
        } else if (r > 0.998) {
          vinylData[i] = (Math.random() * 2 - 1) * 0.15;
        } else {
          vinylData[i] = (Math.random() * 2 - 1) * 0.01;
        }
      }

      const vinylSource = ctx.createBufferSource();
      vinylSource.buffer = vinylBuffer;
      vinylSource.loop = true;

      const vinylFilter = ctx.createBiquadFilter();
      vinylFilter.type = 'bandpass';
      vinylFilter.frequency.value = 2500;
      vinylFilter.Q.value = 2.0;

      const vinylGain = ctx.createGain();
      vinylGain.gain.value = 0; // Off by default

      vinylSource.connect(vinylFilter);
      vinylFilter.connect(vinylGain);
      vinylGain.connect(ambientMaster);
      vinylSource.start(0);

      // --- 3. City Night Drone (Warm low-frequency rumble + distant road texture) ---
      const cityOsc = ctx.createOscillator();
      cityOsc.type = 'triangle';
      cityOsc.frequency.value = 75; // Low hum

      const cityOsc2 = ctx.createOscillator();
      cityOsc2.type = 'sine';
      cityOsc2.frequency.value = 110;

      const cityFilter = ctx.createBiquadFilter();
      cityFilter.type = 'lowpass';
      cityFilter.frequency.value = 280;

      const cityGain = ctx.createGain();
      cityGain.gain.value = 0; // Off by default

      cityOsc.connect(cityFilter);
      cityOsc2.connect(cityFilter);
      cityFilter.connect(cityGain);
      cityGain.connect(ambientMaster);
      cityOsc.start(0);
      cityOsc2.start(0);

      this.ambientNodes = {
        rainGain,
        vinylGain,
        cityGain,
        initialized: true
      };
    } catch (err) {
      console.warn('Ambient mixer init failed:', err);
    }
  }

  setAmbientVolume(type, val) {
    this.initAmbientMixer();
    if (!this.ambientNodes.initialized) return;

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const targetGain = this.ambientNodes[`${type}Gain`];
    if (targetGain) {
      smoothAudioParam(targetGain.gain, Math.max(0, Math.min(1, Number(val))), 0.1, this.audioCtx);
    }
  }
}
