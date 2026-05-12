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

const YT_EMBED_BASE = 'https://www.youtube-nocookie.com/embed/';
const YT_SEARCH_BASE = 'https://www.youtube.com/results';
const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;
const SEARCH_TIMEOUT_MS = 8000;
const searchCache = new Map();

const VIDEO_SEARCH_PROVIDERS = [
  {
    name: 'piped-kavin',
    endpoint(query) {
      const apiUrl = `https://pipedapi.kavin.rocks/search?q=${encodeURIComponent(query)}&filter=videos`;
      return `https://api.allorigins.win/get?url=${encodeURIComponent(apiUrl)}`;
    },
    parse(data) {
      try {
        const parsed = JSON.parse(data?.contents || '{}');
        return Array.isArray(parsed) ? parsed : parsed?.items || parsed?.relatedStreams || [];
      } catch (e) {
        return [];
      }
    }
  },
  {
    name: 'piped-lunar',
    endpoint(query) {
      const apiUrl = `https://pipedapi.lunar.icu/search?q=${encodeURIComponent(query)}&filter=videos`;
      return `https://api.allorigins.win/get?url=${encodeURIComponent(apiUrl)}`;
    },
    parse(data) {
      try {
        const parsed = JSON.parse(data?.contents || '{}');
        return Array.isArray(parsed) ? parsed : parsed?.items || parsed?.relatedStreams || [];
      } catch (e) {
        return [];
      }
    }
  },
  {
    name: 'invidious-yewtu',
    endpoint(query) {
      const apiUrl = `https://yewtu.be/api/v1/search?q=${encodeURIComponent(query)}&type=video`;
      return `https://api.allorigins.win/get?url=${encodeURIComponent(apiUrl)}`;
    },
    parse(data) {
      try {
        const parsed = JSON.parse(data?.contents || '[]');
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    }
  },
  {
    name: 'invidious-projectsegfau',
    endpoint(query) {
      const apiUrl = `https://invidious.projectsegfau.lt/api/v1/search?q=${encodeURIComponent(query)}&type=video`;
      return `https://api.allorigins.win/get?url=${encodeURIComponent(apiUrl)}`;
    },
    parse(data) {
      try {
        const parsed = JSON.parse(data?.contents || '[]');
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    }
  }
];

function buildEmbedUrl(videoId) {
  if (!VIDEO_ID_PATTERN.test(String(videoId || ''))) return '';
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

function buildSearchUrl(query) {
  if (!query) return '';
  const params = new URLSearchParams({
    search_query: query
  });
  return `${YT_SEARCH_BASE}?${params.toString()}`;
}

const CITY_COUNTRY_VIDEOS = {
  'jersey city|united states': { id: 'yhgM2w_DcJk', title: 'Driving through Jersey City, NJ' },
  'london|united kingdom': { id: 'z066yj3sIq8', title: 'London - Big Ben to Piccadilly Circus 4K HDR' },
  'santa monica|united states': { id: '_Wyg213IZDI', title: 'Driving Downtown Manhattan, NYC 4K HDR' },
  'paris|france': { id: 'bCwUwTcvT2M', title: 'Paris Walking Tour 4K/60fps' },
  'wellington|new zealand': { id: 'zWzEVnTc1JU', title: 'Wellington NZ - The Capital of New Zealand 4K' },
  'sydney|australia': { id: 'VuZNHjkZisk', title: 'Sydney CBD 4K Walking Tour' },
  'toronto|canada': { id: 'zqK4JD8jTRI', title: 'Driving Downtown Toronto 4K HDR' },
  'basel|switzerland': { id: 'agxk_P8a-jg', title: 'Basel Switzerland Riverside Walk 4K' },
  'hilversum|netherlands': { id: 'uL6z9v7Cf9Y', title: 'Amsterdam Walking Tour 4K 60fps' },
  'hong kong|hong kong': { id: 'NLubGdhZRk8', title: 'Hong Kong 4K Walking Tour 2024' },
  'dubai|united arab emirates': { id: 'TE2tfavIo3E', title: 'Dubai 4K Driving Downtown - Skyscraper Sunset' },
  'new york|united states': { id: '_Wyg213IZDI', title: 'Driving Downtown Manhattan, NYC 4K HDR' },
  'tokyo|japan': { id: '28ZjrtD_iL0', title: 'Tokyo 4K HDR Walking Tour' },
  'mumbai|india': { id: 'dTxIyhunxbI', title: 'Mumbai Drive - Colaba to Bandra 4K HDR' },
  'delhi|india': { id: 'NEnzX8BVs2E', title: 'New Delhi 4K Walking Tour' },
  'new delhi|india': { id: 'NEnzX8BVs2E', title: 'New Delhi 4K Walking Tour' },
  'bangalore|india': { id: '3YF3k6_R8qM', title: 'Bangalore 4K city walking tour' },
  'bengaluru|india': { id: '3YF3k6_R8qM', title: 'Bengaluru 4K city walking tour' },
  'kolkata|india': { id: '_08eL3K3_d0', title: 'Kolkata 4K city walking tour' },
  'chennai|india': { id: 'W_q6Y-mN_5c', title: 'Chennai 4K city walking tour' },
  'berlin|germany': { id: '1qitNAzhxQk', title: 'Berlin Walking Tour 4K' },
  'rome|italy': { id: 'x4qv5vCQylo', title: 'Rome Walking Tour 4K 60fps' },
  'singapore|singapore': { id: 'xEx3-9v0-_o', title: 'Singapore 4K Scenic Drive' },
  'bangkok|thailand': { id: 'tVcrYCaCMR8', title: 'Bangkok 4K Walking Tour' },
  'amsterdam|netherlands': { id: 'uL6z9v7Cf9Y', title: 'Amsterdam Walking Tour 4K 60fps' }
};

const COUNTRY_DEFAULT_VIDEOS = {
  'united states': CITY_COUNTRY_VIDEOS['new york|united states'],
  'united kingdom': CITY_COUNTRY_VIDEOS['london|united kingdom'],
  france: CITY_COUNTRY_VIDEOS['paris|france'],
  germany: CITY_COUNTRY_VIDEOS['berlin|germany'],
  japan: CITY_COUNTRY_VIDEOS['tokyo|japan'],
  australia: CITY_COUNTRY_VIDEOS['sydney|australia'],
  india: CITY_COUNTRY_VIDEOS['mumbai|india'],
  canada: CITY_COUNTRY_VIDEOS['toronto|canada'],
  italy: CITY_COUNTRY_VIDEOS['rome|italy'],
  netherlands: CITY_COUNTRY_VIDEOS['amsterdam|netherlands'],
  thailand: CITY_COUNTRY_VIDEOS['bangkok|thailand'],
  singapore: CITY_COUNTRY_VIDEOS['singapore|singapore'],
  'new zealand': CITY_COUNTRY_VIDEOS['wellington|new zealand'],
  'united arab emirates': CITY_COUNTRY_VIDEOS['dubai|united arab emirates'],
  'hong kong': CITY_COUNTRY_VIDEOS['hong kong|hong kong'],
  switzerland: CITY_COUNTRY_VIDEOS['basel|switzerland']
};

const STATION_NAME_OVERRIDES = {
  'mirchi top 20|india': CITY_COUNTRY_VIDEOS['mumbai|india']
};

function buildLocationCandidates(station) {
  const country = normalizeCountry(station?.country);
  const city = normalizeToken(station?.city);
  const state = normalizeToken(station?.state);
  return { country, cityCandidates: Array.from(new Set([city, state].filter(Boolean))) };
}

function createCitySearchQuery(station, fallback = false) {
  const city = String(station?.city || station?.state || '').trim();
  const country = String(station?.country || '').replace(/^the\s+/i, '').trim();
  const location = [city, country].filter(Boolean).join(' ');
  if (!location) return '';
  return fallback ? `${location} travel guide` : `${location} 4K city walking tour cinematic`;
}

function extractVideoId(value) {
  if (!value) return '';
  const text = String(value);
  if (VIDEO_ID_PATTERN.test(text)) return text;

  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /\/watch\/([a-zA-Z0-9_-]{11})/,
    /\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }

  return '';
}

function normalizeDurationSeconds(result) {
  const duration = result?.durationSeconds ?? result?.duration;
  return Number.isFinite(Number(duration)) ? Number(duration) : 0;
}

function resultMatchesLocation(result, station) {
  const title = normalizeToken(result?.title);
  const city = normalizeToken(station?.city || station?.state);
  const country = normalizeCountry(station?.country);
  if (!title) return false;

  // Flexible matching for city names
  let cityMatch = true;
  if (city) {
    // Split city into words and filter out small or common words
    const cityWords = city.split(' ').filter(w => w.length > 2);
    if (cityWords.length > 0) {
      cityMatch = cityWords.some(word => title.includes(word));
    } else {
      cityMatch = title.includes(city);
    }
  }

  return cityMatch && (!country || title.includes(country) || title.includes('city') || title.includes('walking'));
}

function pickBestSearchResult(results, station) {
  if (!Array.isArray(results)) return null;
  
  const videos = results
    .map((result) => ({
      result,
      videoId: extractVideoId(result?.videoId || result?.id || result?.url || result?.uploaderUrl),
      durationSeconds: normalizeDurationSeconds(result)
    }))
    .filter(({ result, videoId }) => {
      if (!videoId) return false;
      if (result?.type && result.type !== 'video' && result.type !== 'stream') return false;
      if (result?.isUpcoming || result?.livestream) return false;
      return true;
    });

  if (videos.length === 0) return null;

  return videos
    .sort((a, b) => {
      const aLocation = resultMatchesLocation(a.result, station) ? 1 : 0;
      const bLocation = resultMatchesLocation(b.result, station) ? 1 : 0;
      const aLong = a.durationSeconds >= 300 ? 1 : 0;
      const bLong = b.durationSeconds >= 300 ? 1 : 0;
      return bLocation - aLocation || bLong - aLong || b.durationSeconds - a.durationSeconds;
    })[0];
}

async function fetchWithTimeout(url, fetcher) {
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Video search timed out')), SEARCH_TIMEOUT_MS);
  });
  return Promise.race([fetcher(url), timeout]);
}

