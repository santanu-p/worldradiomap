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
  cityVideos
} from './data.js';
import { escapeHtml } from './htmlUtils.js';
import { buildEmbedUrl, resolveCityVideoForStation } from './cityVideos.js';
import { setupServiceWorker } from './pwa.js';

const LIVE_FETCH_TIMEOUT_MS = 20000;
const LIVE_CACHE_KEY = 'world-radio-atlas.live-stations.v6';
const LIVE_CACHE_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours
let isBrowsePage = window.location.pathname.includes('browse.html');
let isVideoPage = window.location.pathname.includes('videos.html');

const state = {
  allStations: fallbackStations.slice(),
  filteredStations: [],
  visibleStationsCount: 40,
  currentStation: null,
  currentContinent: 'all',
  isPlaying: false,
  audio: document.querySelector('#playerAudio'),
  audioCtx: null,
  audioSource: null,
  audioFilters: {},
  currentAudioStyle: 'normal',
  volume: 0.8,
  lastVolume: 0.8,
  map: null,
  clusters: null,
  loadingStations: false
};

// Robust Audio Stream Handling
state.audio.addEventListener('waiting', () => {
  showToast('Buffering stream...');
});

state.audio.addEventListener('playing', () => {
  state.isPlaying = true;
  updateGlobalPlayState();
});

state.audio.addEventListener('pause', () => {
  state.isPlaying = false;
  updateGlobalPlayState();
});

state.audio.addEventListener('error', () => {
  if (state.currentStation) {
    showToast(`Stream error for ${state.currentStation.name}. Please try another.`);
    state.isPlaying = false;
    updateGlobalPlayState();
  }
});

state.audio.addEventListener('stalled', () => {
  if (state.isPlaying && state.currentStation) {
    showToast('Stream connection unstable. Reconnecting...');
    state.audio.load();
    state.audio.play().catch(()=>{});
  }
});

function updateGlobalPlayState() {
  const pbPlayPauseBtn = document.getElementById('pb-play-pause');
  const pauseIcon = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><rect x="5" y="4" width="5" height="16" rx="2"/><rect x="14" y="4" width="5" height="16" rx="2"/></svg>';
  const playIcon = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M7 4v16l12-8z"/></svg>';
  
  if (pbPlayPauseBtn) {
    pbPlayPauseBtn.innerHTML = state.isPlaying ? pauseIcon : playIcon;
  }
  
  if (state.currentStation) {
    highlightActiveStation(state.currentStation.id);
  }
}

let toastTimeout;
function showToast(msg, persistent = false) {
  const toast = document.querySelector('#toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('visible');
  
  clearTimeout(toastTimeout);
  if (!persistent) {
    toastTimeout = setTimeout(() => toast.classList.remove('visible'), 3000);
  }
}

function hideToast() {
  const toast = document.querySelector('#toast');
  if (toast) toast.classList.remove('visible');
}

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

  // Skeleton count bar
  const counter = document.getElementById('station-count');
  if (counter) {
    counter.innerHTML = '<span class="skeleton-count skeleton-base"></span>';
  }

  // Hide load-more while loading
  const loadMoreBtn = document.getElementById('btn-load-more');
  if (loadMoreBtn) loadMoreBtn.style.display = 'none';
}

function updatePlayerBar(station) {
  const bar = document.getElementById('player-bar');
  const name = document.getElementById('pb-name');
  const loc = document.getElementById('pb-location');
  const logo = document.getElementById('pb-logo');
  const btn = document.getElementById('pb-play-pause');

  bar.classList.add('visible');
  name.textContent = station.name;
  loc.textContent = station.city || station.country || '';
  logo.textContent = '';
  const logoInitial = document.createElement('span');
  logoInitial.textContent = station.name.charAt(0).toUpperCase();
  logo.appendChild(logoInitial);
  btn.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><rect x="5" y="4" width="5" height="16" rx="2"/><rect x="14" y="4" width="5" height="16" rx="2"/></svg>';
}

let playTimeoutId = null;

