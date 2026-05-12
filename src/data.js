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
      detectRetina: true,
      alt: 'Map tile'
    }
  },
  night: {
    label: 'Night',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    options: {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
      detectRetina: true,
      alt: 'Map tile'
    }
  },
  satellite: {
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    options: {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye',
      maxZoom: 18,
      alt: 'Map tile'
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

// Comprehensive country-to-continent mapping for proper region filtering
export const countryToContinent = {
  // Europe
  'United Kingdom': 'Europe', 'The United Kingdom Of Great Britain And Northern Ireland': 'Europe',
  'France': 'Europe', 'Germany': 'Europe', 'Italy': 'Europe', 'Spain': 'Europe',
  'Netherlands': 'Europe', 'The Netherlands': 'Europe', 'Poland': 'Europe',
  'Switzerland': 'Europe', 'Portugal': 'Europe', 'Belgium': 'Europe',
  'Austria': 'Europe', 'Sweden': 'Europe', 'Norway': 'Europe', 'Denmark': 'Europe',
  'Finland': 'Europe', 'Ireland': 'Europe', 'Czech Republic': 'Europe', 'Czechia': 'Europe',
  'Romania': 'Europe', 'Hungary': 'Europe', 'Greece': 'Europe', 'Slovakia': 'Europe',
  'Croatia': 'Europe', 'Bulgaria': 'Europe', 'Serbia': 'Europe', 'Slovenia': 'Europe',
  'Lithuania': 'Europe', 'Latvia': 'Europe', 'Estonia': 'Europe', 'Luxembourg': 'Europe',
  'Malta': 'Europe', 'Cyprus': 'Europe', 'Iceland': 'Europe', 'Albania': 'Europe',
  'North Macedonia': 'Europe', 'Montenegro': 'Europe', 'Bosnia And Herzegovina': 'Europe',
  'Bosnia and Herzegovina': 'Europe', 'Moldova': 'Europe', 'Republic Of Moldova': 'Europe',
  'Belarus': 'Europe', 'Ukraine': 'Europe', 'Kosovo': 'Europe', 'Andorra': 'Europe',
  'Monaco': 'Europe', 'San Marino': 'Europe', 'Liechtenstein': 'Europe',
  'Turkey': 'Europe', 'Russia': 'Europe', 'Russian Federation': 'Europe',
  'Georgia': 'Europe', 'Armenia': 'Europe', 'Azerbaijan': 'Europe',

  // North America
  'United States': 'North America', 'United States Of America': 'North America',
  'The United States Of America': 'North America', 'USA': 'North America', 'US': 'North America',
  'Canada': 'North America', 'Mexico': 'North America',
  'Guatemala': 'North America', 'Cuba': 'North America', 'Haiti': 'North America',
  'Dominican Republic': 'North America', 'Honduras': 'North America',
  'El Salvador': 'North America', 'Nicaragua': 'North America',
  'Costa Rica': 'North America', 'Panama': 'North America',
  'Jamaica': 'North America', 'Trinidad And Tobago': 'North America', 'Trinidad and Tobago': 'North America',
  'Bahamas': 'North America', 'The Bahamas': 'North America', 'Barbados': 'North America',
  'Belize': 'North America', 'Puerto Rico': 'North America',
  'Guadeloupe': 'North America', 'Martinique': 'North America',
  'Saint Lucia': 'North America', 'Grenada': 'North America',
  'Antigua And Barbuda': 'North America', 'Dominica': 'North America',
  'Saint Kitts And Nevis': 'North America', 'Saint Vincent And The Grenadines': 'North America',
  'Curaçao': 'North America', 'Aruba': 'North America',
  'U.S. Virgin Islands': 'North America', 'Bermuda': 'North America',
  'Cayman Islands': 'North America',

  // South America
  'Brazil': 'South America', 'Argentina': 'South America', 'Colombia': 'South America',
  'Peru': 'South America', 'Venezuela': 'South America', 'Chile': 'South America',
  'Ecuador': 'South America', 'Bolivia': 'South America', 'Paraguay': 'South America',
  'Uruguay': 'South America', 'Guyana': 'South America', 'Suriname': 'South America',
  'French Guiana': 'South America',

  // Asia
  'Japan': 'Asia', 'China': 'Asia', 'India': 'Asia', 'South Korea': 'Asia',
  'Korea, Republic Of': 'Asia', 'Republic Of Korea': 'Asia',
  'Indonesia': 'Asia', 'Thailand': 'Asia', 'Vietnam': 'Asia', 'Viet Nam': 'Asia',
  'Philippines': 'Asia', 'The Philippines': 'Asia', 'Malaysia': 'Asia',
  'Singapore': 'Asia', 'Taiwan': 'Asia', 'Taiwan, Province Of China': 'Asia',
  'Hong Kong': 'Asia', 'Bangladesh': 'Asia',
  'Pakistan': 'Asia', 'Sri Lanka': 'Asia', 'Myanmar': 'Asia', 'Nepal': 'Asia',
  'Cambodia': 'Asia', 'Laos': 'Asia', 'Mongolia': 'Asia',
  'Kazakhstan': 'Asia', 'Uzbekistan': 'Asia', 'Turkmenistan': 'Asia',
  'Kyrgyzstan': 'Asia', 'Tajikistan': 'Asia', 'Afghanistan': 'Asia',
  'Iraq': 'Asia', 'Iran': 'Asia', 'Iran, Islamic Republic Of': 'Asia',
  'Saudi Arabia': 'Asia', 'United Arab Emirates': 'Asia',
  'Israel': 'Asia', 'Jordan': 'Asia', 'Lebanon': 'Asia', 'Syria': 'Asia',
  'Syrian Arab Republic': 'Asia',
  'Kuwait': 'Asia', 'Bahrain': 'Asia', 'Qatar': 'Asia', 'Oman': 'Asia', 'Yemen': 'Asia',
  'Palestine': 'Asia', 'Palestine, State Of': 'Asia',
  'Macao': 'Asia', 'Brunei': 'Asia', 'Brunei Darussalam': 'Asia',
  'Maldives': 'Asia', 'Bhutan': 'Asia', 'Timor-Leste': 'Asia',

  // Africa
  'South Africa': 'Africa', 'Nigeria': 'Africa', 'Egypt': 'Africa',
  'Kenya': 'Africa', 'Ghana': 'Africa', 'Tanzania': 'Africa',
  'United Republic Of Tanzania': 'Africa',
  'Ethiopia': 'Africa', 'Morocco': 'Africa', 'Algeria': 'Africa', 'Tunisia': 'Africa',
  'Uganda': 'Africa', 'Cameroon': 'Africa', 'Senegal': 'Africa',
  'Ivory Coast': 'Africa', "Côte D'Ivoire": 'Africa',
  'Madagascar': 'Africa', 'Mozambique': 'Africa', 'Angola': 'Africa',
  'Zimbabwe': 'Africa', 'Zambia': 'Africa', 'Botswana': 'Africa',
  'Namibia': 'Africa', 'Mauritius': 'Africa', 'Rwanda': 'Africa',
  'Libya': 'Africa', 'Sudan': 'Africa', 'South Sudan': 'Africa',
  'Congo': 'Africa', 'The Democratic Republic Of The Congo': 'Africa',
  'Democratic Republic of the Congo': 'Africa',
  'Republic Of The Congo': 'Africa',
  'Mali': 'Africa', 'Burkina Faso': 'Africa', 'Niger': 'Africa',
  'Chad': 'Africa', 'Somalia': 'Africa', 'Guinea': 'Africa',
  'Benin': 'Africa', 'Togo': 'Africa', 'Sierra Leone': 'Africa',
  'Liberia': 'Africa', 'Malawi': 'Africa', 'Gabon': 'Africa',
  'Lesotho': 'Africa', 'Eswatini': 'Africa', 'Swaziland': 'Africa',
  'Mauritania': 'Africa', 'Eritrea': 'Africa', 'Djibouti': 'Africa',
  'Gambia': 'Africa', 'The Gambia': 'Africa', 'Cape Verde': 'Africa',
  'Cabo Verde': 'Africa', 'Comoros': 'Africa', 'São Tomé And Príncipe': 'Africa',
  'Réunion': 'Africa', 'Mayotte': 'Africa', 'Seychelles': 'Africa',
  'Equatorial Guinea': 'Africa', 'Guinea-Bissau': 'Africa',
  'Central African Republic': 'Africa', 'Burundi': 'Africa',

  // Oceania
  'Australia': 'Oceania', 'New Zealand': 'Oceania',
  'Papua New Guinea': 'Oceania', 'Fiji': 'Oceania', 'Samoa': 'Oceania',
  'American Samoa': 'Oceania', 'Tonga': 'Oceania', 'Guam': 'Oceania',
  'New Caledonia': 'Oceania', 'French Polynesia': 'Oceania',
  'Micronesia': 'Oceania', 'Vanuatu': 'Oceania', 'Solomon Islands': 'Oceania',
  'Kiribati': 'Oceania', 'Tuvalu': 'Oceania', 'Nauru': 'Oceania',
  'Palau': 'Oceania', 'Marshall Islands': 'Oceania',
  'Northern Mariana Islands': 'Oceania', 'Cook Islands': 'Oceania'
};

// Fallback coordinates for countries when specific station coordinates are missing
export const countryCentroids = {
  "Afghanistan": [33.93911, 67.709953],
  "Albania": [41.153332, 20.168331],
  "Algeria": [28.033886, 1.659626],
  "Angola": [-11.202692, 17.873887],
  "Argentina": [-38.416097, -63.616672],
  "Australia": [-25.274398, 133.775136],
  "Austria": [47.516231, 14.550072],
  "Azerbaijan": [40.143105, 47.576927],
  "Bangladesh": [23.684994, 90.356331],
  "Belarus": [53.709807, 27.953389],
  "Belgium": [50.503887, 4.469936],
  "Bolivia": [-16.290154, -63.588653],
  "Brazil": [-14.235004, -51.92528],
  "Bulgaria": [42.733883, 25.48583],
  "Cambodia": [12.565679, 104.990963],
  "Cameroon": [7.369722, 12.354722],
  "Canada": [56.130366, -106.346771],
  "Chile": [-35.675147, -71.542969],
  "China": [35.86166, 104.195397],
  "Colombia": [4.570868, -74.297333],
  "Costa Rica": [9.748917, -83.753428],
  "Croatia": [45.1, 15.2],
  "Cuba": [21.521757, -77.781167],
  "Cyprus": [35.126413, 33.429859],
  "Czech Republic": [49.817492, 15.472962],
  "Denmark": [56.26392, 9.501785],
  "Dominican Republic": [18.735693, -70.162651],
  "Ecuador": [-1.831239, -78.183406],
  "Egypt": [26.820553, 30.802498],
  "El Salvador": [13.794185, -88.89653],
  "Ethiopia": [9.145, 40.489673],
  "Finland": [61.92411, 25.748151],
  "France": [46.227638, 2.213749],
  "Germany": [51.165691, 10.451526],
  "Ghana": [7.946527, -1.023194],
  "Greece": [39.074208, 21.824312],
  "Guatemala": [15.783471, -90.230759],
  "Honduras": [15.199999, -86.241905],
  "Hong Kong": [22.396428, 114.109497],
  "Hungary": [47.162494, 19.503304],
  "Iceland": [64.963051, -19.020835],
  "India": [20.593684, 78.96288],
  "Indonesia": [-0.789275, 113.921327],
  "Iran": [32.427908, 53.688046],
  "Iraq": [33.223191, 43.679291],
  "Ireland": [53.41291, -8.24389],
  "Israel": [31.046051, 34.851612],
  "Italy": [41.87194, 12.56738],
  "Jamaica": [18.109581, -77.297508],
  "Japan": [36.204824, 138.252924],
  "Jordan": [30.585164, 36.238414],
  "Kazakhstan": [48.019573, 66.923684],
  "Kenya": [-0.023559, 37.906193],
  "Kuwait": [29.31166, 47.481766],
  "Latvia": [56.879635, 24.603189],
  "Lebanon": [33.854721, 35.862285],
  "Libya": [26.3351, 17.228331],
  "Lithuania": [55.169438, 23.881275],
  "Luxembourg": [49.815273, 6.129583],
  "Malaysia": [4.210484, 101.975766],
  "Mexico": [23.634501, -102.552784],
  "Moldova": [47.411631, 28.369885],
  "Morocco": [31.791702, -7.09262],
  "Nepal": [28.394857, 84.124008],
  "Netherlands": [52.132633, 5.291266],
  "New Zealand": [-40.900557, 174.885971],
  "Nicaragua": [12.865416, -85.207229],
  "Nigeria": [9.081999, 8.675277],
  "Norway": [60.472024, 8.468946],
  "Oman": [21.512583, 55.923255],
  "Pakistan": [30.375321, 69.345116],
  "Panama": [8.537981, -80.782127],
  "Paraguay": [-23.442503, -58.443832],
  "Peru": [-9.189967, -75.015152],
  "Philippines": [12.879721, 121.774017],
  "Poland": [51.919438, 19.145136],
  "Portugal": [39.399872, -8.224454],
  "Qatar": [25.354826, 51.183884],
  "Romania": [45.943161, 24.96676],
  "Russia": [61.52401, 105.318756],
  "Saudi Arabia": [23.885942, 45.079162],
  "Senegal": [14.497401, -14.452362],
  "Singapore": [1.352083, 103.819836],
  "Slovakia": [48.669026, 19.699024],
  "Slovenia": [46.151241, 14.995463],
  "South Africa": [-30.559482, 22.937506],
  "South Korea": [35.907757, 127.766922],
  "Spain": [40.463667, -3.74922],
  "Sri Lanka": [7.873054, 80.771797],
  "Sudan": [12.862807, 30.217636],
  "Sweden": [60.128161, 18.643501],
  "Switzerland": [46.818188, 8.227512],
  "Syria": [34.802075, 38.996815],
  "Taiwan": [23.69781, 120.960515],
  "Tanzania": [-6.369028, 34.888822],
  "Thailand": [15.870032, 100.992541],
  "Tunisia": [33.886917, 9.537499],
  "Turkey": [38.963745, 35.243322],
  "Ukraine": [48.379433, 31.16558],
  "United Arab Emirates": [23.424076, 53.847818],
  "United Kingdom": [55.378051, -3.435973],
  "United States": [37.09024, -95.712891],
  "Uruguay": [-32.522779, -55.765835],
  "Uzbekistan": [41.377491, 64.585262],
  "Venezuela": [6.42375, -66.58973],
  "Vietnam": [14.058324, 108.277199],
  "Yemen": [15.552727, 48.516388]
};

// API server list for redundancy — Radio Browser mirrors
export const API_SERVERS = [
  'https://de1.api.radio-browser.info',
  'https://de2.api.radio-browser.info',
  'https://nl1.api.radio-browser.info',
  'https://at1.api.radio-browser.info',
  'https://fr1.api.radio-browser.info'
];

// Featured stations shown on homepage cards — curated best-of
export const featuredStations = [
  // --- Europe ---
  { id: 'bbc-world-service', name: 'BBC World Service', country: 'United Kingdom', city: 'London', tags: 'news, global, talk', votes: 9680, lat: 51.5074, lng: -0.1278, url: 'http://stream.live.vc.bbcmedia.co.uk/bbc_world_service' },
  { id: 'bbc-radio-1', name: 'BBC Radio 1', country: 'United Kingdom', city: 'London', tags: 'pop, hits, charts', votes: 9500, lat: 51.5074, lng: -0.1278, url: 'http://stream.live.vc.bbcmedia.co.uk/bbc_radio_one' },
  { id: 'bbc-6-music', name: 'BBC 6 Music', country: 'United Kingdom', city: 'Manchester', tags: 'indie, alternative', votes: 6200, lat: 53.4808, lng: -2.2426, url: 'http://stream.live.vc.bbcmedia.co.uk/bbc_6music' },
  { id: 'fip-france', name: 'FIP', country: 'France', city: 'Paris', tags: 'jazz, discovery, ambient', votes: 7230, lat: 48.8566, lng: 2.3522, url: 'https://icecast.radiofrance.fr/fip-hifi.aac' },
  { id: 'rfi', name: 'Radio France Internationale', country: 'France', city: 'Paris', tags: 'news, world', votes: 5600, lat: 48.8566, lng: 2.3522, url: 'https://live02.rfi.fr/rfimonde-64k.mp3' },
  { id: 'tsf-jazz', name: 'TSF Jazz', country: 'France', city: 'Paris', tags: 'jazz', votes: 4800, lat: 48.8566, lng: 2.3522, url: 'https://tsfjazz.ice.infomaniak.ch/tsfjazz-high.mp3' },
  { id: 'radio-538', name: 'Radio 538', country: 'Netherlands', city: 'Hilversum', tags: 'pop, dance, hits', votes: 7580, lat: 52.2292, lng: 5.1669, url: 'https://19983.live.streamtheworld.com/RADIO538.mp3' },
  { id: 'swr3', name: 'SWR3', country: 'Germany', city: 'Baden-Baden', tags: 'pop, adult contemporary', votes: 5800, lat: 48.761, lng: 8.2398, url: 'https://swr-swr3-live.sslcast.addradio.de/swr/swr3/live/aac/128/stream.aac' },
  { id: 'radio-swiss-jazz', name: 'Radio Swiss Jazz', country: 'Switzerland', city: 'Basel', tags: 'jazz, instrumental', votes: 4330, lat: 47.5596, lng: 7.5886, url: 'http://stream.srg-ssr.ch/m/rsj/aacp_96' },
  { id: 'radio-nova-ie', name: 'Radio Nova', country: 'Ireland', city: 'Dublin', tags: 'classic rock', votes: 3900, lat: 53.3498, lng: -6.2603, url: 'https://novastream.nova.ie/stream' },
  { id: 'radio-wave', name: 'Radio Wave', country: 'Czech Republic', city: 'Prague', tags: 'alternative, culture', votes: 2800, lat: 50.0755, lng: 14.4378, url: 'https://icecast8.play.cz/cro2-128.mp3' },

  // --- North America ---
  { id: 'wfmu-new-jersey', name: 'WFMU Freeform', country: 'United States', city: 'Jersey City', tags: 'freeform, indie, eclectic', votes: 9150, lat: 40.7282, lng: -74.0776, url: 'https://stream0.wfmu.org/freeform-128k' },
  { id: 'kcrw-eclectic', name: 'KCRW Eclectic 24', country: 'United States', city: 'Santa Monica', tags: 'eclectic, alternative, music', votes: 8420, lat: 34.0195, lng: -118.4912, url: 'https://kcrw.streamguys1.com/kcrw_192k_mp3_e24' },
  { id: 'radio-paradise', name: 'Radio Paradise', country: 'United States', city: 'Mojave', tags: 'adult alternative, music', votes: 9022, lat: 33.663, lng: -116.971, url: 'https://stream.radioparadise.com/aac-320' },
  { id: 'npr-news', name: 'NPR News', country: 'United States', city: 'Washington DC', tags: 'news, talk', votes: 9100, lat: 38.8951, lng: -77.0364, url: 'http://npr-ice.streamguys1.com/live.mp3' },
  { id: 'kexp', name: 'KEXP 90.3 FM', country: 'United States', city: 'Seattle', tags: 'indie, live sessions', votes: 8600, lat: 47.6062, lng: -122.3321, url: 'http://live-aacplus-64.kexp.org/kexp64.aac' },
  { id: 'hot97', name: 'Hot 97 New York', country: 'United States', city: 'New York', tags: 'hip hop, urban', votes: 7800, lat: 40.7128, lng: -74.006, url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/WQHTFM.mp3' },
  { id: 'jazz24', name: 'Jazz24', country: 'United States', city: 'Seattle', tags: 'jazz, smooth', votes: 6500, lat: 47.6205, lng: -122.3493, url: 'https://live.wostreaming.net/direct/ppm-jazz24mp3-128' },
  { id: 'cbc-music', name: 'CBC Music Toronto', country: 'Canada', city: 'Toronto', tags: 'adult contemporary, music', votes: 6720, lat: 43.6532, lng: -79.3832, url: 'https://cbcmp3.ic.llnwd.net/stream/cbcmp3_cbc_r2_tor' },
  { id: 'rc-premiere', name: 'Radio-Canada Première', country: 'Canada', city: 'Montreal', tags: 'news, talk, francophone', votes: 3600, lat: 45.5017, lng: -73.5673, url: 'https://icecast.radio-canada.ca/radiounemtl.mp3' },

  // --- South America ---
  { id: 'radio-globo', name: 'Radio Globo Rio', country: 'Brazil', city: 'Rio de Janeiro', tags: 'news, talk', votes: 4400, lat: -22.9068, lng: -43.1729, url: 'https://20583.live.streamtheworld.com/RADIO_GLOBOAAC.aac' },
  { id: 'radio-mix-sp', name: 'Rádio Mix São Paulo', country: 'Brazil', city: 'São Paulo', tags: 'pop, hits', votes: 5200, lat: -23.5505, lng: -46.6333, url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/MIXFMAAC.aac' },

  // --- Asia ---
  { id: 'radio-mirchi', name: 'Radio Mirchi Mumbai', country: 'India', city: 'Mumbai', tags: 'bollywood, hits', votes: 6400, lat: 19.076, lng: 72.8777, url: 'https://sc-bb-mirchi-ice.streamguys1.com/mirchi.mp3' },
  { id: 'all-india-radio', name: 'All India Radio', country: 'India', city: 'New Delhi', tags: 'news, culture', votes: 6000, lat: 28.6139, lng: 77.209, url: 'http://air.pc.cdn.bitgravity.com/air/live/pbaudio134/playlist.m3u8' },
  { id: 'rthk-radio-3', name: 'RTHK Radio 3', country: 'Hong Kong', city: 'Hong Kong', tags: 'news, talk, culture', votes: 4920, lat: 22.3193, lng: 114.1694, url: 'https://rthkaudio-rthk3.media.azure.net/live.mp3' },
  { id: 'virgin-dubai', name: 'Virgin Radio Dubai', country: 'United Arab Emirates', city: 'Dubai', tags: 'hits, pop, mainstream', votes: 6110, lat: 25.2048, lng: 55.2708, url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/VIRGIN_RADIOMP3_SC' },

  // --- Africa ---
  { id: 'radio-702', name: 'Radio 702', country: 'South Africa', city: 'Johannesburg', tags: 'news, talk', votes: 3500, lat: -26.2041, lng: 28.0473, url: 'https://edge.iono.fm/xice/29_medium.aac' },

  // --- Oceania ---
  { id: 'triple-j', name: 'triple j', country: 'Australia', city: 'Sydney', tags: 'alternative, new music', votes: 8610, lat: -33.8688, lng: 151.2093, url: 'https://live-radio01.mediahubaustralia.com/2TJW/mp3/' },
  { id: 'double-j', name: 'Double J', country: 'Australia', city: 'Sydney', tags: 'adult alternative', votes: 4200, lat: -33.8688, lng: 151.2093, url: 'https://live-radio01.mediahubaustralia.com/DJDW/mp3/' },
  { id: 'rnz-national', name: 'RNZ National', country: 'New Zealand', city: 'Wellington', tags: 'news, culture, talk', votes: 5310, lat: -41.2865, lng: 174.7762, url: 'https://radionz-ice.streamguys1.com/national.mp3' },
];


// Curated list of high-quality 4K city-walk videos (YouTube IDs)
export const cityVideos = {
  'London': 'GSnAjDu3VoM',
  'Paris': '6BPuGeS6O4w',
  'New York': 'dJm43N7E_pA',
  'Berlin': 'KrbXZ0QeK7Y',
  'Tokyo': '28ZjrtD_iL0',
  'Rome': 'djFJaNsVWNY',
  'Rio de Janeiro': '8SOK2eg3bTU',
  'Mumbai': 'DFQO7Zn-KM4',
  'Kolkata': '_08eL3K3_d0',
  'New Delhi': 'n-O_u5uUj2E',
  'Bangalore': '3YF3k6_R8qM',
  'Chennai': 'W_q6Y-mN_5c',
  'Amsterdam': '7Ttc3AaPNZs',
  'Hong Kong': 'tLdZPklcrr0',
  'Sydney': 'HRg1gJi6yqc',
  'Singapore': 'P_bbpWu7jMk',
  'Lisbon': 'aqevs6jLdJI',
  'Dubai': 'cjAqAkpF7CA',
  'Johannesburg': 'vO_qC8H_Y2M', 
  'Toronto': 'P_bbpWu7jMk', 
  'Earth': 'P5Wj9p7O_m8', // Neutral fallback
};

export const fallbackStations = featuredStations.slice();
