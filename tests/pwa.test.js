import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isLocalDevelopmentHost,
  setupServiceWorker,
  unregisterLocalServiceWorkers
} from '../src/pwa.js';

test('detects localhost development hosts', () => {
  assert.equal(isLocalDevelopmentHost({ hostname: 'localhost' }), true);
  assert.equal(isLocalDevelopmentHost({ hostname: '127.0.0.1' }), true);
  assert.equal(isLocalDevelopmentHost({ hostname: 'worldradioatlas.netlify.app' }), false);
});

test('unregisters existing service workers and clears app shell caches on localhost', async () => {
  const unregisterCalls = [];
  const deletedCaches = [];

  await unregisterLocalServiceWorkers({
    serviceWorker: {
      getRegistrations: async () => [
        { unregister: async () => unregisterCalls.push('first') },
        { unregister: async () => unregisterCalls.push('second') }
      ]
    }
  }, {
    keys: async () => ['world-radio-atlas-shell-old', 'world-radio-map-shell-legacy', 'other-cache'],
    delete: async (cacheName) => deletedCaches.push(cacheName)
  });

  assert.deepEqual(unregisterCalls, ['first', 'second']);
  assert.deepEqual(deletedCaches, ['world-radio-atlas-shell-old', 'world-radio-map-shell-legacy']);
});

test('does not register a service worker on localhost', async () => {
  let loadHandler;
  let registered = false;
  let unregistered = false;

  setupServiceWorker({
    windowObj: {
      addEventListener(eventName, handler) {
        if (eventName === 'load') loadHandler = handler;
      }
    },
    navigatorObj: {
      serviceWorker: {
        getRegistrations: async () => [
          { unregister: async () => { unregistered = true; } }
        ],
        register: async () => {
          registered = true;
        }
      }
    },
    cachesObj: {
      keys: async () => [],
      delete: async () => true
    },
    locationObj: { hostname: 'localhost' }
  });

  assert.equal(typeof loadHandler, 'function');
  await loadHandler();

  assert.equal(registered, false);
  assert.equal(unregistered, true);
});

test('registers the service worker on production hosts', async () => {
  let loadHandler;
  let registeredUrl = '';

  setupServiceWorker({
    windowObj: {
      addEventListener(eventName, handler) {
        if (eventName === 'load') loadHandler = handler;
      }
    },
    navigatorObj: {
      serviceWorker: {
        register: async (url) => {
          registeredUrl = url;
          return { scope: 'https://worldradioatlas.netlify.app/' };
        }
      }
    },
    locationObj: { hostname: 'worldradioatlas.netlify.app' }
  });

  await loadHandler();

  assert.equal(registeredUrl, '/service-worker.js');
});