function playStation(station) {
  if (state.currentStation && state.currentStation.id === station.id) {
    if (state.isPlaying) {
      state.audio.pause();
    } else {
      // Safety check for restored sessions
      if (!state.audio.src || state.audio.src === window.location.href) {
        state.audio.src = station.url;
      }
      state.audio.play().catch(() => showToast('Failed to resume playback.'));
    }
    return;
  }

  state.currentStation = station;
  document.body.classList.add('is-playing');
  state.audio.src = station.url;
  state.audio.volume = state.volume;
  state.isPlaying = false;
  
  showToast(`Connecting to: ${station.name}...`);
  updatePlayerBar(station);
  highlightActiveStation(station.id);
  
  // Center map on station if coordinates exist
  if (state.map && station.lat && station.lng) {
    state.map.setView([station.lat, station.lng], 6);
  }
  
  // Timeout for dead streams (10 seconds)
  if (playTimeoutId) clearTimeout(playTimeoutId);
  
  const playPromise = state.audio.play();
  
  playTimeoutId = setTimeout(() => {
    if (!state.isPlaying) {
      state.audio.pause();
      state.audio.src = '';
      showToast('Stream timed out. Station may be offline.');
    }
  }, 10000);

  playPromise
    .then(() => {
      state.isPlaying = true;
      showToast(`Playing: ${station.name}`);
      updateCityVideo(station);
      
      // Persist state for cross-page navigation
      localStorage.setItem('world-radio-atlas.current-station', JSON.stringify(station));
    })
    .catch((err) => {
      clearTimeout(playTimeoutId);
      if (err.name !== 'AbortError') {
        showToast('Could not play this station. Stream offline.');
      }
    });
}

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

  // Show searching state
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
  }

  const videoUrl = video.embedUrl;
  
  // Set up one-time load listener for this specific request
  iframe.onload = () => {
    if (requestId === cityVideoRequestId) {
      wrapper.classList.remove('loading');
    }
  };

  if (videoUrl && iframe.src !== videoUrl) {
    iframe.src = videoUrl;
  } else {
    // If URL is the same, onload won't fire, so remove loading immediately
    wrapper.classList.remove('loading');
  }
  
  wrapper.classList.add('has-video');
  
  if (cityNameEl) cityNameEl.textContent = `Exploring ${locationLabel}`;
  if (stationNameEl) stationNameEl.textContent = `Listening to ${station.name || stationName || 'live radio'}`;
}




function highlightActiveStation(stationId) {
  const pauseIcon = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><rect x="5" y="4" width="5" height="16" rx="1.5"/><rect x="14" y="4" width="5" height="16" rx="1.5"/></svg>';
  const playIcon = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M7 4v16l12-8z"/></svg>';

  // Update all station cards (grid and featured)
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
      btn.innerHTML = (isThisActive && state.isPlaying) ? pauseIcon : playIcon;
    }
  });

  // Update search results
  document.querySelectorAll('.search-result-item').forEach(item => {
    const cardId = item.dataset.stationId;
    const isThisActive = stationId && cardId === stationId;
    
    item.classList.toggle('active', isThisActive);
    const btn = item.querySelector('.sr-play-btn');
    if (btn) {
      btn.innerHTML = (isThisActive && state.isPlaying) ? pauseIcon : playIcon;
    }
  });
}

