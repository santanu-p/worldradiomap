import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import './style.css';
import {
  featuredStations,
  fallbackStations,
  filterGroups,
  mapStyles,
  regionBounds
} from './data.js';

const LIVE_STATION_LIMIT = 3000;
const LIVE_FETCH_TIMEOUT_MS = 22000;
const LIVE_CACHE_KEY = 'world-radio-atlas.live-stations.v1';
const LIVE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const LIVE_REFRESH_RETRY_DELAY_MS = 1200;
const UI_SOUND_PREF_KEY = 'world-radio-atlas.ui-sounds.v1';
const UI_SOUND_PROFILE_PREF_KEY = 'world-radio-atlas.ui-sound-profile.v1';
const SPATIAL_AUDIO_PREF_KEY = 'world-radio-atlas.spatial-audio-mode.v1';
const UI_SOUND_VOLUME = 0.06;
const UI_SOUND_COOLDOWN_MS = 120;
const SPATIAL_AUDIO_MODES = ['off', 'immersive', 'field360'];
const SPATIAL_AUDIO_LABELS = {
  off: 'Off',
  immersive: 'Immersive',
  field360: '360 field'
};
const SPATIAL_AUDIO_RETRY_DELAY_MS = 260;
const UI_SOUND_PROFILES = {
  soft: {
    label: 'Soft',
    click: [
      {
        frequency: 560,
        endFrequency: 500,
        type: 'sine',
        peak: 0.12,
        attack: 0.003,
        hold: 0.004,
        release: 0.065
      },
      {
        offset: 0.006,
        frequency: 1120,
        endFrequency: 920,
        type: 'sine',
        peak: 0.03,
        attack: 0.002,
        hold: 0.003,
        release: 0.055
      }
    ],
    success: [
      {
        frequency: 494,
        endFrequency: 523,
        type: 'sine',
        peak: 0.14,
        attack: 0.006,
        hold: 0.026,
        release: 0.1
      },
      {
        offset: 0.072,
        frequency: 659,
        endFrequency: 698,
        type: 'sine',
        peak: 0.12,
        attack: 0.006,
        hold: 0.026,
        release: 0.11
      },
      {
        offset: 0.145,
        frequency: 784,
        endFrequency: 830,
        type: 'sine',
        peak: 0.09,
        attack: 0.005,
        hold: 0.02,
        release: 0.1
      }
    ],
    error: [
      {
        frequency: 523,
        endFrequency: 466,
        type: 'triangle',
        peak: 0.12,
        attack: 0.005,
        hold: 0.026,
        release: 0.11
      },
      {
        offset: 0.075,
        frequency: 392,
        endFrequency: 329,
        type: 'triangle',
        peak: 0.11,
        attack: 0.005,
        hold: 0.03,
        release: 0.12
      }
    ]
  },
  arcade: {
    label: 'Arcade',
    click: [
      {
        frequency: 980,
        endFrequency: 900,
        type: 'triangle',
        peak: 0.14,
        attack: 0.002,
        hold: 0.008,
        release: 0.045
      }
    ],
    success: [
      {
        frequency: 620,
        endFrequency: 660,
        type: 'square',
        peak: 0.13,
        attack: 0.003,
        hold: 0.022,
        release: 0.075
      },
      {
        offset: 0.05,
        frequency: 820,
        endFrequency: 880,
        type: 'square',
        peak: 0.12,
        attack: 0.003,
        hold: 0.022,
        release: 0.075
      }
    ],
    error: [
      {
        frequency: 610,
        endFrequency: 560,
        type: 'triangle',
        peak: 0.13,
        attack: 0.003,
        hold: 0.028,
        release: 0.085
      },
      {
        offset: 0.06,
        frequency: 430,
        endFrequency: 380,
        type: 'triangle',
        peak: 0.12,
        attack: 0.003,
        hold: 0.032,
        release: 0.095
      }
    ]
  }
};
const LIVE_STATION_QUERY = `json/stations/search?order=votes&reverse=true&has_geo_info=true&hidebroken=true&limit=${LIVE_STATION_LIMIT}`;
const MAP_TILE_ALT_TEXT = 'World map tile';
const API_ENDPOINTS = [
  `https://all.api.radio-browser.info/${LIVE_STATION_QUERY}`,
  `https://de1.api.radio-browser.info/${LIVE_STATION_QUERY}`,
  `https://fr1.api.radio-browser.info/${LIVE_STATION_QUERY}`,
  `https://us1.api.radio-browser.info/${LIVE_STATION_QUERY}`
];

const app = document.querySelector('#app');

app.innerHTML = `
  <div class="shell">
    <header class="masthead">
      <div class="brand">
        <span class="eyebrow">Broadcast atlas / live radio</span>
        <h1>World Radio Atlas</h1>
        <p>Curated signals, live discovery, and a map-first layout built from scratch for faster browsing and clearer listening.</p>
        <nav class="seo-hub-links" aria-label="Indexable landing pages">
          <span class="seo-hub-label">Browse landing pages</span>
          <div class="seo-hub-row">
            <a class="ghost-button seo-hub-link" href="/regions/">Regions</a>
            <a class="ghost-button seo-hub-link" href="/genres/">Genres</a>
            <a class="ghost-button seo-hub-link" href="/regions/europe/">Europe</a>
            <a class="ghost-button seo-hub-link" href="/genres/music/">Music</a>
          </div>
        </nav>
      </div>
      <div class="masthead-actions">
        <div class="status-chip" id="statusChip">Curated preview ready</div>
        <button class="ghost-button" id="refreshStations" type="button">Refresh live directory</button>
      </div>
    </header>

    <main class="workspace">
      <aside class="rail rail-left">
        <section class="panel search-panel">
          <div class="panel-header">
            <h2>Search the atlas</h2>
            <button class="secondary-button" id="clearFilters" type="button">Reset</button>
          </div>
          <div class="search-field">
            <input id="searchInput" class="search-input" type="search" placeholder="Search city, country, station, or genre" aria-label="Search stations">
            <div class="compact-row">
              <button class="micro-button" id="nearMeButton" type="button">Near me</button>
              <button class="micro-button" id="shuffleFeatured" type="button">Shuffle featured</button>
            </div>
          </div>
          <div class="filter-section">
            <p class="section-label">Genres</p>
            <div class="filter-row" id="filterChips"></div>
          </div>
          <div class="filter-section">
            <p class="section-label">Regions</p>
            <div class="segment-row" id="regionChips"></div>
          </div>
          <div class="filter-section">
            <p class="section-label">Map style</p>
            <div class="segment-row" id="styleChips"></div>
          </div>
        </section>

        <section class="panel featured-panel">
          <div class="panel-header">
            <h2>Featured signals</h2>
            <span class="queue-count"><strong id="featuredCount">0</strong> picks</span>
          </div>
          <p class="helper-copy">A short curated lane while the live directory loads.</p>
          <div class="featured-list" id="featuredList"></div>
        </section>
      </aside>

      <section class="map-panel">
        <div class="map-head">
          <div>
            <span class="eyebrow">Signal map</span>
            <h2 id="mapTitle">Global radio field</h2>
            <p class="map-summary" id="mapSummary">Browse by city, country, or genre. The map will keep the living directory in sync with your filters.</p>
          </div>
          <div class="map-stats">
            <div class="mini-stat">
              <span class="kicker">Stations</span>
              <strong id="stationCount">0</strong>
            </div>
            <div class="mini-stat">
              <span class="kicker">Countries</span>
              <strong id="countryCount">0</strong>
            </div>
            <div class="mini-stat">
              <span class="kicker">Mode</span>
              <strong id="modeLabel">Preview</strong>
            </div>
          </div>
        </div>
        <div class="map-stage">
          <div id="map"></div>
          <div class="map-overlay">
            <p id="statusMessage">Exploring a curated preview while the live directory loads.</p>
            <div class="map-overlay-hints" aria-hidden="true">
              <span>Tap markers</span>
              <span>Search by location</span>
              <span>Clustered map</span>
            </div>
          </div>
        </div>
      </section>

      <aside class="rail rail-right">
        <section class="panel now-playing-panel">
          <div class="panel-header">
            <h2>Now playing</h2>
            <span class="tiny-badge" id="liveBadge">Preview</span>
          </div>
          <div class="now-playing-card">
            <div class="now-playing-art" id="nowPlayingArt">W</div>
            <div>
              <h3 id="nowPlayingTitle">Nothing selected</h3>
              <p id="nowPlayingMeta">Choose a station from the list or the map.</p>
            </div>
          </div>
          <div class="player-controls">
            <div class="control-row">
              <button class="play-toggle" id="playPauseBtn" type="button">Play</button>
              <button class="secondary-button" id="focusMapButton" type="button">Focus map</button>
              <button class="secondary-button spatial-audio-toggle" id="spatialAudioToggle" type="button">Spatial audio: Off</button>
              <button class="secondary-button sound-toggle" id="uiSoundToggle" type="button" aria-pressed="false">UI sounds: Off</button>
              <button class="secondary-button sound-profile-toggle" id="uiSoundProfileToggle" type="button">Sound profile: Soft</button>
            </div>
            <div class="volume-wrap">
              <label for="volumeSlider">Volume</label>
              <input id="volumeSlider" class="volume-slider" type="range" min="0" max="100" value="70" aria-label="Volume level">
            </div>
            <div class="track-stats" id="trackStats">Select a station to start listening.</div>
          </div>
        </section>

        <section class="panel station-panel">
          <div class="panel-header">
            <h2>Station index</h2>
            <button class="load-more-button" id="loadMoreBtn" type="button">Load more</button>
          </div>
          <div class="queue-tools">
            <span class="queue-count"><strong id="visibleCount">0</strong> visible</span>
            <span class="queue-count"><strong id="modeBadge">Preview</strong></span>
          </div>
          <div class="station-list" id="stationList"></div>
        </section>
      </aside>
    </main>
  </div>

  <div class="toast" id="toast" role="status" aria-live="polite"></div>
  <audio id="playerAudio" crossorigin="anonymous" preload="none"></audio>
`;

