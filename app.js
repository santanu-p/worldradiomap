// Global variables
let stations = [];
let allStations = [];
let markers = [];
let markerClusterGroup;
let currentStation = null;
let isPlaying = false;
let map;
let loadStartTime = Date.now();
let baseLayers = {};
let activeBaseLayerKey = 'dark';
let filteredStations = [];
let activeFilterKey = 'all';
let userLocation = null;
let visualizerReady = false;
let markerLoadSequence = 0;
let filterRequestToken = 0;
let isMobile = false;
let isLowPowerMode = false;

// Detect mobile and low power mode
function detectDeviceCapabilities() {
    isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    // Check for low memory or slow device
    isLowPowerMode = isMobile || (navigator.deviceMemory && navigator.deviceMemory < 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4);
}
detectDeviceCapabilities();
const ATMOS_STORAGE_KEY = 'wrm-atmos-enabled';
const supportsSpatialAudio = typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext);
const atmosEngine = {
    context: null,
    source: null,
    dryGain: null,
    wetGain: null,
    convolver: null,
    stereoPanner: null,
    lfo: null,
    lfoGain: null,
    airFilter: null,
    enabled: false
};

const FEATURED_STATIONS = [
    { name: "BBC Radio 1", country: "United Kingdom", tags: "pop, hits, charts", votes: 9800, geo_lat: 51.5074, geo_long: -0.1278, url_resolved: "http://stream.live.vc.bbcmedia.co.uk/bbc_radio_one", stationuuid: "featured-bbc1" },
    { name: "BBC World Service", country: "United Kingdom", tags: "news, talk, global", votes: 9400, geo_lat: 51.5074, geo_long: -0.1278, url_resolved: "http://stream.live.vc.bbcmedia.co.uk/bbc_world_service", stationuuid: "featured-bbc-world" },
    { name: "BBC 6 Music", country: "United Kingdom", tags: "indie, alternative", votes: 6200, geo_lat: 51.5074, geo_long: -0.1278, url_resolved: "http://stream.live.vc.bbcmedia.co.uk/bbc_6music", stationuuid: "featured-bbc6" },
    { name: "NPR News", country: "United States", tags: "news, talk", votes: 9100, geo_lat: 38.8951, geo_long: -77.0364, url_resolved: "http://npr-ice.streamguys1.com/live.mp3", stationuuid: "featured-npr" },
    { name: "KEXP 90.3 FM", country: "United States", tags: "indie, live sessions", votes: 8600, geo_lat: 47.6062, geo_long: -122.3321, url_resolved: "http://live-aacplus-64.kexp.org/kexp64.aac", stationuuid: "featured-kexp" },
    { name: "Hot 97 New York", country: "United States", tags: "hip hop, urban", votes: 7800, geo_lat: 40.7128, geo_long: -74.006, url_resolved: "https://playerservices.streamtheworld.com/api/livestream-redirect/WQHTFM.mp3", stationuuid: "featured-hot97" },
    { name: "Jazz24", country: "United States", tags: "jazz, smooth", votes: 6500, geo_lat: 47.6205, geo_long: -122.3493, url_resolved: "https://live.wostreaming.net/direct/ppm-jazz24mp3-128", stationuuid: "featured-jazz24" },
    { name: "Classical KING FM", country: "United States", tags: "classical", votes: 5200, geo_lat: 47.6132, geo_long: -122.343, url_resolved: "https://live.wostreaming.net/direct/ppm-classicalkingmp3-128", stationuuid: "featured-king" },
    { name: "KCRW Eclectic 24", country: "United States", tags: "eclectic, alternative", votes: 6100, geo_lat: 34.0195, geo_long: -118.4912, url_resolved: "https://kcrw.streamguys1.com/kcrw_192k_mp3_e24", stationuuid: "featured-kcrw" },
    { name: "Radio Paradise", country: "United States", tags: "adult alternative", votes: 7000, geo_lat: 33.738, geo_long: -116.408, url_resolved: "https://stream.radioparadise.com/aac-320", stationuuid: "featured-radioparadise" },
    { name: "Radio France Internationale", country: "France", tags: "news, world", votes: 5600, geo_lat: 48.8566, geo_long: 2.3522, url_resolved: "https://live02.rfi.fr/rfimonde-64k.mp3", stationuuid: "featured-rfi" },
    { name: "FIP", country: "France", tags: "eclectic, lounge", votes: 6300, geo_lat: 48.8566, geo_long: 2.3522, url_resolved: "http://direct.fipradio.fr/live/fip-midfi.mp3", stationuuid: "featured-fip" },
    { name: "TSF Jazz", country: "France", tags: "jazz", votes: 4800, geo_lat: 48.8566, geo_long: 2.3522, url_resolved: "https://tsfjazz.ice.infomaniak.ch/tsfjazz-high.mp3", stationuuid: "featured-tsf" },
    { name: "Radio 538", country: "Netherlands", tags: "pop, dance", votes: 7200, geo_lat: 52.3676, geo_long: 4.9041, url_resolved: "https://19983.live.streamtheworld.com/RADIO538.mp3", stationuuid: "featured-538" },
    { name: "Radio Veronica", country: "Netherlands", tags: "classic rock", votes: 5100, geo_lat: 52.3702, geo_long: 4.8952, url_resolved: "https://playerservices.streamtheworld.com/api/livestream-redirect/VERONICAAAC.aac", stationuuid: "featured-veronica" },
    { name: "Radio Nova", country: "Ireland", tags: "classic rock", votes: 3900, geo_lat: 53.3498, geo_long: -6.2603, url_resolved: "https://novastream.nova.ie/stream", stationuuid: "featured-nova" },
    { name: "RTÉ 2FM", country: "Ireland", tags: "pop, hits", votes: 5400, geo_lat: 53.3498, geo_long: -6.2603, url_resolved: "https://icecast.rte.ie/2fm", stationuuid: "featured-rte2fm" },
    { name: "SWR3", country: "Germany", tags: "pop, adult contemporary", votes: 5800, geo_lat: 48.761, geo_long: 8.2398, url_resolved: "https://swr-swr3-live.sslcast.addradio.de/swr/swr3/live/aac/128/stream.aac", stationuuid: "featured-swr3" },
    { name: "Radio Swiss Pop", country: "Switzerland", tags: "pop, mix", votes: 4300, geo_lat: 46.948, geo_long: 7.4474, url_resolved: "http://stream.srg-ssr.ch/m/rsp/mp3_128", stationuuid: "featured-rsp" },
    { name: "Radio Swiss Jazz", country: "Switzerland", tags: "jazz", votes: 3600, geo_lat: 46.2044, geo_long: 6.1432, url_resolved: "http://stream.srg-ssr.ch/m/rsj/aacp_96", stationuuid: "featured-rsj" },
    { name: "Radio Mirchi Mumbai", country: "India", tags: "bollywood, hits", votes: 6400, geo_lat: 19.076, geo_long: 72.8777, url_resolved: "https://sc-bb-mirchi-ice.streamguys1.com/mirchi.mp3", stationuuid: "featured-mirchi" },
    { name: "Radio City Freedom", country: "India", tags: "indie, alternative", votes: 3200, geo_lat: 12.9716, geo_long: 77.5946, url_resolved: "https://prclive1.listenon.in/RADIOCITY.mp3", stationuuid: "featured-cityfreedom" },
    { name: "All India Radio", country: "India", tags: "news, culture", votes: 6000, geo_lat: 28.6139, geo_long: 77.209, url_resolved: "http://air.pc.cdn.bitgravity.com/air/live/pbaudio134/playlist.m3u8", stationuuid: "featured-air" },
    { name: "NHK Radio Japan", country: "Japan", tags: "news, talk", votes: 4100, geo_lat: 35.6762, geo_long: 139.6503, url_resolved: "http://nhkradioakr-i.akamaihd.net/hls/live/511633/1-r1/1-r1-01.m3u8", stationuuid: "featured-nhk" },
    { name: "triple j", country: "Australia", tags: "alternative, new music", votes: 6900, geo_lat: -33.8688, geo_long: 151.2093, url_resolved: "https://live-radio01.mediahubaustralia.com/2TJW/mp3/", stationuuid: "featured-triplej" },
    { name: "Double J", country: "Australia", tags: "adult alternative", votes: 4200, geo_lat: -33.8688, geo_long: 151.2093, url_resolved: "https://live-radio01.mediahubaustralia.com/DJDW/mp3/", stationuuid: "featured-doublej" },
    { name: "ABC Classic FM", country: "Australia", tags: "classical", votes: 5000, geo_lat: -33.8688, geo_long: 151.2093, url_resolved: "http://live-radio01.mediahubaustralia.com/2FCW/mp3/", stationuuid: "featured-abc-classic" },
    { name: "CBC Music Toronto", country: "Canada", tags: "adult contemporary", votes: 4700, geo_lat: 43.6532, geo_long: -79.3832, url_resolved: "https://cbcmp3.ic.llnwd.net/stream/cbcmp3_cbc_r2_tor", stationuuid: "featured-cbc2" },
    { name: "Radio Canada Première", country: "Canada", tags: "news, talk", votes: 3600, geo_lat: 45.5017, geo_long: -73.5673, url_resolved: "https://icecast.radio-canada.ca/radiounemtl.mp3", stationuuid: "featured-rc-premiere" },
    { name: "Radio Globo Rio", country: "Brazil", tags: "news, talk", votes: 4400, geo_lat: -22.9068, geo_long: -43.1729, url_resolved: "https://20583.live.streamtheworld.com/RADIO_GLOBOAAC.aac", stationuuid: "featured-globo" },
    { name: "Rádio Mix São Paulo", country: "Brazil", tags: "pop, hits", votes: 5200, geo_lat: -23.5505, geo_long: -46.6333, url_resolved: "https://playerservices.streamtheworld.com/api/livestream-redirect/MIXFMAAC.aac", stationuuid: "featured-mix" },
    { name: "Smooth Jazz Florida", country: "United States", tags: "smooth jazz", votes: 3900, geo_lat: 26.1224, geo_long: -80.1373, url_resolved: "https://us4.internet-radio.com/proxy/smoothjazzflorida?mp=/stream", stationuuid: "featured-sjfl" },
    { name: "RNZ National", country: "New Zealand", tags: "news, culture", votes: 3300, geo_lat: -41.2865, geo_long: 174.7762, url_resolved: "https://radionz-ice.streamguys1.com/national.mp3", stationuuid: "featured-rnz" },
    { name: "Radio 702", country: "South Africa", tags: "news, talk", votes: 3500, geo_lat: -26.2041, geo_long: 28.0473, url_resolved: "https://edge.iono.fm/xice/29_medium.aac", stationuuid: "featured-702" },
    { name: "Radio Wave", country: "Czech Republic", tags: "alternative, culture", votes: 2800, geo_lat: 50.0755, geo_long: 14.4378, url_resolved: "https://icecast8.play.cz/cro2-128.mp3", stationuuid: "featured-wave" },
    { name: "Virgin Radio Dubai", country: "United Arab Emirates", tags: "pop, hits", votes: 3000, geo_lat: 25.2048, geo_long: 55.2708, url_resolved: "https://playerservices.streamtheworld.com/api/livestream-redirect/VIRGIN_RADIOMP3_SC", stationuuid: "featured-virgin-dubai" }
];