function updateMapMarkers(stations) {
  if (!state.clusters || !document.getElementById('map')) return;
  state.clusters.clearLayers();
  
  // Featured IDs to show large labels for
  const featuredIds = ['wfmu-new-jersey', 'bbc-world-service', 'fip-france', 'radio-538', 'rthk-radio-3', 'triple-j'];
  const colors = ['sl-blue', 'sl-red', 'sl-purple', 'sl-green', 'sl-yellow', 'sl-blue'];

  stations.forEach((station, index) => {
    if (station.lat === null || station.lng === null) return;
    
    let marker;
    // Show large labels for specific featured stations or a few top ones if from API
    const isFeatured = featuredIds.includes(station.id) || 
                       (stations.length > 5000 && index < 8 && station.lat && station.lng);
    
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
              <span class="sl-name">${escapeHtml(station.name.split(' ').slice(0,3).join(' '))}</span>
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

function initAudioEffect() {
  if (state.audioCtx) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  
  state.audioCtx = new AudioContext();
  state.audioSource = state.audioCtx.createMediaElementSource(state.audio);
  
  // Create filters
  state.audioFilters.bass = state.audioCtx.createBiquadFilter();
  state.audioFilters.bass.type = 'lowshelf';
  state.audioFilters.bass.frequency.value = 150;
  state.audioFilters.bass.gain.value = 0;
  
  state.audioFilters.treble = state.audioCtx.createBiquadFilter();
  state.audioFilters.treble.type = 'highshelf';
  state.audioFilters.treble.frequency.value = 4000;
  state.audioFilters.treble.gain.value = 0;
  
  // Connect graph
  state.audioSource
    .connect(state.audioFilters.bass)
    .connect(state.audioFilters.treble)
    .connect(state.audioCtx.destination);
}

function applyAudioStyle(style) {
  initAudioEffect();
  if (state.audioCtx && state.audioCtx.state === 'suspended') {
    state.audioCtx.resume();
  }
  
  state.currentAudioStyle = style;
  if (!state.audioFilters.bass) return;
  
  // Reset
  state.audioFilters.bass.gain.value = 0;
  state.audioFilters.treble.gain.value = 0;
  
  switch(style) {
    case 'bass':
      state.audioFilters.bass.gain.value = 15;
      break;
    case 'tone':
      state.audioFilters.treble.gain.value = 12;
      break;
    case 'soft':
      state.audioFilters.treble.gain.value = -10;
      state.audioFilters.bass.gain.value = 5;
      break;
    case 'atmos':
      state.audioFilters.bass.gain.value = 8;
      state.audioFilters.treble.gain.value = 8;
      break;
    case 'normal':
    default:
      break;
  }
  showToast(`Audio Style: ${style.charAt(0).toUpperCase() + style.slice(1)}`);
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

  const baseLayer = L.tileLayer(mapStyles.night.url, mapStyles.night.options);
  baseLayer.addTo(mapInstance);

  state.clusters = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 40,
    spiderfyOnMaxZoom: true,
    disableClusteringAtZoom: 16
  });

  updateMapMarkers(state.allStations);

  // Add Custom Map Overlays (Atmosphere controls)
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

  // Auto-invalidate size to fix layout issues
  setTimeout(() => mapInstance.invalidateSize(), 500);
}

function initVideoPage() {
  const suggestionsGrid = document.getElementById('suggestions-grid');
  if (!suggestionsGrid) return;

  const cities = Object.keys(cityVideos).slice(0, 8);
  suggestionsGrid.innerHTML = cities.map(city => `
    <div class="suggestion-card" data-city="${city}">
      <img src="https://images.unsplash.com/photo-1449034446853-66c86144b0ad?auto=format&fit=crop&w=400&q=80" alt="${city}">
      <div class="suggestion-overlay">
        <h4>${city}</h4>
        <p>Watch 4K Atmosphere</p>
      </div>
    </div>
  `).join('');

  suggestionsGrid.querySelectorAll('.suggestion-card').forEach(card => {
    card.addEventListener('click', () => {
      const city = card.dataset.city;
      // Find a station in this city if possible
      const station = state.allStations.find(s => s.city && s.city.includes(city)) || 
                      fallbackStations.find(s => s.city && s.city.includes(city)) || 
                      fallbackStations[0];
      playStation(station);
    });
  });

  // If a station is already playing, sync the video immediately
  if (state.currentStation && state.isPlaying) {
    updateCityVideo(state.currentStation);
  }
}


// --- GLOBAL EVENT LISTENERS (One-time binding) ---
function initGlobalListeners() {
  // Seamless SPA Navigation
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

    // Anchor links (e.g., #about)
    if (href.startsWith('#')) {
      e.preventDefault();
      if (href === '#') {
        showToast(link.textContent.trim() + ' section coming soon!');
        return;
      }
      // If we're NOT on the home page, navigate there first, then scroll
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
      // On the home page, scroll directly to the section
      const target = document.querySelector(href);
      if (target) target.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    // Internal links (Home, Browse, Videos)
    const isInternal = href.startsWith('/') || 
                       href.startsWith(window.location.origin) || 
                       !href.includes('://');

    if (isInternal) {
      const url = new URL(href, window.location.origin);
      const targetPath = url.pathname;
      const currentPath = window.location.pathname;
      
      // If already on the target page, just scroll to top
      if (targetPath === currentPath || (targetPath === '/' && currentPath === '/index.html')) {
        if (url.hash) return; 
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      e.preventDefault();
      navigateTo(href);
    }
  });

  // Global Keydown (Escape for modals)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const overlay = document.getElementById('search-overlay');
      if (overlay?.classList.contains('active')) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
      }
      const mobileNav = document.getElementById('mobile-nav-overlay');
      if (mobileNav?.classList.contains('open')) {
        mobileNav.classList.remove('open');
        document.body.style.overflow = '';
      }
    }
  });

  // Popstate for back/forward buttons
  window.addEventListener('popstate', () => {
    navigateTo(window.location.pathname, false);
  });
}