const refs = {
  app,
  statusChip: document.querySelector('#statusChip'),
  refreshStations: document.querySelector('#refreshStations'),
  clearFilters: document.querySelector('#clearFilters'),
  searchInput: document.querySelector('#searchInput'),
  nearMeButton: document.querySelector('#nearMeButton'),
  shuffleFeatured: document.querySelector('#shuffleFeatured'),
  filterChips: document.querySelector('#filterChips'),
  regionChips: document.querySelector('#regionChips'),
  styleChips: document.querySelector('#styleChips'),
  featuredList: document.querySelector('#featuredList'),
  featuredCount: document.querySelector('#featuredCount'),
  stationCount: document.querySelector('#stationCount'),
  countryCount: document.querySelector('#countryCount'),
  modeLabel: document.querySelector('#modeLabel'),
  mapTitle: document.querySelector('#mapTitle'),
  mapSummary: document.querySelector('#mapSummary'),
  statusMessage: document.querySelector('#statusMessage'),
  liveBadge: document.querySelector('#liveBadge'),
  nowPlayingArt: document.querySelector('#nowPlayingArt'),
  nowPlayingTitle: document.querySelector('#nowPlayingTitle'),
  nowPlayingMeta: document.querySelector('#nowPlayingMeta'),
  playPauseBtn: document.querySelector('#playPauseBtn'),
  focusMapButton: document.querySelector('#focusMapButton'),
  spatialAudioToggle: document.querySelector('#spatialAudioToggle'),
  uiSoundToggle: document.querySelector('#uiSoundToggle'),
  uiSoundProfileToggle: document.querySelector('#uiSoundProfileToggle'),
  volumeSlider: document.querySelector('#volumeSlider'),
  trackStats: document.querySelector('#trackStats'),
  loadMoreBtn: document.querySelector('#loadMoreBtn'),
  stationList: document.querySelector('#stationList'),
  visibleCount: document.querySelector('#visibleCount'),
  modeBadge: document.querySelector('#modeBadge'),
  toast: document.querySelector('#toast'),
  audio: document.querySelector('#playerAudio'),
  map: document.querySelector('#map')
};

const state = {
  mode: 'preview',
  activeFilter: 'all',
  activeRegion: 'world',
  activeStyle: 'paper',
  query: '',
  visibleCount: 18,
  selectedId: '',
  isPlaying: false,
  userLocation: null,
  allStations: fallbackStations.slice(),
  featuredStations: fallbackStations.slice(0, 6),
  filteredStations: fallbackStations.slice(),
  liveCacheUpdatedAt: null,
  spatialAudioMode: 'off',
  spatialAudioReady: false,
  uiSoundsEnabled: false,
  uiSoundProfile: 'soft',
  hasUserInteracted: false,
  lastUiSoundAt: 0,
  renderToken: 0,
  markerToken: 0,
  stationLayers: new Map(),
  baseLayers: {}
};

const FILTER_KEYS = new Set(filterGroups.map((group) => group.key));
const REGION_KEYS = new Set(Object.keys(regionBounds));
const HASH_ALIASES = {
  electronic: 'ambient',
  top: 'all'
};

const DEFAULT_SEO = {
  title: 'World Radio Atlas | Live Radio Stations on a Global Map',
  description: 'Discover live radio stations from around the world on an interactive map with curated picks, filters, and instant playback.'
};

const REGION_SEO = {
  americas: {
    title: 'Americas live radio stations | World Radio Atlas',
    description: 'Browse live radio stations across North, Central, and South America on the World Radio Atlas map.'
  },
  europe: {
    title: 'Europe live radio stations | World Radio Atlas',
    description: 'Explore live radio stations from across Europe with map-based browsing and quick access to curated picks.'
  },
  asia: {
    title: 'Asia live radio stations | World Radio Atlas',
    description: 'Find live radio stations from across Asia on a fast, map-first discovery page.'
  },
  africa: {
    title: 'Africa live radio stations | World Radio Atlas',
    description: 'Discover live radio stations from across Africa with filters for music, news, and talk.'
  },
  oceania: {
    title: 'Oceania live radio stations | World Radio Atlas',
    description: 'Browse live radio stations from Australia, New Zealand, and the wider Oceania region.'
  }
};

const FILTER_SEO = {
  music: {
    title: 'Music radio stations | World Radio Atlas',
    description: 'Browse live music radio stations from around the world with curated map-based discovery.'
  },
  news: {
    title: 'News radio stations | World Radio Atlas',
    description: 'Explore live news and talk radio stations from around the world on a global map.'
  },
  talk: {
    title: 'Talk radio stations | World Radio Atlas',
    description: 'Find live talk radio stations, interviews, and conversation-led streams across the world.'
  },
  ambient: {
    title: 'Ambient radio stations | World Radio Atlas',
    description: 'Discover ambient, chill, and lo-fi radio stations curated for slower listening.'
  }
};

if ('serviceWorker' in navigator) {
  // Clean up legacy registration so old cache-first behavior cannot keep stale bundles alive.
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
        });
      })
      .catch(() => {
        // Ignore cleanup failures.
      });
  }, { once: true });
}

const audio = refs.audio;
audio.volume = 0.7;

let map;
let clusterLayer;
let uiAudioContext;
let uiMasterGain;
let uiToneFilter;
let uiToneCompressor;
let streamAudioContext;
let streamSourceNode;
let streamDryGain;
let streamWetGain;
let streamWetFilter;
let streamConvolver;
let streamTapDelayA;
let streamTapDelayB;
let streamTapGainA;
let streamTapGainB;
let streamTapPanA;
let streamTapPanB;

