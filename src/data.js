export const regionBounds = {
  world: {
    center: [20, 8],
    zoom: 2
  },
  americas: {
    bounds: [[-56, -170], [75, -25]]
  },
  europe: {
    bounds: [[34, -15], [72, 42]]
  },
  asia: {
    bounds: [[-5, 60], [58, 150]]
  },
  africa: {
    bounds: [[-35, -20], [38, 55]]
  },
  oceania: {
    bounds: [[-50, 110], [10, 180]]
  }
};

export const mapStyles = {
  paper: {
    label: 'Paper',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    options: {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
      detectRetina: true
    }
  },
  night: {
    label: 'Night',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    options: {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
      detectRetina: true
    }
  },
  satellite: {
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    options: {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye',
      maxZoom: 18
    }
  }
};

export const filterGroups = [
  { key: 'all', label: 'All' },
  { key: 'music', label: 'Music' },
  { key: 'news', label: 'News' },
  { key: 'talk', label: 'Talk' },
  { key: 'ambient', label: 'Ambient' },
  { key: 'nearby', label: 'Near me' }
];

export const featuredStations = [
  {
    id: 'wfmu-new-jersey',
    name: 'WFMU Freeform',
    country: 'United States',
    city: 'Jersey City',
    tags: 'freeform, indie, eclectic',
    votes: 9150,
    lat: 40.7282,
    lng: -74.0776,
    url: 'https://stream0.wfmu.org/freeform-128k'
  },
  {
    id: 'bbc-world-service',
    name: 'BBC World Service',
    country: 'United Kingdom',
    city: 'London',
    tags: 'news, global, talk',
    votes: 9680,
    lat: 51.5074,
    lng: -0.1278,
    url: 'http://stream.live.vc.bbcmedia.co.uk/bbc_world_service'
  },
  {
    id: 'kcrw-eclectic',
    name: 'KCRW Eclectic 24',
    country: 'United States',
    city: 'Santa Monica',
    tags: 'eclectic, alternative, music',
    votes: 8420,
    lat: 34.0195,
    lng: -118.4912,
    url: 'https://kcrw.streamguys1.com/kcrw_192k_mp3_e24'
  },
  {
    id: 'radio-paradise',
    name: 'Radio Paradise',
    country: 'United States',
    city: 'Mojave',
    tags: 'adult alternative, music',
    votes: 9022,
    lat: 33.663,
    lng: -116.971,
    url: 'https://stream.radioparadise.com/aac-320'
  },
  {
    id: 'fip-france',
    name: 'FIP',
    country: 'France',
    city: 'Paris',
    tags: 'jazz, discovery, ambient',
    votes: 7230,
    lat: 48.8566,
    lng: 2.3522,
    url: 'https://icecast.radiofrance.fr/fip-hifi.aac'
  },
  {
    id: 'rnz-national',
    name: 'RNZ National',
    country: 'New Zealand',
    city: 'Wellington',
    tags: 'news, culture, talk',
    votes: 5310,
    lat: -41.2865,
    lng: 174.7762,
    url: 'https://radionz-ice.streamguys1.com/national.mp3'
  },
  {
    id: 'triple-j',
    name: 'triple j',
    country: 'Australia',
    city: 'Sydney',
    tags: 'alternative, new music',
    votes: 8610,
    lat: -33.8688,
    lng: 151.2093,
    url: 'https://live-radio01.mediahubaustralia.com/2TJW/mp3/'
  },
  {
    id: 'cbc-music',
    name: 'CBC Music Toronto',
    country: 'Canada',
    city: 'Toronto',
    tags: 'adult contemporary, music',
    votes: 6720,
    lat: 43.6532,
    lng: -79.3832,
    url: 'https://cbcmp3.ic.llnwd.net/stream/cbcmp3_cbc_r2_tor'
  },
  {
    id: 'radio-swiss-jazz',
    name: 'Radio Swiss Jazz',
    country: 'Switzerland',
    city: 'Basel',
    tags: 'jazz, instrumental',
    votes: 4330,
    lat: 47.5596,
    lng: 7.5886,
    url: 'http://stream.srg-ssr.ch/m/rsj/aacp_96'
  },
  {
    id: 'radio-538',
    name: 'Radio 538',
    country: 'Netherlands',
    city: 'Hilversum',
    tags: 'pop, dance, hits',
    votes: 7580,
    lat: 52.2292,
    lng: 5.1669,
    url: 'https://19983.live.streamtheworld.com/RADIO538.mp3'
  },
  {
    id: 'rthk-radio-3',
    name: 'RTHK Radio 3',
    country: 'Hong Kong',
    city: 'Hong Kong',
    tags: 'news, talk, culture',
    votes: 4920,
    lat: 22.3193,
    lng: 114.1694,
    url: 'https://rthkaudio-rthk3.media.azure.net/live.mp3'
  },
  {
    id: 'virgin-dubai',
    name: 'Virgin Radio Dubai',
    country: 'United Arab Emirates',
    city: 'Dubai',
    tags: 'hits, pop, mainstream',
    votes: 6110,
    lat: 25.2048,
    lng: 55.2708,
    url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/VIRGIN_RADIOMP3_SC'
  }
];

export const fallbackStations = featuredStations.slice();
