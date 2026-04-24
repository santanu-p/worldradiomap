/**
 * Curated YouTube driving / walking-tour video catalog.
 *
 * Each entry maps a normalised location key to a YouTube video ID.
 * The embed URL is assembled at lookup time so only IDs live here.
 *
 * All video IDs have been verified via the YouTube oEmbed API as
 * valid, embeddable, 4K city tour clips (drive, walk, drone, etc.).
 */

// ── Normalisation helpers ───────────────────────────────────────────

function normalizeToken(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeCountry(value) {
  const normalized = normalizeToken(value).replace(/^the\s+/, '');
  const aliasMap = {
    us: 'united states',
    usa: 'united states',
    'united states of america': 'united states',
    uae: 'united arab emirates',
    uk: 'united kingdom'
  };

  return aliasMap[normalized] || normalized;
}

// ── YouTube embed builder ───────────────────────────────────────────

const YT_EMBED_BASE = 'https://www.youtube-nocookie.com/embed/';

function buildEmbedUrl(videoId) {
  if (!videoId) return '';
  const params = [
    'autoplay=1',
    'mute=1',
    'loop=1',
    `playlist=${videoId}`,
    'controls=1',
    'rel=0',
    'modestbranding=1',
    'playsinline=1'
  ].join('&');
  return `${YT_EMBED_BASE}${videoId}?${params}`;
}

// ── Curated city → video-ID catalog ─────────────────────────────────
// Key format: "city|country" (normalised).
// Every ID below has been verified via YouTube oEmbed API.

const CITY_COUNTRY_VIDEOS = {
  // ── Featured station cities ───────────────────────────────────────
  'jersey city|united states':   { id: 'yhgM2w_DcJk', title: 'Driving through Jersey City, NJ' },
  'london|united kingdom':       { id: 'z066yj3sIq8', title: 'London — Big Ben to Piccadilly Circus 4K HDR' },
  'santa monica|united states':  { id: '_Wyg213IZDI', title: 'Driving Downtown Manhattan, NYC 4K HDR' },
  'paris|france':                { id: 'bCwUwTcvT2M', title: 'Paris Walking Tour 4K/60fps' },
  'wellington|new zealand':      { id: 'zWzEVnTc1JU', title: 'Wellington NZ — The Capital of New Zealand 4K' },
  'sydney|australia':            { id: 'VuZNHjkZisk', title: 'Sydney CBD 4K Walking Tour' },
  'toronto|canada':              { id: 'zqK4JD8jTRI', title: 'Driving Downtown Toronto 4K HDR' },
  'basel|switzerland':           { id: 'agxk_P8a-jg', title: 'Basel Switzerland Riverside Walk 4K' },
  'hilversum|netherlands':       { id: 'uL6z9v7Cf9Y', title: 'Amsterdam Walking Tour 4K 60fps' },
  'hong kong|hong kong':         { id: 'NLubGdhZRk8', title: 'Hong Kong 4K Walking Tour 2024' },
  'dubai|united arab emirates':  { id: 'TE2tfavIo3E', title: 'Dubai 4K Driving Downtown — Skyscraper Sunset' },

  // ── Major global cities ───────────────────────────────────────────
  'new york|united states':      { id: '_Wyg213IZDI', title: 'Driving Downtown Manhattan, NYC 4K HDR' },
  'los angeles|united states':   { id: '_Wyg213IZDI', title: 'Driving NYC 4K HDR (US fallback)' },
  'tokyo|japan':                 { id: '28ZjrtD_iL0', title: 'Tokyo 4K HDR Walking Tour — Day & Night' },
  'seoul|south korea':           { id: 'ca9uN3QyDmQ', title: 'Seoul Nightlife 4K Walking Tour' },
  'mumbai|india':                { id: 'dTxIyhunxbI', title: 'Mumbai Drive — Colaba to Bandra 4K HDR' },
  'delhi|india':                 { id: 'dTxIyhunxbI', title: 'Mumbai Drive 4K HDR (India fallback)' },
  'new delhi|india':             { id: 'dTxIyhunxbI', title: 'Mumbai Drive 4K HDR (India fallback)' },
  'bangalore|india':             { id: 'dTxIyhunxbI', title: 'Mumbai Drive 4K HDR (India fallback)' },
  'bengaluru|india':             { id: 'dTxIyhunxbI', title: 'Mumbai Drive 4K HDR (India fallback)' },
  'kolkata|india':               { id: 'dTxIyhunxbI', title: 'Mumbai Drive 4K HDR (India fallback)' },
  'chennai|india':               { id: 'dTxIyhunxbI', title: 'Mumbai Drive 4K HDR (India fallback)' },
  'hyderabad|india':             { id: 'dTxIyhunxbI', title: 'Mumbai Drive 4K HDR (India fallback)' },
  'istanbul|turkey':             { id: '1G1pi3LLVqY', title: 'Istanbul Walking Tour 4K' },
  'berlin|germany':              { id: '1qitNAzhxQk', title: 'Berlin Walking Tour 4K' },
  'rome|italy':                  { id: 'x4qv5vCQylo', title: 'Rome Walking Tour 4K 60fps' },
  'singapore|singapore':         { id: 'xEx3-9v0-_o', title: 'Singapore 4K Scenic Drive' },
  'buenos aires|argentina':      { id: 'a_PaSxIyKfw', title: 'Buenos Aires Walking Tour 4K/60fps' },
  'bangkok|thailand':            { id: 'tVcrYCaCMR8', title: 'Bangkok 4K Walking Tour — Nightlife & Street Vibes' },
  'amsterdam|netherlands':       { id: 'uL6z9v7Cf9Y', title: 'Amsterdam Walking Tour 4K 60fps' },
};

// ── Country-only fallbacks ──────────────────────────────────────────

const COUNTRY_DEFAULT_VIDEOS = {
  'united states':        CITY_COUNTRY_VIDEOS['new york|united states'],
  'united kingdom':       CITY_COUNTRY_VIDEOS['london|united kingdom'],
  france:                 CITY_COUNTRY_VIDEOS['paris|france'],
  germany:                CITY_COUNTRY_VIDEOS['berlin|germany'],
  japan:                  CITY_COUNTRY_VIDEOS['tokyo|japan'],
  australia:              CITY_COUNTRY_VIDEOS['sydney|australia'],
  india:                  CITY_COUNTRY_VIDEOS['mumbai|india'],
  canada:                 CITY_COUNTRY_VIDEOS['toronto|canada'],
  italy:                  CITY_COUNTRY_VIDEOS['rome|italy'],
  spain:                  CITY_COUNTRY_VIDEOS['buenos aires|argentina'],
  netherlands:            CITY_COUNTRY_VIDEOS['amsterdam|netherlands'],
  'south korea':          CITY_COUNTRY_VIDEOS['seoul|south korea'],
  turkey:                 CITY_COUNTRY_VIDEOS['istanbul|turkey'],
  argentina:              CITY_COUNTRY_VIDEOS['buenos aires|argentina'],
  thailand:               CITY_COUNTRY_VIDEOS['bangkok|thailand'],
  singapore:              CITY_COUNTRY_VIDEOS['singapore|singapore'],
  'new zealand':          CITY_COUNTRY_VIDEOS['wellington|new zealand'],
  'united arab emirates': CITY_COUNTRY_VIDEOS['dubai|united arab emirates'],
  'hong kong':            CITY_COUNTRY_VIDEOS['hong kong|hong kong'],
  switzerland:            CITY_COUNTRY_VIDEOS['basel|switzerland'],
};

// ── Station-name overrides (special cases) ──────────────────────────

const STATION_NAME_OVERRIDES = {
  'mirchi top 20|india': CITY_COUNTRY_VIDEOS['mumbai|india']
};

// ── Lookup helpers ──────────────────────────────────────────────────

function buildLocationCandidates(station) {
  const country = normalizeCountry(station?.country);
  const city = normalizeToken(station?.city);
  const state = normalizeToken(station?.state);

  const cityCandidates = [city, state].filter(Boolean);
  const uniqueCities = Array.from(new Set(cityCandidates));

  return { country, cityCandidates: uniqueCities };
}

function resolveEntry(entry) {
  if (!entry?.id) return null;
  return {
    embedUrl: buildEmbedUrl(entry.id),
    title: entry.title || 'City video',
    matchedBy: 'city-country'
  };
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Resolve a curated city video for a station object.
 *
 * Lookup priority:
 *   1. Station-name override (special cases)
 *   2. Exact city + country match
 *   3. Country-only fallback
 *   4. null (no video available)
 *
 * Returns { embedUrl, title, matchedBy } or null.
 */
export function resolveCityVideoForStation(station) {
  if (!station) return null;

  const stationName = normalizeToken(station.name);
  const { country, cityCandidates } = buildLocationCandidates(station);

  // 1. Station-name override
  if (stationName && country) {
    const stationKey = `${stationName}|${country}`;
    const override = STATION_NAME_OVERRIDES[stationKey];
    if (override) {
      const result = resolveEntry(override);
      if (result) {
        result.matchedBy = 'station-name';
        return result;
      }
    }
  }

  // 2. Exact city + country
  for (const city of cityCandidates) {
    const locationKey = `${city}|${country}`;
    const entry = CITY_COUNTRY_VIDEOS[locationKey];
    if (entry) {
      return resolveEntry(entry);
    }
  }

  // 3. Country fallback
  if (country && COUNTRY_DEFAULT_VIDEOS[country]) {
    const result = resolveEntry(COUNTRY_DEFAULT_VIDEOS[country]);
    if (result) {
      result.matchedBy = 'country-default';
      return result;
    }
  }

  return null;
}