function makeStationId(station) {
  return station.id || station.stationuuid || `${station.name}-${station.country}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function normalizeStation(item) {
  const lat = Number(item.geo_lat ?? item.lat);
  const lng = Number(item.geo_long ?? item.lng ?? item.lon);
  const url = item.url_resolved || item.url || item.stream || '';
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !url) {
    return null;
  }

  const name = item.name || item.station_name || 'Untitled signal';
  return {
    id: makeStationId(item),
    name,
    country: item.country || 'Unknown',
    city: item.city || item.state || '',
    state: item.state || '',
    tags: item.tags || '',
    votes: Number(item.votes) || 0,
    lat,
    lng,
    url,
    favicon: item.favicon || '',
    source: item.source || 'live'
  };
}

function sanitizeStations(items) {
  if (!Array.isArray(items)) return [];

  const seen = new Set();
  return items
    .map(normalizeStation)
    .filter((station) => station && station.name && station.url)
    .filter((station) => station.lat >= -90 && station.lat <= 90 && station.lng >= -180 && station.lng <= 180)
    .filter((station) => {
      if (seen.has(station.id)) return false;
      seen.add(station.id);
      return true;
    });
}

function readCachedLiveStations() {
  if (!('localStorage' in window)) return null;

  try {
    const raw = window.localStorage.getItem(LIVE_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const stations = sanitizeStations(parsed?.stations || []);
    if (!stations.length) return null;

    const cachedAt = Number(parsed?.cachedAt);

    return {
      stations,
      cachedAt: Number.isFinite(cachedAt) && cachedAt > 0 ? cachedAt : Date.now()
    };
  } catch (error) {
    console.warn('Could not read local cache.', error);
    return null;
  }
}

function writeCachedLiveStations(stations, cachedAt = Date.now()) {
  if (!('localStorage' in window)) return;

  try {
    window.localStorage.setItem(LIVE_CACHE_KEY, JSON.stringify({
      cachedAt,
      stations
    }));
  } catch (error) {
    console.warn('Could not write local cache.', error);
  }

  return cachedAt;
}

function shouldRefreshLiveCache(cacheEntry) {
  if (!cacheEntry?.cachedAt) return true;
  return (Date.now() - cacheEntry.cachedAt) >= LIVE_CACHE_TTL_MS;
}

function readUiSoundPreference() {
  if (!('localStorage' in window)) return false;

  try {
    return window.localStorage.getItem(UI_SOUND_PREF_KEY) === 'on';
  } catch {
    return false;
  }
}

function writeUiSoundPreference(enabled) {
  if (!('localStorage' in window)) return;

  try {
    window.localStorage.setItem(UI_SOUND_PREF_KEY, enabled ? 'on' : 'off');
  } catch {
    // Ignore preference write failures.
  }
}

function readUiSoundProfilePreference() {
  if (!('localStorage' in window)) return 'soft';

  try {
    const raw = window.localStorage.getItem(UI_SOUND_PROFILE_PREF_KEY);
    return UI_SOUND_PROFILES[raw] ? raw : 'soft';
  } catch {
    return 'soft';
  }
}

function writeUiSoundProfilePreference(profile) {
  if (!('localStorage' in window)) return;

  if (!UI_SOUND_PROFILES[profile]) return;

  try {
    window.localStorage.setItem(UI_SOUND_PROFILE_PREF_KEY, profile);
  } catch {
    // Ignore preference write failures.
  }
}

function readSpatialAudioPreference() {
  if (!('localStorage' in window)) return 'off';

  try {
    const value = window.localStorage.getItem(SPATIAL_AUDIO_PREF_KEY);
    return SPATIAL_AUDIO_MODES.includes(value) ? value : 'off';
  } catch {
    return 'off';
  }
}

function writeSpatialAudioPreference(mode) {
  if (!('localStorage' in window)) return;
  if (!SPATIAL_AUDIO_MODES.includes(mode)) return;

  try {
    window.localStorage.setItem(SPATIAL_AUDIO_PREF_KEY, mode);
  } catch {
    // Ignore preference write failures.
  }
}

function getUiSoundProfile() {
  return UI_SOUND_PROFILES[state.uiSoundProfile] || UI_SOUND_PROFILES.soft;
}

function syncUiSoundToggle() {
  if (!refs.uiSoundToggle) return;

  refs.uiSoundToggle.textContent = state.uiSoundsEnabled ? 'UI sounds: On' : 'UI sounds: Off';
  refs.uiSoundToggle.setAttribute('aria-pressed', String(state.uiSoundsEnabled));
  refs.uiSoundToggle.classList.toggle('is-on', state.uiSoundsEnabled);
}

function syncUiSoundProfileToggle() {
  if (!refs.uiSoundProfileToggle) return;

  const activeProfile = getUiSoundProfile();
  refs.uiSoundProfileToggle.textContent = `Sound profile: ${activeProfile.label}`;
  refs.uiSoundProfileToggle.classList.toggle('is-arcade', state.uiSoundProfile === 'arcade');
}

function syncSpatialAudioToggle() {
  if (!refs.spatialAudioToggle) return;

  const label = SPATIAL_AUDIO_LABELS[state.spatialAudioMode] || SPATIAL_AUDIO_LABELS.off;
  refs.spatialAudioToggle.textContent = `Spatial audio: ${label}`;
  refs.spatialAudioToggle.classList.toggle('is-on', state.spatialAudioMode !== 'off');
  refs.spatialAudioToggle.classList.toggle('is-360', state.spatialAudioMode === 'field360');
}

function markUserInteraction() {
  if (state.hasUserInteracted) return;

  state.hasUserInteracted = true;
}

function getUiAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!uiAudioContext) {
    uiAudioContext = new AudioContextClass();
  }

  if (!uiMasterGain || uiMasterGain.context !== uiAudioContext) {
    uiToneFilter = uiAudioContext.createBiquadFilter();
    uiToneFilter.type = 'lowpass';
    uiToneFilter.frequency.value = 2800;
    uiToneFilter.Q.value = 0.24;

    uiToneCompressor = uiAudioContext.createDynamicsCompressor();
    uiToneCompressor.threshold.value = -28;
    uiToneCompressor.knee.value = 16;
    uiToneCompressor.ratio.value = 2.2;
    uiToneCompressor.attack.value = 0.003;
    uiToneCompressor.release.value = 0.12;

    uiMasterGain = uiAudioContext.createGain();
    // Keep UI sounds subtle and separate from stream volume.
    uiMasterGain.gain.value = UI_SOUND_VOLUME;

    uiToneFilter.connect(uiToneCompressor);
    uiToneCompressor.connect(uiMasterGain);
    uiMasterGain.connect(uiAudioContext.destination);
  }

  return uiAudioContext;
}

function withUiAudioContext(callback) {
  const context = getUiAudioContext();
  if (!context) return;

  if (context.state === 'suspended') {
    context.resume()
      .then(() => {
        callback(context);
      })
      .catch(() => {
        // Ignore resume failures.
      });
    return;
  }

  callback(context);
}

function reserveUiSoundSlot(minInterval = UI_SOUND_COOLDOWN_MS) {
  if (!state.uiSoundsEnabled || !state.hasUserInteracted) return false;

  const now = performance.now();
  if (now - state.lastUiSoundAt < minInterval) return false;
  state.lastUiSoundAt = now;
  return true;
}

function createSpatialImpulseResponse(context, duration = 1.25, decay = 2.4) {
  const sampleRate = context.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const impulse = context.createBuffer(2, length, sampleRate);

  for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let index = 0; index < length; index += 1) {
      const envelope = (1 - (index / length)) ** decay;
      data[index] = (Math.random() * 2 - 1) * envelope * 0.36;
    }
  }

  return impulse;
}

function createStereoPanNode(context, panValue) {
  if (typeof context.createStereoPanner === 'function') {
    const panner = context.createStereoPanner();
    panner.pan.value = panValue;
    return panner;
  }

  return context.createGain();
}

function smoothAudioParam(param, value, ramp = 0.05) {
  const now = param.context.currentTime;
  const currentValue = Number.isFinite(param.value) ? param.value : value;
  param.cancelScheduledValues(now);
  param.setValueAtTime(currentValue, now);
  param.linearRampToValueAtTime(value, now + ramp);
}

function setSpatialPan(node, value) {
  if (!node?.pan) return;
  node.pan.setValueAtTime(value, node.context.currentTime);
}

function applySpatialAudioMode(mode) {
  if (!state.spatialAudioReady || !streamAudioContext || !streamDryGain || !streamWetGain) {
    return;
  }

  switch (mode) {
    case 'immersive':
      smoothAudioParam(streamDryGain.gain, 0.86, 0.06);
      smoothAudioParam(streamWetGain.gain, 0.24, 0.06);
      smoothAudioParam(streamTapGainA.gain, 0.12, 0.06);
      smoothAudioParam(streamTapGainB.gain, 0.14, 0.06);
      smoothAudioParam(streamWetFilter.frequency, 4400, 0.08);
      streamTapDelayA.delayTime.setValueAtTime(0.015, streamAudioContext.currentTime);
      streamTapDelayB.delayTime.setValueAtTime(0.022, streamAudioContext.currentTime);
      setSpatialPan(streamTapPanA, -0.5);
      setSpatialPan(streamTapPanB, 0.5);
      break;
    case 'field360':
      smoothAudioParam(streamDryGain.gain, 0.74, 0.06);
      smoothAudioParam(streamWetGain.gain, 0.34, 0.06);
      smoothAudioParam(streamTapGainA.gain, 0.2, 0.06);
      smoothAudioParam(streamTapGainB.gain, 0.22, 0.06);
      smoothAudioParam(streamWetFilter.frequency, 3600, 0.08);
      streamTapDelayA.delayTime.setValueAtTime(0.019, streamAudioContext.currentTime);
      streamTapDelayB.delayTime.setValueAtTime(0.028, streamAudioContext.currentTime);
      setSpatialPan(streamTapPanA, -0.78);
      setSpatialPan(streamTapPanB, 0.78);
      break;
    default:
      smoothAudioParam(streamDryGain.gain, 1, 0.05);
      smoothAudioParam(streamWetGain.gain, 0, 0.05);
      smoothAudioParam(streamTapGainA.gain, 0, 0.05);
      smoothAudioParam(streamTapGainB.gain, 0, 0.05);
      smoothAudioParam(streamWetFilter.frequency, 5200, 0.06);
      streamTapDelayA.delayTime.setValueAtTime(0.015, streamAudioContext.currentTime);
      streamTapDelayB.delayTime.setValueAtTime(0.022, streamAudioContext.currentTime);
      setSpatialPan(streamTapPanA, -0.5);
      setSpatialPan(streamTapPanB, 0.5);
  }
}

function ensureSpatialAudioGraph() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return false;

  try {
    if (!streamAudioContext) {
      streamAudioContext = new AudioContextClass();
    }

    if (!streamSourceNode) {
      streamSourceNode = streamAudioContext.createMediaElementSource(audio);
    }

    if (!state.spatialAudioReady) {
      streamDryGain = streamAudioContext.createGain();
      streamWetGain = streamAudioContext.createGain();
      streamWetFilter = streamAudioContext.createBiquadFilter();
      streamConvolver = streamAudioContext.createConvolver();
      streamTapDelayA = streamAudioContext.createDelay(0.08);
      streamTapDelayB = streamAudioContext.createDelay(0.08);
      streamTapGainA = streamAudioContext.createGain();
      streamTapGainB = streamAudioContext.createGain();
      streamTapPanA = createStereoPanNode(streamAudioContext, -0.5);
      streamTapPanB = createStereoPanNode(streamAudioContext, 0.5);

      streamWetFilter.type = 'lowpass';
      streamWetFilter.frequency.value = 5200;
      streamWetFilter.Q.value = 0.62;

      streamConvolver.normalize = true;
      streamConvolver.buffer = createSpatialImpulseResponse(streamAudioContext);

      streamTapDelayA.delayTime.value = 0.015;
      streamTapDelayB.delayTime.value = 0.022;

      streamTapGainA.gain.value = 0;
      streamTapGainB.gain.value = 0;
      streamWetGain.gain.value = 0;
      streamDryGain.gain.value = 1;

      streamSourceNode.connect(streamDryGain);
      streamDryGain.connect(streamAudioContext.destination);

      streamSourceNode.connect(streamWetFilter);
      streamWetFilter.connect(streamConvolver);
      streamConvolver.connect(streamWetGain);

      streamSourceNode.connect(streamTapDelayA);
      streamTapDelayA.connect(streamTapPanA);
      streamTapPanA.connect(streamTapGainA);
      streamTapGainA.connect(streamWetGain);

      streamSourceNode.connect(streamTapDelayB);
      streamTapDelayB.connect(streamTapPanB);
      streamTapPanB.connect(streamTapGainB);
      streamTapGainB.connect(streamWetGain);

      streamWetGain.connect(streamAudioContext.destination);
      state.spatialAudioReady = true;
      applySpatialAudioMode(state.spatialAudioMode);
    }

    if (streamAudioContext.state === 'suspended') {
      streamAudioContext.resume().catch(() => {
        // Ignore resume failures.
      });
    }

    return true;
  } catch (error) {
    console.warn('Spatial audio graph could not be initialized.', error);
    return false;
  }
}

function activateSpatialAudioMode(mode = state.spatialAudioMode) {
  if (mode === 'off') {
    applySpatialAudioMode('off');
    return true;
  }

  const spatialReady = ensureSpatialAudioGraph();
  if (!spatialReady) return false;

  applySpatialAudioMode(mode);
  return true;
}

function scheduleSpatialAudioRetry(mode = state.spatialAudioMode) {
  let resolved = false;

  const retry = () => {
    if (resolved) return;
    if (state.spatialAudioMode !== mode || mode === 'off') {
      resolved = true;
      return;
    }

    if (activateSpatialAudioMode(mode)) {
      resolved = true;
    }
  };

  window.setTimeout(retry, SPATIAL_AUDIO_RETRY_DELAY_MS);
  audio.addEventListener('playing', retry, { once: true });
}

function scheduleUiTone(context, startTime, {
  frequency,
  endFrequency,
  type = 'sine',
  peak = 0.3,
  attack = 0.005,
  hold = 0.02,
  release = 0.055
}) {
  if (!uiToneFilter || !uiMasterGain) return;

  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  const startFrequency = Math.max(1, Number(frequency) || 440);
  const glideFrequency = Math.max(1, Number(endFrequency ?? startFrequency));
  const toneDuration = attack + hold + release;
  const peakGain = Math.max(0.0001, peak);

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(startFrequency, startTime);
  if (glideFrequency !== startFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(glideFrequency, startTime + toneDuration);
  }

  gainNode.gain.setValueAtTime(0.0001, startTime);
  gainNode.gain.exponentialRampToValueAtTime(peakGain, startTime + attack);
  gainNode.gain.setValueAtTime(peakGain, startTime + attack + hold);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + attack + hold + release);

  oscillator.connect(gainNode);
  gainNode.connect(uiToneFilter);
  oscillator.start(startTime);
  oscillator.stop(startTime + toneDuration + 0.01);
}

function playUiClickCue() {
  const profile = getUiSoundProfile();
  if (!reserveUiSoundSlot(90)) return;

  withUiAudioContext((context) => {
    const start = context.currentTime + 0.002;
    profile.click.forEach((tone) => {
      const { offset = 0, ...config } = tone;
      scheduleUiTone(context, start + offset, config);
    });
  });
}

function playUiSuccessCue() {
  const profile = getUiSoundProfile();
  if (!reserveUiSoundSlot(260)) return;

  withUiAudioContext((context) => {
    const start = context.currentTime + 0.002;
    profile.success.forEach((tone) => {
      const { offset = 0, ...config } = tone;
      scheduleUiTone(context, start + offset, config);
    });
  });
}

function playUiErrorCue() {
  const profile = getUiSoundProfile();
  if (!reserveUiSoundSlot(260)) return;

  withUiAudioContext((context) => {
    const start = context.currentTime + 0.002;
    profile.error.forEach((tone) => {
      const { offset = 0, ...config } = tone;
      scheduleUiTone(context, start + offset, config);
    });
  });
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function formatCacheUpdatedAt(timestamp) {
  if (!Number.isFinite(timestamp)) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

function updateSeoMetadata({ title, description }) {
  const metaDescription = document.querySelector('meta[name="description"]');
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDescription = document.querySelector('meta[property="og:description"]');
  const twitterTitle = document.querySelector('meta[name="twitter:title"]');
  const twitterDescription = document.querySelector('meta[name="twitter:description"]');

  document.title = title || DEFAULT_SEO.title;
  if (metaDescription) metaDescription.content = description || DEFAULT_SEO.description;
  if (ogTitle) ogTitle.content = title || DEFAULT_SEO.title;
  if (ogDescription) ogDescription.content = description || DEFAULT_SEO.description;
  if (twitterTitle) twitterTitle.content = title || DEFAULT_SEO.title;
  if (twitterDescription) twitterDescription.content = description || DEFAULT_SEO.description;
}

function getSeoMetadata() {
  if (state.selectedId) {
    const station = getSelectedStation();
    if (station) {
      return {
        title: `${station.name} | World Radio Atlas`,
        description: `Listen to ${station.name} from ${station.country}${station.city ? `, ${station.city}` : ''} on World Radio Atlas.`
      };
    }
  }

  if (state.activeFilter !== 'all' && state.activeFilter !== 'nearby' && FILTER_SEO[state.activeFilter]) {
    return FILTER_SEO[state.activeFilter];
  }

  if (state.activeRegion !== 'world' && REGION_SEO[state.activeRegion]) {
    return REGION_SEO[state.activeRegion];
  }

  if (state.query) {
    return {
      title: `Search results for "${state.query}" | World Radio Atlas`,
      description: `Browse live radio stations matching ${state.query} on the World Radio Atlas map.`
    };
  }

  return DEFAULT_SEO;
}

function syncSeoMetadata() {
  updateSeoMetadata(getSeoMetadata());
}

function updateStatusChip() {
  if (!refs.statusChip) return;

  if (state.mode !== 'live') {
    refs.statusChip.textContent = 'Curated preview';
    return;
  }

  const formatted = formatCacheUpdatedAt(state.liveCacheUpdatedAt);
  refs.statusChip.textContent = formatted
    ? `Live directory · Updated ${formatted}`
    : 'Live directory';
}

async function getLiveStationsWithRetry() {
  const stations = await getLiveStations();
  if (stations.length) return stations;

  await wait(LIVE_REFRESH_RETRY_DELAY_MS);
  return getLiveStations();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]+/g, (character) => {
    switch (character) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      default: return character;
    }
  });
}

function formatTags(rawTags, maxLength = 96) {
  if (!rawTags) return 'No tags';
  const normalized = String(rawTags)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8)
    .join(', ');

  if (!normalized) return 'No tags';
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trim()}...`;
}

