const CACHE_NAME = 'world-radio-map-shell-v2026-04-18';

const CORE_ASSETS = [
    '/',
    '/index.html',
    '/404.html',
    '/app.js',
    '/manifest.json',
    '/favicon_io/site.webmanifest',
    '/favicon_io/favicon.ico',
    '/favicon_io/favicon-16x16.png',
    '/favicon_io/favicon-32x32.png',
    '/favicon_io/apple-touch-icon.png',
    '/favicon_io/android-chrome-192x192.png',
    '/favicon_io/android-chrome-512x512.png'
]

const CDN_ASSETS = [
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css',
    'https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css',
    'https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js'
];

function shouldCacheRequest(request) {
    const url = new URL(request.url);
    if (url.origin === self.location.origin) {
        return true;
    }
    return ['style', 'script', 'image', 'font'].includes(request.destination);
}

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(CORE_ASSETS);
        await Promise.allSettled(
            CDN_ASSETS.map(async (asset) => {
                try {
                    await cache.add(asset);
                } catch (error) {
                    console.warn('Skipping precache asset:', asset, error);
                }
            })
        );
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const cacheNames = await caches.keys();
        await Promise.all(
            cacheNames.map((cacheName) => {
                if (cacheName !== CACHE_NAME) {
                    return caches.delete(cacheName);
                }
                return null;
            })
        );
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') {
        return;
    }

    if (event.request.mode === 'navigate') {
        event.respondWith((async () => {
            try {
                return await fetch(event.request);
            } catch (error) {
                return (await caches.match('/index.html')) || (await caches.match('/404.html'));
            }
        })());
        return;
    }

    if (!shouldCacheRequest(event.request)) {
        return;
    }

    event.respondWith((async () => {
        const cached = await caches.match(event.request);
        if (cached) {
            event.waitUntil((async () => {
                try {
                    const freshResponse = await fetch(event.request);
                    if (freshResponse && (freshResponse.ok || freshResponse.type === 'opaque')) {
                        const cache = await caches.open(CACHE_NAME);
                        await cache.put(event.request, freshResponse.clone());
                    }
                } catch (error) {
                    // Ignore background refresh failures.
                }
            })());
            return cached;
        }

        try {
            const response = await fetch(event.request);
            if (response && (response.ok || response.type === 'opaque')) {
                const cache = await caches.open(CACHE_NAME);
                await cache.put(event.request, response.clone());
            }
            return response;
        } catch (error) {
            return caches.match(event.request);
        }
    })());
});