const MAP_STYLE_CONFIG = {
    dark: {
        name: 'Neon Dark',
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        options: {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 19,
            detectRetina: true
        }
    },
    light: {
        name: 'Clean Light',
        url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        options: {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 19,
            detectRetina: true
        }
    },
    terrain: {
        name: 'Terrain',
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        options: {
            attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap',
            maxZoom: 17,
            detectRetina: true
        }
    },
    satellite: {
        name: 'Satellite',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        options: {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye',
            maxZoom: 18
        }
    }
};

const REGION_PRESETS = {
    world: { center: [20, 0], zoom: 2 },
    americas: { bounds: [[-55, -170], [72, -30]] },
    europe: { bounds: [[34, -12], [71, 40]] },
    asia: { bounds: [[-5, 60], [60, 150]] },
    africa: { bounds: [[-35, -20], [38, 55]] },
    oceania: { bounds: [[-50, 110], [10, 180]] }
};

// Demo stations fallback (if API is unavailable)
function getDemoStations() {
    return FEATURED_STATIONS.slice(0, 35);
}

const audioPlayer = document.getElementById('audioPlayer');
const playPauseBtn = document.getElementById('playPauseBtn');
const volumeSlider = document.getElementById('volumeSlider');
const playerDiv = document.getElementById('player');
const sidebar = document.getElementById('sidebar');
const loading = document.getElementById('loading');
const stationList = document.getElementById('stationList');
const searchInput = document.getElementById('searchInput');
const visualizer = document.getElementById('musicVisualizer');
const featuredGrid = document.getElementById('featuredGrid');
const shuffleFeaturedBtn = document.getElementById('shuffleFeatured');
const filterStatus = document.getElementById('filterStatus');
const filterChipsContainer = document.getElementById('filterChips');
const clearFiltersBtn = document.getElementById('clearFilters');
const mapStyleControls = document.getElementById('mapStyleControls');
const regionControls = document.getElementById('regionControls');
const mapControlsContainer = document.getElementById('mapControls');
const mapControlsToggle = document.getElementById('mapControlsToggle');
const mapControlsOverlay = document.getElementById('mapControlsOverlay');
const atmosToggle = document.getElementById('atmosToggle');
const atmosStatusLabel = document.getElementById('atmosStatus');

