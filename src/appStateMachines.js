/**
 * Explicit application state machines for World Radio Atlas.
 * Unifies playback, catalog ingestion, UI overlays, and city video synchronization.
 */

import { createMachine } from './stateMachine.js';

/**
 * 1. Playback State Machine
 */
export function createPlaybackStateMachine(callbacks = {}) {
  return createMachine({
    name: 'PlaybackFSM',
    initial: 'idle',
    context: {
      station: null,
      mode: 'dsp', // 'dsp' | 'direct'
      streamUrl: null,
      retryCount: 0,
      errorMessage: null
    },
    states: {
      idle: {
        entry: (ctx) => {
          if (callbacks.onIdle) callbacks.onIdle(ctx);
        },
        on: {
          PLAY_STATION: {
            target: 'connecting',
            action: (ctx, e) => {
              ctx.station = e.station;
              ctx.streamUrl = e.streamUrl || e.station?.url;
              ctx.retryCount = 0;
              ctx.errorMessage = null;
              ctx.mode = e.forceDirect ? 'direct' : 'dsp';
            }
          }
        }
      },
      connecting: {
        entry: (ctx, e) => {
          if (callbacks.onConnecting) callbacks.onConnecting(ctx, e);
        },
        on: {
          AUDIO_PLAYING: [
            { target: 'playing_direct', guard: (ctx) => ctx.mode === 'direct' },
            { target: 'playing_dsp' }
          ],
          AUDIO_PLAYING_DIRECT: {
            target: 'playing_direct'
          },
          AUDIO_WAITING: 'buffering',
          FALLBACK_TO_DIRECT: {
            target: 'connecting',
            action: (ctx) => {
              ctx.mode = 'direct';
            }
          },
          WATCHDOG_EXPIRED: {
            target: 'error',
            action: (ctx, e) => {
              ctx.errorMessage = e?.message || 'Connection timed out';
            }
          },
          MEDIA_ERROR: {
            target: 'error',
            action: (ctx, e) => {
              ctx.errorMessage = e?.message || 'Stream error';
            }
          },
          STOP: 'idle'
        }
      },
      buffering: {
        entry: (ctx, e) => {
          if (callbacks.onBuffering) callbacks.onBuffering(ctx, e);
        },
        on: {
          AUDIO_PLAYING: [
            { target: 'playing_direct', guard: (ctx) => ctx.mode === 'direct' },
            { target: 'playing_dsp' }
          ],
          AUDIO_PLAYING_DIRECT: {
            target: 'playing_direct'
          },
          WATCHDOG_EXPIRED: 'error',
          MEDIA_ERROR: 'error',
          STOP: 'idle'
        }
      },
      playing_dsp: {
        entry: (ctx, e) => {
          ctx.mode = 'dsp';
          if (callbacks.onPlaying) callbacks.onPlaying(ctx, 'dsp', e);
        },
        on: {
          AUDIO_WAITING: 'buffering',
          CORS_MUTE_DETECTED: {
            target: 'connecting',
            action: (ctx) => {
              ctx.mode = 'direct';
            }
          },
          MEDIA_ERROR: {
            target: 'connecting',
            action: (ctx) => {
              ctx.mode = 'direct';
            }
          },
          STALLED: 'reconnecting',
          PAUSE: 'idle',
          STOP: 'idle',
          PLAY_STATION: {
            target: 'connecting',
            action: (ctx, e) => {
              ctx.station = e.station;
              ctx.streamUrl = e.streamUrl || e.station?.url;
              ctx.mode = e.forceDirect ? 'direct' : 'dsp';
            }
          }
        }
      },
      playing_direct: {
        entry: (ctx, e) => {
          ctx.mode = 'direct';
          if (callbacks.onPlaying) callbacks.onPlaying(ctx, 'direct', e);
        },
        on: {
          AUDIO_WAITING: 'buffering',
          STALLED: 'reconnecting',
          MEDIA_ERROR: 'error',
          PAUSE: 'idle',
          STOP: 'idle',
          PLAY_STATION: {
            target: 'connecting',
            action: (ctx, e) => {
              ctx.station = e.station;
              ctx.streamUrl = e.streamUrl || e.station?.url;
              ctx.mode = e.forceDirect ? 'direct' : 'dsp';
            }
          }
        }
      },
      reconnecting: {
        entry: (ctx, e) => {
          if (callbacks.onReconnecting) callbacks.onReconnecting(ctx, e);
        },
        on: {
          AUDIO_PLAYING: [
            { target: 'playing_direct', guard: (ctx) => ctx.mode === 'direct' },
            { target: 'playing_dsp' }
          ],
          AUDIO_PLAYING_DIRECT: {
            target: 'playing_direct'
          },
          WATCHDOG_EXPIRED: 'error',
          MEDIA_ERROR: 'error',
          STOP: 'idle'
        }
      },
      error: {
        entry: (ctx, e) => {
          if (callbacks.onError) callbacks.onError(ctx, e);
        },
        on: {
          PLAY_STATION: {
            target: 'connecting',
            action: (ctx, e) => {
              ctx.station = e.station;
              ctx.streamUrl = e.streamUrl || e.station?.url;
              ctx.mode = e.forceDirect ? 'direct' : 'dsp';
              ctx.errorMessage = null;
            }
          },
          RESET: 'idle'
        }
      }
    }
  });
}