function bindEvents() {
  // Station Card Play Buttons
  document.querySelectorAll('.st-play').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const name = btn.dataset.stationName;
      let station = state.allStations.find(s => s.name === name);
      if (!station) station = fallbackStations.find(s => s.name === name);
      if (station) playStation(station);
    };
  });

  // Make entire station card clickable
  document.querySelectorAll('.station-card').forEach(card => {
    card.onclick = (e) => {
      if (e.target.closest('button')) return;
      const btn = card.querySelector('.st-play, .st-play-small');
      if (btn) {
        const name = btn.dataset.stationName || card.dataset.stationName;
        const id = card.dataset.stationId;
        let station = state.allStations.find(s => s.id === id || s.name === name);
        if (!station) station = fallbackStations.find(s => s.id === id || s.name === name);
        if (station) playStation(station);
      }
    };
  });

  // Listen Live / Random Station
  const listenLiveBtn = document.querySelector('#nav-listen-live');
  if (listenLiveBtn) listenLiveBtn.onclick = () => {
    if (state.allStations.length > 0) {
      const random = state.allStations[Math.floor(Math.random() * state.allStations.length)];
      playStation(random);
      if (state.map && random.lat) {
        state.map.setView([random.lat, random.lng], 4);
      }
    }
  };

  // Explore Radio
  const exploreBtn = document.querySelector('#btn-explore-radio');
  if (exploreBtn) exploreBtn.onclick = () => {
    if (state.allStations.length > 0) {
      const random = state.allStations[Math.floor(Math.random() * state.allStations.length)];
      playStation(random);
      const mapEl = document.querySelector('#map');
      if (mapEl) {
        mapEl.scrollIntoView({ behavior: 'smooth' });
        if (state.map && random.lat) {
          state.map.setView([random.lat, random.lng], 5);
        }
      }
    }
  };

  // Scroll to map buttons
  const openMapBtn = document.querySelector('#btn-open-map');
  if (openMapBtn) openMapBtn.onclick = () => {
    document.querySelector('#map')?.scrollIntoView({ behavior: 'smooth' });
  };

  const pbCloseBtn = document.getElementById('pb-close-btn');
  if (pbCloseBtn) {
    pbCloseBtn.onclick = (e) => {
      e.stopPropagation();
      state.audio.pause();
      state.audio.src = '';
      state.isPlaying = false;
      state.currentStation = null;
      
      const bar = document.getElementById('player-bar');
      if (bar) bar.classList.remove('visible');
      
      localStorage.removeItem('world-radio-atlas.current-station');
      highlightActiveStation(null);
      document.body.classList.remove('is-playing');
      
      // Also clear city video if any
      const videoWrapper = document.getElementById('video-player-wrapper');
      if (videoWrapper) {
        videoWrapper.classList.remove('has-video');
        videoWrapper.innerHTML = '';
      }
    };
  }

  const pbPlayPauseBtn = document.getElementById('pb-play-pause');
  if (pbPlayPauseBtn) {
    pbPlayPauseBtn.onclick = () => {
      if (!state.currentStation) return;
      
      // Ensure source is set (important for restored sessions)
      if (!state.audio.src || state.audio.src === window.location.href) {
        state.audio.src = state.currentStation.url;
      }

      if (state.isPlaying) {
        state.audio.pause();
      } else {
        state.audio.play().catch((err) => {
          console.error('Playback failed:', err);
          showToast('Failed to resume playback. Try another station.');
        });
      }
    };
  }

  // Nav Actions (Search & Map Theme)
  const iconBtns = document.querySelectorAll('.landing-nav-actions .icon-btn');
  if (iconBtns.length >= 2) {
    const searchBtn = iconBtns[0];
    const themeBtn = iconBtns[1];

    searchBtn.onclick = () => {
      document.getElementById('search-overlay').classList.add('active');
      document.getElementById('global-search-input').focus();
      document.body.style.overflow = 'hidden';
    };

    const closeSearchBtn = document.getElementById('close-search-btn');
    if (closeSearchBtn) closeSearchBtn.onclick = () => {
      document.getElementById('search-overlay').classList.remove('active');
      document.body.style.overflow = '';
    };

    const searchOverlay = document.getElementById('search-overlay');
    if (searchOverlay) searchOverlay.onclick = (e) => {
      if (e.target.id === 'search-overlay') {
        searchOverlay.classList.remove('active');
        document.body.style.overflow = '';
      }
    };

    themeBtn.onclick = () => {
      if (!state.map) {
        showToast("Map theme updated (Go Home to see it)");
        return;
      }
      const layers = [];
      state.map.eachLayer(l => { if (l instanceof L.TileLayer) layers.push(l); });
      const currentUrl = layers[0] ? layers[0]._url : '';
      const newStyle = currentUrl.includes('dark_all') ? 'paper' : 'night';
      
      layers.forEach(l => state.map.removeLayer(l));
      L.tileLayer(mapStyles[newStyle].url, mapStyles[newStyle].options).addTo(state.map);
      if (state.clusters) state.map.addLayer(state.clusters);
      showToast(`Map theme updated to ${mapStyles[newStyle].label}`);
    };
  }

  // Global search input
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
      const matches = state.allStations.filter(s => 
        s.name.toLowerCase().includes(query) || 
        (s.country && s.country.toLowerCase().includes(query)) ||
        (s.city && s.city.toLowerCase().includes(query)) ||
        (s.tags && s.tags.toLowerCase().includes(query))
      ).slice(0, 10);

      const renderMatches = (data) => {
        if (data.length === 0) {
          resultsContainer.innerHTML = '<div class="search-placeholder"><p>No stations found for "' + escapeHtml(query) + '"</p></div>';
          return;
        }
        resultsContainer.innerHTML = data.map(s => {
          const isActive = state.currentStation && state.currentStation.id === s.id;
          return `
            <div class="search-result-item ${isActive ? 'active' : ''}" data-station-id="${escapeHtml(s.id)}">
              <div class="sr-info"><strong>${escapeHtml(s.name)}</strong><span>${escapeHtml(s.city || s.country || '')}</span></div>
              <button class="sr-play-btn">${(isActive && state.isPlaying) ? 'Pause' : 'Play'}</button>
            </div>
          `;
        }).join('');

        resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
          item.onclick = () => {
            const id = item.dataset.stationId;
            let st = state.allStations.find(s => s.id === id) || data.find(s => s.id === id);
            if (st) {
              playStation(st);
              document.getElementById('search-overlay').classList.remove('active');
              document.body.style.overflow = '';
              const m = document.getElementById('map');
              if (m) { m.scrollIntoView({ behavior: 'smooth' }); if (state.map && st.lat) state.map.setView([st.lat, st.lng], 8); }
            }
          };
        });
      };

      if (matches.length > 0) renderMatches(matches);
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(async () => {
        try {
          const res = await fetch(`${API_SERVERS[0]}/json/stations/search?name=${encodeURIComponent(query)}&limit=15`);
          if (res.ok) {
            const raw = await res.json();
            const apiM = raw.map(i => ({ id: i.stationuuid, name: i.name, url: i.url_resolved, favicon: i.favicon, tags: i.tags, lat: i.geo_lat ? Number(i.geo_lat) : null, lng: i.geo_long ? Number(i.geo_long) : null, country: i.country, city: i.state })).filter(s => s.url && s.name);
            const finalM = [...matches, ...apiM.filter(m => !matches.find(ex => ex.id === m.id))].slice(0, 15);
            renderMatches(finalM);
          }
        } catch (err) {}
      }, 500);
    };
  }

  // Grid Navigation
  const nextStBtn = document.querySelector('.btn-next-st');
  if (nextStBtn) nextStBtn.onclick = () => document.querySelector('.stations-grid')?.scrollBy({ left: 320, behavior: 'smooth' });

  // Volume
  const volumeSlider = document.getElementById('pb-volume-slider');
  if (volumeSlider) {
    volumeSlider.value = state.volume;
    volumeSlider.oninput = (e) => {
      state.volume = parseFloat(e.target.value);
      state.audio.volume = state.volume;
      if (state.volume > 0) state.lastVolume = state.volume;
      updateVolumeIcon(state.volume);
    };
  }
  const volumeBtn = document.getElementById('pb-volume-btn');
  if (volumeBtn) volumeBtn.onclick = () => {
    state.volume = state.volume > 0 ? 0 : (state.lastVolume || 0.8);
    state.audio.volume = state.volume;
    if (volumeSlider) volumeSlider.value = state.volume;
    updateVolumeIcon(state.volume);
  };

  // EQ
  const eqBtn = document.getElementById('pb-eq-btn');
  const eqDropdown = document.getElementById('eq-dropdown');
  if (eqBtn && eqDropdown) {
    eqBtn.onclick = (e) => { e.stopPropagation(); eqDropdown.classList.toggle('show'); eqBtn.classList.toggle('active'); };
    document.querySelectorAll('.eq-option').forEach(opt => {
      opt.onclick = (e) => {
        e.stopPropagation();
        const style = opt.dataset.style;
        document.querySelectorAll('.eq-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        applyAudioStyle(style);
        eqDropdown.classList.remove('show');
        eqBtn.classList.remove('active');
      };
    });
  }

  // Map Controls
  document.querySelector('#zoom-in')?.addEventListener('click', () => state.map?.zoomIn());
  document.querySelector('#zoom-out')?.addEventListener('click', () => state.map?.zoomOut());
  document.querySelector('#locate-me')?.addEventListener('click', () => state.map?.locate({ setView: true, maxZoom: 10 }));

  // Browse Page
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
  if (loadMoreBtn) loadMoreBtn.onclick = () => { state.visibleStationsCount += 40; renderAllStations(); };

  // Brand logo
  document.querySelectorAll('.landing-nav-brand').forEach(brand => {
    brand.onclick = (e) => { e.preventDefault(); navigateTo('/'); };
  });

  // Mobile Menu
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  if (mobileToggle) mobileToggle.onclick = () => {
    document.getElementById('mobile-nav-overlay')?.classList.add('open');
    document.body.style.overflow = 'hidden';
  };
  const closeMenuBtn = document.getElementById('close-menu-btn');
  if (closeMenuBtn) closeMenuBtn.onclick = () => {
    document.getElementById('mobile-nav-overlay')?.classList.remove('open');
    document.body.style.overflow = '';
  };

  document.querySelectorAll('.mobile-nav-content a').forEach(link => {
    link.onclick = () => {
      document.getElementById('mobile-nav-overlay')?.classList.remove('open');
      document.body.style.overflow = '';
    };
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


function applyFilters() {
  const query = document.getElementById('station-search')?.value.toLowerCase() || '';
  
  state.filteredStations = state.allStations.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(query) || 
                          (s.country && s.country.toLowerCase().includes(query)) ||
                          (s.city && s.city.toLowerCase().includes(query)) ||
                          (s.tags && s.tags.toLowerCase().includes(query));
    
    if (state.currentContinent === 'all') return matchesSearch;
    
    const continent = countryToContinent[s.country] || 'Other';
    return matchesSearch && continent === state.currentContinent;
  });

  state.visibleStationsCount = 40;
  renderAllStations();

  // Hide loading overlay once filtered/data is ready
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 400);
  }
}

