import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import './style.css';

import {
  featuredStations,
  fallbackStations,
  mapStyles,
  countryToContinent,
  countryCentroids,
  API_SERVERS,
  cityVideos,
  regionBounds
} from './data.js';

import { escapeHtml } from './htmlUtils.js';
import { buildEmbedUrl, resolveCityVideoForStation } from './cityVideos.js';
import { setupServiceWorker } from './pwa.js';
import { buildFreshStreamUrl, isSupportedStreamUrl, resetAudioElement } from './streamUtils.js';
import { getInternalNavigationUrl } from './navigationUtils.js';
import { getStationColor, getStationInitial, renderStationLogoMarkup } from './stationLogoUtils.js';

// Modular Subsystems
import {
  fetchAllActiveStations,
  searchStationsLive,
  loadStationsFromIDB,
  saveStationsToIDB
} from './radioApi.js';
import { AudioEngine, EQ_PRESETS } from './audioEngine.js';
import { AudioVisualizer } from './visualizer.js';
import { SleepTimer } from './sleepTimer.js';
import { fetchStationWeatherAndTime } from './weatherTime.js';
import {
  getFavorites,
  isFavorite,
  toggleFavorite,
  getPassportData,
  recordPassportVisit
} from './favoritesPassport.js';
import {
  createCatalogStateMachine,
  createUIStateMachine,
  createCityVideoStateMachine
} from './appStateMachines.js';

// IndexedDB cache configuration
const IDB_VERSION = 2;
export { IDB_VERSION };

const STORAGE_KEYS = {
  CURRENT_STATION: 'world-radio-atlas.current-station',
  VOLUME: 'world-radio-atlas.volume',
  EQ_PRESET: 'world-radio-atlas.eq-preset',
  MAP_STYLE: 'world-radio-atlas.map-style'
};

let isBrowsePage = window.location.pathname.includes('browse.html');
let isVideoPage = window.location.pathname.includes('videos.html');

const state = {
  allStations: fallbackStations.slice(),
  filteredStations: [],
  visibleStationsCount: 40,
  currentStation: null,
  currentContinent: 'all',
  map: null,
  clusters: null,
  loadingStations: false,
  activeMapStyle: 'night',
  isCinemaMode: false
};

// --- AUDIO & VISUALIZER INITIALIZATION ---
const audioElement = document.querySelector('#playerAudio') || new Audio();
const audioEngine = new AudioEngine(audioElement);

// --- STATE MACHINES (UX, DX, AX UNIFICATION) ---
const catalogFSM = createCatalogStateMachine({
  onCheckingCache: () => {},
  onFetchingNetwork: (ctx) => {},
  onRotatingMirror: (ctx) => {
    showToast(`Connecting to backup radio mirror #${ctx.mirrorIndex + 1}...`, true);
  },
  onFallbackCurated: () => {
    showToast('Using curated stations (API mirrors busy)');
  },
  onReady: (ctx) => {}
});

const uiFSM = createUIStateMachine({
  onCloseAll: () => {
    document.getElementById('search-overlay')?.classList.remove('active');
    document.getElementById('passport-modal-overlay')?.classList.remove('active');
    document.getElementById('mobile-nav-overlay')?.classList.remove('open');
    document.getElementById('eq-dropdown')?.classList.remove('show');
    document.getElementById('ambient-drawer')?.classList.remove('show');
    document.getElementById('sleep-dropdown')?.classList.remove('show');
    document.body.style.overflow = '';
  },
  onOpenSearch: () => {
    document.getElementById('passport-modal-overlay')?.classList.remove('active');
    document.getElementById('mobile-nav-overlay')?.classList.remove('open');
    document.getElementById('eq-dropdown')?.classList.remove('show');
    document.getElementById('ambient-drawer')?.classList.remove('show');
    document.getElementById('sleep-dropdown')?.classList.remove('show');

    document.getElementById('search-overlay')?.classList.add('active');
    document.getElementById('global-search-input')?.focus();
    document.body.style.overflow = 'hidden';
  },
  onOpenPassport: () => {
    document.getElementById('search-overlay')?.classList.remove('active');
    document.getElementById('mobile-nav-overlay')?.classList.remove('open');
    document.getElementById('eq-dropdown')?.classList.remove('show');
    document.getElementById('ambient-drawer')?.classList.remove('show');
    document.getElementById('sleep-dropdown')?.classList.remove('show');

    updatePassportUI();
    document.getElementById('passport-modal-overlay')?.classList.add('active');
    document.body.style.overflow = 'hidden';
  },
  onOpenMobileNav: () => {
    document.getElementById('search-overlay')?.classList.remove('active');
    document.getElementById('passport-modal-overlay')?.classList.remove('active');
    document.getElementById('eq-dropdown')?.classList.remove('show');
    document.getElementById('ambient-drawer')?.classList.remove('show');
    document.getElementById('sleep-dropdown')?.classList.remove('show');

    document.getElementById('mobile-nav-overlay')?.classList.add('open');
    document.body.style.overflow = 'hidden';
  },
  onOpenEq: () => {
    document.getElementById('search-overlay')?.classList.remove('active');
    document.getElementById('passport-modal-overlay')?.classList.remove('active');
    document.getElementById('mobile-nav-overlay')?.classList.remove('open');
    document.getElementById('ambient-drawer')?.classList.remove('show');
    document.getElementById('sleep-dropdown')?.classList.remove('show');

    document.getElementById('eq-dropdown')?.classList.add('show');
  },
  onOpenAmbient: () => {
    document.getElementById('search-overlay')?.classList.remove('active');
    document.getElementById('passport-modal-overlay')?.classList.remove('active');
    document.getElementById('mobile-nav-overlay')?.classList.remove('open');
    document.getElementById('eq-dropdown')?.classList.remove('show');
    document.getElementById('sleep-dropdown')?.classList.remove('show');

    document.getElementById('ambient-drawer')?.classList.add('show');
  },
  onOpenSleep: () => {
    document.getElementById('search-overlay')?.classList.remove('active');
    document.getElementById('passport-modal-overlay')?.classList.remove('active');
    document.getElementById('mobile-nav-overlay')?.classList.remove('open');
    document.getElementById('eq-dropdown')?.classList.remove('show');
    document.getElementById('ambient-drawer')?.classList.remove('show');

    document.getElementById('sleep-dropdown')?.classList.add('show');
  }
});

