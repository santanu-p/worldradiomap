// Global variables
let stations = [];
let allStations = [];
let markers = [];
let markerClusterGroup;
let currentStation = null;
let isPlaying = false;
let map;
let loadStartTime = Date.now();

// Demo stations fallback (if API is unavailable)
function getDemoStations() {
    return [
        {name:"BBC Radio 1",country:"United Kingdom",tags:"pop, music",votes:5000,geo_lat:51.5074,geo_long:-0.1278,url_resolved:"http://stream.live.vc.bbcmedia.co.uk/bbc_radio_one",stationuuid:"demo-bbc1"},
        {name:"NPR News",country:"USA",tags:"news, talk",votes:4500,geo_lat:38.8951,geo_long:-77.0364,url_resolved:"http://npr-ice.streamguys1.com/live.mp3",stationuuid:"demo-npr"},
        {name:"France Inter",country:"France",tags:"news, talk, culture",votes:4000,geo_lat:48.8566,geo_long:2.3522,url_resolved:"http://direct.franceinter.fr/live/franceinter-midfi.mp3",stationuuid:"demo-france"},
        {name:"Deutschlandfunk",country:"Germany",tags:"news, culture",votes:3800,geo_lat:52.5200,geo_long:13.4050,url_resolved:"http://st01.dlf.de/dlf/01/128/mp3/stream.mp3",stationuuid:"demo-dlf"},
        {name:"Radio Nacional",country:"Argentina",tags:"news, music",votes:3500,geo_lat:-34.6037,geo_long:-58.3816,url_resolved:"http://sa.mp3.icecast.magma.edge-access.net:7200/sc_rad1",stationuuid:"demo-argentina"},
        {name:"ABC Classic FM",country:"Australia",tags:"classical",votes:3200,geo_lat:-33.8688,geo_long:151.2093,url_resolved:"http://live-radio01.mediahubaustralia.com/2FCW/mp3/",stationuuid:"demo-abc"},
        {name:"NHK Radio Japan",country:"Japan",tags:"news, culture",votes:3000,geo_lat:35.6762,geo_long:139.6503,url_resolved:"http://nhkradioakr-i.akamaihd.net/hls/live/511633/1-r1/1-r1-01.m3u8",stationuuid:"demo-nhk"},
        {name:"CBC Radio One",country:"Canada",tags:"news, talk",votes:2800,geo_lat:45.4215,geo_long:-75.6972,url_resolved:"http://cbcliveradio-lh.akamaihd.net/i/CBCR1_MTL@382863/master.m3u8",stationuuid:"demo-cbc"},
        {name:"RTÉ Radio 1",country:"Ireland",tags:"news, talk",votes:2500,geo_lat:53.3498,geo_long:-6.2603,url_resolved:"http://icecast1.rte.ie/radio1",stationuuid:"demo-rte"},
        {name:"Radio España",country:"Spain",tags:"music, pop",votes:2300,geo_lat:40.4168,geo_long:-3.7038,url_resolved:"http://listen.011fm.com/stream28",stationuuid:"demo-spain"},
        {name:"Radio Moscow",country:"Russia",tags:"news, talk",votes:2200,geo_lat:55.7558,geo_long:37.6173,url_resolved:"http://icecast-studio21.cdnvideo.ru/radio21_96kbps",stationuuid:"demo-moscow"},
        {name:"All India Radio",country:"India",tags:"news, music",votes:2000,geo_lat:28.6139,geo_long:77.2090,url_resolved:"http://air.pc.cdn.bitgravity.com/air/live/pbaudio134/playlist.m3u8",stationuuid:"demo-india"},
        {name:"Radio China",country:"China",tags:"news, culture",votes:1900,geo_lat:39.9042,geo_long:116.4074,url_resolved:"http://sk.cri.cn/am846.m3u8",stationuuid:"demo-china"},
        {name:"Radio Cairo",country:"Egypt",tags:"news, music",votes:1800,geo_lat:30.0444,geo_long:31.2357,url_resolved:"http://livestreaming2.onlinehorizons.net/Shaabi",stationuuid:"demo-egypt"},
        {name:"Radio Brasil",country:"Brazil",tags:"music, samba",votes:1700,geo_lat:-23.5505,geo_long:-46.6333,url_resolved:"http://8903.brasilstream.com.br:8903/stream",stationuuid:"demo-brazil"},
        {name:"Radio South Africa",country:"South Africa",tags:"news, music",votes:1600,geo_lat:-33.9249,geo_long:18.4241,url_resolved:"http://41445.live.streamtheworld.com/METRO_FM_SC",stationuuid:"demo-sa"},
        {name:"Radio Mexico",country:"Mexico",tags:"music, latin",votes:1500,geo_lat:19.4326,geo_long:-99.1332,url_resolved:"http://playerservices.streamtheworld.com/api/livestream-redirect/XHFMFMAAC.aac",stationuuid:"demo-mexico"},
        {name:"Radio Italia",country:"Italy",tags:"music, pop",votes:1400,geo_lat:41.9028,geo_long:12.4964,url_resolved:"http://icecast.unitedradio.it/RID.mp3",stationuuid:"demo-italy"},
        {name:"Radio Amsterdam",country:"Netherlands",tags:"music, dance",votes:1300,geo_lat:52.3676,geo_long:4.9041,url_resolved:"http://icecast-qmusicnl-cdp.triple-it.nl/Qmusic_nl_live.mp3",stationuuid:"demo-nl"},
        {name:"Radio Sweden",country:"Sweden",tags:"pop, music",votes:1200,geo_lat:59.3293,geo_long:18.0686,url_resolved:"http://sverigesradio.se/topsy/direkt/164-hi-mp3.m3u",stationuuid:"demo-sweden"}
    ];
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

// Set initial volume
audioPlayer.volume = 0.7;

// Create cool fast visualizer effects
function createFloatingParticles() {
    visualizer.innerHTML = ''; // Clear existing
    
    const colors = ['#00d4ff', '#0095ff', '#00ffcc', '#0080ff', '#00b8e6', '#00e5ff'];
    
    // Fast floating particles (30 particles)
    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'floating-particle';
        
        const size = Math.random() * 40 + 10;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const left = Math.random() * 100;
        const top = Math.random() * 100;
        const delay = Math.random() * 4;
        const tx = (Math.random() - 0.5) * 200;
        const ty = (Math.random() - 0.5) * 200;
        
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        particle.style.background = `radial-gradient(circle, ${color}, transparent)`;
        particle.style.left = left + '%';
        particle.style.top = top + '%';
        particle.style.animationDelay = delay + 's';
        particle.style.setProperty('--tx', tx + 'px');
        particle.style.setProperty('--ty', ty + 'px');
        particle.style.color = color;
        
        visualizer.appendChild(particle);
    }
    
    // Fast pulse rings (5 rings)
    for (let i = 0; i < 5; i++) {
        const ring = document.createElement('div');
        ring.className = 'pulse-ring';
        ring.style.animationDelay = (i * 0.3) + 's';
        visualizer.appendChild(ring);
    }
    
    // Light streaks (15 streaks)
    for (let i = 0; i < 15; i++) {
        const streak = document.createElement('div');
        streak.className = 'light-streak';
        streak.style.left = Math.random() * 100 + '%';
        streak.style.animationDelay = Math.random() * 2 + 's';
        streak.style.setProperty('--rotation', (Math.random() * 30 - 15) + 'deg');
        visualizer.appendChild(streak);
    }
    
    // Energy waves (3 layers)
    for (let i = 0; i < 3; i++) {
        const wave = document.createElement('div');
        wave.className = 'wave';
        wave.style.animationDelay = (i * 1) + 's';
        wave.style.opacity = 0.3 - (i * 0.1);
        visualizer.appendChild(wave);
    }
    
    // Rotating circles (3 circles)
    for (let i = 0; i < 3; i++) {
        const circle = document.createElement('div');
        circle.className = 'rotating-circle';
        circle.style.animationDelay = (i * 2.6) + 's';
        circle.style.width = (200 + i * 100) + 'px';
        circle.style.height = (200 + i * 100) + 'px';
        visualizer.appendChild(circle);
    }
}