function updateStationCount(total, showing) {
  const counter = document.getElementById('station-count');
  if (counter) {
    counter.textContent = `Showing ${showing.toLocaleString()} of ${total.toLocaleString()} stations`;
  }
}

function renderAllStations() {
  const grid = document.getElementById('all-stations-grid');
  if (!grid) return;

  // If grid still holds skeletons, fade them out before painting real cards
  if (grid.querySelector('.skeleton-card')) {
    grid.style.opacity = '0';
    grid.style.transition = 'opacity 0.25s ease';
    requestAnimationFrame(() => {
      _doRenderAllStations(grid);
      grid.style.opacity = '1';
    });
    return;
  }
  _doRenderAllStations(grid);
}

function _doRenderAllStations(grid) {
  const isFiltered = state.currentContinent !== 'all' || document.getElementById('station-search')?.value;
  const stations = (state.filteredStations.length > 0 || isFiltered)
    ? state.filteredStations 
    : state.allStations;

  const toRender = stations.slice(0, state.visibleStationsCount);
  
  // Update station count
  updateStationCount(stations.length, toRender.length);

  // Show/hide load more button
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
    const stationInitial = name.charAt(0).toUpperCase();
    const logoContent = s.favicon
      ? `<img src="${escapeHtml(s.favicon)}" alt="${escapeHtml(name)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block'" style="width:100%;height:100%;object-fit:cover;border-radius:4px;"><span style="display:none; font-size:24px; font-weight:800;">${escapeHtml(stationInitial)}</span>`
      : `<span style="font-size:24px; font-weight:800;">${escapeHtml(stationInitial)}</span>`;
    
    return `
      <div class="station-card list-card ${isActive ? 'active' : ''}" data-station-id="${escapeHtml(s.id)}" data-station-name="${escapeHtml(name)}">
        <div class="st-logo" style="background: ${getRandomColor()}; color: #fff;">
          ${logoContent}
        </div>
        <div class="st-info">
          <h4>${escapeHtml(name.split(' ').slice(0,4).join(' '))}</h4>
          <span class="st-loc">${escapeHtml(cityOrCountry)}</span>
          <span class="st-genre">${escapeHtml(primaryTag)}</span>
        </div>
        <div class="st-actions">
          <button class="st-play-small">
            ${isActive ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>' : '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>'}
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Add listener for cards in grid
  grid.querySelectorAll('.station-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.stationId;
      const station = state.allStations.find(s => s.id === id);
      if (station) playStation(station);
    });
  });
}

function getRandomColor() {
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4'];
  return colors[Math.floor(Math.random() * colors.length)];
}

async function fetchLiveStations() {
  if (state.loadingStations) return;
  state.loadingStations = true;

  // Normalize raw API item to our format
  function normalize(item) {
    let lat = item.geo_lat ? Number(item.geo_lat) : null;
    let lng = item.geo_long ? Number(item.geo_long) : null;

    // Fallback to country centroid if missing exact coordinates
    if (lat === null || lng === null) {
      const centroid = countryCentroids[item.country];
      if (centroid) {
        lat = centroid[0];
        lng = centroid[1];
      }
    }

    return {
      id: item.stationuuid,
      name: item.name,
      url: item.url_resolved,
      favicon: item.favicon,
      tags: item.tags,
      lat: lat,
      lng: lng,
      country: item.country,
      city: item.state
    };
  }

    // Try IndexedDB cache first
    try {
      const cached = await loadFromIDB();
      // Force refresh if cache has less than 50k stations (user likely has old 11k cache)
      if (cached && cached.length > 50000) {
        console.log(`✅ Loaded ${cached.length.toLocaleString()} stations from cache`);
        state.allStations = cached;
        updateMapMarkers(cached);
        applyFilters();
        // Removed the toast here to make it silent on page change
        
        // Refresh in background if needed (silent)
        refreshInBackground();
        state.loadingStations = false;
        return;
      }
    } catch (e) {
      console.warn('IDB cache miss', e);
    }
  
    // Only show toast if we are actually starting a network fetch
    showToast('Loading more radio stations...', true);
  
  for (const server of API_SERVERS) {
    try {
      const allData = [];
      const PAGE_SIZE = 25000;
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const url = `${server}/json/stations/search?order=votes&reverse=true&limit=${PAGE_SIZE}&offset=${offset}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), LIVE_FETCH_TIMEOUT_MS);
        
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const page = await response.json();
        
        allData.push(...page);
        
        if (page.length < PAGE_SIZE) {
          hasMore = false;
        } else {
          offset += PAGE_SIZE;
          showToast(`Loading more radio stations... (${allData.length.toLocaleString()} so far)`, true);
        }
      }

      if (allData.length < 100) continue; // Too few, try next server

      const normalized = allData
        .map(normalize)
        .filter(s => s.url && s.name);

      console.log(`✅ Fetched ${normalized.length.toLocaleString()} stations from ${server}`);
      
      state.allStations = normalized;
      updateMapMarkers(normalized);
      applyFilters();
      showToast(`${normalized.length.toLocaleString()} radio stations loaded!`);
      
      // Persist to IDB
      saveToIDB(normalized);
      state.loadingStations = false;
      return;

    } catch (e) {
      console.warn(`Server ${server} failed:`, e.message);
    }
  }

  // All servers failed — use fallback
  console.warn('All API servers failed, using fallback stations');
  showToast('Using curated stations (API unavailable)');
  state.loadingStations = false;
}