async function searchYouTubeWithoutDataApi(station, fetcher = globalThis.fetch) {
  const query = createCitySearchQuery(station);
  if (!query || typeof fetcher !== 'function') return null;
  if (searchCache.has(query)) return searchCache.get(query);

  const queries = [query, createCitySearchQuery(station, true)];
  
  for (const q of queries) {
    try {
      const results = await Promise.allSettled(VIDEO_SEARCH_PROVIDERS.map(async (provider) => {
        try {
          const response = await fetchWithTimeout(provider.endpoint(q), fetcher);
          if (!response?.ok) return null;
          const data = await response.json();
          const best = pickBestSearchResult(provider.parse(data), station);
          if (best?.videoId) return { best, providerName: provider.name };
        } catch (err) {
          // Individual provider failure is okay
        }
        return null;
      }));

      const successful = results
        .filter(r => r.status === 'fulfilled' && r.value)
        .map(r => r.value);

      if (successful.length > 0) {
        // Sort successful results to pick the best across all providers
        successful.sort((a, b) => {
          const aLocation = resultMatchesLocation(a.best.result, station) ? 1 : 0;
          const bLocation = resultMatchesLocation(b.best.result, station) ? 1 : 0;
          const aLong = a.best.durationSeconds >= 300 ? 1 : 0;
          const bLong = b.best.durationSeconds >= 300 ? 1 : 0;
          return bLocation - aLocation || bLong - aLong || b.best.durationSeconds - a.best.durationSeconds;
        });

        const { best, providerName } = successful[0];
        const result = {
          embedUrl: buildEmbedUrl(best.videoId),
          searchUrl: buildSearchUrl(q),
          title: best.result?.title || `${station.city || station.country} city video`,
          videoId: best.videoId,
          matchedBy: `youtube-search:${providerName}`
        };
        searchCache.set(query, result);
        return result;
      }
    } catch (err) {
      console.warn(`Search failed for query "${q}":`, err);
    }
  }

  return null;
}