createFloatingParticles();

// Initialize map
function initMap() {
    map = L.map('map').setView([20, 0], 2);
    
    // Add tile layer with dark theme
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    // Initialize marker cluster group
    markerClusterGroup = L.markerClusterGroup({
        chunkedLoading: true,
        chunkInterval: 100,
        chunkDelay: 30,
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: true,
        zoomToBoundsOnClick: true,
        removeOutsideVisibleBounds: false,
        animate: true,
        animateAddingMarkers: false,
        disableClusteringAtZoom: 12,
        iconCreateFunction: function(cluster) {
            const count = cluster.getChildCount();
            let size = 'small';
            if (count > 100) size = 'large';
            else if (count > 50) size = 'medium';
            
            return L.divIcon({
                html: '<div><span>' + count + '</span></div>',
                className: 'marker-cluster marker-cluster-' + size,
                iconSize: L.point(48, 48)
            });
        }
    });
    
    map.addLayer(markerClusterGroup);
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
    loading.classList.add('active');
    loading.innerHTML = '<div class="spinner"></div>Checking cache...';
    
    try {
        // Try to load from cache first
        const cached = await getCachedStations();
        
        if (cached && cached.length > 0) {
            console.log(`✅ Loaded ${cached.length} stations from cache`);
            allStations = cached;
            stations = allStations;
            
            // Quick display - show initial batch immediately
            loading.innerHTML = '<div class="spinner"></div>Loading from cache...';
            displayInitialStations();
            displayStationsInSidebar(stations.slice(0, 200));
            updateStats();
            loading.classList.remove('active');
            
            // Fetch fresh data in background
            fetchStationsInBackground();
            return;
        }
        
        // No cache - fetch from API
        console.log('No cache found. Fetching from API...');
        loading.innerHTML = '<div class="spinner"></div>Loading stations from internet...';
        await fetchStationsFromAPI();
        
    } catch (error) {
        console.error('Error loading stations:', error);
        loading.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <div class="spinner"></div>
                <div style="margin-top: 10px;">Connection error. Retrying...</div>
            </div>
        `;
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
            loading.innerHTML = `<div class="spinner"></div>Loading from server ${i + 1}/${apis.length}...`;
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
            
            stations = allStations;
            console.log(`${allStations.length} valid stations with coordinates`);
            
            // Cache for next time
            cacheStations(allStations);
            
            // Display quickly
            displayInitialStations();
            displayStationsInSidebar(stations.slice(0, 200));
            updateStats();
            loading.classList.remove('active');
            return; // Success!
            
        } catch (error) {
            console.error(`❌ API ${i + 1} failed:`, error.message);
            
            // If this was the last API, show error
            if (i === apis.length - 1) {
                // All APIs failed - use fallback demo data
                console.warn('All APIs failed. Using fallback demo stations.');
                
                // Load minimal demo stations
                allStations = getDemoStations();
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
                    displayInitialStations();
                    displayStationsInSidebar(stations);
                    updateStats();
                    
                    setTimeout(() => {
                        loading.classList.remove('active');
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

// Display initial stations quickly (only 1000 on map initially)
function displayInitialStations() {
    const initialBatch = stations.slice(0, 1000);
    const markers = [];
    
    initialBatch.forEach(station => {
        const marker = L.circleMarker([station.geo_lat, station.geo_long], {
            radius: 8,
            fillColor: '#00d4ff',
            color: '#fff',
            weight: 3,
            opacity: 1,
            fillOpacity: 0.85
        });

        const popupContent = `
            <div class="popup-station-name">${escapeHtml(station.name)}</div>
            <div class="popup-station-info">📍 ${escapeHtml(station.country || 'Unknown')}</div>
            <div class="popup-station-info">🏷️ ${escapeHtml(station.tags || 'No tags')}</div>
            <div class="popup-station-info">👥 Votes: ${station.votes || 0}</div>
            <button class="popup-play-btn" onclick="playStationById('${station.stationuuid}')">▶️ Play Station</button>
        `;
        
        marker.bindPopup(popupContent, {
            maxWidth: 250,
            className: 'custom-popup'
        });
        
        // Add hover effect
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
        
        markers.push(marker);
    });
    
    markerClusterGroup.addLayers(markers);
    
    // Load remaining stations in background
    if (stations.length > 1000) {
        setTimeout(() => loadRemainingStations(1000), 500);
    }
}

// Load remaining stations in background
function loadRemainingStations(startIndex) {
    const batchSize = 2000;
    const batch = stations.slice(startIndex, startIndex + batchSize);
    
    if (batch.length === 0) return;
    
    const markers = [];
    batch.forEach(station => {
        const marker = L.circleMarker([station.geo_lat, station.geo_long], {
            radius: 8,
            fillColor: '#00d4ff',
            color: '#fff',
            weight: 3,
            opacity: 1,
            fillOpacity: 0.85
        });

        const popupContent = `
            <div class="popup-station-name">${escapeHtml(station.name)}</div>
            <div class="popup-station-info">📍 ${escapeHtml(station.country || 'Unknown')}</div>
            <div class="popup-station-info">🏷️ ${escapeHtml(station.tags || 'No tags')}</div>
            <button class="popup-play-btn" onclick="playStationById('${station.stationuuid}')">▶️ Play Station</button>
        `;
        
        marker.bindPopup(popupContent, {
            maxWidth: 250,
            className: 'custom-popup'
        });
        
        // Add hover effect
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
        
        markers.push(marker);
    });
    
    markerClusterGroup.addLayers(markers);
    
    // Load next batch
    if (startIndex + batchSize < stations.length) {
        setTimeout(() => loadRemainingStations(startIndex + batchSize), 200);
    }
}

// Display stations on map in batches using clustering
async function displayStationsOnMapBatched() {
    return new Promise((resolve) => {
        const batchSize = 500;
        let currentIndex = 0;
        
        function processBatch() {
            const batch = stations.slice(currentIndex, currentIndex + batchSize);
            const newMarkers = [];
            
            batch.forEach(station => {
                const marker = L.circleMarker([station.geo_lat, station.geo_long], {
                    radius: 6,
                    fillColor: '#00d4ff',
                    color: '#fff',
                    weight: 2,
                    opacity: 0.9,
                    fillOpacity: 0.7
                });

                // Create popup
                const popupContent = `
                    <div class="popup-station-name">${escapeHtml(station.name)}</div>
                    <div class="popup-station-info">📍 ${escapeHtml(station.country || 'Unknown')}</div>
                    <div class="popup-station-info">🏷️ ${escapeHtml(station.tags || 'No tags')}</div>
                    <div class="popup-station-info">👥 Votes: ${station.votes || 0}</div>
                    <button class="popup-play-btn" onclick="playStationById('${station.stationuuid}')">▶️ Play</button>
                `;
                
                marker.bindPopup(popupContent);
                newMarkers.push(marker);
            });
            
            // Add batch to cluster group
            markerClusterGroup.addLayers(newMarkers);
            markers = markers.concat(newMarkers);
            
            currentIndex += batchSize;
            
            // Update loading message
            const progress = Math.min(100, Math.round((currentIndex / stations.length) * 100));
            loading.innerHTML = `<div class="spinner"></div>Loading stations: ${progress}%`;
            
            if (currentIndex < stations.length) {
                // Process next batch
                setTimeout(processBatch, 50);
            } else {
                resolve();
            }
        }
        
        processBatch();
    });
}

// Display stations in sidebar with virtual scrolling
let currentDisplayIndex = 0;
const STATIONS_PER_PAGE = 50;

function displayStationsInSidebar(stationsToDisplay) {
    stationList.innerHTML = '';
    currentDisplayIndex = 0;
    
    const displayLimit = Math.min(stationsToDisplay.length, 200);
    
    stationsToDisplay.slice(0, displayLimit).forEach(station => {
        const li = createStationListItem(station);
        stationList.appendChild(li);
    });
    
    // Add load more button if needed
    if (stationsToDisplay.length > displayLimit) {
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.className = 'load-more-btn';
        loadMoreBtn.textContent = `Load More (${stationsToDisplay.length - displayLimit} more stations)`;
        loadMoreBtn.onclick = () => {
            const currentCount = stationList.querySelectorAll('.station-item').length;
            const nextBatch = stationsToDisplay.slice(currentCount, currentCount + 100);
            
            nextBatch.forEach(station => {
                const li = createStationListItem(station);
                stationList.insertBefore(li, loadMoreBtn);
            });
            
            if (currentCount + 100 >= stationsToDisplay.length) {
                loadMoreBtn.remove();
            } else {
                loadMoreBtn.textContent = `Load More (${stationsToDisplay.length - currentCount - 100} more stations)`;
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

// Play station
function playStation(station) {
    currentStation = station;
    
    // Update player UI
    document.getElementById('playerStationName').textContent = station.name;
    document.getElementById('playerStationMeta').textContent = `${station.country || 'Unknown'} • ${station.tags || 'No tags'}`;
    
    // Show player
    playerDiv.classList.add('active');
    
    // Update station list highlighting
    document.querySelectorAll('.station-item').forEach(item => {
        item.classList.remove('playing');
    });
    const currentItem = document.querySelector(`[data-uuid="${station.stationuuid}"]`);
    if (currentItem) {
        currentItem.classList.add('playing');
        currentItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    // Load and play audio
    audioPlayer.src = station.url_resolved;
    audioPlayer.play().then(() => {
        isPlaying = true;
        playPauseBtn.textContent = '⏸️';
        
        // Activate music visualizer
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

// Volume control
volumeSlider.addEventListener('input', (e) => {
    audioPlayer.volume = e.target.value / 100;
});

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

// Search functionality with debouncing
let searchTimeout;
function searchStations() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        const query = searchInput.value.toLowerCase().trim();
        
        if (!query) {
            stations = allStations;
            displayStationsInSidebar(stations.slice(0, 200));
            updateMapMarkers(allStations);
            return;
        }

        const filtered = allStations.filter(station => 
            station.name.toLowerCase().includes(query) ||
            (station.country && station.country.toLowerCase().includes(query)) ||
            (station.state && station.state.toLowerCase().includes(query)) ||
            (station.tags && station.tags.toLowerCase().includes(query))
        );

        stations = filtered;
        displayStationsInSidebar(filtered);
        updateMapMarkers(filtered);

        // Zoom to show filtered stations
        if (filtered.length > 0 && filtered.length < 100) {
            const bounds = L.latLngBounds(filtered.map(s => [s.geo_lat, s.geo_long]));
            map.fitBounds(bounds, { padding: [50, 50] });
        }

        sidebar.classList.add('active');
    }, 300);
}

function updateMapMarkers(stationsToShow) {
    // Clear existing markers
    markerClusterGroup.clearLayers();
    markers = [];
    
    // Add new markers in batches
    const batchSize = 500;
    let index = 0;
    
    function addBatch() {
        const batch = stationsToShow.slice(index, index + batchSize);
        const newMarkers = [];
        
        batch.forEach(station => {
            const marker = L.circleMarker([station.geo_lat, station.geo_long], {
                radius: 8,
                fillColor: '#00d4ff',
                color: '#fff',
                weight: 3,
                opacity: 1,
                fillOpacity: 0.85
            });

            const popupContent = `
                <div class="popup-station-name">${escapeHtml(station.name)}</div>
                <div class="popup-station-info">📍 ${escapeHtml(station.country || 'Unknown')}</div>
                <div class="popup-station-info">🏷️ ${escapeHtml(station.tags || 'No tags')}</div>
                <button class="popup-play-btn" onclick="playStationById('${station.stationuuid}')">▶️ Play Station</button>
            `;
            
            marker.bindPopup(popupContent, {
                maxWidth: 250,
                className: 'custom-popup'
            });
            
            // Add hover effect
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
            
            newMarkers.push(marker);
        });
        
        markerClusterGroup.addLayers(newMarkers);
        markers = markers.concat(newMarkers);
        
        index += batchSize;
        
        if (index < stationsToShow.length) {
            setTimeout(addBatch, 50);
        }
    }
    
    addBatch();
}

document.getElementById('searchBtn').addEventListener('click', searchStations);
searchInput.addEventListener('input', searchStations);

// Update stats
function updateStats() {
    const countries = [...new Set(allStations.map(s => s.country).filter(Boolean))];
    const loadTime = ((Date.now() - loadStartTime) / 1000).toFixed(2);
    
    document.getElementById('statsContent').innerHTML = `
        Stations: ${allStations.length.toLocaleString()}<br>
        Countries: ${countries.length}
    `;
    
    document.getElementById('loadTime').textContent = `Loaded in ${loadTime}s`;
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    initMap();
    fetchStations();
    
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
