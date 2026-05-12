const CACHE_NAME = 'world-radio-atlas-shell-v2026-05-12';

const CORE_ASSETS = [
    '/',
    '/index.html',
    '/browse.html',
    '/404.html',
    '/manifest.json',
    '/favicon_io/site.webmanifest',
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
    // Cache same-origin assets and external style/script/image/font assets
    if (url.origin === self.location.origin) {
        return true;
    }
    return ['style', 'script', 'image', 'font'].includes(request.destination);
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
