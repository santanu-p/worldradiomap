const APP_SHELL_CACHE_PREFIXES = [
  'world-radio-atlas-shell-',
  'world-radio-map-shell-'
];

export function isLocalDevelopmentHost(locationLike) {
  const hostname = locationLike?.hostname || '';
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname.endsWith('.localhost');
}

async function clearAppShellCaches(cachesObj) {
  if (!cachesObj?.keys || !cachesObj?.delete) return;

  const cacheNames = await cachesObj.keys();
  await Promise.all(
    cacheNames
      .filter((cacheName) => APP_SHELL_CACHE_PREFIXES.some((prefix) => cacheName.startsWith(prefix)))
      .map((cacheName) => cachesObj.delete(cacheName))
  );
}

export async function unregisterLocalServiceWorkers(navigatorObj, cachesObj) {
  const serviceWorker = navigatorObj?.serviceWorker;
  if (!serviceWorker?.getRegistrations) return;

  const registrations = await serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
  await clearAppShellCaches(cachesObj);
}

export function setupServiceWorker({
  windowObj = globalThis.window,
  navigatorObj = globalThis.navigator,
  cachesObj = globalThis.caches,
  locationObj = globalThis.location
} = {}) {
  if (!windowObj?.addEventListener || !navigatorObj?.serviceWorker) return;

  windowObj.addEventListener('load', async () => {
    if (isLocalDevelopmentHost(locationObj)) {
      try {
        await unregisterLocalServiceWorkers(navigatorObj, cachesObj);
        console.info('Local service worker cache cleared for development.');
      } catch (err) {
        console.warn('Local service worker cleanup failed:', err);
      }
      return;
    }

    try {
      const reg = await navigatorObj.serviceWorker.register('/service-worker.js');
      console.log('SW registered:', reg.scope);
    } catch (err) {
      console.warn('SW registration failed:', err);
    }
  });
}
