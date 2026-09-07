// public/js/game/birdSpawner.js
//
// Issue #12 — Bird spawner.
//
// Keeps up to `levelConfig.birdDensity` bird sprites alive at once inside
// a rendered scene (game/renderer.js, #11): picks which bird to spawn via
// rarity weighting, sizes it from `levelConfig.birdDistanceRange`, and
// drives each bird's lifecycle through game/stateMachine.js:
//
//   spawning -> visible -> [fleeing -> hidden -> visible] -> visible -> clicked -> despawned
//
// When a bird despawns (caught), a replacement spawns automatically so
// the level stays at `birdDensity` concurrent birds until stop()/destroy().
//
// ---------------------------------------------------------------------
// BACKEND DEPENDENCY: there's no birds catalog endpoint yet — Bird model
// is an empty stub. This is a different situation from Background (#11):
// backgrounds ended up as dev-curated static config because only birds
// are meant to be user-uploaded / admin-reviewed per the design doc, so
// birds genuinely need a real DB-backed catalog (something like
// GET /api/birds?visibility=approved) rather than a static list.
//
// Until that exists, createBirdSpawner() takes a `birdPool` array
// directly instead of fetching one itself — this module is fully usable
// today against a hand-built fixture (see the bottom of this file for
// one) and won't need to change shape once the endpoint lands; just swap
// what populates `birdPool`.
//
//   birdPool = [{ id, name, frames: [imageUrl, ...], rarity }, ...]
//   // rarity: 'basic' | 'rare' | 'epic' | 'legendary' — must have at
//   // least one entry in `rarityWeights` (defaults below cover all four).
//   //
//   // frames[0] is the rest/sitting pose, shown whenever the bird is
//   // landed. frames[1:] are a flap/transition cycle (e.g. wings up,
//   // wings down) played only while the bird is arriving (spawning) —
//   // see restFrame()/flapFrames() below. A single-frame bird just has
//   // no flap animation, which is a valid, boring bird.
// ---------------------------------------------------------------------

import { createBirdStateMachine, BIRD_STATES } from './stateMachine.js';

const DEFAULT_RARITY_WEIGHTS = {
  basic: 100,
  rare: 30,
  epic: 8,
  legendary: 2
};

// Timing constants (ms) — reasonable defaults to tune once this is
// actually being played rather than guessed at.
const SPAWN_FADE_MS = 450;
const FRAME_INTERVAL_MS = 100;
const FLEE_ANIMATION_MS = 500;
const HIDDEN_MIN_MS = 400;
const HIDDEN_MAX_MS = 1200;
const FLEE_DELAY_MIN_MS = 2500; // how long a bird sits visible before it may flee
const FLEE_DELAY_MAX_MS = 6000;

// Sprites are placed with a margin so they don't spawn clipped at the
// very edge of the scene.
const PLACEMENT_MARGIN_PCT = 8;

let nextInstanceId = 1;

/**
 * Frame contract for a bird definition's `frames` array: frames[0] is the
 * resting/sitting pose (shown whenever the bird is landed/visible);
 * everything after it is a flap/transition cycle played only while the
 * bird is arriving (see startFrameCycle in createBirdSpawner). A bird
 * with only one frame just has no flap animation — it appears and sits.
 */
function restFrame(def) {
  return def.frames[0];
}
function flapFrames(def) {
  return def.frames.length > 1 ? def.frames.slice(1) : [def.frames[0]];
}

/**
 * Picks one bird definition from `pool`, weighted by `weights[def.rarity]`
 * (defaults to weight 1 for an unrecognized rarity, so a malformed pool
 * entry degrades gracefully instead of throwing mid-game). Exported on
 * its own so rarity distribution can be unit-tested without spinning up
 * a whole spawner.
 *
 * @param {Array<{rarity:string}>} pool
 * @param {Record<string, number>} [weights]
 * @param {() => number} [random] - defaults to Math.random.
 */
export function pickWeightedBird(pool, weights = DEFAULT_RARITY_WEIGHTS, random = Math.random) {
  if (!Array.isArray(pool) || pool.length === 0) {
    throw new Error('pickWeightedBird: pool must be a non-empty array');
  }
  const weighted = pool.map((def) => ({ def, weight: weights[def.rarity] ?? 1 }));
  const total = weighted.reduce((sum, w) => sum + w.weight, 0);
  let roll = random() * total;
  for (const { def, weight } of weighted) {
    roll -= weight;
    if (roll <= 0) return def;
  }
  return weighted[weighted.length - 1].def; // floating-point fallback
}