/**
 * 2. Catalog Ingestion State Machine
 */
export function createCatalogStateMachine(callbacks = {}) {
  return createMachine({
    name: 'CatalogFSM',
    initial: 'idle',
    context: {
      count: 0,
      activeMirror: null,
      mirrorIndex: 0,
      cacheSource: null // 'idb' | 'network' | 'fallback'
    },
    states: {
      idle: {
        on: {
          START_LOAD: 'checking_cache'
        }
      },
      checking_cache: {
        entry: (ctx) => {
          if (callbacks.onCheckingCache) callbacks.onCheckingCache(ctx);
        },
        on: {
          CACHE_VALID: {
            target: 'ready',
            action: (ctx, e) => {
              ctx.count = e.count;
              ctx.cacheSource = 'idb';
            }
          },
          CACHE_MISS: 'fetching_network'
        }
      },
      fetching_network: {
        entry: (ctx, e) => {
          ctx.activeMirror = e.mirror || ctx.activeMirror;
          if (callbacks.onFetchingNetwork) callbacks.onFetchingNetwork(ctx, e);
        },
        on: {
          NETWORK_PROGRESS: {
            action: (ctx, e) => {
              ctx.count = e.count;
            }
          },
          NETWORK_SUCCESS: {
            target: 'ready',
            action: (ctx, e) => {
              ctx.count = e.count;
              ctx.cacheSource = 'network';
            }
          },
          MIRROR_FAIL: {
            target: 'rotating_mirror',
            action: (ctx, e) => {
              ctx.mirrorIndex += 1;
            }
          },
          ALL_MIRRORS_FAILED: 'fallback_curated'
        }
      },
      rotating_mirror: {
        entry: (ctx, e) => {
          if (callbacks.onRotatingMirror) callbacks.onRotatingMirror(ctx, e);
        },
        on: {
          TRY_NEXT_MIRROR: {
            target: 'fetching_network',
            action: (ctx, e) => {
              ctx.activeMirror = e.mirror;
            }
          },
          EXHAUSTED_MIRRORS: 'fallback_curated',
          ALL_MIRRORS_FAILED: 'fallback_curated'
        }
      },
      fallback_curated: {
        entry: (ctx) => {
          ctx.cacheSource = 'fallback';
          if (callbacks.onFallbackCurated) callbacks.onFallbackCurated(ctx);
        },
        on: {
          FALLBACK_LOADED: {
            target: 'ready',
            action: (ctx, e) => {
              ctx.count = e.count;
            }
          }
        }
      },
      ready: {
        entry: (ctx, e) => {
          if (callbacks.onReady) callbacks.onReady(ctx, e);
        },
        on: {
          TRIGGER_BACKGROUND_REFRESH: 'fetching_network'
        }
      }
    }
  });
}

/**
 * 3. Unified UI Overlays & Drawers State Machine
 * Eliminates modal collisions and ensures deterministic open/close states.
 */