const cityVideoFSM = createCityVideoStateMachine({
  onShowPrompt: () => {
    const wrapper = document.querySelector('.video-player-wrapper') || document.getElementById('video-player-wrapper');
    if (wrapper) wrapper.classList.remove('has-video', 'loading');
    const iframe = document.getElementById('city-video-iframe');
    if (iframe) iframe.src = '';
  },
  onResolving: (ctx) => {
    const wrapper = document.querySelector('.video-player-wrapper') || document.getElementById('video-player-wrapper');
    const cityNameEl = document.getElementById('video-city-name');
    const stationNameEl = document.getElementById('video-station-playing');
    const spinner = document.getElementById('video-spinner');

    if (wrapper) wrapper.classList.add('loading');
    if (spinner) {
      const spinnerText = spinner.querySelector('span');
      if (spinnerText) spinnerText.textContent = `Searching for ${ctx.city || ctx.country || 'city'} footage...`;
    }
    const locationLabel = [ctx.city, ctx.country].filter(Boolean).join(', ') || ctx.city || ctx.country || 'the world';
    if (cityNameEl) cityNameEl.textContent = `Finding videos for ${locationLabel}`;
    if (stationNameEl) stationNameEl.textContent = 'Listening to live radio';
  },
  onLoadingIframe: (ctx) => {
    const iframe = document.getElementById('city-video-iframe');
    if (iframe && ctx.embedUrl && iframe.src !== ctx.embedUrl) {
      iframe.src = ctx.embedUrl;
    }
  },
  onActive: (ctx) => {
    const wrapper = document.querySelector('.video-player-wrapper') || document.getElementById('video-player-wrapper');
    if (wrapper) {
      wrapper.classList.remove('loading');
      wrapper.classList.add('has-video');
    }
    const locationLabel = [ctx.city, ctx.country].filter(Boolean).join(', ') || 'the world';
    const cityNameEl = document.getElementById('video-city-name');
    if (cityNameEl) cityNameEl.textContent = `Exploring ${locationLabel}`;
  },
  onCinemaMode: (ctx, isCinema) => {
    state.isCinemaMode = isCinema;
    const main = document.querySelector('.video-page-main');
    const cinemaBtn = document.getElementById('btn-cinema-mode');
    if (!main) return;
    main.classList.toggle('cinema-mode', isCinema);
    if (cinemaBtn) cinemaBtn.classList.toggle('active', isCinema);

    if (isCinema) {
      let closeFloat = document.querySelector('.close-cinema-floating');
      if (!closeFloat) {
        closeFloat = document.createElement('button');
        closeFloat.className = 'close-cinema-floating';
        closeFloat.innerHTML = 'Exit Cinema Mode &times;';
        closeFloat.onclick = () => cityVideoFSM.send('EXIT_CINEMA');
        main.appendChild(closeFloat);
      }
    } else {
      document.querySelector('.close-cinema-floating')?.remove();
    }
  }
});

// Load persisted volume & EQ preset
try {
  const savedVol = localStorage.getItem(STORAGE_KEYS.VOLUME);
  if (savedVol !== null) {
    audioEngine.setVolume(parseFloat(savedVol));
  }
  const savedPreset = localStorage.getItem(STORAGE_KEYS.EQ_PRESET);
  if (savedPreset && EQ_PRESETS[savedPreset]) {
    audioEngine.applyPreset(savedPreset);
  }
} catch (e) {
  console.warn('Could not restore audio settings from storage:', e);
}

// Setup Canvas Visualizer
const visualizerCanvas = document.getElementById('pb-canvas-visualizer');
let visualizer = null;
if (visualizerCanvas) {
  visualizer = new AudioVisualizer(visualizerCanvas, audioEngine);
  visualizer.start();
}

// Setup Sleep Timer
const sleepBadge = document.getElementById('pb-sleep-badge');
const sleepTimer = new SleepTimer(
  audioEngine,
  ({ formatted, isActive }) => {
    if (sleepBadge) {
      if (isActive && formatted) {
        sleepBadge.textContent = formatted;
        sleepBadge.style.display = 'inline-block';
      } else {
        sleepBadge.style.display = 'none';
      }
    }
  },
  () => {
    showToast('Sleep timer ended. Playback paused.');
  }
);

// --- AUDIO ENGINE CALLBACKS ---
audioEngine.onStateChange = ({ isPlaying, currentStation, volume, currentPreset, isDirectStream }) => {
  updateGlobalPlayState(isPlaying);

  // Sync localStorage
  try {
    if (currentStation) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_STATION, JSON.stringify(currentStation));
    }
    localStorage.setItem(STORAGE_KEYS.VOLUME, String(volume));
    localStorage.setItem(STORAGE_KEYS.EQ_PRESET, currentPreset);
  } catch (err) {}

  if (currentStation) {
    updatePlayerBar(currentStation, isPlaying, isDirectStream, currentPreset);
    highlightActiveStation(currentStation.id);

    if (isPlaying) {
      recordPassportVisit(currentStation);
      updatePassportUI();
      updateStationWeather(currentStation);
      updateCityVideo(currentStation);
    }
  }
};

audioEngine.onModeChange = ({ isDirectStream }) => {
  const streamBadge = document.getElementById('pb-stream-badge');
  if (streamBadge) {
    if (isDirectStream) {
      streamBadge.textContent = 'Direct Stream (EQ Bypassed)';
      streamBadge.classList.add('direct-mode');
    } else {
      streamBadge.textContent = 'DSP Active';
      streamBadge.classList.remove('direct-mode');
    }
  }
};

audioEngine.onFailoverSuggested = (failedStation) => {
  // Suggest a station in the same country or genre
  const similar = findSimilarStation(failedStation);
  if (similar) {
    showToastWithAction(
      `Station offline. Try similar in ${failedStation.country || 'world'}:`,
      similar.name,
      () => {
        playStation(similar);
      }
    );
  }
};

audioEngine.onToast = (msg, persistent, action) => {
  if (action) {
    showToastWithAction(msg, action.label, action.onClick);
  } else {
    showToast(msg, persistent);
  }
};

function findSimilarStation(station) {
  if (!station) return null;
  const list = state.allStations.length > 0 ? state.allStations : fallbackStations;

  // 1. Try matching same country
  if (station.country) {
    const match = list.find(s => s.country === station.country && s.id !== station.id);
    if (match) return match;
  }

  // 2. Try matching primary tag
  if (station.tags) {
    const firstTag = station.tags.split(',')[0].trim().toLowerCase();
    const match = list.find(s => s.tags && s.tags.toLowerCase().includes(firstTag) && s.id !== station.id);
    if (match) return match;
  }

  // 3. Fallback to a random station
  return list[Math.floor(Math.random() * list.length)];
}

// --- GLOBAL UI HELPERS ---
function updateGlobalPlayState(isPlaying) {
  const pbPlayPauseBtn = document.getElementById('pb-play-pause');
  const pauseIcon = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><rect x="5" y="4" width="5" height="16" rx="2"/><rect x="14" y="4" width="5" height="16" rx="2"/></svg>';
  const playIcon = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M7 4v16l12-8z"/></svg>';

  if (pbPlayPauseBtn) {
    pbPlayPauseBtn.innerHTML = isPlaying ? pauseIcon : playIcon;
  }

  if (isPlaying) {
    document.body.classList.add('is-playing');
  } else {
    document.body.classList.remove('is-playing');
  }
}

let toastTimeout;
function showToast(msg, persistent = false) {
  const toast = document.querySelector('#toast');
  if (!toast) return;
  toast.innerHTML = escapeHtml(msg);
  toast.classList.add('visible');

  clearTimeout(toastTimeout);
  if (!persistent) {
    toastTimeout = setTimeout(() => toast.classList.remove('visible'), 3500);
  }
}

