/**
 * Lightweight, deterministic Finite State Machine (FSM) engine.
 * Elevates UX (prevents invalid states/race conditions),
 * DX (predictable event-driven transitions and centralized logging),
 * and AX (exposes inspectable runtime states and programmatic telemetry).
 */

export class StateMachine {
  constructor(config) {
    this.name = config.name || 'FSM';
    this.initialState = config.initial;
    this.states = config.states || {};
    this.context = { ...(config.context || {}) };
    this.currentState = config.initial;
    this.listeners = new Set();
    this.history = [];
    this.maxHistory = config.maxHistory || 25;

    // Call onEntry for initial state if defined
    const initialStateConfig = this.states[this.initialState];
    if (initialStateConfig?.entry) {
      initialStateConfig.entry(this.context);
    }
  }

  getState() {
    return {
      name: this.name,
      value: this.currentState,
      context: { ...this.context }
    };
  }

  matches(stateValue) {
    return this.currentState === stateValue;
  }

  can(eventType) {
    const stateDef = this.states[this.currentState];
    return Boolean(stateDef?.on?.[eventType]);
  }

  transition(event) {
    const eventObj = typeof event === 'string' ? { type: event } : event;
    const eventType = eventObj.type;
    const stateDef = this.states[this.currentState];

    if (!stateDef) {
      console.warn(`[${this.name}] Unknown state: "${this.currentState}"`);
      return false;
    }

    const transitionTarget = stateDef.on?.[eventType];
    if (!transitionTarget) {
      // Event not handled in current state (silent ignore or no-op)
      return false;
    }

    let nextState = null;
    let action = null;
    let guard = null;

    let candidate = transitionTarget;
    if (Array.isArray(candidate)) {
      candidate = candidate.find(branch => !branch.guard || branch.guard(this.context, eventObj));
      if (!candidate) return false;
    }

    if (typeof candidate === 'string') {
      nextState = candidate;
    } else if (typeof candidate === 'object' && candidate !== null) {
      guard = candidate.guard;
      if (guard && !guard(this.context, eventObj)) {
        return false;
      }
      nextState = candidate.target || this.currentState;
      action = candidate.action;
    } else if (typeof candidate === 'function') {
      nextState = candidate(this.context, eventObj);
    }

    if (!nextState || !this.states[nextState]) {
      console.warn(`[${this.name}] Invalid transition target: "${nextState}" from "${this.currentState}" on event "${eventType}"`);
      return false;
    }

    const prevState = this.currentState;

    // Exit action of previous state
    if (this.states[prevState]?.exit) {
      this.states[prevState].exit(this.context, eventObj);
    }

    // Transition action
    if (action) {
      action(this.context, eventObj);
    }

    // Update state
    this.currentState = nextState;

    // Entry action of next state
    if (this.states[nextState]?.entry) {
      this.states[nextState].entry(this.context, eventObj);
    }

    const transitionRecord = {
      timestamp: Date.now(),
      machine: this.name,
      from: prevState,
      to: nextState,
      event: eventObj
    };

    this.history.push(transitionRecord);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Notify listeners
    for (const listener of this.listeners) {
      try {
        listener(this.getState(), transitionRecord);
      } catch (err) {
        console.error(`[${this.name}] Listener error:`, err);
      }
    }

    return true;
  }

  send(event) {
    return this.transition(event);
  }

  updateContext(updater) {
    if (typeof updater === 'function') {
      this.context = { ...this.context, ...updater(this.context) };
    } else if (typeof updater === 'object' && updater !== null) {
      this.context = { ...this.context, ...updater };
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export function createMachine(config) {
  return new StateMachine(config);
}