// Set initial volume
audioPlayer.crossOrigin = 'anonymous';
audioPlayer.volume = 0.7;

// Create optimized visualizer effects - lighter on mobile
function createFloatingParticles() {
    visualizer.innerHTML = ''; // Clear existing
    
    // Skip heavy effects on mobile/low-power devices
    if (isLowPowerMode) {
        // Minimal visualizer for mobile - just 2 pulse rings
        for (let i = 0; i < 2; i++) {
            const ring = document.createElement('div');
            ring.className = 'pulse-ring';
            ring.style.animationDelay = (i * 0.8) + 's';
            visualizer.appendChild(ring);
        }
        return;
    }
    
    const colors = ['#00d4ff', '#0095ff', '#00ffcc', '#0080ff', '#00b8e6', '#00e5ff'];
    
    // Reduced floating particles (10 instead of 30)
    const particleCount = 10;
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'floating-particle';
        
        const size = Math.random() * 30 + 10;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const left = Math.random() * 100;
        const top = Math.random() * 100;
        const delay = Math.random() * 4;
        const tx = (Math.random() - 0.5) * 150;
        const ty = (Math.random() - 0.5) * 150;
        
        particle.style.cssText = `width:${size}px;height:${size}px;background:radial-gradient(circle,${color},transparent);left:${left}%;top:${top}%;animation-delay:${delay}s;--tx:${tx}px;--ty:${ty}px;color:${color}`;
        
        visualizer.appendChild(particle);
    }
    
    // Reduced pulse rings (3 instead of 5)
    for (let i = 0; i < 3; i++) {
        const ring = document.createElement('div');
        ring.className = 'pulse-ring';
        ring.style.animationDelay = (i * 0.5) + 's';
        visualizer.appendChild(ring);
    }
    
    // Reduced light streaks (5 instead of 15)
    for (let i = 0; i < 5; i++) {
        const streak = document.createElement('div');
        streak.className = 'light-streak';
        streak.style.cssText = `left:${Math.random() * 100}%;animation-delay:${Math.random() * 2}s;--rotation:${(Math.random() * 30 - 15)}deg`;
        visualizer.appendChild(streak);
    }
    
    // Energy waves (1 layer only - was 3)
    const wave = document.createElement('div');
    wave.className = 'wave';
    visualizer.appendChild(wave);
    
    // Rotating circles (1 circle only - was 3)
    const circle = document.createElement('div');
    circle.className = 'rotating-circle';
    circle.style.cssText = 'width:200px;height:200px';
    visualizer.appendChild(circle);
}

function ensureVisualizerReady() {
    if (!visualizerReady) {
        createFloatingParticles();
        visualizerReady = true;
    }
}

// Initialize map with mobile optimizations
function initMap() {
    const defaultView = REGION_PRESETS.world;
    map = L.map('map', {
        worldCopyJump: true,
        preferCanvas: true,
        zoomSnap: isMobile ? 1 : 0.5,
        // Mobile optimizations
        tap: isMobile,
        touchZoom: true,
        bounceAtZoomLimits: false,
        // Disable animations on mobile for smoother feel
        fadeAnimation: !isMobile,
        zoomAnimation: !isMobile,
        markerZoomAnimation: !isMobile
    }).setView(defaultView.center, defaultView.zoom);

    baseLayers = {};
    Object.entries(MAP_STYLE_CONFIG).forEach(([key, config]) => {
        baseLayers[key] = L.tileLayer(config.url, config.options);
    });
    baseLayers[activeBaseLayerKey].addTo(map);
    map.zoomControl.setPosition('bottomright');
    if (!isMobile) {
        L.control.scale({ position: 'bottomright', maxWidth: 120 }).addTo(map);
    }

    // Initialize marker cluster group with mobile optimizations
    markerClusterGroup = L.markerClusterGroup({
        chunkedLoading: true,
        chunkInterval: isMobile ? 200 : 100,
        chunkDelay: isMobile ? 80 : 30,
        maxClusterRadius: isMobile ? 80 : 50,
        spiderfyOnMaxZoom: !isMobile,
        showCoverageOnHover: !isMobile,
        zoomToBoundsOnClick: true,
        removeOutsideVisibleBounds: true,
        animate: !isMobile,
        animateAddingMarkers: false,
        disableClusteringAtZoom: isMobile ? 10 : 12,
        iconCreateFunction: function(cluster) {
            const count = cluster.getChildCount();
            let size = 'small';
            if (count > 100) size = 'large';
            else if (count > 50) size = 'medium';
            
            return L.divIcon({
                html: '<div><span>' + count + '</span></div>',
                className: 'marker-cluster marker-cluster-' + size,
                iconSize: L.point(40, 40)
            });
        }
    });
    
    map.addLayer(markerClusterGroup);
}

function switchBaseLayer(styleKey) {
    if (!map || !baseLayers[styleKey] || styleKey === activeBaseLayerKey) return;
    baseLayers[activeBaseLayerKey].removeFrom(map);
    baseLayers[styleKey].addTo(map);
    activeBaseLayerKey = styleKey;
}

function setActiveMapStyleButton(styleKey) {
    if (!mapStyleControls) return;
    mapStyleControls.querySelectorAll('.pill').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mapStyle === styleKey);
    });
}

function setActiveRegionButton(regionKey) {
    if (!regionControls) return;
    regionControls.querySelectorAll('.pill').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.region === regionKey);
    });
}

function zoomToRegion(regionKey) {
    if (!map) return;
    const preset = REGION_PRESETS[regionKey];
    if (!preset) return;
    if (preset.bounds) {
        map.fitBounds(preset.bounds, { padding: [40, 40] });
    } else if (preset.center) {
        map.flyTo(preset.center, preset.zoom || 3, { duration: 1.1 });
    }
}

function isMobileViewport() {
    return window.matchMedia('(max-width: 768px)').matches;
}

function setMapPanelVisibility(forceOpen) {
    if (!mapControlsContainer) return;
    const shouldOpen = typeof forceOpen === 'boolean'
        ? forceOpen
        : !mapControlsContainer.classList.contains('open');
    mapControlsContainer.classList.toggle('open', shouldOpen);
    if (mapControlsToggle) {
        mapControlsToggle.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
    }
    if (mapControlsOverlay) {
        mapControlsOverlay.classList.toggle('active', shouldOpen);
    }
}

function closeMobileMapPanel() {
    setMapPanelVisibility(false);
}

function createImpulseResponse(context) {
    const duration = 1.6;
    const sampleRate = context.sampleRate;
    const length = sampleRate * duration;
    const impulse = context.createBuffer(2, length, sampleRate);
    for (let channel = 0; channel < impulse.numberOfChannels; channel++) {
        const buffer = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) {
            buffer[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
        }
    }
    return impulse;
}

