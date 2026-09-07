// public/js/views/level.js
//
// Issue #14 — Level view: timer, min-birds-found counter, wires
// renderer.js (#11) + birdSpawner.js (#12) + input.js (#13) together,
// and on timer expiry or hitting minBirdsRequired, completes the run and
// routes to views/roundSummary.js.
//
// ---------------------------------------------------------------------
// SCORING IS A CLIENT-SIDE STAND-IN. POST /runs/:id/complete
// (src/controllers/runController.js) doesn't compute or persist score or
// coins at all — it only records birdsFound/levelTimestamps and bumps
// user.stats.maxLevelReached. There's no `run.score` field, and
// user.coins is never touched. POINTS_BY_RARITY/COINS_BY_RARITY below
// exist purely so the round summary has numbers to show; they are not
// what actually gets saved, and the coins shown do not reflect the
// player's real balance until the backend awards them for real.
//
// Similarly, `birdsFound` is sent to the server as an empty array: the
// Run schema expects real Bird ObjectIds (`ref: 'Bird'`), but there's no
// birds catalog yet (see birdSpawner.js's own header) — DEV_FIXTURE_BIRD_POOL's
// ids ('dev-1' etc.) aren't valid ObjectIds and would fail to cast if sent.
// Once a real catalog exists, swap birdsFound to the caught birds' real ids.
// ---------------------------------------------------------------------

import { showView } from '../router.js';
import { api } from '../api.js';
import { mountScene } from '../game/renderer.js';
import {
  createBirdSpawner,
  DEV_FIXTURE_BIRD_POOL
} from '../game/birdSpawner.js';
import { attachLevelInput } from '../game/input.js';

// Design doc §2: a flat 5 minutes per level. getLevelConfig() has no
// duration field today, so this is hardcoded rather than read from
// levelConfig — move it there if levels ever need different durations.
const ROUND_DURATION_MS = 5 * 60 * 1000;

const POINTS_BY_RARITY = { basic: 10, rare: 25, epic: 60, legendary: 150 };
const COINS_BY_RARITY = { basic: 1, rare: 3, epic: 8, legendary: 20 };

// router.js re-mounts views from scratch on every showView() and has no
// unmount hook (see #13), so mountLevel() tracks and tears down its own
// previous instance — spawner, input listeners, AND now the round timer,
// otherwise leaving a level mid-round leaks a running setInterval too.
let activeSpawner = null;
let activeInput = null;
let activeTimerId = null;

function teardownLevel() {
  activeSpawner?.destroy();
  activeInput?.destroy();
  if (activeTimerId != null) clearInterval(activeTimerId);
  activeSpawner = null;
  activeInput = null;
  activeTimerId = null;
}

/** mm:ss, floor-safe and never negative. Exported for testing. */
export function formatClock(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export async function mountLevel(container, params = {}) {
  teardownLevel(); // in case a previous level is still running

  container.hidden = true;
  container.innerHTML = `
    <div class="level-loading">Loading level...</div>
  `;

  const { run, user, levelNumber, levelConfig } = params ?? {};
  const runId = run?._id;
  const minBirdsRequired = levelConfig?.minBirdsRequired ?? 1;
  const startedAt = new Date();

  container.innerHTML = `
  <div class="level-scene" data-level-scene>
    <div class="level-hud" aria-live="polite">
      <div class="hud-chip" data-hud="timer">${formatClock(ROUND_DURATION_MS)}</div>
      <div class="hud-chip" data-hud="counter">0 / ${minBirdsRequired}</div>
    </div>
    <button type="button" class="btn btn-primary level-back-btn" data-action="back">
      Back
    </button>
  </div>
  `;

  const sceneHost = document.createElement('div');
  container.querySelector('[data-level-scene]').prepend(sceneHost);

  const timerEl = container.querySelector('[data-hud="timer"]');
  const counterEl = container.querySelector('[data-hud="counter"]');
  const backButton = container.querySelector('[data-action="back"]');

  // Round state, closed over by the spawner's onCatch and the timer tick.
  let birdsFoundCount = 0;
  let pointsEarned = 0;
  let coinsEarned = 0;
  let finished = false; // guards against a click and the timer racing each other

  async function finishRound(outcome) {
    if (finished) return; // set synchronously, before any await — see below
    finished = true;
    teardownLevel();

    if (!runId) {
      console.error('Level view missing run id; cannot complete run');
      showView('mainMenu', { user });
      return;
    }

    try {
      const { run: completedRun } = await api.completeRun(runId, {
        outcome,
        birdsFound: [],
        levelTimestamps: [
          {
            level: levelNumber,
            enteredAt: startedAt.toISOString(),
            exitedAt: new Date().toISOString()
          }
        ]
      });

      // Re-fetch so the summary reflects any maxLevelReached bump the
      // server just made — `user` in params is a snapshot from before
      // this run started.
      let freshUser = user;
      try {
        const meRes = await api.me();
        freshUser = meRes?.user ?? user;
      } catch (err) {
        console.error('Failed to refresh user after completing run:', err);
      }

      showView('roundSummary', {
        outcome, // 'cleared' | 'timeout'
        levelNumber,
        birdsFound: birdsFoundCount,
        minBirdsRequired,
        points: pointsEarned,
        coins: coinsEarned,
        previousMaxLevel: user?.stats?.maxLevelReached ?? 0,
        run: completedRun,
        user: freshUser
      });
    } catch (error) {
      console.error('Failed to complete run:', error);
      window.alert(error.message || 'Failed to complete level');
      showView('mainMenu', { user });
    }
  }

  try {
    const sceneConfig = levelConfig?.scene ?? {
      imageUrl: '/assets/backgrounds/bg1.jpg',
      occlusionLayers: []
    };

    const scene = await mountScene(sceneHost, sceneConfig);

    const spawner = createBirdSpawner({
      scene,
      levelConfig,
      birdPool: DEV_FIXTURE_BIRD_POOL,
      onCatch: ({ bird }) => {
        if (finished) return;

        birdsFoundCount += 1;
        pointsEarned += POINTS_BY_RARITY[bird.rarity] ?? 0;
        coinsEarned += COINS_BY_RARITY[bird.rarity] ?? 0;
        if (counterEl) counterEl.textContent = `${birdsFoundCount} / ${minBirdsRequired}`;

        if (birdsFoundCount >= minBirdsRequired) finishRound('cleared');
      }
    });

    spawner.start();
    activeSpawner = spawner;

    activeInput = attachLevelInput({ sceneHost, scene });

    const roundEndsAt = Date.now() + ROUND_DURATION_MS;
    activeTimerId = setInterval(() => {
      const remaining = roundEndsAt - Date.now();
      if (timerEl) timerEl.textContent = formatClock(remaining);
      if (remaining <= 0) finishRound('timeout');
    }, 250);

    container.hidden = false;
  } catch (error) {
    console.error('Failed to start level scene:', error);
    container.innerHTML = `
    <div class="level-loading">Failed to load level.</div>
  `;
    container.hidden = false;
  }

  if (backButton) {
    backButton.addEventListener('click', () => {
      // Leaving early does NOT call completeRun — the run is simply
      // abandoned (stays 'in_progress' in the DB forever; there's no
      // /abandon endpoint). Pre-existing behavior, not new to #14.
      if (finished) return;
      teardownLevel();
      showView('mainMenu', { user });
    });
  }
}