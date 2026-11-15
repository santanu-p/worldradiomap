import assert from 'node:assert/strict';
import test from 'node:test';

const store = new Map();
const mockLocalStorage = {
  getItem(k) { return store.has(k) ? store.get(k) : null; },
  setItem(k, v) { store.set(k, String(v)); },
  removeItem(k) { store.delete(k); },
  clear() { store.clear(); }
};

Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  configurable: true,
  writable: true
});

import {
  getFavorites,
  saveFavorites,
  toggleFavorite,
  isFavorite,
  getPassportData,
  recordPassportVisit
} from '../src/favoritesPassport.js';

test('favorites management allows toggling and checking favorite state', () => {
  mockLocalStorage.clear();
  const station = { id: 'station-123', name: 'Tokyo FM', country: 'Japan', city: 'Tokyo' };

  assert.equal(isFavorite('station-123'), false);
  const nowFav = toggleFavorite(station);
  assert.equal(nowFav, true);
  assert.equal(isFavorite('station-123'), true);

  const favs = getFavorites();
  assert.equal(favs.length, 1);
  assert.equal(favs[0].name, 'Tokyo FM');

  const unFav = toggleFavorite(station);
  assert.equal(unFav, false);
  assert.equal(isFavorite('station-123'), false);
});

test('passport records unique countries and cities', () => {
  mockLocalStorage.clear();
  const st1 = { id: 's1', name: 'BBC 1', country: 'United Kingdom', city: 'London' };
  const st2 = { id: 's2', name: 'BBC 2', country: 'United Kingdom', city: 'London' };
  const st3 = { id: 's3', name: 'FIP', country: 'France', city: 'Paris' };

  recordPassportVisit(st1);
  recordPassportVisit(st2);
  const result3 = recordPassportVisit(st3);

  const passport = getPassportData();
  assert.equal(passport.countries.length, 2);
  assert.ok(passport.countries.includes('United Kingdom'));
  assert.ok(passport.countries.includes('France'));
  assert.equal(passport.totalListened, 3);
  assert.equal(result3.isNewCountry, true);
});