function ensureAtmosChain() {
    if (!supportsSpatialAudio) {
        throw new Error('Web Audio API not supported');
    }
    if (atmosEngine.source) {
        return atmosEngine;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const context = atmosEngine.context || new AudioCtx();
    const source = context.createMediaElementSource(audioPlayer);
    const dryGain = context.createGain();
    const wetGain = context.createGain();
    const convolver = context.createConvolver();
    const airFilter = context.createBiquadFilter();
    const stereoPanner = context.createStereoPanner();
    const lfo = context.createOscillator();
    const lfoGain = context.createGain();

    convolver.buffer = createImpulseResponse(context);
    airFilter.type = 'highshelf';
    airFilter.frequency.value = 4200;
    airFilter.gain.value = 0;
    stereoPanner.pan.value = 0;
    lfo.frequency.value = 0.12;
    lfoGain.gain.value = 0;

    lfo.connect(lfoGain).connect(stereoPanner.pan);
    lfo.start();

    dryGain.gain.value = 1;
    wetGain.gain.value = 0;

    source.connect(airFilter);
    airFilter.connect(stereoPanner);

    stereoPanner.connect(dryGain);
    dryGain.connect(context.destination);

    stereoPanner.connect(convolver);
    convolver.connect(wetGain);
    wetGain.connect(context.destination);

    atmosEngine.context = context;
    atmosEngine.source = source;
    atmosEngine.dryGain = dryGain;
    atmosEngine.wetGain = wetGain;
    atmosEngine.convolver = convolver;
    atmosEngine.stereoPanner = stereoPanner;
    atmosEngine.lfo = lfo;
    atmosEngine.lfoGain = lfoGain;
    atmosEngine.airFilter = airFilter;

    return atmosEngine;
}

function updateAtmosUI(statusText) {
    if (!atmosToggle || !atmosStatusLabel) return;
    const state = atmosEngine.enabled;
    atmosToggle.classList.toggle('active', state);
    atmosToggle.setAttribute('aria-pressed', state ? 'true' : 'false');
    atmosStatusLabel.textContent = statusText || (state ? 'On' : 'Off');
}

async function setAtmosEnabled(state) {
    if (!supportsSpatialAudio) return;
    try {
        const engine = ensureAtmosChain();
        await engine.context.resume();
        const now = engine.context.currentTime;
        const targetWet = state ? 0.65 : 0;
        const targetDry = state ? 0.8 : 1;
        const lfoDepth = state ? 0.4 : 0;
        const stereoBias = state ? 0.15 : 0;
        const airLift = state ? 5 : 0;
        engine.wetGain.gain.setTargetAtTime(targetWet, now, 0.05);
        engine.dryGain.gain.setTargetAtTime(targetDry, now, 0.05);
        if (engine.lfoGain) {
            engine.lfoGain.gain.setTargetAtTime(lfoDepth, now, 0.2);
        }
        if (engine.stereoPanner) {
            engine.stereoPanner.pan.setTargetAtTime(stereoBias, now, 0.2);
        }
        if (engine.airFilter) {
            engine.airFilter.gain.setTargetAtTime(airLift, now, 0.2);
        }
        atmosEngine.enabled = state;
        updateAtmosUI(state ? 'Spatial+' : 'Off');
        if (window.localStorage) {
            localStorage.setItem(ATMOS_STORAGE_KEY, state ? 'on' : 'off');
        }
    } catch (error) {
        console.warn('Unable to toggle Atmos feature', error);
        atmosEngine.enabled = false;
        const fallback = error && error.name === 'NotAllowedError' ? 'Tap to enable' : 'Error';
        updateAtmosUI(fallback);
    }
}

function toggleAtmos() {
    setAtmosEnabled(!atmosEngine.enabled);
}

function initializeAtmosFeature() {
    if (!atmosToggle || !atmosStatusLabel) return;
    if (!supportsSpatialAudio) {
        atmosToggle.disabled = true;
        atmosToggle.title = 'Spatial audio is unavailable in this browser.';
        updateAtmosUI('Unsupported');
        return;
    }
    atmosToggle.disabled = false;
    atmosToggle.title = 'Blend a simulated Atmos field into the stream.';
    atmosToggle.addEventListener('click', toggleAtmos);
    let savedPreference = null;
    try {
        if (window.localStorage) {
            savedPreference = localStorage.getItem(ATMOS_STORAGE_KEY);
        }
    } catch (error) {
        console.warn('Unable to read Atmos preference', error);
    }
    if (savedPreference === 'on') {
        updateAtmosUI('Loading...');
        setAtmosEnabled(true);
    } else {
        updateAtmosUI('Off');
    }
}

// IndexedDB caching
const DB_NAME = 'RadioStationsDB';
const DB_VERSION = 1;
const STORE_NAME = 'stations';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Open IndexedDB
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
}

