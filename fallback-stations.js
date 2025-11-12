// Sample fallback stations (used if API fails)
const FALLBACK_STATIONS = [
    {name:"BBC Radio 1",country:"United Kingdom",tags:"pop,music",votes:5000,geo_lat:51.5074,geo_long:-0.1278,url_resolved:"http://stream.live.vc.bbcmedia.co.uk/bbc_radio_one",stationuuid:"961d5bc3-0601-11e8-ae97-52543be04c81"},
    {name:"NPR",country:"USA",tags:"news,talk",votes:4500,geo_lat:38.8951,geo_long:-77.0364,url_resolved:"http://npr-ice.streamguys1.com/live.mp3",stationuuid:"961d5d35-0601-11e8-ae97-52543be04c81"},
    {name:"France Inter",country:"France",tags:"news,talk",votes:4000,geo_lat:48.8566,geo_long:2.3522,url_resolved:"http://direct.franceinter.fr/live/franceinter-midfi.mp3",stationuuid:"961d5e57-0601-11e8-ae97-52543be04c81"},
    {name:"Deutschlandfunk",country:"Germany",tags:"news,culture",votes:3800,geo_lat:52.5200,geo_long:13.4050,url_resolved:"http://st01.dlf.de/dlf/01/128/mp3/stream.mp3",stationuuid:"961d5f79-0601-11e8-ae97-52543be04c81"},
    {name:"Radio Nacional",country:"Argentina",tags:"news,music",votes:3500,geo_lat:-34.6037,geo_long:-58.3816,url_resolved:"http://sa.mp3.icecast.magma.edge-access.net:7200/sc_rad1",stationuuid:"961d609b-0601-11e8-ae97-52543be04c81"},
    {name:"ABC Classic FM",country:"Australia",tags:"classical",votes:3200,geo_lat:-33.8688,geo_long:151.2093,url_resolved:"http://live-radio01.mediahubaustralia.com/2FCW/mp3/",stationuuid:"961d61bd-0601-11e8-ae97-52543be04c81"},
    {name:"NHK Radio Japan",country:"Japan",tags:"news,culture",votes:3000,geo_lat:35.6762,geo_long:139.6503,url_resolved:"http://nhkradioakr-i.akamaihd.net/hls/live/511633/1-r1/1-r1-01.m3u8",stationuuid:"961d62df-0601-11e8-ae97-52543be04c81"},
    {name:"CBC Radio One",country:"Canada",tags:"news,talk",votes:2800,geo_lat:45.4215,geo_long:-75.6972,url_resolved:"http://cbcliveradio-lh.akamaihd.net/i/CBCR1_MTL@382863/master.m3u8",stationuuid:"961d6401-0601-11e8-ae97-52543be04c81"},
    {name:"RTÉ Radio 1",country:"Ireland",tags:"news,talk",votes:2500,geo_lat:53.3498,geo_long:-6.2603,url_resolved:"http://icecast1.rte.ie/radio1",stationuuid:"961d6523-0601-11e8-ae97-52543be04c81"},
    {name:"Radio España",country:"Spain",tags:"music,pop",votes:2300,geo_lat:40.4168,geo_long:-3.7038,url_resolved:"http://cires21.streaming.rtvcast.com:8080/radio.mp3",stationuuid:"961d6645-0601-11e8-ae97-52543be04c81"}
];

export default FALLBACK_STATIONS;