function getHashSelection(hashValue = window.location.hash) {
  const rawValue = String(hashValue || '').replace(/^#/, '').trim();
  if (!rawValue) return null;

  let normalized = rawValue.toLowerCase();
  try {
    normalized = decodeURIComponent(rawValue).toLowerCase();
  } catch {
    // Keep the normalized raw value when decoding fails.
  }

  const key = HASH_ALIASES[normalized] || normalized;
  if (FILTER_KEYS.has(key)) {
    return { type: 'filter', key };
  }

  if (REGION_KEYS.has(key)) {
    return { type: 'region', key };
  }

  return null;
}

function applyHashSelection(hashValue = window.location.hash) {
  const selection = getHashSelection(hashValue);
  if (!selection) return false;

  state.visibleCount = 18;

  if (selection.type === 'filter') {
    state.activeFilter = selection.key;
    state.activeRegion = 'world';

    if (selection.key === 'nearby') {
      renderFilterChips();
      renderRegionChips();
      applyNearbyFilter();
      return true;
    }

    applyFilters();
    jumpToRegion('world');
    return true;
  }

  state.activeFilter = 'all';
  state.activeRegion = selection.key;
  applyFilters();
  jumpToRegion(selection.key);
  return true;
}

function setStatus(message, tone = 'neutral') {
  if (refs.statusMessage) {
    refs.statusMessage.textContent = message;
  }
  if (refs.mapSummary && tone === 'live') {
    refs.mapSummary.textContent = 'The live directory is active. Search, filter, and jump around the atlas to discover stations.';
  }
  if (refs.mapSummary && tone === 'empty') {
    refs.mapSummary.textContent = 'No stations matched this view. Try broadening your query or changing region and genre filters.';
  }
  if (refs.mapSummary && tone === 'preview') {
    refs.mapSummary.textContent = 'Curated fallback stations are active while live data is loading or unavailable.';
  }
}

function setMode(mode, message) {
  state.mode = mode;
  refs.modeLabel.textContent = mode === 'live' ? 'Live' : 'Preview';
  refs.modeBadge.textContent = mode === 'live' ? 'Live' : 'Preview';
  refs.liveBadge.textContent = mode === 'live' ? 'Live' : 'Preview';
  updateStatusChip();
  setStatus(message, mode);
  updateStats();
  syncSeoMetadata();
}

function updateStats() {
  const stations = state.filteredStations;
  const countries = new Set(stations.map((station) => station.country).filter(Boolean));
  refs.stationCount.textContent = stations.length.toLocaleString();
  refs.countryCount.textContent = countries.size.toLocaleString();
  refs.featuredCount.textContent = state.featuredStations.length.toLocaleString();
  refs.visibleCount.textContent = Math.min(state.visibleCount, stations.length).toLocaleString();
}

function applyLiveDirectory(stations, modeMessage, cacheUpdatedAt = Date.now()) {
  state.liveCacheUpdatedAt = cacheUpdatedAt;
  state.allStations = stations;
  state.featuredStations = stations.slice().sort((a, b) => (b.votes || 0) - (a.votes || 0)).slice(0, 6);
  state.visibleCount = 18;
  setMode('live', modeMessage);

  if (state.activeFilter === 'nearby') {
    applyNearbyFilter();
    return;
  }

  applyFilters();
}

function getStationMatches(station) {
  const haystack = [station.name, station.country, station.city, station.state, station.tags].join(' ').toLowerCase();
  const queryMatch = !state.query || haystack.includes(state.query.toLowerCase());

  let filterMatch = true;
  switch (state.activeFilter) {
    case 'music':
      filterMatch = /music|pop|rock|indie|jazz|electronic|house|dance|alt|alternative|classical/.test(station.tags.toLowerCase());
      break;
    case 'news':
      filterMatch = /news|world|business|talk|current|information/.test(station.tags.toLowerCase());
      break;
    case 'talk':
      filterMatch = /talk|culture|speech|interview|debate|podcast/.test(station.tags.toLowerCase());
      break;
    case 'ambient':
      filterMatch = /ambient|chill|lounge|lofi|downtempo|jazz|instrumental/.test(station.tags.toLowerCase());
      break;
    case 'nearby':
      filterMatch = true;
      break;
    default:
      filterMatch = true;
  }

  return queryMatch && filterMatch;
}

function filterByRegion(station) {
  if (state.activeRegion === 'world') return true;

  const bounds = regionBounds[state.activeRegion];
  if (!bounds || !bounds.bounds) return true;
  const [[south, west], [north, east]] = bounds.bounds;
  return station.lat >= south && station.lat <= north && station.lng >= west && station.lng <= east;
}

function applyFilters() {
  const source = state.allStations.slice();
  const matches = source.filter((station) => getStationMatches(station) && filterByRegion(station));
  state.filteredStations = matches;
  state.visibleCount = Math.min(18, matches.length || 18);
  refs.loadMoreBtn.disabled = matches.length <= state.visibleCount;

  if (!matches.length) {
    refs.mapTitle.textContent = 'No stations found';
    setStatus('No stations matched your current search and filters.', 'empty');
  } else if (state.query) {
    refs.mapTitle.textContent = `Results for "${state.query}"`;
    setStatus(`${matches.length.toLocaleString()} stations matched your search.`, state.mode);
  } else {
    refs.mapTitle.textContent = 'Global radio field';
    setStatus(`${matches.length.toLocaleString()} stations available in this view.`, state.mode);
  }

  renderAll();
}

function renderFilterChips() {
  refs.filterChips.innerHTML = filterGroups.map((group) => `
    <button class="filter-button ${state.activeFilter === group.key ? 'active' : ''}" data-filter="${group.key}" type="button">${group.label}</button>
  `).join('');
}

function renderRegionChips() {
  const regions = [
    { key: 'world', label: 'World' },
    { key: 'americas', label: 'Americas' },
    { key: 'europe', label: 'Europe' },
    { key: 'asia', label: 'Asia' },
    { key: 'africa', label: 'Africa' },
    { key: 'oceania', label: 'Oceania' }
  ];

  refs.regionChips.innerHTML = regions.map((region) => `
    <button class="segment-button ${state.activeRegion === region.key ? 'active' : ''}" data-region="${region.key}" type="button">${region.label}</button>
  `).join('');
}

function renderStyleChips() {
  refs.styleChips.innerHTML = Object.entries(mapStyles).map(([key, style]) => `
    <button class="segment-button ${state.activeStyle === key ? 'active' : ''}" data-style="${key}" type="button">${style.label}</button>
  `).join('');
}

function renderFeaturedStations() {
  const pool = state.featuredStations.slice().sort((a, b) => (b.votes || 0) - (a.votes || 0)).slice(0, 6);
  refs.featuredList.innerHTML = '';

  pool.forEach((station, index) => {
    const item = document.createElement('article');
    item.className = `featured-item ${state.selectedId === station.id ? 'is-active' : ''}`;
    item.dataset.id = station.id;
    const formattedTags = formatTags(station.tags, 88);
    item.innerHTML = `
      <button class="featured-button" type="button" data-play-id="${station.id}">
        <div class="station-card-head">
          <h3 class="featured-name">${escapeHtml(station.name)}</h3>
          <span class="tiny-badge">${String(index + 1).padStart(2, '0')}</span>
        </div>
        <div class="featured-country">${escapeHtml(station.country)} ${station.city ? `· ${escapeHtml(station.city)}` : ''}</div>
        <div class="featured-tags">${escapeHtml(formattedTags)} · ${station.votes.toLocaleString()} votes</div>
      </button>
    `;
    refs.featuredList.appendChild(item);
  });
}

function renderStationList() {
  const visibleStations = state.filteredStations.slice(0, state.visibleCount);

  if (!visibleStations.length) {
    refs.stationList.innerHTML = `
      <article class="station-empty">
        <h3>No stations in this view</h3>
        <p>Try clearing filters, switching region, or searching with a broader keyword.</p>
      </article>
    `;
    refs.visibleCount.textContent = '0';
    refs.loadMoreBtn.disabled = true;
    refs.loadMoreBtn.hidden = true;
    return;
  }

  refs.stationList.innerHTML = visibleStations.map((station) => {
    const formattedTags = formatTags(station.tags, 84);
    return `
    <article class="station-item ${state.selectedId === station.id ? 'is-active' : ''}" data-id="${station.id}">
      <button class="station-button" type="button" data-play-id="${station.id}">
        <h3 class="station-name">${escapeHtml(station.name)}</h3>
        <div class="station-location">${escapeHtml(station.country)}${station.city ? ` · ${escapeHtml(station.city)}` : ''}</div>
        <div class="station-tags">${escapeHtml(formattedTags)}${station.votes ? ` · ${station.votes.toLocaleString()} votes` : ''}</div>
      </button>
    </article>
  `;
  }).join('');

  refs.visibleCount.textContent = Math.min(state.visibleCount, state.filteredStations.length).toLocaleString();
  refs.loadMoreBtn.disabled = state.visibleCount >= state.filteredStations.length;
  refs.loadMoreBtn.hidden = state.visibleCount >= state.filteredStations.length;
}

function renderMapMarkers() {
  if (!clusterLayer) return;
  const token = ++state.markerToken;
  clusterLayer.clearLayers();
  state.stationLayers.clear();

  const markers = state.filteredStations.map((station) => {
    const formattedTags = formatTags(station.tags, 86);
    const icon = L.divIcon({
      className: '',
      html: `<span class="signal-marker ${state.selectedId === station.id ? 'is-selected' : ''}"></span>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });

    const marker = L.marker([station.lat, station.lng], { icon, title: station.name });
    const popupHtml = `
      <div class="popup-card">
        <h4>${escapeHtml(station.name)}</h4>
        <p>${escapeHtml(station.country)}${station.city ? ` · ${escapeHtml(station.city)}` : ''}</p>
        <p>${escapeHtml(formattedTags)}</p>
        <p>${station.votes ? `${station.votes.toLocaleString()} votes` : 'Live radio station'}</p>
        <button class="primary-button" type="button" data-popup-play="${station.id}">Play this station</button>
      </div>
    `;

    marker.bindPopup(popupHtml, { maxWidth: 260, className: 'atlas-popup' });
    marker.on('click', () => playStation(station));
    marker.on('popupopen', (event) => {
      const popupButton = event.popup.getElement()?.querySelector('[data-popup-play]');
      if (popupButton) {
        popupButton.addEventListener('click', () => playStation(station));
      }
    });
    state.stationLayers.set(station.id, marker);
    return marker;
  });

  if (token === state.markerToken) {
    clusterLayer.addLayers(markers);
  }
}

function updateActiveCardStyles() {
  document.querySelectorAll('.station-item, .featured-item').forEach((item) => {
    const isActive = item.dataset.id === state.selectedId;
    item.classList.toggle('is-active', isActive);
  });

  state.stationLayers.forEach((marker, stationId) => {
    const element = marker.getElement();
    if (!element) return;
    const markerNode = element.querySelector('.signal-marker');
    if (markerNode) {
      markerNode.classList.toggle('is-selected', stationId === state.selectedId);
    }
  });
}

function renderAll() {
  renderFilterChips();
  renderRegionChips();
  renderStyleChips();
  renderFeaturedStations();
  renderStationList();
  renderMapMarkers();
  updateStats();
  updateActiveCardStyles();
  syncSeoMetadata();
}

function showToast(message) {
  refs.toast.textContent = message;
  refs.toast.classList.add('is-visible');
  window.clearTimeout(showToast._timer);
  showToast._timer = window.setTimeout(() => {
    refs.toast.classList.remove('is-visible');
  }, 2600);
}

function applyTileAltText(tileImage) {
  if (!(tileImage instanceof HTMLImageElement)) return;
  tileImage.alt = MAP_TILE_ALT_TEXT;
}

function enforceTileAltTextOnLayer(tileLayer) {
  tileLayer.on('tileloadstart', (event) => {
    applyTileAltText(event.tile);
  });

  tileLayer.on('tileload', (event) => {
    applyTileAltText(event.tile);
  });
}

function sweepMapTileAltText() {
  refs.map?.querySelectorAll('.leaflet-tile').forEach((tile) => {
    applyTileAltText(tile);
  });
}

function initializeMap() {
  const defaultView = regionBounds.world;
  map = L.map(refs.map, {
    zoomControl: true,
    worldCopyJump: true,
    preferCanvas: true,
    zoomSnap: 0.5,
    fadeAnimation: true,
    zoomAnimation: true,
    markerZoomAnimation: true
  }).setView(defaultView.center, defaultView.zoom);

  Object.entries(mapStyles).forEach(([key, style]) => {
    const tileLayer = L.tileLayer(style.url, style.options);
    enforceTileAltTextOnLayer(tileLayer);
    state.baseLayers[key] = tileLayer;
  });

  clusterLayer = L.markerClusterGroup({
    chunkedLoading: true,
    removeOutsideVisibleBounds: true,
    disableClusteringAtZoom: 11,
    maxClusterRadius: 56,
    iconCreateFunction(cluster) {
      return L.divIcon({
        html: `<div class="cluster-marker">${cluster.getChildCount()}</div>`,
        className: '',
        iconSize: [42, 42]
      });
    }
  });

  state.baseLayers.paper.addTo(map);
  map.addLayer(clusterLayer);
  map.on('zoomend moveend layeradd', sweepMapTileAltText);
  window.setTimeout(sweepMapTileAltText, 0);
}

function applyMapStyle(styleKey) {
  if (!state.baseLayers[styleKey] || styleKey === state.activeStyle) return;

  state.baseLayers[state.activeStyle].removeFrom(map);
  state.baseLayers[styleKey].addTo(map);
  state.activeStyle = styleKey;
  renderStyleChips();
}

function jumpToRegion(regionKey) {
  const preset = regionBounds[regionKey];
  if (!preset || !map) return;

  if (preset.bounds) {
    map.fitBounds(preset.bounds, { padding: [26, 26] });
  } else if (preset.center) {
    map.flyTo(preset.center, preset.zoom || 3, { duration: 1.05 });
  }
}

function getSelectedStation() {
  if (!state.selectedId) return null;

  return state.allStations.find((station) => station.id === state.selectedId)
    || state.filteredStations.find((station) => station.id === state.selectedId)
    || null;
}

function focusMapView() {
  if (!map) return;

  const selectedStation = getSelectedStation();
  if (selectedStation && Number.isFinite(selectedStation.lat) && Number.isFinite(selectedStation.lng)) {
    map.flyTo([selectedStation.lat, selectedStation.lng], Math.max(map.getZoom(), 5), { duration: 0.8 });
    const marker = state.stationLayers.get(selectedStation.id);
    if (marker) marker.openPopup();
  } else if (state.activeRegion && regionBounds[state.activeRegion]) {
    jumpToRegion(state.activeRegion);
  } else {
    jumpToRegion('world');
  }

  const mapPanel = refs.map?.closest('.map-panel');
  if (!mapPanel) return;

  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const rect = mapPanel.getBoundingClientRect();
  const isMostlyVisible = rect.top < viewportHeight * 0.68 && rect.bottom > viewportHeight * 0.32;

  if (!isMostlyVisible) {
    mapPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => map?.invalidateSize(), 260);
    return;
  }

  map.invalidateSize();
}

async function getLiveStations() {
  let lastError;

  for (const endpoint of API_ENDPOINTS) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), LIVE_FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(endpoint, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = await response.json();
      const stations = sanitizeStations(payload);

      if (stations.length) {
        return stations;
      }

      throw new Error('No geocoded stations returned.');
    } catch (error) {
      lastError = error;
      console.warn(`Live endpoint failed: ${endpoint}`, error);
    } finally {
      window.clearTimeout(timeout);
    }
  }

  if (lastError) {
    console.warn('All live endpoints failed. Falling back to curated preview.', lastError);
  }

  return [];
}

function matchesNearby(station) {
  return Boolean(station.lat && station.lng);
}

async function ensureUserLocation() {
  if (state.userLocation) {
    return state.userLocation;
  }

  if (!navigator.geolocation) {
    throw new Error('Geolocation is unavailable in this browser.');
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        state.userLocation = [position.coords.latitude, position.coords.longitude];
        resolve(state.userLocation);
      },
      reject,
      {
        enableHighAccuracy: false,
        maximumAge: 600000,
        timeout: 9000
      }
    );
  });
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const radius = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(a));
}

async function applyNearbyFilter() {
  try {
    const [lat, lng] = await ensureUserLocation();
    const nearby = state.allStations
      .filter(matchesNearby)
      .map((station) => ({
        station,
        distance: haversineDistance(lat, lng, station.lat, station.lng)
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 120)
      .map((item) => item.station);

    if (!nearby.length) {
      state.filteredStations = [];
      state.visibleCount = 0;
      refs.mapTitle.textContent = 'No nearby stations';
      setStatus('No nearby stations were found. Try a different filter.', 'empty');
      renderAll();
      return;
    }

    state.filteredStations = nearby;
    state.visibleCount = Math.min(18, nearby.length || 18);
    refs.mapTitle.textContent = 'Nearby stations';
    setStatus('Showing stations closest to your current location.');
    if (map) {
      map.flyTo([lat, lng], 5, { duration: 1.1 });
    }
    renderAll();
  } catch (error) {
    showToast('Location access is blocked. Showing the wider directory instead.');
    state.activeFilter = 'all';
    renderFilterChips();
    applyFilters();
  }
}

function selectStation(station, shouldAutoplay = false) {
  const formattedTags = formatTags(station.tags, 90);
  state.selectedId = station.id;
  refs.nowPlayingArt.textContent = station.name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase();
  refs.nowPlayingTitle.textContent = station.name;
  refs.nowPlayingMeta.textContent = `${station.country}${station.city ? ` · ${station.city}` : ''}`;
  refs.trackStats.textContent = `${formattedTags} · ${station.votes ? `${station.votes.toLocaleString()} votes` : 'Community station'}`;
  refs.playPauseBtn.textContent = state.isPlaying && audio.src === station.url ? 'Pause' : 'Play';
  refs.mapTitle.textContent = `${station.country} / ${station.name}`;
  updateActiveCardStyles();

  const marker = state.stationLayers.get(station.id);
  if (marker) {
    marker.openPopup();
  }

  if (map && Number.isFinite(station.lat) && Number.isFinite(station.lng)) {
    map.flyTo([station.lat, station.lng], Math.max(map.getZoom(), 5), { duration: 0.8 });
  }

  if (shouldAutoplay) {
    playStation(station);
  }

  syncSeoMetadata();
}

function playStation(station) {
  selectStation(station, false);
  audio.src = station.url;

  if (state.spatialAudioMode !== 'off') {
    const spatialReady = activateSpatialAudioMode(state.spatialAudioMode);
    if (!spatialReady) {
      scheduleSpatialAudioRetry(state.spatialAudioMode);
    }
  }

  audio.play()
    .then(() => {
      state.isPlaying = true;
      refs.playPauseBtn.textContent = 'Pause';
      refs.trackStats.textContent = `${station.tags || 'Signal ready'} · streaming now`;
      if (state.spatialAudioMode !== 'off') {
        const spatialReady = activateSpatialAudioMode(state.spatialAudioMode);
        if (!spatialReady) {
          scheduleSpatialAudioRetry(state.spatialAudioMode);
        }
      }
      playUiSuccessCue();
    })
    .catch(() => {
      state.isPlaying = false;
      refs.playPauseBtn.textContent = 'Play';
      showToast('This stream did not start. Try another station.');
      playUiErrorCue();
    });
}

function pausePlayback() {
  audio.pause();
  state.isPlaying = false;
  refs.playPauseBtn.textContent = 'Play';
}

function togglePlayback() {
  const current = getSelectedStation();
  if (!current) {
    showToast('Pick a station first.');
    return;
  }

  if (state.isPlaying) {
    pausePlayback();
    return;
  }

  playStation(current);
}

function resetFilters() {
  state.activeFilter = 'all';
  state.activeRegion = 'world';
  state.query = '';
  state.visibleCount = 18;
  refs.searchInput.value = '';
  applyFilters();
  jumpToRegion('world');
  setStatus('Filters cleared. Back to the world view.');
}

function shuffleFeatured() {
  state.featuredStations = state.featuredStations
    .slice()
    .sort(() => Math.random() - 0.5);
  renderFeaturedStations();
  showToast('Featured signals shuffled.');
}

function renderMoreStations() {
  state.visibleCount = Math.min(state.visibleCount + 18, state.filteredStations.length);
  renderStationList();
  showToast('More stations loaded.');
}

function bindEvents() {
  window.addEventListener('pointerdown', markUserInteraction, { passive: true });
  window.addEventListener('keydown', markUserInteraction, { passive: true });

  refs.uiSoundToggle.addEventListener('click', () => {
    markUserInteraction();
    state.uiSoundsEnabled = !state.uiSoundsEnabled;
    writeUiSoundPreference(state.uiSoundsEnabled);
    syncUiSoundToggle();
    showToast(state.uiSoundsEnabled ? 'UI sounds enabled.' : 'UI sounds disabled.');
  });

  refs.uiSoundProfileToggle.addEventListener('click', () => {
    markUserInteraction();
    const profileKeys = Object.keys(UI_SOUND_PROFILES);
    const currentIndex = profileKeys.indexOf(state.uiSoundProfile);
    const nextProfile = profileKeys[(currentIndex + 1) % profileKeys.length] || 'soft';
    state.uiSoundProfile = nextProfile;
    writeUiSoundProfilePreference(nextProfile);
    syncUiSoundProfileToggle();
    showToast(`Sound profile set to ${getUiSoundProfile().label}.`);
  });

  refs.spatialAudioToggle.addEventListener('click', () => {
    markUserInteraction();
    const currentIndex = SPATIAL_AUDIO_MODES.indexOf(state.spatialAudioMode);
    const nextMode = SPATIAL_AUDIO_MODES[(currentIndex + 1) % SPATIAL_AUDIO_MODES.length] || 'off';

    state.spatialAudioMode = nextMode;
    writeSpatialAudioPreference(nextMode);
    syncSpatialAudioToggle();

    if (nextMode === 'off') {
      applySpatialAudioMode('off');
      showToast(`Spatial audio set to ${SPATIAL_AUDIO_LABELS.off}.`);
      return;
    }

    const hasStreamSource = Boolean(audio.currentSrc || audio.src);
    if (!hasStreamSource) {
      showToast(`Spatial audio ${SPATIAL_AUDIO_LABELS[nextMode]} is armed. Start a station to activate.`);
      return;
    }

    const spatialReady = activateSpatialAudioMode(nextMode);
    if (spatialReady) {
      showToast(`Spatial audio set to ${SPATIAL_AUDIO_LABELS[nextMode]}.`);
      return;
    }

    showToast('Initializing spatial audio...');
    scheduleSpatialAudioRetry(nextMode);
  });

  document.addEventListener('click', (event) => {
    const targetButton = event.target.closest('button');
    if (!targetButton) return;
    playUiClickCue();
  });

  refs.refreshStations.addEventListener('click', async () => {
    const defaultLabel = 'Refresh live directory';
    const hasLiveDataInView = state.mode === 'live' && state.allStations.length > 0;
    refs.refreshStations.textContent = 'Refreshing...';
    setStatus('Refreshing the live directory...');
    refs.refreshStations.disabled = true;
    try {
      const liveStations = await getLiveStationsWithRetry();
      if (liveStations.length) {
        const cachedAt = writeCachedLiveStations(liveStations);
        state.activeFilter = 'all';
        state.activeRegion = 'world';
        applyLiveDirectory(
          liveStations,
          `Live directory loaded with ${liveStations.length.toLocaleString()} stations.`,
          cachedAt
        );
        jumpToRegion('world');
      } else if (hasLiveDataInView) {
        setStatus('Could not refresh right now. Continuing with your cached stations.', 'live');
        showToast('Refresh failed. Still using cached stations.');
      } else {
        setMode('preview', 'Could not reach the live directory, so the curated preview stays active.');
      }
    } catch (error) {
      if (hasLiveDataInView) {
        setStatus('Could not refresh right now. Continuing with your cached stations.', 'live');
        showToast('Refresh failed. Still using cached stations.');
      } else {
        setMode('preview', 'Could not reach the live directory, so the curated preview stays active.');
      }
    } finally {
      refs.refreshStations.disabled = false;
      refs.refreshStations.textContent = defaultLabel;
    }
  });

  refs.clearFilters.addEventListener('click', resetFilters);
  refs.nearMeButton.addEventListener('click', () => {
    state.activeFilter = 'nearby';
    renderFilterChips();
    applyNearbyFilter();
  });
  refs.shuffleFeatured.addEventListener('click', shuffleFeatured);
  refs.playPauseBtn.addEventListener('click', togglePlayback);
  refs.focusMapButton.addEventListener('click', () => {
    focusMapView();
  });

  refs.loadMoreBtn.addEventListener('click', renderMoreStations);
  refs.volumeSlider.addEventListener('input', (event) => {
    audio.volume = Number(event.target.value) / 100;
  });

  refs.searchInput.addEventListener('input', () => {
    state.query = refs.searchInput.value.trim();
    if (state.activeFilter === 'nearby') {
      state.activeFilter = 'all';
      renderFilterChips();
    }
    state.visibleCount = 18;
    applyFilters();
  });

  refs.filterChips.addEventListener('click', (event) => {
    const button = event.target.closest('[data-filter]');
    if (!button) return;
    state.activeFilter = button.dataset.filter;
    renderFilterChips();
    if (state.activeFilter === 'nearby') {
      applyNearbyFilter();
      return;
    }
    state.visibleCount = 18;
    applyFilters();
  });

  refs.regionChips.addEventListener('click', (event) => {
    const button = event.target.closest('[data-region]');
    if (!button) return;
    state.activeRegion = button.dataset.region;
    renderRegionChips();
    applyFilters();
    jumpToRegion(state.activeRegion);
  });

  refs.styleChips.addEventListener('click', (event) => {
    const button = event.target.closest('[data-style]');
    if (!button) return;
    applyMapStyle(button.dataset.style);
    renderStyleChips();
  });

  document.addEventListener('click', (event) => {
    const playButton = event.target.closest('[data-play-id]');
    if (playButton) {
      const stationId = playButton.dataset.playId;
      const station = state.allStations.find((item) => item.id === stationId);
      if (station) {
        playStation(station);
      }
    }
  });

  audio.addEventListener('ended', () => {
    pausePlayback();
  });

  audio.addEventListener('error', () => {
    state.isPlaying = false;
    refs.playPauseBtn.textContent = 'Play';
    playUiErrorCue();
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (map) {
        map.invalidateSize();
      }
    }, 160);
  }, { passive: true });

  window.addEventListener('hashchange', () => {
    applyHashSelection(window.location.hash);
  });
}

async function boot() {
  initializeMap();
  bindEvents();
  state.spatialAudioMode = readSpatialAudioPreference();
  state.uiSoundsEnabled = readUiSoundPreference();
  state.uiSoundProfile = readUiSoundProfilePreference();
  syncSpatialAudioToggle();
  syncUiSoundToggle();
  syncUiSoundProfileToggle();

  setMode('preview', 'Exploring a curated preview while the live directory loads.');

  const hasDeepLinkSelection = applyHashSelection(window.location.hash);
  if (!hasDeepLinkSelection) {
    renderAll();
    jumpToRegion('world');
  }

  window.setTimeout(() => map?.invalidateSize(), 120);

  const cachedEntry = readCachedLiveStations();
  const hasLiveCache = Boolean(cachedEntry?.stations?.length);

  if (hasLiveCache) {
    applyLiveDirectory(
      cachedEntry.stations,
      `Loaded ${cachedEntry.stations.length.toLocaleString()} stations from your 24-hour cache.`,
      cachedEntry.cachedAt
    );
  }

  const shouldRefresh = !hasLiveCache || shouldRefreshLiveCache(cachedEntry);
  if (!shouldRefresh) {
    return;
  }

  try {
    const liveStations = await getLiveStationsWithRetry();
    if (liveStations.length) {
      const cachedAt = writeCachedLiveStations(liveStations);
      applyLiveDirectory(
        liveStations,
        hasLiveCache
          ? `24-hour cache refreshed in the background with ${liveStations.length.toLocaleString()} live stations.`
          : `Live directory loaded with ${liveStations.length.toLocaleString()} stations.`,
        cachedAt
      );
    } else {
      if (!hasLiveCache) {
        setMode('preview', 'Live lookup failed, so the curated preview stays active.');
      } else {
        setStatus('Could not refresh live data in the background. Using your cached stations.', 'live');
      }
    }
  } catch (error) {
    if (!hasLiveCache) {
      setMode('preview', 'Live lookup failed, so the curated preview stays active.');
    } else {
      setStatus('Could not refresh live data in the background. Using your cached stations.', 'live');
    }
  }
}

boot();