/**
 * @param {object} options
 * @param {{getBirdLayer:(depth:number)=>HTMLElement, birdLayers:HTMLElement[]}} options.scene
 *   the handle returned by renderer.js's renderScene()/mountScene().
 * @param {{birdDensity:number, birdDistanceRange:{min:number,max:number}, fleeEnabled:boolean}} options.levelConfig
 * @param {Array<{id:string,name?:string,frames:string[],rarity:string}>} options.birdPool
 *   candidate birds to spawn from — see file header for shape/source.
 * @param {(caught: {instanceId:number, bird:object, depth:number, scale:number}) => void} [options.onCatch]
 *   fired when a bird is clicked. Scoring/coins live outside this module
 *   (design doc's economy is a separate concern) — this is just the hook.
 * @param {Record<string, number>} [options.rarityWeights] - override spawn odds.
 * @param {() => number} [options.random] - injectable RNG; tests use this for determinism.
 * @param {{setTimeout: Function, clearTimeout: Function}} [options.scheduler]
 *   injectable timers; tests use a fake one instead of waiting on real time.
 */
export function createBirdSpawner({
  scene,
  levelConfig,
  birdPool,
  onCatch = () => { },
  rarityWeights = DEFAULT_RARITY_WEIGHTS,
  random = Math.random,
  scheduler = {
    setTimeout: (...args) => setTimeout(...args),
    clearTimeout: (...args) => clearTimeout(...args)
  }
}) {
  if (!scene || typeof scene.getBirdLayer !== 'function' || !Array.isArray(scene.birdLayers)) {
    throw new Error('createBirdSpawner: scene (from renderScene/mountScene) is required');
  }
  if (!Array.isArray(birdPool) || birdPool.length === 0) {
    throw new Error('createBirdSpawner: birdPool must be a non-empty array');
  }

  const density = Math.max(1, levelConfig?.birdDensity ?? 1);
  const distanceRange = levelConfig?.birdDistanceRange ?? { min: 1, max: 1 };
  const fleeEnabled = Boolean(levelConfig?.fleeEnabled);

  const active = new Map(); // instanceId -> { el, clearTimers, onClick }
  let running = false;

  function rand(min, max) {
    return min + random() * (max - min);
  }

  function randomDepth() {
    const raw = Math.floor(rand(0, scene.birdLayers.length));
    return Math.min(raw, scene.birdLayers.length - 1);
  }

  function spawnOne() {
    if (!running) return;

    const def = pickWeightedBird(birdPool, rarityWeights, random);
    const depth = randomDepth();
    const scale = rand(distanceRange.min, distanceRange.max);

    const el = document.createElement('div');
    el.className = 'bird-sprite';
    el.dataset.rarity = def.rarity;
    el.style.setProperty('--bird-scale', scale);
    placeRandomly(el);

    const img = document.createElement('img');
    img.className = 'bird-frame';
    img.src = restFrame(def); // overwritten synchronously by startFrameCycle() below; just a sane pre-mount default
    img.draggable = false;
    img.alt = def.name ?? 'bird';
    el.appendChild(img);

    scene.getBirdLayer(depth).appendChild(el);

    const instanceId = nextInstanceId++;
    const timers = new Set();
    function runTimer(fn, ms) {
      const id = scheduler.setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
      return id;
    }
    function clearTimers() {
      timers.forEach((id) => scheduler.clearTimeout(id));
      timers.clear();
    }

    // Frame contract: frames[0] is the resting/sitting pose; anything
    // after it is a flap/transition cycle (e.g. wings up, wings down)
    // played only while the bird is arriving (spawning). A bird with no
    // extra frames just shows its rest pose the whole time — no crash,
    // no animation.
    let frameTimer = null;
    function stopFrameCycle({ settleOnRest = false } = {}) {
      if (frameTimer != null) {
        scheduler.clearTimeout(frameTimer);
        timers.delete(frameTimer);
        frameTimer = null;
      }
      if (settleOnRest) img.src = restFrame(def);
    }
    function startFrameCycle() {
      const flaps = flapFrames(def);

      if (flaps.length <= 1) {
        img.src = flaps[0];
        return;
      }
      let i = 0;
      const tick = () => {
        img.src = flaps[i];
        i = (i + 1) % flaps.length;
        frameTimer = runTimer(tick, FRAME_INTERVAL_MS);
      };

      tick();
    }

    function placeRandomly(target) {
      const x = rand(PLACEMENT_MARGIN_PCT, 100 - PLACEMENT_MARGIN_PCT);
      const y = rand(PLACEMENT_MARGIN_PCT, 100 - PLACEMENT_MARGIN_PCT);
      target.style.left = `${x}%`;
      target.style.top = `${y}%`;
    }

    function onClick() {
      fsm.transition(BIRD_STATES.CLICKED);
    }

    const fsm = createBirdStateMachine({
      initial: BIRD_STATES.SPAWNING,
      onEnter: {
        [BIRD_STATES.SPAWNING]() {
          el.classList.add('is-spawning');
          startFrameCycle();
          runTimer(() => fsm.transition(BIRD_STATES.VISIBLE), SPAWN_FADE_MS);
        },

        [BIRD_STATES.VISIBLE](machine, from) {
          el.classList.remove('is-spawning', 'is-hidden', 'is-fleeing');
          el.classList.add('is-visible');

          if (from === BIRD_STATES.HIDDEN) {
            el.classList.add('is-reappearing');
            startFrameCycle();

            runTimer(() => {
              el.classList.remove('is-reappearing');
              stopFrameCycle({ settleOnRest: true });
            }, SPAWN_FADE_MS);
          } else {
            stopFrameCycle({ settleOnRest: true });
          }

          if (fleeEnabled) {
            runTimer(
              () => fsm.transition(BIRD_STATES.FLEEING),
              rand(FLEE_DELAY_MIN_MS, FLEE_DELAY_MAX_MS)
            );
          }
        },

        [BIRD_STATES.FLEEING]() {
          el.classList.remove('is-visible');
          el.classList.add('is-fleeing');
          startFrameCycle();

          runTimer(() => fsm.transition(BIRD_STATES.HIDDEN), FLEE_ANIMATION_MS);
        },

        [BIRD_STATES.HIDDEN]() {
          stopFrameCycle();
          el.classList.remove('is-fleeing');
          el.classList.add('is-hidden');
          placeRandomly(el);

          runTimer(
            () => fsm.transition(BIRD_STATES.VISIBLE),
            rand(HIDDEN_MIN_MS, HIDDEN_MAX_MS)
          );
        },

        [BIRD_STATES.CLICKED]() {
          stopFrameCycle();
          clearTimers();
          el.classList.remove('is-spawning', 'is-reappearing', 'is-fleeing');
          el.removeEventListener('click', onClick);

          onCatch({ instanceId, bird: def, depth, scale });
          fsm.transition(BIRD_STATES.DESPAWNED);
        },

        [BIRD_STATES.DESPAWNED]() {
          stopFrameCycle();
          clearTimers();
          el.remove();
          active.delete(instanceId);

          if (running) {
            spawnOne();
          }
        }
      }
    });

    el.addEventListener('click', onClick);
    active.set(instanceId, { el, clearTimers, onClick });
  }

  return {
    /** Spawns up to `birdDensity` birds and keeps that count topped up as birds are caught. */
    start() {
      if (running) return;
      running = true;
      for (let i = 0; i < density; i++) spawnOne();
    },
    /** Stops spawning replacements; birds already alive keep animating until caught or destroy(). */
    stop() {
      running = false;
    },
    /** Removes every active bird and cancels all pending timers immediately. */
    destroy() {
      running = false;
      active.forEach(({ el, clearTimers, onClick }) => {
        clearTimers();
        el.removeEventListener('click', onClick);
        el.remove();
      });
      active.clear();
    },
    /** Number of birds currently alive (spawning/visible/fleeing/hidden). */
    get activeCount() {
      return active.size;
    }
  };
}

// ---------------------------------------------------------------------
// Fixture for manual testing in the browser before a real birds catalog
// ---------------------------------------------------------------------
export const DEV_FIXTURE_BIRD_POOL = [
  {
    id: 'dev-1',
    name: 'Mourning Dove',
    rarity: 'basic',
    frames: [
      '/assets/birds/mourning-dove/sitting.png',     // frames[0] = rest pose
      '/assets/birds/mourning-dove/flight_up.png',   // frames[1:] = flap cycle
      '/assets/birds/mourning-dove/flight_down.png'
    ]
  }
];