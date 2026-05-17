import { escapeHtml } from './htmlUtils.js';

const STATION_LOGO_COLORS = [
  '#2563eb',
  '#dc2626',
  '#059669',
  '#7c3aed',
  '#d97706',
  '#0891b2',
  '#be123c',
  '#4f46e5'
];

export function getStationInitial(name) {
  const match = String(name || '').trim().match(/[A-Z0-9]/i);
  return match ? match[0].toUpperCase() : '?';
}

export function getStationColor(seed = '') {
  const text = String(seed || '');
  let hash = 0;

  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }

  return STATION_LOGO_COLORS[Math.abs(hash) % STATION_LOGO_COLORS.length];
}

export function renderStationLogoMarkup(station) {
  const initial = getStationInitial(station?.name);
  const label = station?.name || 'Station';
  return `<span class="st-logo-initial" aria-hidden="true" title="${escapeHtml(label)}">${escapeHtml(initial)}</span>`;
}
