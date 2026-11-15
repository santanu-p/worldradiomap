import assert from 'node:assert/strict';
import test from 'node:test';

import { createMachine } from '../src/stateMachine.js';
import {
  createPlaybackStateMachine,
  createCatalogStateMachine,
  createUIStateMachine,
  createCityVideoStateMachine
} from '../src/appStateMachines.js';

test('StateMachine engine handles basic states, transitions, and history', () => {
  const machine = createMachine({
    name: 'TrafficLight',
    initial: 'green',
    context: { cycles: 0 },
    states: {
      green: {
        on: {
          TIMER: {
            target: 'yellow',
            action: (ctx) => { ctx.cycles += 1; }
          }
        }
      },
      yellow: {
        on: { TIMER: 'red' }
      },
      red: {
        on: { TIMER: 'green' }
      }
    }
  });

  assert.equal(machine.currentState, 'green');
  assert.equal(machine.matches('green'), true);
  assert.equal(machine.can('TIMER'), true);
  assert.equal(machine.can('INVALID'), false);

  const transitioned = machine.send('TIMER');
  assert.equal(transitioned, true);
  assert.equal(machine.currentState, 'yellow');
  assert.equal(machine.context.cycles, 1);
  assert.equal(machine.history.length, 1);
  assert.equal(machine.history[0].from, 'green');
  assert.equal(machine.history[0].to, 'yellow');

  machine.send('TIMER');
  assert.equal(machine.currentState, 'red');

  machine.send('TIMER');
  assert.equal(machine.currentState, 'green');
  assert.equal(machine.history.length, 3);
});

test('StateMachine handles transition guards and branch arrays', () => {
  const machine = createMachine({
    initial: 'locked',
    context: { attempts: 0 },
    states: {
      locked: {
        on: {
          UNLOCK: [
            {
              target: 'unlocked',
              guard: (ctx, e) => e.code === 'secret'
            },
            {
              target: 'locked',
              action: (ctx) => { ctx.attempts += 1; }
            }
          ]
        }
      },
      unlocked: {}
    }
  });

  machine.send({ type: 'UNLOCK', code: 'wrong' });
  assert.equal(machine.currentState, 'locked');
  assert.equal(machine.context.attempts, 1);

  machine.send({ type: 'UNLOCK', code: 'secret' });
  assert.equal(machine.currentState, 'unlocked');
});

test('StateMachine lifecycle: entry and exit hooks and subscriber notifications', () => {
  const log = [];
  const machine = createMachine({
    initial: 'a',
    states: {
      a: {
        entry: () => log.push('enter_a'),
        exit: () => log.push('exit_a'),
        on: { NEXT: 'b' }
      },
      b: {
        entry: () => log.push('enter_b'),
        exit: () => log.push('exit_b'),
        on: { BACK: 'a' }
      }
    }
  });

  assert.deepEqual(log, ['enter_a']);

  let subscriberCalls = 0;
  const unsubscribe = machine.subscribe((state, record) => {
    subscriberCalls += 1;
    assert.equal(record.to, 'b');
  });

  machine.send('NEXT');
  assert.deepEqual(log, ['enter_a', 'exit_a', 'enter_b']);
  assert.equal(subscriberCalls, 1);

  unsubscribe();
  machine.send('BACK');
  assert.equal(subscriberCalls, 1); // Not called after unsubscribe
});

test('PlaybackFSM tracks audio modes, buffering, and CORS fallback flow', () => {
  let playNotice = null;
  const fsm = createPlaybackStateMachine({
    onPlaying: (ctx, mode) => {
      playNotice = { mode, station: ctx.station?.name };
    }
  });

  assert.equal(fsm.matches('idle'), true);

  // 1. User starts a station
  fsm.send({
    type: 'PLAY_STATION',
    station: { id: 's1', name: 'BBC World Service', url: 'https://stream.example/bbc.mp3' }
  });
  assert.equal(fsm.matches('connecting'), true);
  assert.equal(fsm.context.mode, 'dsp');

  // 2. Stream buffers
  fsm.send('AUDIO_WAITING');
  assert.equal(fsm.matches('buffering'), true);

  // 3. Audio connects and starts playing in DSP mode
  fsm.send('AUDIO_PLAYING');
  assert.equal(fsm.matches('playing_dsp'), true);
  assert.equal(playNotice.mode, 'dsp');
  assert.equal(playNotice.station, 'BBC World Service');

  // 4. CORS mute detected: reconnects in Direct mode
  fsm.send('CORS_MUTE_DETECTED');
  assert.equal(fsm.matches('connecting'), true);
  assert.equal(fsm.context.mode, 'direct');

  // 5. Playing in direct mode
  fsm.send('AUDIO_PLAYING');
  assert.equal(fsm.matches('playing_direct'), true);
  assert.equal(playNotice.mode, 'direct');

  // 6. Stop resets to idle
  fsm.send('STOP');
  assert.equal(fsm.matches('idle'), true);
});

