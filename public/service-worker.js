const CACHE_NAME = 'world-radio-atlas-shell-v2026-05-17';

const CORE_ASSETS = [
    '/',
    '/index.html',
    '/browse.html',
    '/404.html',
    '/manifest.json',
    '/favicon.svg',
    '/logo.svg'
];

function isLocalDevelopmentUrl(url) {
    return url.hostname === 'localhost' ||
        url.hostname === '127.0.0.1' ||
        url.hostname === '::1' ||
        url.hostname.endsWith('.localhost');
}

function shouldCacheRequest(request) {
    const url = new URL(request.url);
    if (isLocalDevelopmentUrl(url)) {
        return false;
    }

    if (url.origin !== self.location.origin) {
        return false;
    }

    // 1. NEVER cache audio or video streams.
    if (request.destination === 'audio' || request.destination === 'video') {
        return false;
    }

    // 2. Do not cache range requests (common for media buffering)
    if (request.headers.get('range')) {
        return false;
    }

    // 3. EXCLUDE Map Tiles (These cause massive cache bloat)
    const mapDomains = ['basemaps.cartocdn.com', 'server.arcgisonline.com', 'tile.opentopomap.org', 'tile.openstreetmap.org'];
    if (mapDomains.some(domain => url.hostname.includes(domain))) {
        return false;
    }

    // 4. Exclude large media extensions from same-origin caching
    const path = url.pathname.toLowerCase();
    const mediaExtensions = ['.mp3', '.aac', '.mp4', '.m4v', '.m4a', '.webm', '.ogg', '.wav', '.flac'];
    if (mediaExtensions.some(ext => path.endsWith(ext))) {
        return false;
    }

    // 5. Cache only same-origin app-shell assets.
    return true;
}

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        if (isLocalDevelopmentUrl(new URL(self.location.href))) {
            await self.registration.unregister();
            return;
        }

        const cache = await caches.open(CACHE_NAME);
        // Use addAll for core assets; failures are acceptable for optional ones
        await Promise.allSettled(
            CORE_ASSETS.map(async (asset) => {
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

    const url = new URL(event.request.url);
    if (isLocalDevelopmentUrl(url)) {
        return;
    }

    // Navigation requests: network-first with offline fallback
    if (event.request.mode === 'navigate') {
        event.respondWith((async () => {
            try {
                const response = await fetch(event.request);
                // Cache the successful navigation response
                const cache = await caches.open(CACHE_NAME);
                cache.put(event.request, response.clone());
                return response;
            } catch (error) {
                const cached = await caches.match(event.request);
                return cached || (await caches.match('/index.html')) || (await caches.match('/404.html'));
            }
        })());
        return;
    }

    // Skip non-cacheable requests
    if (!shouldCacheRequest(event.request)) {
        return;
    }

    // Stale-while-revalidate for assets
    event.respondWith((async () => {
        const cached = await caches.match(event.request);
        if (cached) {
            // Revalidate in background
            event.waitUntil((async () => {
                try {
                    const freshResponse = await fetch(event.request);
                    if (freshResponse && freshResponse.status !== 206 && freshResponse.ok) {
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
            
            // Final safety check: don't cache partial content or opaque responses.
            if (response && response.status !== 206 && response.ok) {
                const cache = await caches.open(CACHE_NAME);
                await cache.put(event.request, response.clone());
            }
            return response;
        } catch (error) {
            return caches.match(event.request);
        }
    })());
});