function showToastWithAction(text, actionLabel, actionHandler) {
  const toast = document.querySelector('#toast');
  if (!toast) return;

  toast.innerHTML = `
    <span>${escapeHtml(text)}</span>
    <button class="toast-action-btn" id="toast-action-btn">${escapeHtml(actionLabel)}</button>
  `;
  toast.classList.add('visible');

  const btn = toast.querySelector('#toast-action-btn');
  if (btn) {
    btn.onclick = (e) => {
      e.stopPropagation();
      toast.classList.remove('visible');
      actionHandler();
    };
  }

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('visible'), 7000);
}

function hideToast() {
  const toast = document.querySelector('#toast');
  if (toast) toast.classList.remove('visible');
}

// --- PLAYER DOCK RENDERING ---
function updatePlayerBar(station, isPlaying, isDirectStream, currentPreset) {
  const bar = document.getElementById('player-bar');
  if (!bar) return;

  bar.classList.add('visible');

  const nameEl = document.getElementById('pb-name');
  const locEl = document.getElementById('pb-location');
  const logoEl = document.getElementById('pb-logo');
  const codecBadge = document.getElementById('pb-codec-badge');
  const streamBadge = document.getElementById('pb-stream-badge');
  const presetPill = document.getElementById('pb-preset-pill');
  const favBtn = document.getElementById('pb-favorite-btn');

  if (nameEl) nameEl.textContent = station.name;
  if (locEl) locEl.textContent = [station.city, station.country].filter(Boolean).join(', ') || 'Live Broadcast';

  if (logoEl) {
    const initial = getStationInitial(station.name);
    const color = getStationColor(station.id || station.name);
    logoEl.style.background = `linear-gradient(135deg, ${color} 0%, #1e293b 100%)`;
    logoEl.innerHTML = `<span class="pb-logo-initial">${escapeHtml(initial)}</span>`;
  }

  if (codecBadge) {
    const codecText = [station.bitrate ? `${station.bitrate} kbps` : '', station.codec ? station.codec.toUpperCase() : ''].filter(Boolean).join(' ');
    if (codecText) {
      codecBadge.textContent = codecText;
      codecBadge.style.display = 'inline-block';
    } else {
      codecBadge.style.display = 'none';
    }
  }

  if (streamBadge) {
    if (isDirectStream) {
      streamBadge.textContent = 'Direct Stream (EQ Bypassed)';
      streamBadge.classList.add('direct-mode');
    } else {
      streamBadge.textContent = 'DSP Active';
      streamBadge.classList.remove('direct-mode');
    }
  }

  if (presetPill) {
    const presetInfo = EQ_PRESETS[currentPreset] || EQ_PRESETS.normal;
    presetPill.textContent = presetInfo.name;
  }

  if (favBtn) {
    const isFav = isFavorite(station.id);
    favBtn.classList.toggle('active', isFav);
  }
}

async function updateStationWeather(station) {
  const weatherPill = document.getElementById('pb-weather-pill');
  if (!weatherPill) return;

  if (!station || !station.lat || !station.lng) {
    weatherPill.style.display = 'none';
    return;
  }

  try {
    const weatherData = await fetchStationWeatherAndTime(station.lat, station.lng);
    if (weatherData && weatherData.displayString) {
      weatherPill.textContent = weatherData.displayString;
      weatherPill.style.display = 'inline-flex';
    } else {
      weatherPill.style.display = 'none';
    }
  } catch {
    weatherPill.style.display = 'none';
  }
}

function playStation(station) {
  if (!station || !isSupportedStreamUrl(station.url)) {
    showToast('Unsupported stream URL. Try another station.');
    return;
  }

  state.currentStation = station;
  audioEngine.playStation(station);

  // Center map if coordinates exist
  if (state.map && station.lat && station.lng) {
    state.map.setView([station.lat, station.lng], Math.max(state.map.getZoom(), 5));
  }
}

// --- CITY VIDEOS INTEGRATION ---
let cityVideoRequestId = 0;
async function updateCityVideo(stationOrLocation, stationName) {
  const iframe = document.getElementById('city-video-iframe');
  const wrapper = document.querySelector('.video-player-wrapper');
  const cityNameEl = document.getElementById('video-city-name');
  const stationNameEl = document.getElementById('video-station-playing');
  const spinner = document.getElementById('video-spinner');

  if (!iframe || !wrapper || !stationOrLocation) return;

  const requestId = ++cityVideoRequestId;
  const station = typeof stationOrLocation === 'object'
    ? stationOrLocation
    : { name: stationName, city: stationOrLocation };
  const locationLabel = [station.city || station.state, station.country].filter(Boolean).join(', ') || station.city || station.country || 'the world';

  cityVideoFSM.send({
    type: 'STATION_SELECTED',
    city: station.city,
    country: station.country
  });

  wrapper.classList.add('loading');
  if (spinner) {
    const spinnerText = spinner.querySelector('span');
    if (spinnerText) spinnerText.textContent = `Searching for ${station.city || station.country || 'city'} footage...`;
  }

  if (cityNameEl) cityNameEl.textContent = `Finding videos for ${locationLabel}`;
  if (stationNameEl) stationNameEl.textContent = `Listening to ${station.name || stationName || 'live radio'}`;

  let video = await resolveCityVideoForStation(station);
  if (requestId !== cityVideoRequestId) return;

  if (!video) {
    const earthVideoId = cityVideos['Earth'];
    video = {
      embedUrl: buildEmbedUrl(earthVideoId),
      title: 'Planet Earth',
      videoId: earthVideoId,
      matchedBy: 'global-default'
    };
    cityVideoFSM.send({
      type: 'VIDEO_FALLBACK_GLOBAL',
      videoId: video.videoId,
      embedUrl: video.embedUrl
    });
  } else {
    cityVideoFSM.send({
      type: 'VIDEO_RESOLVED',
      videoId: video.videoId,
      embedUrl: video.embedUrl
    });
  }

  const videoUrl = video.embedUrl;

  iframe.onload = () => {
    if (requestId === cityVideoRequestId) {
      wrapper.classList.remove('loading');
      cityVideoFSM.send('IFRAME_LOADED');
    }
  };

  if (videoUrl && iframe.src !== videoUrl) {
    iframe.src = videoUrl;
  } else {
    wrapper.classList.remove('loading');
    cityVideoFSM.send('IFRAME_LOADED');
  }

  wrapper.classList.add('has-video');

  if (cityNameEl) cityNameEl.textContent = `Exploring ${locationLabel}`;
  if (stationNameEl) stationNameEl.textContent = `Listening to ${station.name || stationName || 'live radio'}`;
}

