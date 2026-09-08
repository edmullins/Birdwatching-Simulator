// public/js/game/stateMachine.js
//
// Issue #12 — Bird state machine.
//
// Generic finite state machine for a single bird instance's lifecycle
// (design doc §3):
//
//   spawning -> visible -> [fleeing -> hidden -> visible] -> visible -> clicked -> despawned
//
// This file has no DOM or rendering opinions and no idea what "birdDensity"
// or "rarity" mean — game/birdSpawner.js owns creating/positioning bird
// instances and deciding *when* a transition should happen (flee timers,
// click handling). This file only owns *validating and executing*
// transitions and firing lifecycle hooks, so animation code (fade-in,
// flee flight, hide/reappear) has one place to hook into instead of being
// scattered through birdSpawner's timer callbacks.

export const BIRD_STATES = Object.freeze({
  SPAWNING: 'spawning',
  VISIBLE: 'visible',
  FLEEING: 'fleeing',
  HIDDEN: 'hidden',
  CLICKED: 'clicked',
  DESPAWNED: 'despawned'
});

const TRANSITIONS = {
  [BIRD_STATES.SPAWNING]: [BIRD_STATES.VISIBLE, BIRD_STATES.DESPAWNED],
  [BIRD_STATES.VISIBLE]: [BIRD_STATES.FLEEING, BIRD_STATES.CLICKED, BIRD_STATES.DESPAWNED],
  [BIRD_STATES.FLEEING]: [BIRD_STATES.HIDDEN, BIRD_STATES.DESPAWNED],
  [BIRD_STATES.HIDDEN]: [BIRD_STATES.VISIBLE, BIRD_STATES.DESPAWNED],
  [BIRD_STATES.CLICKED]: [BIRD_STATES.DESPAWNED],
  [BIRD_STATES.DESPAWNED]: []
};

/**
 * @param {object} [options]
 * @param {string} [options.initial] - starting state, defaults to 'spawning'.
 * @param {Partial<Record<string, (machine: object, from: string) => void>>} [options.onEnter]
 *   per-state callbacks fired synchronously right after entering that
 *   state — including the initial state, fired synchronously during this
 *   call. Because of that, an `onEnter[initial]` handler shouldn't call
 *   back into the machine it's still in the middle of constructing
 *   (e.g. `machine.transition(...)`) synchronously; scheduling a timer
 *   that calls it later, like birdSpawner.js does, is fine.
 */
export function createBirdStateMachine({ initial = BIRD_STATES.SPAWNING, onEnter = {} } = {}) {
  if (!TRANSITIONS[initial]) {
    throw new Error(`createBirdStateMachine: unknown initial state "${initial}"`);
  }

  let state = initial;
  const listeners = new Set();

  const machine = {
    get state() {
      return state;
    },

    /** True if `to` is a legal transition from the current state. */
    can(to) {
      return TRANSITIONS[state]?.includes(to) ?? false;
    },

    /**
     * Attempts to transition to `to`. Returns true if it happened, false
     * if it was illegal (e.g. trying to click a bird that's already
     * fleeing). Callers should treat an illegal transition as a no-op,
     * not an exception — a click landing the same frame a flee timer
     * fires is an expected race, not a bug, and this is how birdSpawner
     * gets that race resolved for free.
     */
    transition(to) {
      if (!machine.can(to)) return false;
      const from = state;
      state = to;
      onEnter[to]?.(machine, from);
      listeners.forEach((fn) => fn(state, from));
      return true;
    },

    /** Subscribe to every state change. Returns an unsubscribe function. */
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }
  };

  // Fire the initial state's onEnter too (from: null signals "not a real
  // transition, this is construction") — otherwise a bird spawned with
  // initial: 'spawning' never gets its spawn-fade timer or fade-in class
  // applied, since nothing ever "transitioned into" spawning.
  onEnter[initial]?.(machine, null);

  return machine;
}