test('PlaybackFSM handles watchdog expiration and error state recovery', () => {
  const fsm = createPlaybackStateMachine();

  fsm.send({
    type: 'PLAY_STATION',
    station: { id: 's2', name: 'Offline FM', url: 'https://stream.example/offline.mp3' }
  });
  assert.equal(fsm.matches('connecting'), true);

  fsm.send({ type: 'WATCHDOG_EXPIRED', message: 'Stream timed out' });
  assert.equal(fsm.matches('error'), true);
  assert.equal(fsm.context.errorMessage, 'Stream timed out');

  // Recover by playing a new station
  fsm.send({
    type: 'PLAY_STATION',
    station: { id: 's3', name: 'Working FM', url: 'https://stream.example/working.mp3' }
  });
  assert.equal(fsm.matches('connecting'), true);
  assert.equal(fsm.context.errorMessage, null);
});

test('CatalogFSM handles cache check, mirror rotation, and fallback', () => {
  const fsm = createCatalogStateMachine();

  assert.equal(fsm.matches('idle'), true);
  fsm.send('START_LOAD');
  assert.equal(fsm.matches('checking_cache'), true);

  // Cache hit
  fsm.send({ type: 'CACHE_VALID', count: 12500 });
  assert.equal(fsm.matches('ready'), true);
  assert.equal(fsm.context.count, 12500);
  assert.equal(fsm.context.cacheSource, 'idb');

  // Fresh load simulation with mirror rotation
  const freshFsm = createCatalogStateMachine();
  freshFsm.send('START_LOAD');
  freshFsm.send('CACHE_MISS');
  assert.equal(freshFsm.matches('fetching_network'), true);

  freshFsm.send('MIRROR_FAIL');
  assert.equal(freshFsm.matches('rotating_mirror'), true);
  assert.equal(freshFsm.context.mirrorIndex, 1);

  freshFsm.send('ALL_MIRRORS_FAILED');
  assert.equal(freshFsm.matches('fallback_curated'), true);

  freshFsm.send({ type: 'FALLBACK_LOADED', count: 50 });
  assert.equal(freshFsm.matches('ready'), true);
  assert.equal(freshFsm.context.count, 50);
});

test('UIOverlayFSM guarantees mutual exclusion between modals and drawers', () => {
  let opened = null;
  const fsm = createUIStateMachine({
    onOpenSearch: () => { opened = 'search'; },
    onOpenPassport: () => { opened = 'passport'; },
    onOpenEq: () => { opened = 'eq'; },
    onOpenAmbient: () => { opened = 'ambient'; },
    onCloseAll: () => { opened = 'none'; }
  });

  assert.equal(fsm.matches('closed'), true);

  fsm.send('OPEN_SEARCH');
  assert.equal(fsm.matches('search'), true);
  assert.equal(opened, 'search');

  // Opening Passport directly closes search and opens passport
  fsm.send('OPEN_PASSPORT');
  assert.equal(fsm.matches('passport'), true);
  assert.equal(opened, 'passport');

  // Opening EQ closes passport and opens EQ drawer
  fsm.send('TOGGLE_EQ');
  assert.equal(fsm.matches('eq_drawer'), true);
  assert.equal(opened, 'eq');

  // Opening Ambient closes EQ drawer and opens Ambient drawer
  fsm.send('TOGGLE_AMBIENT');
  assert.equal(fsm.matches('ambient_drawer'), true);
  assert.equal(opened, 'ambient');

  // Escape key closes everything
  fsm.send('ESCAPE');
  assert.equal(fsm.matches('closed'), true);
  assert.equal(opened, 'none');
});

test('CityVideoFSM transitions from prompt to active and handles cinema mode', () => {
  let cinemaState = false;
  const fsm = createCityVideoStateMachine({
    onCinemaMode: (ctx, isCinema) => { cinemaState = isCinema; }
  });

  assert.equal(fsm.matches('idle_prompt'), true);

  fsm.send({ type: 'STATION_SELECTED', city: 'Berlin', country: 'Germany' });
  assert.equal(fsm.matches('resolving'), true);
  assert.equal(fsm.context.city, 'Berlin');

  fsm.send({
    type: 'VIDEO_RESOLVED',
    videoId: 'abc1234',
    embedUrl: 'https://youtube-nocookie.com/embed/abc1234'
  });
  assert.equal(fsm.matches('loading_iframe'), true);
  assert.equal(fsm.context.videoId, 'abc1234');

  fsm.send('IFRAME_LOADED');
  assert.equal(fsm.matches('active'), true);

  // Enter cinema mode
  fsm.send('TOGGLE_CINEMA');
  assert.equal(fsm.matches('cinema_mode'), true);
  assert.equal(cinemaState, true);

  // Exit cinema mode
  fsm.send('EXIT_CINEMA');
  assert.equal(fsm.matches('active'), true);
  assert.equal(cinemaState, false);

  // Clear when player closes
  fsm.send('CLEAR_VIDEO');
  assert.equal(fsm.matches('idle_prompt'), true);
});