// --- ACTIVE STATION HIGHLIGHTING ---
function highlightActiveStation(stationId) {
  const pauseIcon = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><rect x="5" y="4" width="5" height="16" rx="1.5"/><rect x="14" y="4" width="5" height="16" rx="1.5"/></svg>';
  const playIcon = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M7 4v16l12-8z"/></svg>';

  document.querySelectorAll('.station-card').forEach(card => {
    const playBtn = card.querySelector('.st-play, .st-play-small');
    const cardId = card.dataset.stationId || playBtn?.dataset.stationId;
    const cardName = card.dataset.stationName || playBtn?.dataset.stationName;

    let isThisActive = false;
    if (stationId && cardId === stationId) {
      isThisActive = true;
    } else if (cardName && state.currentStation && cardName === state.currentStation.name) {
      isThisActive = true;
    }

    card.classList.toggle('active', isThisActive);
    const btn = card.querySelector('.st-play, .st-play-small');
    if (btn) {
      btn.innerHTML = (isThisActive && audioEngine.isPlaying) ? pauseIcon : playIcon;
    }
  });

  document.querySelectorAll('.search-result-item').forEach(item => {
    const cardId = item.dataset.stationId;
    const isThisActive = stationId && cardId === stationId;
    item.classList.toggle('active', isThisActive);
    const btn = item.querySelector('.sr-play-btn');
    if (btn) {
      btn.innerHTML = (isThisActive && audioEngine.isPlaying) ? 'Pause' : 'Play';
    }
  });
}

