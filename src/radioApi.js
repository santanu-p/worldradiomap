import { API_SERVERS, countryCentroids, fallbackStations } from './data.js';
import { isSupportedStreamUrl } from './streamUtils.js';

export const MIRROR_SERVERS = [
  'https://de1.api.radio-browser.info',
  'https://fi1.api.radio-browser.info',
  'https://at1.api.radio-browser.info',
  'https://nl1.api.radio-browser.info'
];

export const MIRROR_TIMEOUT_MS = 4000;
export const CACHE_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours
export const IDB_NAME = 'WorldRadioAtlasDB';
export const IDB_VERSION = 2;
export const IDB_STORE = 'stationCache';

let currentMirrorIndex = 0;

/**
 * Returns the currently preferred API mirror
 */
export function getCurrentMirror() {
  return MIRROR_SERVERS[currentMirrorIndex] || MIRROR_SERVERS[0];
}

/**
 * Rotates to the next mirror
 */
export function rotateMirror() {
  currentMirrorIndex = (currentMirrorIndex + 1) % MIRROR_SERVERS.length;
  return getCurrentMirror();
}

/**
 * Normalize raw Radio Browser API station object
 */
export function normalizeStation(item) {
  let lat = item.geo_lat ? Number(item.geo_lat) : null;
  let lng = item.geo_long ? Number(item.geo_long) : null;

  if (lat === null || lng === null) {
    const centroid = countryCentroids[item.country];
    if (centroid) {
      lat = centroid[0];
      lng = centroid[1];
    }
  }

  // Gracefully upgrade http:// stream url to https:// if possible or keep original
  let streamUrl = item.url_resolved || item.url || '';
  if (streamUrl.startsWith('http://') && window.location.protocol === 'https:') {
    // If the stream provider supports HTTPS, we can upgrade, but keep fallback
    // Some streams strictly only work on http, which browser mixed-content may block.
  }

  return {
    id: item.stationuuid || String(Math.random()),
    name: (item.name || 'Unknown Station').trim(),
    url: streamUrl,
    tags: item.tags || '',
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    country: item.country || '',
    city: item.state || item.city || '',
    codec: item.codec || '',
    bitrate: item.bitrate ? Number(item.bitrate) : 0,
    votes: item.votes ? Number(item.votes) : 0,
    favicon: item.favicon || ''
  };
}

/**
 * IndexedDB helpers
 */
export function openIDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return resolve(null);
    }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onerror = () => resolve(null);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'key' });
      }
    };
  });
}