export function createUIStateMachine(callbacks = {}) {
  return createMachine({
    name: 'UIOverlayFSM',
    initial: 'closed',
    context: {
      activeView: null
    },
    states: {
      closed: {
        entry: (ctx) => {
          ctx.activeView = null;
          if (callbacks.onCloseAll) callbacks.onCloseAll();
        },
        on: {
          OPEN_SEARCH: 'search',
          OPEN_PASSPORT: 'passport',
          OPEN_MOBILE_NAV: 'mobile_nav',
          TOGGLE_EQ: 'eq_drawer',
          TOGGLE_AMBIENT: 'ambient_drawer',
          TOGGLE_SLEEP: 'sleep_drawer'
        }
      },
      search: {
        entry: (ctx) => {
          ctx.activeView = 'search';
          if (callbacks.onOpenSearch) callbacks.onOpenSearch();
        },
        on: {
          CLOSE: 'closed',
          ESCAPE: 'closed',
          OPEN_SEARCH: 'search',
          OPEN_PASSPORT: 'passport',
          OPEN_MOBILE_NAV: 'mobile_nav',
          TOGGLE_EQ: 'eq_drawer',
          TOGGLE_AMBIENT: 'ambient_drawer',
          TOGGLE_SLEEP: 'sleep_drawer'
        }
      },
      passport: {
        entry: (ctx) => {
          ctx.activeView = 'passport';
          if (callbacks.onOpenPassport) callbacks.onOpenPassport();
        },
        on: {
          CLOSE: 'closed',
          ESCAPE: 'closed',
          OPEN_SEARCH: 'search',
          OPEN_PASSPORT: 'passport',
          OPEN_MOBILE_NAV: 'mobile_nav',
          TOGGLE_EQ: 'eq_drawer',
          TOGGLE_AMBIENT: 'ambient_drawer',
          TOGGLE_SLEEP: 'sleep_drawer'
        }
      },
      mobile_nav: {
        entry: (ctx) => {
          ctx.activeView = 'mobile_nav';
          if (callbacks.onOpenMobileNav) callbacks.onOpenMobileNav();
        },
        on: {
          CLOSE: 'closed',
          ESCAPE: 'closed',
          OPEN_SEARCH: 'search',
          OPEN_PASSPORT: 'passport',
          OPEN_MOBILE_NAV: 'closed',
          TOGGLE_EQ: 'eq_drawer',
          TOGGLE_AMBIENT: 'ambient_drawer',
          TOGGLE_SLEEP: 'sleep_drawer'
        }
      },
      eq_drawer: {
        entry: (ctx) => {
          ctx.activeView = 'eq_drawer';
          if (callbacks.onOpenEq) callbacks.onOpenEq();
        },
        on: {
          CLOSE: 'closed',
          ESCAPE: 'closed',
          TOGGLE_EQ: 'closed',
          TOGGLE_AMBIENT: 'ambient_drawer',
          TOGGLE_SLEEP: 'sleep_drawer',
          OPEN_SEARCH: 'search',
          OPEN_PASSPORT: 'passport',
          OPEN_MOBILE_NAV: 'mobile_nav'
        }
      },
      ambient_drawer: {
        entry: (ctx) => {
          ctx.activeView = 'ambient_drawer';
          if (callbacks.onOpenAmbient) callbacks.onOpenAmbient();
        },
        on: {
          CLOSE: 'closed',
          ESCAPE: 'closed',
          TOGGLE_AMBIENT: 'closed',
          TOGGLE_EQ: 'eq_drawer',
          TOGGLE_SLEEP: 'sleep_drawer',
          OPEN_SEARCH: 'search',
          OPEN_PASSPORT: 'passport',
          OPEN_MOBILE_NAV: 'mobile_nav'
        }
      },
      sleep_drawer: {
        entry: (ctx) => {
          ctx.activeView = 'sleep_drawer';
          if (callbacks.onOpenSleep) callbacks.onOpenSleep();
        },
        on: {
          CLOSE: 'closed',
          ESCAPE: 'closed',
          TOGGLE_SLEEP: 'closed',
          TOGGLE_EQ: 'eq_drawer',
          TOGGLE_AMBIENT: 'ambient_drawer',
          OPEN_SEARCH: 'search',
          OPEN_PASSPORT: 'passport',
          OPEN_MOBILE_NAV: 'mobile_nav'
        }
      }
    }
  });
}

/**
 * 4. City Video Synchronization State Machine
 */
export function createCityVideoStateMachine(callbacks = {}) {
  return createMachine({
    name: 'CityVideoFSM',
    initial: 'idle_prompt',
    context: {
      videoId: null,
      city: null,
      country: null,
      embedUrl: null,
      isCinema: false
    },
    states: {
      idle_prompt: {
        entry: (ctx) => {
          if (callbacks.onShowPrompt) callbacks.onShowPrompt(ctx);
        },
        on: {
          STATION_SELECTED: 'resolving'
        }
      },
      resolving: {
        entry: (ctx, e) => {
          ctx.city = e.city || ctx.city;
          ctx.country = e.country || ctx.country;
          if (callbacks.onResolving) callbacks.onResolving(ctx, e);
        },
        on: {
          VIDEO_RESOLVED: {
            target: 'loading_iframe',
            action: (ctx, e) => {
              ctx.videoId = e.videoId;
              ctx.embedUrl = e.embedUrl;
            }
          },
          VIDEO_FALLBACK_GLOBAL: {
            target: 'loading_iframe',
            action: (ctx, e) => {
              ctx.videoId = e.videoId;
              ctx.embedUrl = e.embedUrl;
            }
          },
          CLEAR_VIDEO: 'idle_prompt'
        }
      },
      loading_iframe: {
        entry: (ctx) => {
          if (callbacks.onLoadingIframe) callbacks.onLoadingIframe(ctx);
        },
        on: {
          IFRAME_LOADED: 'active',
          STATION_SELECTED: 'resolving',
          CLEAR_VIDEO: 'idle_prompt'
        }
      },
      active: {
        entry: (ctx) => {
          if (callbacks.onActive) callbacks.onActive(ctx);
        },
        on: {
          TOGGLE_CINEMA: {
            target: 'cinema_mode',
            action: (ctx) => { ctx.isCinema = true; }
          },
          ENTER_CINEMA: {
            target: 'cinema_mode',
            action: (ctx) => { ctx.isCinema = true; }
          },
          STATION_SELECTED: 'resolving',
          CLEAR_VIDEO: 'idle_prompt'
        }
      },
      cinema_mode: {
        entry: (ctx) => {
          if (callbacks.onCinemaMode) callbacks.onCinemaMode(ctx, true);
        },
        exit: (ctx) => {
          ctx.isCinema = false;
          if (callbacks.onCinemaMode) callbacks.onCinemaMode(ctx, false);
        },
        on: {
          EXIT_CINEMA: 'active',
          TOGGLE_CINEMA: 'active',
          STATION_SELECTED: 'resolving',
          CLEAR_VIDEO: 'idle_prompt'
        }
      }
    }
  });
}