function resolveEntry(entry) {
  if (!entry?.id) return null;
  return {
    embedUrl: buildEmbedUrl(entry.id),
    title: entry.title || 'City video',
    videoId: entry.id,
    matchedBy: 'city-country'
  };
}

function resolveCuratedCityVideoForStation(station) {
  if (!station) return null;

  const stationName = normalizeToken(station.name);
  const { country, cityCandidates } = buildLocationCandidates(station);

  if (stationName && country) {
    const override = STATION_NAME_OVERRIDES[`${stationName}|${country}`];
    if (override) {
      const result = resolveEntry(override);
      if (result) {
        result.matchedBy = 'station-name';
        return result;
      }
    }
  }

  for (const city of cityCandidates) {
    const result = resolveEntry(CITY_COUNTRY_VIDEOS[`${city}|${country}`]);
    if (result) return result;
  }

  const fallback = resolveEntry(COUNTRY_DEFAULT_VIDEOS[country]);
  if (fallback) {
    fallback.matchedBy = 'country-default';
    return fallback;
  }

  return null;
}

export async function resolveCityVideoForStation(station, options = {}) {
  if (!station) return null;

  const searchResult = await searchYouTubeWithoutDataApi(station, options.fetcher);
  if (searchResult) return searchResult;

  const curatedResult = resolveCuratedCityVideoForStation(station);
  if (curatedResult) {
    curatedResult.searchUrl = buildSearchUrl(createCitySearchQuery(station));
    return curatedResult;
  }

  return null;
}

export function clearCityVideoSearchCache() {
  searchCache.clear();
}

export { buildEmbedUrl, buildSearchUrl, createCitySearchQuery, extractVideoId, resolveCuratedCityVideoForStation };