export async function loadStationsFromIDB() {
  try {
    const db = await openIDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get('all');
      req.onsuccess = () => {
        const row = req.result;
        if (row && Array.isArray(row.data) && row.data.length > 0) {
          const isFresh = (Date.now() - row.ts) < CACHE_DURATION_MS;
          resolve({ stations: row.data, isFresh, timestamp: row.ts });
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('IDB load error:', err);
    return null;
  }
}

export async function saveStationsToIDB(stations) {
  if (!Array.isArray(stations) || stations.length === 0) return;
  try {
    const db = await openIDB();
    if (!db) return;
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put({ key: 'all', data: stations, ts: Date.now() });
  } catch (err) {
    console.warn('IDB save error:', err);
  }
}

/**
 * Fetch with mirror rotation and strict timeout
 */
export async function fetchWithMirrorRotation(endpointBuilder, options = {}) {
  const timeoutMs = options.timeoutMs || MIRROR_TIMEOUT_MS;
  const mirrorsToTry = options.mirrors || [
    MIRROR_SERVERS[currentMirrorIndex],
    ...MIRROR_SERVERS.filter((_, i) => i !== currentMirrorIndex)
  ];

  let lastError = null;

  for (const mirror of mirrorsToTry) {
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const url = endpointBuilder(mirror);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timerId);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} from ${mirror}`);
      }

      const data = await res.json();
      if (Array.isArray(data)) {
        // Success: update current mirror index
        const idx = MIRROR_SERVERS.indexOf(mirror);
        if (idx !== -1) currentMirrorIndex = idx;
        return { data, mirror };
      }
    } catch (err) {
      clearTimeout(timerId);
      lastError = err;
      console.warn(`Mirror ${mirror} failed (${err.message}). Trying next mirror...`);
    }
  }

  throw lastError || new Error('All Radio Browser API mirrors failed.');
}

/**
 * Fetch full active radio stations catalog
 */
export async function fetchAllActiveStations(onProgress) {
  // 1. Check IDB cache first
  const cached = await loadStationsFromIDB();
  if (cached && cached.stations.length > 500) {
    if (cached.isFresh) {
      return cached.stations;
    }
    // Return stale cache immediately and trigger background refresh
    setTimeout(() => backgroundRefreshStations(), 2000);
    return cached.stations;
  }

  // 2. Fetch fresh catalog from mirrors with pagination
  const PAGE_SIZE = 10000;
  const MAX_STATIONS = 70000;
  let allStations = [];

  for (let offset = 0; offset < MAX_STATIONS; offset += PAGE_SIZE) {
    if (onProgress) onProgress(allStations.length);

    let chunkData = null;
    let attempts = 0;
    while (!chunkData && attempts < 2) {
      attempts++;
      try {
        const { data } = await fetchWithMirrorRotation((mirror) => {
          return `${mirror}/json/stations/search?order=votes&reverse=true&hidebroken=true&limit=${PAGE_SIZE}&offset=${offset}`;
        }, { timeoutMs: 8000 });

        if (Array.isArray(data)) {
          chunkData = data;
        }
      } catch (err) {
        console.warn(`Station fetch chunk at offset ${offset} (attempt ${attempts}) failed:`, err);
        rotateMirror();
      }
    }

    if (!chunkData || chunkData.length === 0) {
      break; // Reached end of stations or persistent network issue
    }

    const normalized = chunkData
      .map(normalizeStation)
      .filter(s => s.url && s.name && isSupportedStreamUrl(s.url));

    allStations.push(...normalized);

    // If API returned fewer stations than requested, we've loaded the entire database
    if (chunkData.length < PAGE_SIZE) break;
  }

  // 3. Deduplicate
  const seenIds = new Set();
  const deduplicated = [];
  for (const st of allStations) {
    if (!seenIds.has(st.id) && !seenIds.has(st.url)) {
      seenIds.add(st.id);
      seenIds.add(st.url);
      deduplicated.push(st);
    }
  }

  if (deduplicated.length >= 100) {
    await saveStationsToIDB(deduplicated);
    return deduplicated;
  }

  // If API returned too few or failed completely, fallback to curated
  if (cached && cached.stations.length > 0) {
    return cached.stations;
  }
  return fallbackStations.map(normalizeStation);
}

/**
 * Background silent refresh
 */
export async function backgroundRefreshStations() {
  const PAGE_SIZE = 10000;
  const MAX_STATIONS = 70000;
  let allStations = [];

  for (let offset = 0; offset < MAX_STATIONS; offset += PAGE_SIZE) {
    try {
      const { data } = await fetchWithMirrorRotation((mirror) => {
        return `${mirror}/json/stations/search?order=votes&reverse=true&hidebroken=true&limit=${PAGE_SIZE}&offset=${offset}`;
      }, { timeoutMs: 8000 });

      if (!data || data.length === 0) break;

      const normalized = data
        .map(normalizeStation)
        .filter(s => s.url && s.name && isSupportedStreamUrl(s.url));

      allStations.push(...normalized);

      if (data.length < PAGE_SIZE) break;
    } catch (err) {
      console.debug('Background refresh chunk postponed:', err.message);
      break;
    }
  }

  if (allStations.length > 1000) {
    const seenIds = new Set();
    const deduplicated = [];
    for (const st of allStations) {
      if (!seenIds.has(st.id) && !seenIds.has(st.url)) {
        seenIds.add(st.id);
        seenIds.add(st.url);
        deduplicated.push(st);
      }
    }
    await saveStationsToIDB(deduplicated);
    console.log(`Background refreshed ${deduplicated.length} stations`);
  }
}

/**
 * Search stations live across mirrors with debounce and query optimization
 */
export async function searchStationsLive(query, limit = 20) {
  if (!query || query.trim().length < 2) return [];

  const cleanQuery = encodeURIComponent(query.trim());

  try {
    const { data } = await fetchWithMirrorRotation((mirror) => {
      return `${mirror}/json/stations/search?name=${cleanQuery}&hidebroken=true&order=votes&reverse=true&limit=${limit}`;
    }, { timeoutMs: 3000 });

    return (data || [])
      .map(normalizeStation)
      .filter(s => s.url && s.name && isSupportedStreamUrl(s.url));
  } catch (err) {
    console.warn('Live search failed across mirrors:', err);
    return [];
  }
}
