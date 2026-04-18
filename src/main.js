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
const LIVE_STATION_QUERY = `json/stations/search?order=votes&reverse=true&has_geo_info=true&hidebroken=true&limit=${LIVE_STATION_LIMIT}`;
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
  renderToken: 0,
  markerToken: 0,
  stationLayers: new Map(),
  baseLayers: {}
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
  const modeName = mode === 'live' ? 'Live directory' : 'Curated preview';
  refs.modeLabel.textContent = mode === 'live' ? 'Live' : 'Preview';
  refs.modeBadge.textContent = mode === 'live' ? 'Live' : 'Preview';
  refs.liveBadge.textContent = mode === 'live' ? 'Live' : 'Preview';
  if (refs.statusChip) {
    refs.statusChip.textContent = modeName;
  }
  setStatus(message, mode);
  updateStats();
}

function updateStats() {
  const stations = state.filteredStations;
  const countries = new Set(stations.map((station) => station.country).filter(Boolean));
  refs.stationCount.textContent = stations.length.toLocaleString();
  refs.countryCount.textContent = countries.size.toLocaleString();
  refs.featuredCount.textContent = state.featuredStations.length.toLocaleString();
  refs.visibleCount.textContent = Math.min(state.visibleCount, stations.length).toLocaleString();
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
}

function showToast(message) {
  refs.toast.textContent = message;
  refs.toast.classList.add('is-visible');
  window.clearTimeout(showToast._timer);
  showToast._timer = window.setTimeout(() => {
    refs.toast.classList.remove('is-visible');
  }, 2600);
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
    state.baseLayers[key] = L.tileLayer(style.url, style.options);
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
      if (!Array.isArray(payload)) {
        throw new Error('Unexpected API response.');
      }

      const seen = new Set();
      const stations = payload
        .map(normalizeStation)
        .filter((station) => station && station.name && station.url)
        .filter((station) => station.lat >= -90 && station.lat <= 90 && station.lng >= -180 && station.lng <= 180)
        .filter((station) => {
          if (seen.has(station.id)) return false;
          seen.add(station.id);
          return true;
        });

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
}

function playStation(station) {
  selectStation(station, false);
  audio.src = station.url;
  audio.play()
    .then(() => {
      state.isPlaying = true;
      refs.playPauseBtn.textContent = 'Pause';
      refs.trackStats.textContent = `${station.tags || 'Signal ready'} · streaming now`;
    })
    .catch(() => {
      state.isPlaying = false;
      refs.playPauseBtn.textContent = 'Play';
      showToast('This stream did not start. Try another station.');
    });
}

function pausePlayback() {
  audio.pause();
  state.isPlaying = false;
  refs.playPauseBtn.textContent = 'Play';
}

function togglePlayback() {
  const current = state.allStations.find((station) => station.id === state.selectedId);
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
  renderAll();
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
  refs.refreshStations.addEventListener('click', async () => {
    const defaultLabel = 'Refresh live directory';
    refs.refreshStations.textContent = 'Refreshing...';
    setStatus('Refreshing the live directory...');
    refs.refreshStations.disabled = true;
    try {
      const liveStations = await getLiveStations();
      if (liveStations.length) {
        state.allStations = liveStations;
        state.featuredStations = liveStations.slice().sort((a, b) => (b.votes || 0) - (a.votes || 0)).slice(0, 6);
        state.visibleCount = 18;
        state.activeFilter = 'all';
        state.activeRegion = 'world';
        applyFilters();
        setMode('live', `Live directory loaded with ${liveStations.length.toLocaleString()} stations.`);
      } else {
        setMode('preview', 'Could not reach the live directory, so the curated preview stays active.');
      }
    } catch (error) {
      setMode('preview', 'Could not reach the live directory, so the curated preview stays active.');
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
    if (!map) return;
    const activeStation = state.allStations.find((station) => station.id === state.selectedId);
    if (activeStation) {
      map.flyTo([activeStation.lat, activeStation.lng], Math.max(map.getZoom(), 5), { duration: 0.8 });
      const marker = state.stationLayers.get(activeStation.id);
      if (marker) marker.openPopup();
      return;
    }
    map.flyTo(regionBounds.world.center, regionBounds.world.zoom, { duration: 0.8 });
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

  let resizeTimer;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (map) {
        map.invalidateSize();
      }
    }, 160);
  }, { passive: true });
}

async function boot() {
  initializeMap();
  bindEvents();
  renderAll();
  jumpToRegion('world');
  window.setTimeout(() => map?.invalidateSize(), 120);

  setMode('preview', 'Exploring a curated preview while the live directory loads.');

  try {
    const liveStations = await getLiveStations();
    if (liveStations.length) {
      state.allStations = liveStations;
      state.featuredStations = liveStations.slice().sort((a, b) => (b.votes || 0) - (a.votes || 0)).slice(0, 6);
      state.filteredStations = liveStations.slice();
      state.visibleCount = 18;
      setMode('live', `Live directory loaded with ${liveStations.length.toLocaleString()} stations.`);
      renderAll();
    } else {
      setMode('preview', 'Live lookup failed, so the curated preview stays active.');
    }
  } catch (error) {
    setMode('preview', 'Live lookup failed, so the curated preview stays active.');
  }
}

boot();
