/**
 * Favorites & Radio Passport Manager
 */

const FAVORITES_STORAGE_KEY = 'world-radio-atlas.favorites';
const PASSPORT_STORAGE_KEY = 'world-radio-atlas.passport';

export function getFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveFavorites(favs) {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favs));
  } catch (e) {
    console.warn('Could not save favorites to localStorage:', e);
  }
}

export function isFavorite(stationId) {
  if (!stationId) return false;
  const favs = getFavorites();
  return favs.some(f => f.id === stationId);
}

export function toggleFavorite(station) {
  if (!station || !station.id) return false;
  let favs = getFavorites();
  const index = favs.findIndex(f => f.id === station.id);
  let nowFavorite = false;

  if (index >= 0) {
    favs.splice(index, 1);
    nowFavorite = false;
  } else {
    favs.unshift({
      id: station.id,
      name: station.name,
      country: station.country,
      city: station.city,
      tags: station.tags,
      url: station.url,
      lat: station.lat,
      lng: station.lng,
      addedAt: Date.now()
    });
    nowFavorite = true;
  }

  saveFavorites(favs);
  return nowFavorite;
}

export function getPassportData() {
  try {
    const raw = localStorage.getItem(PASSPORT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      countries: Array.isArray(parsed.countries) ? parsed.countries : [],
      cities: Array.isArray(parsed.cities) ? parsed.cities : [],
      totalListened: Number(parsed.totalListened || 0),
      stamps: Array.isArray(parsed.stamps) ? parsed.stamps : []
    };
  } catch {
    return { countries: [], cities: [], totalListened: 0, stamps: [] };
  }
}

export function recordPassportVisit(station) {
  if (!station) return;
  const data = getPassportData();

  let changed = false;
  data.totalListened += 1;

  if (station.country && !data.countries.includes(station.country)) {
    data.countries.push(station.country);
    changed = true;
  }

  const cityKey = [station.city, station.country].filter(Boolean).join(', ');
  if (cityKey && !data.cities.includes(cityKey)) {
    data.cities.push(cityKey);
    changed = true;
  }

  // Add latest stamp
  const newStamp = {
    stationName: station.name,
    country: station.country || 'Global',
    city: station.city || '',
    timestamp: Date.now()
  };

  data.stamps.unshift(newStamp);
  if (data.stamps.length > 50) data.stamps = data.stamps.slice(0, 50);

  try {
    localStorage.setItem(PASSPORT_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Could not save passport data:', e);
  }

  return {
    countryCount: data.countries.length,
    cityCount: data.cities.length,
    isNewCountry: changed
  };
}
