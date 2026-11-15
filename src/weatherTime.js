/**
 * Local Time & Weather Service via Open-Meteo Free API (no API key required)
 */

const weatherCache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

const WEATHER_CODE_MAP = {
  0: { label: 'Clear Sky', iconDay: '☀️', iconNight: '🌙' },
  1: { label: 'Mainly Clear', iconDay: '🌤️', iconNight: '🌤️' },
  2: { label: 'Partly Cloudy', iconDay: '⛅', iconNight: '⛅' },
  3: { label: 'Overcast', iconDay: '☁️', iconNight: '☁️' },
  45: { label: 'Fog', iconDay: '🌫️', iconNight: '🌫️' },
  48: { label: 'Depositing Rime Fog', iconDay: '🌫️', iconNight: '🌫️' },
  51: { label: 'Light Drizzle', iconDay: '🌦️', iconNight: '🌧️' },
  53: { label: 'Moderate Drizzle', iconDay: '🌦️', iconNight: '🌧️' },
  55: { label: 'Dense Drizzle', iconDay: '🌧️', iconNight: '🌧️' },
  61: { label: 'Slight Rain', iconDay: '🌦️', iconNight: '🌧️' },
  63: { label: 'Moderate Rain', iconDay: '🌧️', iconNight: '🌧️' },
  65: { label: 'Heavy Rain', iconDay: '🌧️', iconNight: '🌧️' },
  71: { label: 'Slight Snow', iconDay: '🌨️', iconNight: '🌨️' },
  73: { label: 'Moderate Snow', iconDay: '❄️', iconNight: '❄️' },
  75: { label: 'Heavy Snow', iconDay: '❄️', iconNight: '❄️' },
  80: { label: 'Rain Showers', iconDay: '🌦️', iconNight: '🌧️' },
  81: { label: 'Moderate Showers', iconDay: '🌧️', iconNight: '🌧️' },
  82: { label: 'Violent Showers', iconDay: '⛈️', iconNight: '⛈️' },
  95: { label: 'Thunderstorm', iconDay: '⛈️', iconNight: '⛈️' },
  96: { label: 'Thunderstorm & Hail', iconDay: '⛈️', iconNight: '⛈️' }
};

export async function fetchStationWeatherAndTime(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const cached = weatherCache.get(key);
  if (cached && (Date.now() - cached.ts < CACHE_TTL_MS)) {
    return cached.data;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,is_day&timezone=auto`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) return null;
    const json = await res.json();

    const current = json.current;
    if (!current) return null;

    const timezone = json.timezone || 'UTC';
    const isDay = current.is_day === 1;
    const temp = Math.round(current.temperature_2m);
    const codeInfo = WEATHER_CODE_MAP[current.weather_code] || { label: 'Fair', iconDay: '☀️', iconNight: '🌙' };
    const icon = isDay ? codeInfo.iconDay : codeInfo.iconNight;
    const dayPeriod = isDay ? 'Day' : 'Night';

    // Format local time using the station's IANA timezone
    const now = new Date();
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    const localTimeStr = timeFormatter.format(now);

    const result = {
      localTime: localTimeStr,
      timezone,
      temperature: temp,
      condition: codeInfo.label,
      icon,
      isDay,
      dayPeriod,
      displayString: `${localTimeStr} Local Time • ${dayPeriod} ${icon} (${temp}°C ${codeInfo.label})`
    };

    weatherCache.set(key, { data: result, ts: Date.now() });
    return result;
  } catch (err) {
    console.debug('Weather fetch error:', err.message);
    return null;
  }
}