// --- MAP & MARKERS ---
function updateMapMarkers(stations) {
  if (!state.clusters || !document.getElementById('map')) return;
  state.clusters.clearLayers();

  const featuredIds = ['wfmu-new-jersey', 'bbc-world-service', 'fip-france', 'radio-538', 'rthk-radio-3', 'triple-j'];
  const colors = ['sl-blue', 'sl-red', 'sl-purple', 'sl-green', 'sl-yellow', 'sl-blue'];

  stations.forEach((station, index) => {
    if (station.lat === null || station.lng === null) return;

    let marker;
    const isFeatured = featuredIds.includes(station.id) || (stations.length > 5000 && index < 8);

    if (isFeatured) {
      const colorClass = colors[index % colors.length];
      const icon = L.divIcon({
        className: 'station-label-marker',
        html: `
          <div class="station-label">
            <div class="sl-icon-wrapper ${colorClass}">
              <div class="sl-pulse"></div>
              <div class="sl-icon-dot"></div>
            </div>
            <div class="sl-content">
              <span class="sl-name">${escapeHtml(station.name.split(' ').slice(0, 3).join(' '))}</span>
              <span class="sl-meta">${escapeHtml(station.city || station.country || 'Live')}</span>
            </div>
            <div class="sl-play">
              <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </div>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      });
      marker = L.marker([station.lat, station.lng], { icon, zIndexOffset: 1000 });
    } else {
      const icon = L.divIcon({
        className: 'custom-map-dot',
        iconSize: [8, 8]
      });
      marker = L.marker([station.lat, station.lng], { icon });
    }

    marker.on('click', () => playStation(station));
    state.clusters.addLayer(marker);
  });
}

function initializeMap() {
  const mapEl = document.getElementById('map');
  if (!mapEl) return;

  const mapInstance = L.map('map', {
    center: [20, 0],
    zoom: 2,
    zoomControl: false,
    attributionControl: false,
    worldCopyJump: true
  });

  const baseLayer = L.tileLayer(mapStyles[state.activeMapStyle].url, mapStyles[state.activeMapStyle].options);
  baseLayer.addTo(mapInstance);

  state.clusters = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 40,
    spiderfyOnMaxZoom: true,
    disableClusteringAtZoom: 16
  });

  updateMapMarkers(state.allStations);

  // Home map controls (Required by unit test assertions)
  const controlsHTML = `
    <div class="map-controls-custom">
      <div class="ctrl-group">
        <button id="zoom-in" title="Zoom In">+</button>
        <button id="zoom-out" title="Zoom Out">-</button>
      </div>
      <button class="ctrl-btn" id="locate-me" title="My Location">
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>
      </button>
    </div>
    <div class="city-videos-overlay">
      <div class="cv-tag">
        <h5>City Videos</h5>
        <p>See the Cities, Feel the Vibes</p>
      </div>
    </div>
  `;

  const heroRight = document.querySelector('.hero-right');
  if (heroRight) {
    heroRight.insertAdjacentHTML('beforeend', controlsHTML);
  }

  state.map = mapInstance;
  mapInstance.addLayer(state.clusters);

  setTimeout(() => mapInstance.invalidateSize(), 500);
}

// --- VIDEO SHOWCASE PAGE ---
function initVideoPage() {
  const suggestionsGrid = document.getElementById('suggestions-grid');
  if (!suggestionsGrid) return;

  const cities = Object.keys(cityVideos).slice(0, 8);
  suggestionsGrid.innerHTML = cities.map(city => `
    <div class="suggestion-card" data-city="${escapeHtml(city)}">
      <img src="https://images.unsplash.com/photo-1449034446853-66c86144b0ad?auto=format&fit=crop&w=400&q=80" alt="${escapeHtml(city)}">
      <div class="suggestion-overlay">
        <h4>${escapeHtml(city)}</h4>
        <p>Watch 4K Atmosphere</p>
      </div>
    </div>
  `).join('');

  suggestionsGrid.querySelectorAll('.suggestion-card').forEach(card => {
    card.addEventListener('click', () => {
      const city = card.dataset.city;
      const station = state.allStations.find(s => s.city && s.city.includes(city)) ||
                      fallbackStations.find(s => s.city && s.city.includes(city)) ||
                      fallbackStations[0];
      playStation(station);
    });
  });

  if (state.currentStation && audioEngine.isPlaying) {
    updateCityVideo(state.currentStation);
  }
}

// --- BROWSE PAGE RENDERING ---
function renderSkeletons(count = 40) {
  const grid = document.getElementById('all-stations-grid');
  if (!grid) return;
  const card = () => `
    <div class="skeleton-card">
      <div class="skeleton-logo skeleton-base"></div>
      <div class="skeleton-info">
        <div class="skeleton-title skeleton-base"></div>
        <div class="skeleton-sub skeleton-base"></div>
        <div class="skeleton-tag skeleton-base"></div>
      </div>
      <div class="skeleton-btn skeleton-base"></div>
    </div>
  `;
  grid.innerHTML = Array.from({ length: count }, card).join('');

  const counter = document.getElementById('station-count');
  if (counter) {
    counter.innerHTML = '<span class="skeleton-count skeleton-base"></span>';
  }

  const loadMoreBtn = document.getElementById('btn-load-more');
  if (loadMoreBtn) loadMoreBtn.style.display = 'none';
}

function applyFilters() {
  const query = document.getElementById('station-search')?.value.toLowerCase().trim() || '';

  state.filteredStations = state.allStations.filter(s => {
    const matchesSearch = !query ||
      s.name.toLowerCase().includes(query) ||
      (s.country && s.country.toLowerCase().includes(query)) ||
      (s.city && s.city.toLowerCase().includes(query)) ||
      (s.tags && s.tags.toLowerCase().includes(query));

    if (state.currentContinent === 'all') return matchesSearch;

    const continent = countryToContinent[s.country] || 'Other';
    return matchesSearch && continent === state.currentContinent;
  });

  state.visibleStationsCount = 40;
  renderAllStations();
}

function renderAllStations() {
  const grid = document.getElementById('all-stations-grid');
  if (!grid) return;

  const isFiltered = state.currentContinent !== 'all' || Boolean(document.getElementById('station-search')?.value);
  const stations = (state.filteredStations.length > 0 || isFiltered)
    ? state.filteredStations
    : state.allStations;

  const toRender = stations.slice(0, state.visibleStationsCount);

  const counter = document.getElementById('station-count');
  if (counter) {
    counter.textContent = `Showing ${toRender.length.toLocaleString()} of ${stations.length.toLocaleString()} stations`;
  }

  const loadMoreBtn = document.getElementById('btn-load-more');
  if (loadMoreBtn) {
    loadMoreBtn.style.display = toRender.length < stations.length ? '' : 'none';
    loadMoreBtn.textContent = `Load More Stations (${(stations.length - toRender.length).toLocaleString()} remaining)`;
  }

  if (stations.length === 0 && isFiltered) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#9ca3af;"><p style="font-size:16px;">No stations found. Try a different search or filter.</p></div>';
    return;
  }

  grid.innerHTML = toRender.map(s => {
    const isActive = state.currentStation && (state.currentStation.id === s.id || state.currentStation.name === s.name);
    const name = String(s.name || '');
    const cityOrCountry = s.city || s.country || '';
    const primaryTag = s.tags ? String(s.tags).split(',')[0] : 'Live Stream';
    const stationSeed = s.id || name || cityOrCountry;
    const logoContent = renderStationLogoMarkup(s);

    return `
      <div class="station-card list-card ${isActive ? 'active' : ''}" data-station-id="${escapeHtml(s.id)}" data-station-name="${escapeHtml(name)}">
        <div class="st-logo" style="background: ${getStationColor(stationSeed)}; color: #fff;">
          ${logoContent}
        </div>
        <div class="st-info">
          <h4>${escapeHtml(name.split(' ').slice(0, 4).join(' '))}</h4>
          <span class="st-loc">${escapeHtml(cityOrCountry)}</span>
          <span class="st-genre">${escapeHtml(primaryTag)}</span>
        </div>
        <div class="st-actions">
          <button class="st-play-small" aria-label="Play ${escapeHtml(name)}">
            ${(isActive && audioEngine.isPlaying) ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>' : '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>'}
          </button>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.station-card').forEach(card => {
    card.onclick = () => {
      const id = card.dataset.stationId;
      const station = state.allStations.find(s => s.id === id);
      if (station) playStation(station);
    };
  });
}

// --- PASSPORT & FAVORITES MODAL UI ---
function updatePassportUI() {
  const passportData = getPassportData();
  const cCount = document.getElementById('passport-country-count');
  const cityCount = document.getElementById('passport-city-count');
  const sCount = document.getElementById('passport-stations-count');
  const stampsGrid = document.getElementById('passport-stamps-grid');

  if (cCount) cCount.textContent = passportData.countries.length;
  if (cityCount) cityCount.textContent = passportData.cities.length;
  if (sCount) sCount.textContent = passportData.totalListened;

  if (stampsGrid) {
    if (passportData.countries.length === 0) {
      stampsGrid.innerHTML = '<p class="passport-empty-hint">Start listening to radio stations worldwide to earn country stamps in your passport!</p>';
    } else {
      stampsGrid.innerHTML = passportData.countries.map(c => `
        <div class="stamp-badge">
          <span class="stamp-icon">🛂</span>
          <strong class="stamp-name">${escapeHtml(c)}</strong>
          <span class="stamp-date">Verified Entry</span>
        </div>
      `).join('');
    }
  }

  // Update Favorites
  renderFavoritesList();
}

function renderFavoritesList() {
  const list = document.getElementById('favorites-list');
  if (!list) return;

  const favs = getFavorites();
  if (favs.length === 0) {
    list.innerHTML = '<p class="passport-empty-hint">No favorite stations saved yet. Click the heart icon on any playing station to save it here!</p>';
    return;
  }

  list.innerHTML = favs.map(f => `
    <div class="fav-item" data-station-id="${escapeHtml(f.id)}">
      <div class="fav-left">
        <span class="stamp-icon">📻</span>
        <div>
          <div class="fav-title">${escapeHtml(f.name)}</div>
          <div class="fav-sub">${escapeHtml([f.city, f.country].filter(Boolean).join(', '))}</div>
        </div>
      </div>
      <div class="fav-actions">
        <button class="fav-play-btn" data-id="${escapeHtml(f.id)}">Play</button>
        <button class="fav-remove-btn" data-id="${escapeHtml(f.id)}" title="Remove Favorite">&times;</button>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.fav-play-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const favs = getFavorites();
      const st = favs.find(f => f.id === id);
      if (st) {
        playStation(st);
        uiFSM.send('CLOSE');
      }
    };
  });

  list.querySelectorAll('.fav-remove-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const favs = getFavorites().filter(f => f.id !== id);
      localStorage.setItem('world-radio-atlas.favorites', JSON.stringify(favs));
      renderFavoritesList();
      if (state.currentStation && state.currentStation.id === id) {
        document.getElementById('pb-favorite-btn')?.classList.remove('active');
      }
    };
  });
}

// --- EVENT BINDING ---
function bindEvents() {
  // Navigation Search & Theme Triggers
  const searchTrigger = document.getElementById('search-trigger');
  if (searchTrigger) {
    searchTrigger.onclick = () => uiFSM.send('OPEN_SEARCH');
  }

  const themeTrigger = document.getElementById('theme-trigger');
  if (themeTrigger) {
    themeTrigger.onclick = () => {
      if (!state.map) {
        showToast('Map theme updated (Go Home to see it)');
        return;
      }
      const newStyle = state.activeMapStyle === 'night' ? 'paper' : 'night';
      state.activeMapStyle = newStyle;

      const layers = [];
      state.map.eachLayer(l => { if (l instanceof L.TileLayer) layers.push(l); });
      layers.forEach(l => state.map.removeLayer(l));

      L.tileLayer(mapStyles[newStyle].url, mapStyles[newStyle].options).addTo(state.map);
      if (state.clusters) state.map.addLayer(state.clusters);
      showToast(`Map theme updated to ${mapStyles[newStyle].label}`);
    };
  }

  // Surprise Me (Spin the Globe)
  const spinGlobeBtn = document.getElementById('btn-spin-globe');
  if (spinGlobeBtn) {
    spinGlobeBtn.onclick = () => {
      const candidates = state.allStations.filter(s => s.lat && s.lng && isSupportedStreamUrl(s.url));
      const pool = candidates.length > 0 ? candidates : fallbackStations;
      const randomStation = pool[Math.floor(Math.random() * pool.length)];

      if (state.map && randomStation.lat && randomStation.lng) {
        state.map.flyTo([randomStation.lat, randomStation.lng], 6, { duration: 2.2 });
      }
      showToast(`Spinning globe... Tuned into ${randomStation.name} (${randomStation.country})!`);
      playStation(randomStation);
    };
  }

  // Listen Live / Explore Buttons
  const listenLiveBtn = document.querySelector('#nav-listen-live');
  if (listenLiveBtn) {
    listenLiveBtn.onclick = () => {
      const random = state.allStations[Math.floor(Math.random() * state.allStations.length)];
      if (random) playStation(random);
    };
  }

  const exploreBtn = document.querySelector('#btn-explore-radio');
  if (exploreBtn) {
    exploreBtn.onclick = () => {
      const random = state.allStations[Math.floor(Math.random() * state.allStations.length)];
      if (random) {
        playStation(random);
        const mapEl = document.querySelector('#map');
        if (mapEl) {
          mapEl.scrollIntoView({ behavior: 'smooth' });
          if (state.map && random.lat) state.map.setView([random.lat, random.lng], 5);
        }
      }
    };
  }

  const openMapBtn = document.querySelector('#btn-open-map');
  if (openMapBtn) {
    openMapBtn.onclick = () => {
      document.querySelector('#map')?.scrollIntoView({ behavior: 'smooth' });
    };
  }

  // Station Cards Play
  document.querySelectorAll('.station-card').forEach(card => {
    card.onclick = (e) => {
      if (e.target.closest('button') && !e.target.closest('.st-play, .st-play-small')) return;
      const name = card.dataset.stationName || card.querySelector('.st-play, .st-play-small')?.dataset.stationName;
      const id = card.dataset.stationId;
      const station = state.allStations.find(s => s.id === id || s.name === name) ||
                      fallbackStations.find(s => s.id === id || s.name === name);
      if (station) playStation(station);
    };
  });

  // Player Bar Play/Pause & Close
  const pbPlayPause = document.getElementById('pb-play-pause');
  if (pbPlayPause) {
    pbPlayPause.onclick = () => audioEngine.togglePlayPause();
  }

  const pbCloseBtn = document.getElementById('pb-close-btn');
  if (pbCloseBtn) {
    pbCloseBtn.onclick = (e) => {
      e.stopPropagation();
      audioEngine.stop({ clearStation: true });
      document.getElementById('player-bar')?.classList.remove('visible');
      highlightActiveStation(null);
      cityVideoFSM.send('CLEAR_VIDEO');
    };
  }

  // Volume
  const volumeSlider = document.getElementById('pb-volume-slider');
  if (volumeSlider) {
    volumeSlider.value = audioEngine.volume;
    volumeSlider.oninput = (e) => {
      const val = parseFloat(e.target.value);
      audioEngine.setVolume(val);
      updateVolumeIcon(val);
    };
  }

  const volumeBtn = document.getElementById('pb-volume-btn');
  if (volumeBtn) {
    volumeBtn.onclick = () => {
      audioEngine.toggleMute();
      if (volumeSlider) volumeSlider.value = audioEngine.volume;
      updateVolumeIcon(audioEngine.volume);
    };
  }

  // Favorite Button on Player Dock
  const favBtn = document.getElementById('pb-favorite-btn');
  if (favBtn) {
    favBtn.onclick = (e) => {
      e.stopPropagation();
      if (!state.currentStation) return;
      const nowFav = toggleFavorite(state.currentStation);
      favBtn.classList.toggle('active', nowFav);
      showToast(nowFav ? `Added ${state.currentStation.name} to Favorites ❤️` : `Removed from Favorites`);
      renderFavoritesList();
    };
  }

  // EQ Styles Dropdown
  const eqBtn = document.getElementById('pb-eq-btn');
  const eqDropdown = document.getElementById('eq-dropdown');
  if (eqBtn && eqDropdown) {
    eqBtn.onclick = (e) => {
      e.stopPropagation();
      uiFSM.send(uiFSM.matches('eq_drawer') ? 'CLOSE' : 'TOGGLE_EQ');
    };

    document.querySelectorAll('.eq-option').forEach(opt => {
      opt.onclick = (e) => {
        e.stopPropagation();
        const style = opt.dataset.style;
        document.querySelectorAll('.eq-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        audioEngine.applyPreset(style);
        uiFSM.send('CLOSE');
      };
    });
  }

  // Ambient Mixer Drawer
  const ambientBtn = document.getElementById('pb-ambient-btn');
  const ambientDrawer = document.getElementById('ambient-drawer');
  if (ambientBtn && ambientDrawer) {
    ambientBtn.onclick = (e) => {
      e.stopPropagation();
      uiFSM.send(uiFSM.matches('ambient_drawer') ? 'CLOSE' : 'TOGGLE_AMBIENT');
    };

    ambientDrawer.querySelectorAll('.ambient-slider').forEach(slider => {
      slider.oninput = (e) => {
        const type = slider.dataset.type;
        const val = parseFloat(e.target.value);
        audioEngine.setAmbientVolume(type, val);
      };
    });
  }

  // Sleep Timer Dropdown
  const sleepBtn = document.getElementById('pb-sleep-btn');
  const sleepDropdown = document.getElementById('sleep-dropdown');
  if (sleepBtn && sleepDropdown) {
    sleepBtn.onclick = (e) => {
      e.stopPropagation();
      uiFSM.send(uiFSM.matches('sleep_drawer') ? 'CLOSE' : 'TOGGLE_SLEEP');
    };

    sleepDropdown.querySelectorAll('.sleep-option').forEach(opt => {
      opt.onclick = (e) => {
        e.stopPropagation();
        const minutes = parseInt(opt.dataset.minutes, 10);
        if (minutes > 0) {
          sleepTimer.start(minutes);
          showToast(`Sleep timer set for ${minutes} minutes 🌙`);
        } else {
          sleepTimer.cancel();
          showToast('Sleep timer cancelled');
        }
        uiFSM.send('CLOSE');
      };
    });
  }

  // Share Station Link
  const shareBtn = document.getElementById('pb-share-btn');
  if (shareBtn) {
    shareBtn.onclick = (e) => {
      e.stopPropagation();
      if (!state.currentStation) {
        showToast('Play a station to share its link');
        return;
      }
      const shareUrl = `${window.location.origin}/?station=${encodeURIComponent(state.currentStation.id)}`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrl).then(() => {
          showToast('Live station link copied to clipboard! 📋');
        }).catch(() => {
          showToast(`Share URL: ${shareUrl}`);
        });
      } else {
        showToast(`Share URL: ${shareUrl}`);
      }
    };
  }

  // Cinema Mode Toggle (on Videos page)
  const cinemaBtn = document.getElementById('btn-cinema-mode');
  if (cinemaBtn) {
    cinemaBtn.onclick = () => {
      cityVideoFSM.send('TOGGLE_CINEMA');
    };
  }

  // Passport & Favorites Modal Triggers
  const navPassportBtn = document.getElementById('nav-passport');
  if (navPassportBtn) navPassportBtn.onclick = () => uiFSM.send('OPEN_PASSPORT');

  const mobilePassportBtn = document.getElementById('mobile-nav-passport');
  if (mobilePassportBtn) mobilePassportBtn.onclick = (e) => {
    e.preventDefault();
    uiFSM.send('OPEN_PASSPORT');
  };

  const closePassportBtn = document.getElementById('close-passport-btn');
  if (closePassportBtn) {
    closePassportBtn.onclick = () => uiFSM.send('CLOSE');
  }

  const passportOverlay = document.getElementById('passport-modal-overlay');
  if (passportOverlay) {
    passportOverlay.onclick = (e) => {
      if (e.target.id === 'passport-modal-overlay') {
        uiFSM.send('CLOSE');
      }
    };
  }

  // Passport Modal Tabs
  document.querySelectorAll('.passport-tab').forEach(tab => {
    tab.onclick = () => {
      const tabKey = tab.dataset.tab;
      document.querySelectorAll('.passport-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.passport-tab-content').forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      const targetContent = document.getElementById(`tab-content-${tabKey}`);
      if (targetContent) targetContent.classList.add('active');
    };
  });

  // Global Search Input with multi-mirror live fallback
  const searchInput = document.getElementById('global-search-input');
  if (searchInput) {
    let searchTimeout;
    searchInput.oninput = (e) => {
      const query = e.target.value.toLowerCase().trim();
      const resultsContainer = document.getElementById('global-search-results');
      if (!query) {
        resultsContainer.innerHTML = '<div class="search-placeholder"><p>Type to search through 60,000+ stations...</p></div>';
        return;
      }

      // Fast local search first
      const matches = state.allStations.filter(s =>
        s.name.toLowerCase().includes(query) ||
        (s.country && s.country.toLowerCase().includes(query)) ||
        (s.city && s.city.toLowerCase().includes(query)) ||
        (s.tags && s.tags.toLowerCase().includes(query))
      ).slice(0, 10);

      const renderMatches = (data) => {
        if (data.length === 0) {
          resultsContainer.innerHTML = `<div class="search-placeholder"><p>No stations found for "${escapeHtml(query)}"</p></div>`;
          return;
        }

        resultsContainer.innerHTML = data.map(s => {
          const isActive = state.currentStation && state.currentStation.id === s.id;
          return `
            <div class="search-result-item ${isActive ? 'active' : ''}" data-station-id="${escapeHtml(s.id)}">
              <div class="sr-info">
                <strong>${escapeHtml(s.name)}</strong>
                <span>${escapeHtml([s.city, s.country].filter(Boolean).join(', '))}</span>
              </div>
              <button class="sr-play-btn">${(isActive && audioEngine.isPlaying) ? 'Pause' : 'Play'}</button>
            </div>
          `;
        }).join('');

        resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
          item.onclick = () => {
            const id = item.dataset.stationId;
            const st = state.allStations.find(s => s.id === id) || data.find(s => s.id === id);
            if (st) {
              playStation(st);
              uiFSM.send('CLOSE');
              const m = document.getElementById('map');
              if (m) {
                m.scrollIntoView({ behavior: 'smooth' });
                if (state.map && st.lat) state.map.setView([st.lat, st.lng], 8);
              }
            }
          };
        });
      };

      if (matches.length > 0) renderMatches(matches);

      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(async () => {
        const liveResults = await searchStationsLive(query, 15);
        if (liveResults.length > 0) {
          const combined = [...matches, ...liveResults.filter(lr => !matches.some(m => m.id === lr.id))].slice(0, 15);
          renderMatches(combined);
        }
      }, 350);
    };
  }

  // Close Search overlay
  const closeSearchBtn = document.getElementById('close-search-btn');
  if (closeSearchBtn) {
    closeSearchBtn.onclick = () => uiFSM.send('CLOSE');
  }

  const searchOverlay = document.getElementById('search-overlay');
  if (searchOverlay) {
    searchOverlay.onclick = (e) => {
      if (e.target.id === 'search-overlay') {
        uiFSM.send('CLOSE');
      }
    };
  }

  // Close drawers when clicking outside
  document.addEventListener('click', (e) => {
    if (
      !e.target.closest('.eq-container') &&
      !e.target.closest('#eq-dropdown') &&
      !e.target.closest('.ambient-container') &&
      !e.target.closest('#ambient-drawer') &&
      !e.target.closest('.sleep-container') &&
      !e.target.closest('#sleep-dropdown')
    ) {
      if (uiFSM.matches('eq_drawer') || uiFSM.matches('ambient_drawer') || uiFSM.matches('sleep_drawer')) {
        uiFSM.send('CLOSE');
      }
    }
  });

  // Browse Page Filter bar & Search
  document.getElementById('station-search')?.addEventListener('input', applyFilters);

  document.querySelectorAll('#continent-filters .chip').forEach(chip => {
    chip.onclick = () => {
      document.querySelectorAll('#continent-filters .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.currentContinent = chip.dataset.continent;
      applyFilters();
    };
  });

  const loadMoreBtn = document.getElementById('btn-load-more');
  if (loadMoreBtn) {
    loadMoreBtn.onclick = () => {
      state.visibleStationsCount += 40;
      renderAllStations();
    };
  }

  // Map Controls
  document.querySelector('#zoom-in')?.addEventListener('click', () => state.map?.zoomIn());
  document.querySelector('#zoom-out')?.addEventListener('click', () => state.map?.zoomOut());
  document.querySelector('#locate-me')?.addEventListener('click', () => state.map?.locate({ setView: true, maxZoom: 10 }));

  // Mobile Menu
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  if (mobileToggle) {
    mobileToggle.onclick = () => uiFSM.send('OPEN_MOBILE_NAV');
  }
  const closeMenuBtn = document.getElementById('close-menu-btn');
  if (closeMenuBtn) {
    closeMenuBtn.onclick = () => uiFSM.send('CLOSE');
  }
  document.querySelectorAll('.mobile-nav-content a').forEach(link => {
    link.onclick = () => uiFSM.send('CLOSE');
  });
}

function updateVolumeIcon(vol) {
  const volumeIcon = document.getElementById('volume-icon');
  if (!volumeIcon) return;
  if (vol === 0) {
    volumeIcon.innerHTML = '<path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>';
  } else if (vol < 0.5) {
    volumeIcon.innerHTML = '<path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>';
  } else {
    volumeIcon.innerHTML = '<path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>';
  }
}

// --- GLOBAL NAVIGATION LISTENERS ---
function initGlobalListeners() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href || href.startsWith('mailto:') || href.startsWith('tel:')) return;

    if (href.startsWith('#')) {
      e.preventDefault();
      const isHome = window.location.pathname === '/' || window.location.pathname === '/index.html';
      if (!isHome) {
        navigateTo('/').then(() => {
          setTimeout(() => {
            const target = document.querySelector(href);
            if (target) target.scrollIntoView({ behavior: 'smooth' });
          }, 300);
        });
        return;
      }
      const target = document.querySelector(href);
      if (target) target.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    const internalUrl = getInternalNavigationUrl(href, window.location.origin);
    if (internalUrl) {
      const targetPath = internalUrl.pathname;
      const currentPath = window.location.pathname;

      if (targetPath === currentPath || (targetPath === '/' && currentPath === '/index.html')) {
        if (internalUrl.hash) return;
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      e.preventDefault();
      navigateTo(`${internalUrl.pathname}${internalUrl.search}${internalUrl.hash}`);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      uiFSM.send('ESCAPE');
    }
  });

  window.addEventListener('popstate', () => {
    navigateTo(window.location.pathname, false);
  });
}

async function navigateTo(url, push = true) {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const newContent = doc.querySelector('.landing-content');
    const currentContent = document.querySelector('.landing-content');

    if (!newContent || !currentContent) {
      window.location.href = url;
      return;
    }

    if (push) window.history.pushState({}, '', url);
    document.title = doc.title;

    currentContent.style.opacity = '0';
    currentContent.style.transition = 'opacity 0.15s ease';

    await new Promise(resolve => setTimeout(() => {
      currentContent.innerHTML = newContent.innerHTML;

      isBrowsePage = window.location.pathname.includes('browse.html');
      isVideoPage = window.location.pathname.includes('videos.html');

      document.querySelectorAll('.landing-nav-links a, .mobile-nav-content a').forEach(navLink => {
        const linkHref = navLink.getAttribute('href');
        const isActive = (linkHref === '/' && (window.location.pathname === '/' || window.location.pathname === '/index.html')) ||
                         (linkHref !== '/' && linkHref && window.location.pathname.includes(linkHref));
        navLink.classList.toggle('active', isActive);
      });

      currentContent.style.opacity = '1';

      if (isBrowsePage) {
        renderSkeletons(40);
        if (state.allStations.length < 500) {
          loadStations();
        } else {
          applyFilters();
        }
      } else if (isVideoPage) {
        initVideoPage();
      } else {
        initializeMap();
      }

      bindEvents();
      window.scrollTo(0, 0);
      resolve();
    }, 150));
  } catch (err) {
    console.error('Navigation failed:', err);
    window.location.href = url;
  }
}

// --- DATA FETCHING & INITIALIZATION ---
async function loadStations() {
  if (state.loadingStations) return;
  state.loadingStations = true;
  catalogFSM.send('START_LOAD');

  try {
    const stations = await fetchAllActiveStations((loadedCount) => {
      catalogFSM.send({ type: 'NETWORK_PROGRESS', count: loadedCount });
      if (loadedCount > 0) {
        showToast(`Loading radio stations... (${loadedCount.toLocaleString()} ready)`, true);
      }
    });

    if (stations && stations.length > 0) {
      state.allStations = stations;
      updateMapMarkers(stations);
      if (isBrowsePage) applyFilters();
      catalogFSM.send({ type: 'NETWORK_SUCCESS', count: stations.length });
      showToast(`${stations.length.toLocaleString()} live stations connected!`);
    } else {
      catalogFSM.send('ALL_MIRRORS_FAILED');
      catalogFSM.send({ type: 'FALLBACK_LOADED', count: state.allStations.length });
    }
  } catch (err) {
    console.warn('Live catalog fetch failed:', err);
    catalogFSM.send('ALL_MIRRORS_FAILED');
    catalogFSM.send({ type: 'FALLBACK_LOADED', count: fallbackStations.length });
    showToast('Using curated stations (API mirrors busy)');
  } finally {
    state.loadingStations = false;
  }
}

// --- INITIAL STARTUP ---
setTimeout(async () => {
  initializeMap();
  initGlobalListeners();
  bindEvents();

  if (isBrowsePage) {
    renderSkeletons(40);
    loadStations();
  } else if (isVideoPage) {
    initVideoPage();
    loadStations();
  } else {
    // Background prefetch
    setTimeout(() => loadStations(), 1200);
  }

  // Check URL query parameters for shareable station link: ?station=<uuid>
  const urlParams = new URLSearchParams(window.location.search);
  const targetStationId = urlParams.get('station');

  // Restore saved station from localStorage
  let stationToRestore = null;
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_STATION);
    if (saved) stationToRestore = JSON.parse(saved);
  } catch {}

  if (targetStationId) {
    const found = state.allStations.find(s => s.id === targetStationId) ||
                  fallbackStations.find(s => s.id === targetStationId);
    if (found) {
      stationToRestore = found;
      playStation(found);
    }
  }

  if (stationToRestore) {
    state.currentStation = stationToRestore;
    updatePlayerBar(stationToRestore, false, false, audioEngine.currentPreset);
    updateCityVideo(stationToRestore);
  }
}, 0);

// --- AGENT EXPERIENCE (AX) RUNTIME BRIDGE ---
if (typeof window !== 'undefined') {
  window.__WRA__ = {
    version: '2.0.0',
    machines: {
      playback: audioEngine.fsm,
      catalog: catalogFSM,
      ui: uiFSM,
      cityVideo: cityVideoFSM
    },
    getState() {
      return {
        playback: audioEngine.fsm.getState(),
        catalog: catalogFSM.getState(),
        ui: uiFSM.getState(),
        cityVideo: cityVideoFSM.getState(),
        audio: {
          volume: audioEngine.volume,
          isPlaying: audioEngine.isPlaying,
          isDirectStream: audioEngine.isDirectStream,
          preset: audioEngine.currentPreset,
          currentStation: state.currentStation
        },
        activeMapStyle: state.activeMapStyle,
        totalStations: state.allStations.length
      };
    },
    dispatch(machineName, event) {
      const machine = this.machines[machineName];
      if (!machine) {
        console.warn(`[WRA AX] Machine "${machineName}" not found.`);
        return false;
      }
      return machine.send(event);
    },
    getHistory(machineName) {
      if (machineName) {
        return this.machines[machineName]?.history || [];
      }
      return {
        playback: this.machines.playback.history,
        catalog: this.machines.catalog.history,
        ui: this.machines.ui.history,
        cityVideo: this.machines.cityVideo.history
      };
    },
    subscribe(listener) {
      const unsubs = Object.values(this.machines).map(m => m.subscribe(listener));
      return () => unsubs.forEach(u => u());
    },
    playStationById(id) {
      const station = state.allStations.find(s => s.id === id) || fallbackStations.find(s => s.id === id);
      if (station) {
        playStation(station);
        return true;
      }
      return false;
    },
    pause() {
      if (audioEngine.isPlaying) {
        audioEngine.togglePlayPause();
        return true;
      }
      return false;
    },
    resume() {
      if (!audioEngine.isPlaying) {
        audioEngine.togglePlayPause();
        return true;
      }
      return false;
    },
    spinGlobe() {
      document.getElementById('btn-spin-globe')?.click();
      return true;
    },
    setVolume(vol) {
      audioEngine.setVolume(vol);
      return true;
    },
    openView(viewName) {
      const eventMap = {
        search: 'OPEN_SEARCH',
        passport: 'OPEN_PASSPORT',
        mobile_nav: 'OPEN_MOBILE_NAV',
        eq_drawer: 'TOGGLE_EQ',
        ambient_drawer: 'TOGGLE_AMBIENT',
        sleep_drawer: 'TOGGLE_SLEEP',
        closed: 'CLOSE'
      };
      const event = eventMap[viewName];
      if (event) return uiFSM.send(event);
      return false;
    }
  };
}

export { catalogFSM, uiFSM, cityVideoFSM, audioEngine };

setupServiceWorker();