// --- IndexedDB helpers for caching all stations ---
const IDB_NAME = 'WorldRadioAtlasDB';
const IDB_VERSION = 1;
const IDB_STORE = 'stationCache';

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'key' });
      }
    };
  });
}

async function loadFromIDB() {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get('all');
    req.onsuccess = () => {
      const row = req.result;
      if (row && (Date.now() - row.ts < LIVE_CACHE_DURATION_MS)) {
        resolve(row.data);
      } else {
        resolve(null);
      }
    };
    req.onerror = () => resolve(null);
  });
}

async function saveToIDB(stations) {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put({ key: 'all', data: stations, ts: Date.now() });
  } catch (e) {
    console.warn('IDB save failed', e);
  }
}

async function refreshInBackground() {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get('all');
    req.onsuccess = async () => {
      const row = req.result;
      if (!row || (Date.now() - row.ts > LIVE_CACHE_DURATION_MS)) {
        console.log('Background refresh: cache expired, will refresh on next load');
      }
    };
  } catch (e) { /* ignore */ }
}



setTimeout(() => {
  initializeMap();
  initGlobalListeners();
  bindEvents();

  if (isBrowsePage) {
    renderSkeletons(40);
    fetchLiveStations();
  } else if (isVideoPage) {
    initVideoPage();
    fetchLiveStations();
  } else {
    // Only fetch if not already loaded
    if (state.allStations.length < 500) {
      setTimeout(() => fetchLiveStations(), 2000);
    }
  }

  // Restore state if available
  const savedStation = localStorage.getItem('world-radio-atlas.current-station');
  if (savedStation) {
    try {
      const station = JSON.parse(savedStation);
      updatePlayerBar(station);
      state.currentStation = station;
      updateCityVideo(station);
      
      // Initialize audio source but stay paused
      state.audio.src = station.url;
      state.audio.preload = 'none'; // Don't waste data until user clicks play
      state.audio.pause();
      state.isPlaying = false;
      
      const btn = document.getElementById('pb-play-pause');
      if (btn) btn.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
    } catch (e) {
      console.error('Failed to restore station:', e);
    }
  }
}, 0);