// Get cached stations
async function getCachedStations() {
    try {
        const db = await openDB();
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        
        return new Promise((resolve, reject) => {
            const request = store.get('allStations');
            request.onsuccess = () => {
                const data = request.result;
                if (data && (Date.now() - data.timestamp < CACHE_DURATION)) {
                    resolve(data.stations);
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => resolve(null);
        });
    } catch (error) {
        console.error('Cache read error:', error);
        return null;
    }
}

// Save stations to cache
async function cacheStations(stations) {
    try {
        const db = await openDB();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        store.put({
            id: 'allStations',
            stations: stations,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('Cache write error:', error);
    }
}

// Fetch radio stations from Radio Browser API with caching
async function fetchStations() {
    if (loading) {
        loading.classList.add('active');
        loading.innerHTML = '<div class="spinner"></div>Checking local cache...';
    }
    
    try {
        // Try to load from cache first
        const cached = await getCachedStations();
        
        if (cached && cached.length > 0) {
            console.log(`✅ Loaded ${cached.length} stations from cache`);
            allStations = cached;
            filteredStations = allStations;
            stations = allStations;
            await applyQuickFilter(activeFilterKey || 'all');
            updateStats();
            updateFilterStatus(`${cached.length.toLocaleString()} stations loaded from cache. Checking for fresh updates...`);
            if (loading) loading.classList.remove('active');
            
            // Fetch fresh data in background
            fetchStationsInBackground();
            return;
        }
        
        // No cache - fetch from API
        console.log('No cache found. Fetching from API...');
        if (loading) {
            loading.innerHTML = '<div class="spinner"></div>Loading live stations...';
        }
        await fetchStationsFromAPI();
        
    } catch (error) {
        console.error('Error loading stations:', error);
        if (loading) {
            loading.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <div class="spinner"></div>
                    <div style="margin-top: 10px;">Connection error. Retrying...</div>
                </div>
            `;
        }
        setTimeout(() => fetchStationsFromAPI(), 2000);
    }
}

// Fetch from API
async function fetchStationsFromAPI() {
    const apis = [
        'https://de1.api.radio-browser.info/json/stations/search?order=votes&reverse=true&has_geo_info=true&limit=50000',
        'https://nl1.api.radio-browser.info/json/stations/search?order=votes&reverse=true&has_geo_info=true&limit=50000',
        'https://at1.api.radio-browser.info/json/stations/search?order=votes&reverse=true&has_geo_info=true&limit=50000',
        'https://fr1.api.radio-browser.info/json/stations/search?order=votes&reverse=true&has_geo_info=true&limit=50000'
    ];
    
    // Try each API one by one until one works
    for (let i = 0; i < apis.length; i++) {
        try {
            if (loading) {
                loading.innerHTML = `<div class="spinner"></div>Loading from server ${i + 1}/${apis.length}...`;
            }
            console.log(`Trying API ${i + 1}: ${apis[i]}`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
            
            const response = await fetch(apis[i], { 
                signal: controller.signal,
                mode: 'cors',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`✅ Successfully fetched ${data.length} stations from API ${i + 1}`);
            
            // Filter valid stations
            allStations = data.filter(station => 
                station.geo_lat && 
                station.geo_long && 
                station.url_resolved &&
                Math.abs(station.geo_lat) <= 90 &&
                Math.abs(station.geo_long) <= 180
            );
            
            filteredStations = allStations;
            console.log(`${allStations.length} valid stations with coordinates`);
            
            cacheStations(allStations);
            await applyQuickFilter(activeFilterKey || 'all');
            updateStats();
            updateFilterStatus(`${allStations.length.toLocaleString()} live stations ready to explore.`);
            if (loading) loading.classList.remove('active');
            return; // Success!
            
        } catch (error) {
            console.error(`❌ API ${i + 1} failed:`, error.message);
            
            // If this was the last API, show error
            if (i === apis.length - 1) {
                // All APIs failed - use fallback demo data
                console.warn('All APIs failed. Using fallback demo stations.');
                
                // Load minimal demo stations
                allStations = getDemoStations();
                filteredStations = allStations;
                stations = allStations;
                
                loading.innerHTML = `
                    <div style="text-align: center; padding: 20px; background: rgba(255,165,0,0.1); border-radius: 10px;">
                        <div style="color: #ffa500; font-size: 18px; margin-bottom: 10px;">⚠️ API Connection Issue</div>
                        <div style="font-size: 14px; color: #fff; margin-bottom: 10px;">
                            Could not connect to Radio Browser API.<br>
                            Showing ${allStations.length} demo stations instead.
                        </div>
                        <button onclick="location.reload()" style="margin-top: 10px; padding: 10px 20px; background: #00d4ff; border: none; border-radius: 20px; color: #0a0e27; font-weight: 600; cursor: pointer;">
                            🔄 Try Again
                        </button>
                    </div>
                `;
                
                setTimeout(() => {
                    displayInitialStations(allStations, { clearExisting: true, background: false });
                    displayStationsInSidebar(allStations);
                    updateStats();
                    updateFilterStatus('Showing curated stations while the API is offline.');
                    
                    setTimeout(() => {
                        if (loading) loading.classList.remove('active');
                    }, 2000);
                }, 1000);
                
                return;
            } else {
                // Try next API
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
    }
}

// Fetch fresh data in background (when using cache)
async function fetchStationsInBackground() {
    try {
        const apis = [
            'https://de1.api.radio-browser.info/json/stations/search?order=votes&reverse=true&has_geo_info=true&limit=50000'
        ];
        
        const response = await fetch(apis[0]);
        const data = await response.json();
        
        const freshStations = data.filter(station => 
            station.geo_lat && 
            station.geo_long && 
            station.url_resolved &&
            Math.abs(station.geo_lat) <= 90 &&
            Math.abs(station.geo_long) <= 180
        );
        
        // Update cache
        if (freshStations.length > allStations.length) {
            cacheStations(freshStations);
            console.log('Cache updated with fresh data');
        }
    } catch (error) {
        console.log('Background update failed:', error);
    }
}

function getPopupTemplate(station) {
    const tagsLine = station.tags ? `<div class="popup-station-info">🏷️ ${escapeHtml(station.tags)}</div>` : '';
    const votesLine = station.votes ? `<div class="popup-station-info">👥 Votes: ${station.votes}</div>` : '';
    return `
        <div class="popup-station-name">${escapeHtml(station.name)}</div>
        <div class="popup-station-info">📍 ${escapeHtml(station.country || 'Unknown')}</div>
        ${tagsLine}
        ${votesLine}
        <button class="popup-play-btn" onclick="playStationById('${station.stationuuid}')">▶️ Play Station</button>
    `;
}

function buildMarkerForStation(station) {
    if (!station || typeof station.geo_lat !== 'number' || typeof station.geo_long !== 'number') {
        return null;
    }
    const marker = L.circleMarker([station.geo_lat, station.geo_long], {
        radius: 8,
        fillColor: '#00d4ff',
        color: '#fff',
        weight: 3,
        opacity: 1,
        fillOpacity: 0.85
    });

    marker.bindPopup(getPopupTemplate(station), {
        maxWidth: 250,
        className: 'custom-popup'
    });

    marker.on('mouseover', function() {
        this.setStyle({
            fillColor: '#0095ff',
            fillOpacity: 1,
            radius: 10
        });
    });

    marker.on('mouseout', function() {
        this.setStyle({
            fillColor: '#00d4ff',
            fillOpacity: 0.85,
            radius: 8
        });
    });

    return marker;
}

function displayInitialStations(sourceStations = stations, options = {}) {
    if (!sourceStations || sourceStations.length === 0) return;
    const { clearExisting = false, background = true } = options;
    if (clearExisting) {
        markerLoadSequence += 1;
        markerClusterGroup.clearLayers();
        markers = [];
    }
    const token = markerLoadSequence;

    // Reduce initial batch size on mobile
    const initialBatchSize = isMobile ? 300 : 1000;
    const batch = sourceStations.slice(0, initialBatchSize).map(buildMarkerForStation).filter(Boolean);
    if (!batch.length) return;

    markerClusterGroup.addLayers(batch);
    markers = markers.concat(batch);

    if (background && sourceStations.length > initialBatchSize) {
        // Longer delay on mobile for smoother experience
        const delay = isMobile ? 800 : 400;
        setTimeout(() => loadRemainingStations(initialBatchSize, sourceStations, token), delay);
    }
}

function loadRemainingStations(startIndex, sourceStations = stations, token = markerLoadSequence) {
    if (token !== markerLoadSequence) return;
    // Smaller batches on mobile to prevent jank
    const batchSize = isMobile ? 500 : 2000;
    const batch = sourceStations.slice(startIndex, startIndex + batchSize).map(buildMarkerForStation).filter(Boolean);
    if (!batch.length) return;
    
    // Use requestIdleCallback on supported browsers for smoother loading
    const addBatch = () => {
        markerClusterGroup.addLayers(batch);
        markers = markers.concat(batch);

        if (startIndex + batchSize < sourceStations.length) {
            const delay = isMobile ? 500 : 200;
            setTimeout(() => loadRemainingStations(startIndex + batchSize, sourceStations, token), delay);
        }
    };
    
    if ('requestIdleCallback' in window && !isMobile) {
        requestIdleCallback(addBatch, { timeout: 1000 });
    } else {
        addBatch();
    }
}


// Display stations in sidebar with virtual scrolling
let currentDisplayIndex = 0;
const STATIONS_PER_PAGE = 50;

function displayStationsInSidebar(stationsToDisplay) {
    stationList.innerHTML = '';
    currentDisplayIndex = 0;
    if (!stationsToDisplay || stationsToDisplay.length === 0) {
        const empty = document.createElement('li');
        empty.className = 'station-item';
        empty.innerHTML = `
            <div class="station-name">No stations found</div>
            <div class="station-tags">Try a different search or reset your filters.</div>
        `;
        stationList.appendChild(empty);
        return;
    }
    
    // Reduce initial list on mobile for faster rendering
    const displayLimit = isMobile ? Math.min(stationsToDisplay.length, 50) : Math.min(stationsToDisplay.length, 200);
    
    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    stationsToDisplay.slice(0, displayLimit).forEach(station => {
        const li = createStationListItem(station);
        fragment.appendChild(li);
    });
    stationList.appendChild(fragment);
    
    // Add load more button if needed
    if (stationsToDisplay.length > displayLimit) {
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.className = 'load-more-btn';
        loadMoreBtn.textContent = `Load More (${stationsToDisplay.length - displayLimit} more stations)`;
        loadMoreBtn.onclick = () => {
            const currentCount = stationList.querySelectorAll('.station-item').length;
            const batchSize = isMobile ? 30 : 100;
            const nextBatch = stationsToDisplay.slice(currentCount, currentCount + batchSize);
            
            const fragment = document.createDocumentFragment();
            nextBatch.forEach(station => {
                const li = createStationListItem(station);
                fragment.appendChild(li);
            });
            stationList.insertBefore(fragment, loadMoreBtn);
            
            if (currentCount + batchSize >= stationsToDisplay.length) {
                loadMoreBtn.remove();
            } else {
                loadMoreBtn.textContent = `Load More (${stationsToDisplay.length - currentCount - batchSize} more stations)`;
            }
        };
        stationList.appendChild(loadMoreBtn);
    }
    
    // Add info message
    const info = document.createElement('div');
    info.style.cssText = 'padding: 15px; text-align: center; color: #00d4ff; font-size: 13px;';
    info.textContent = `${stationsToDisplay.length.toLocaleString()} stations available. All are on the map!`;
    stationList.appendChild(info);
}

function renderFeaturedGrid(shuffle = false) {
    if (!featuredGrid) return;
    const pool = FEATURED_STATIONS.slice();
    if (shuffle) {
        pool.sort(() => Math.random() - 0.5);
    }
    const subset = pool.slice(0, 8);
    featuredGrid.innerHTML = '';
    subset.forEach(station => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'featured-card';
        card.innerHTML = `
            <h4>${escapeHtml(station.name)}</h4>
            <span>${escapeHtml(station.country || 'Global')}</span>
        `;
        card.addEventListener('click', () => playStation(station));
        featuredGrid.appendChild(card);
    });
}

function setActiveFilterChip(filterKey) {
    if (!filterChipsContainer) return;
    filterChipsContainer.querySelectorAll('.chip').forEach(chip => {
        chip.classList.toggle('active', chip.dataset.filter === filterKey);
    });
}

function updateFilterStatus(message) {
    if (filterStatus) {
        filterStatus.textContent = message;
    }
}

async function applyQuickFilter(filterKey, options = {}) {
    const { silent = false } = options;
    const token = ++filterRequestToken;
    const baseData = allStations && allStations.length ? allStations : FEATURED_STATIONS;
    let result = baseData;
    let statusMessage = `${baseData.length.toLocaleString()} stations loaded worldwide.`;

    const normalizeTags = (station) => (station.tags || '').toLowerCase();

    switch (filterKey) {
        case 'top':
            result = [...baseData].sort((a, b) => (b.votes || 0) - (a.votes || 0)).slice(0, 200);
            statusMessage = `Top ${result.length} most voted stations.`;
            break;
        case 'music':
            result = baseData.filter(station => /music|pop|rock|dance|soul|indie|alt/.test(normalizeTags(station)));
            statusMessage = `${result.length.toLocaleString()} music-forward stations.`;
            break;
        case 'news':
            result = baseData.filter(station => /news|politic|world|business|finance/.test(normalizeTags(station)));
            statusMessage = `${result.length.toLocaleString()} live news and current affairs stations.`;
            break;
        case 'talk':
            result = baseData.filter(station => /talk|culture|sports|podcast/.test(normalizeTags(station)));
            statusMessage = `${result.length.toLocaleString()} talk, culture, and sports voices.`;
            break;
        case 'electronic':
            result = baseData.filter(station => /electro|edm|house|techno|dance|club/.test(normalizeTags(station)));
            statusMessage = `${result.length.toLocaleString()} electronic and club stations.`;
            break;
        case 'nearby': {
            statusMessage = 'Locating you to show nearby stations...';
            if (!silent) updateFilterStatus(statusMessage);
            try {
                const coords = await ensureUserLocation();
                result = getNearbyStations(coords, 120, baseData);
                statusMessage = result.length ? `Closest ${result.length} stations to you right now.` : 'No nearby stations yet. Showing global picks.';
                if (map && coords) {
                    map.flyTo(coords, 5, { duration: 1.2 });
                }
            } catch (error) {
                console.warn('Location lookup failed:', error);
                setActiveFilterChip('all');
                activeFilterKey = 'all';
                result = baseData;
                statusMessage = 'Location blocked. Showing all stations instead.';
            }
            break;
        }
        default:
            result = baseData;
            statusMessage = `${result.length.toLocaleString()} stations across the globe.`;
    }

    if (token !== filterRequestToken) {
        return result;
    }

    filteredStations = result;
    stations = result;
    displayStationsInSidebar(result);
    updateMapMarkers(result);
    if (!silent) {
        updateFilterStatus(statusMessage);
    }
    return result;
}

function ensureUserLocation() {
    if (userLocation) return Promise.resolve(userLocation);
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported in this browser.'));
            return;
        }
        navigator.geolocation.getCurrentPosition((position) => {
            userLocation = [position.coords.latitude, position.coords.longitude];
            resolve(userLocation);
        }, (error) => {
            reject(error);
        }, {
            enableHighAccuracy: false,
            timeout: 8000,
            maximumAge: 600000
        });
    });
}

function getNearbyStations(coords, limit = 100, dataset = allStations) {
    if (!coords || !dataset) return [];
    const [lat, lng] = coords;
    return dataset
        .filter(station => typeof station.geo_lat === 'number' && typeof station.geo_long === 'number')
        .map(station => ({
            station,
            distance: haversineDistance(lat, lng, station.geo_lat, station.geo_long)
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, limit)
        .map(item => item.station);
}

function haversineDistance(lat1, lon1, lat2, lon2) {
    const toRad = (deg) => deg * (Math.PI / 180);
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}

function primeFeaturedExperience() {
    if (!FEATURED_STATIONS.length) return;
    if (loading) {
        loading.classList.add('active');
        loading.innerHTML = '<div class="spinner"></div>Connecting to the live radio directory...';
    }
    allStations = FEATURED_STATIONS.slice();
    filteredStations = allStations;
    stations = allStations;
    displayInitialStations(allStations, { clearExisting: true, background: false });
    displayStationsInSidebar(allStations);
    updateStats(true);
    updateFilterStatus('Showing curated stations while we fetch the full live directory...');
}

function registerUIBindings() {
    if (shuffleFeaturedBtn) {
        shuffleFeaturedBtn.addEventListener('click', () => renderFeaturedGrid(true));
    }
    if (filterChipsContainer) {
        filterChipsContainer.addEventListener('click', (event) => {
            const chip = event.target.closest('.chip');
            if (!chip) return;
            const filterKey = chip.dataset.filter;
            if (!filterKey || filterKey === activeFilterKey) return;
            activeFilterKey = filterKey;
            setActiveFilterChip(filterKey);
            applyQuickFilter(filterKey);
        });
    }
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            activeFilterKey = 'all';
            setActiveFilterChip('all');
            applyQuickFilter('all');
        });
    }
    if (mapStyleControls) {
        setActiveMapStyleButton(activeBaseLayerKey);
        mapStyleControls.addEventListener('click', (event) => {
            const button = event.target.closest('.pill');
            if (!button) return;
            const styleKey = button.dataset.mapStyle;
            if (!styleKey || styleKey === activeBaseLayerKey) return;
            setActiveMapStyleButton(styleKey);
            switchBaseLayer(styleKey);
            if (isMobileViewport()) closeMobileMapPanel();
        });
    }
    if (regionControls) {
        setActiveRegionButton('world');
        regionControls.addEventListener('click', (event) => {
            const button = event.target.closest('.pill');
            if (!button) return;
            const regionKey = button.dataset.region;
            if (!regionKey) return;
            setActiveRegionButton(regionKey);
            zoomToRegion(regionKey);
            if (isMobileViewport()) closeMobileMapPanel();
        });
    }
    if (mapControlsToggle) {
        mapControlsToggle.addEventListener('click', () => setMapPanelVisibility());
    }
    if (mapControlsOverlay) {
        mapControlsOverlay.addEventListener('click', closeMobileMapPanel);
    }
    
    // Debounced resize handler to update mobile detection
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            detectDeviceCapabilities();
            if (!isMobileViewport()) {
                closeMobileMapPanel();
            }
        }, 250);
    }, { passive: true });
    
    initializeAtmosFeature();
}

function createStationListItem(station) {
    const li = document.createElement('li');
    li.className = 'station-item';
    li.dataset.uuid = station.stationuuid;
    
    li.innerHTML = `
        <div class="station-name">${escapeHtml(station.name)}</div>
        <div class="station-country">📍 ${escapeHtml(station.country || 'Unknown')} ${station.state ? '• ' + escapeHtml(station.state) : ''}</div>
        <div class="station-tags">🏷️ ${escapeHtml(station.tags || 'No tags')} • 👥 ${station.votes || 0} votes</div>
    `;
    
    li.addEventListener('click', () => playStation(station));
    return li;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Play station by ID (called from popup)
window.playStationById = function(uuid) {
    const station = allStations.find(s => s.stationuuid === uuid);
    if (station) {
        playStation(station);
    }
};

// Play station with cleanup
function playStation(station) {
    // Stop any existing playback first
    if (audioPlayer.src) {
        audioPlayer.pause();
        audioPlayer.src = '';
    }
    
    currentStation = station;
    
    // Update player UI
    document.getElementById('playerStationName').textContent = station.name;
    document.getElementById('playerStationMeta').textContent = `${station.country || 'Unknown'} • ${station.tags || 'No tags'}`;
    
    // Show player
    playerDiv.classList.add('active');
    
    // Update station list highlighting - use more efficient method
    const currentPlaying = document.querySelector('.station-item.playing');
    if (currentPlaying) currentPlaying.classList.remove('playing');
    
    const currentItem = document.querySelector(`[data-uuid="${station.stationuuid}"]`);
    if (currentItem) {
        currentItem.classList.add('playing');
        // Use smooth scroll only on desktop
        if (!isMobile) {
            currentItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    
    // Load and play audio
    audioPlayer.src = station.url_resolved;
    audioPlayer.play().then(() => {
        isPlaying = true;
        playPauseBtn.textContent = '⏸️';
        
        // Activate music visualizer
        ensureVisualizerReady();
        visualizer.classList.add('active');
    }).catch(error => {
        console.error('Error playing station:', error);
        alert('Failed to play this station. It might be offline.');
        visualizer.classList.remove('active');
    });

    // Track click
    fetch(`https://de1.api.radio-browser.info/json/url/${station.stationuuid}`).catch(() => {});
}

// Play/Pause control
playPauseBtn.addEventListener('click', () => {
    if (!currentStation) return;
    
    if (isPlaying) {
        audioPlayer.pause();
        playPauseBtn.textContent = '▶️';
        isPlaying = false;
        visualizer.classList.remove('active');
    } else {
        audioPlayer.play();
        playPauseBtn.textContent = '⏸️';
        isPlaying = true;
        visualizer.classList.add('active');
    }
});

// Volume control - passive for better scroll performance
volumeSlider.addEventListener('input', (e) => {
    audioPlayer.volume = e.target.value / 100;
}, { passive: true });

// Toggle sidebar
const sidebarOverlay = document.getElementById('sidebarOverlay');
const closeSidebarBtn = document.getElementById('closeSidebar');

// Hamburger Menu for Mobile
const hamburgerMenu = document.getElementById('hamburgerMenu');
const mobileMenu = document.getElementById('mobileMenu');
const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
const searchInputMobile = document.getElementById('searchInputMobile');
const browseStationsMobile = document.getElementById('browseStationsMobile');
const searchStationsMobile = document.getElementById('searchStationsMobile');
const closeMenuMobile = document.getElementById('closeMenuMobile');

// Toggle mobile menu
hamburgerMenu.addEventListener('click', () => {
    hamburgerMenu.classList.toggle('active');
    mobileMenu.classList.toggle('active');
    mobileMenuOverlay.classList.toggle('active');
});

// Close mobile menu
function closeMobileMenu() {
    hamburgerMenu.classList.remove('active');
    mobileMenu.classList.remove('active');
    mobileMenuOverlay.classList.remove('active');
}

closeMenuMobile.addEventListener('click', closeMobileMenu);
mobileMenuOverlay.addEventListener('click', closeMobileMenu);

// Browse stations from mobile menu
browseStationsMobile.addEventListener('click', () => {
    closeMobileMenu();
    sidebar.classList.add('active');
    sidebarOverlay.classList.add('active');
});

// Search from mobile menu
searchStationsMobile.addEventListener('click', () => {
    searchStations();
    closeMobileMenu();
});

// Mobile search input
searchInputMobile.addEventListener('input', () => {
    searchInput.value = searchInputMobile.value;
    searchStations();
});

// Desktop toggle sidebar
document.getElementById('toggleSidebar').addEventListener('click', () => {
    sidebar.classList.toggle('active');
    sidebarOverlay.classList.toggle('active');
});

// Close sidebar button
closeSidebarBtn.addEventListener('click', () => {
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
});

// Close sidebar when clicking overlay
sidebarOverlay.addEventListener('click', () => {
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
});

// Search functionality with debouncing - longer delay on mobile
let searchTimeout;
function searchStations() {
    clearTimeout(searchTimeout);
    const debounceDelay = isMobile ? 500 : 300;
    searchTimeout = setTimeout(() => {
        const searchLabel = searchInput.value.trim();
        const query = searchLabel.toLowerCase().trim();
        const baseCollection = (filteredStations && filteredStations.length) ? filteredStations : allStations;
        
        if (!query) {
            stations = baseCollection;
            displayStationsInSidebar(baseCollection);
            updateMapMarkers(baseCollection);
            updateFilterStatus(`${baseCollection.length.toLocaleString()} stations with current filters.`);
            return;
        }

        const filtered = baseCollection.filter(station => 
            station.name.toLowerCase().includes(query) ||
            (station.country && station.country.toLowerCase().includes(query)) ||
            (station.state && station.state.toLowerCase().includes(query)) ||
            (station.tags && station.tags.toLowerCase().includes(query))
        );

        stations = filtered;
        displayStationsInSidebar(filtered);
        updateMapMarkers(filtered);
        if (filtered.length) {
            updateFilterStatus(`${filtered.length.toLocaleString()} matches for "${searchLabel}"`);
        } else {
            updateFilterStatus(`No stations matched "${searchLabel}". Try another keyword.`);
        }

        // Zoom to show filtered stations
        if (filtered.length > 0 && filtered.length < 100) {
            const bounds = L.latLngBounds(filtered.map(s => [s.geo_lat, s.geo_long]));
            map.fitBounds(bounds, { padding: [50, 50] });
        }

        sidebar.classList.add('active');
    }, 300);
}

function updateMapMarkers(stationsToShow) {
    if (!stationsToShow || stationsToShow.length === 0) {
        markerClusterGroup.clearLayers();
        markers = [];
        return;
    }

    const shouldBackgroundLoad = stationsToShow.length > 1000;
    displayInitialStations(stationsToShow, {
        clearExisting: true,
        background: shouldBackgroundLoad
    });
}

document.getElementById('searchBtn').addEventListener('click', searchStations);
searchInput.addEventListener('input', searchStations);

// Update stats
function updateStats(isPreview = false) {
    const safeStations = allStations || [];
    const countries = [...new Set(safeStations.map(s => s.country).filter(Boolean))];
    const loadTime = ((Date.now() - loadStartTime) / 1000).toFixed(2);
    const statsNode = document.getElementById('statsContent');
    const loadNode = document.getElementById('loadTime');
    if (statsNode) {
        statsNode.innerHTML = `
            Stations: ${safeStations.length.toLocaleString()}<br>
            Countries: ${countries.length}
        `;
    }
    if (loadNode) {
        loadNode.textContent = isPreview ? 'Warming up live data...' : `Loaded in ${loadTime}s`;
    }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    // Re-detect device on load
    detectDeviceCapabilities();
    
    // Defer non-critical initialization on mobile
    initMap();
    registerUIBindings();
    setActiveFilterChip(activeFilterKey);
    
    if (isMobile) {
        // Delay heavy operations on mobile
        setTimeout(() => {
            renderFeaturedGrid();
            primeFeaturedExperience();
            fetchStations();
        }, 100);
    } else {
        renderFeaturedGrid();
        primeFeaturedExperience();
        fetchStations();
    }
    
    // Register service worker for offline support
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js')
            .then(reg => console.log('Service Worker registered'))
            .catch(err => console.log('Service Worker registration failed:', err));
    }
    
    // Hide visualizer when audio ends or errors
    audioPlayer.addEventListener('ended', () => {
        visualizer.classList.remove('active');
        isPlaying = false;
        playPauseBtn.textContent = '▶️';
    });
    
    audioPlayer.addEventListener('error', () => {
        visualizer.classList.remove('active');
    });
    
    // Close panels when clicking on map or open space (one by one)
    document.addEventListener('click', (e) => {
        // Check if clicked element is the map or map container
        const isMapClick = e.target.id === 'map' || 
                          e.target.classList.contains('leaflet-container') ||
                          e.target.classList.contains('leaflet-pane') ||
                          e.target.classList.contains('leaflet-tile-pane') ||
                          e.target.closest('.leaflet-container');
        
        // Don't close if clicking on player, buttons, or inputs
        const isPlayerClick = e.target.closest('.player');
        const isHeaderClick = e.target.closest('.header');
        const isSidebarClick = e.target.closest('.sidebar');
        const isMobileMenuClick = e.target.closest('.mobile-menu');
        const isButtonClick = e.target.closest('button') || e.target.closest('.btn');
        const isInputClick = e.target.tagName === 'INPUT';
        
        if (isPlayerClick || isHeaderClick || isButtonClick || isInputClick) {
            return; // Don't close anything if clicking on these elements
        }
        
        // Close panels one by one in reverse order (last opened first)
        if (isMapClick || (!isSidebarClick && !isMobileMenuClick)) {
            // First, close sidebar if it's open
            if (sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
                sidebarOverlay.classList.remove('active');
                return; // Stop here, close one at a time
            }
            
            // Then, close mobile menu if it's open
            if (mobileMenu.classList.contains('active')) {
                closeMobileMenu();
                return; // Stop here
            }
        }
    });
});