setupServiceWorker();

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

    // Update URL and Title
    if (push) window.history.pushState({}, '', url);
    document.title = doc.title;

    // Smooth Transition
    currentContent.style.opacity = '0';
    currentContent.style.transition = 'opacity 0.15s ease';

    await new Promise(resolve => setTimeout(() => {
      // Replace Content
      currentContent.innerHTML = newContent.innerHTML;
      
      // Update State
      isBrowsePage = window.location.pathname.includes('browse.html');
      isVideoPage = window.location.pathname.includes('videos.html');

      // Update Nav Active States
      document.querySelectorAll('.landing-nav-links a, .mobile-nav-content a').forEach(navLink => {
        const linkHref = navLink.getAttribute('href');
        const isActive = (linkHref === '/' && (window.location.pathname === '/' || window.location.pathname === '/index.html')) || 
                         (linkHref !== '/' && linkHref && window.location.pathname.includes(linkHref));
        navLink.classList.toggle('active', isActive);
      });

      // Fade in
      currentContent.style.opacity = '1';

      // Re-initialize logic
      if (isBrowsePage) {
        renderSkeletons(40);
        // Only fetch if we don't have enough stations
        if (state.allStations.length < 500) {
          fetchLiveStations();
        } else {
          applyFilters();
        }
      } else if (isVideoPage) {
        initVideoPage();
      } else {
        initializeMap();
      }

      // Re-bind events for new content
      bindEvents();
      
      // Scroll to top
      window.scrollTo(0, 0);

      resolve();
    }, 150));

  } catch (err) {
    console.error('Navigation failed:', err);
    window.location.href = url;
  }
}
