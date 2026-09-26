// public/js/views/level.js
// ---------------------------------------------------------------------
// Manages level HUD and round lifecycle: mounts scene, starts bird
// spawner and input, updates timer and counter, awards points on catches,
// and completes the run (API) on clear or timeout. Ensures teardown of
// spawner, input listeners, and the interval timer to avoid leaks.
//
// Birds are collected by typing their name into the textbox at the bottom
// of the scene (Enter or "Collect"); the guess is trimmed + upper-cased
// and matched against the birds currently visible (see
// game/birdSpawner.js attemptCatch). A mini Field Guide sits bottom-right
// so players can look names up mid-round.
// 
// Lifecycle (high level):
// mountLevel -> mountScene -> start spawner & input -> run timer ->
// onCatch / timer expiry -> finishRound -> teardownLevel
// ---------------------------------------------------------------------

import { showView } from '../router.js';
import { api } from '../api.js';
import { mountScene } from '../game/renderer.js';
import { createBirdSpawner, normalizeGuess, DEV_FIXTURE_BIRD_POOL } from '../game/birdSpawner.js';
import { attachLevelInput } from '../game/input.js';
import { mountFieldGuide } from '../components/fieldGuide.js';

// Design doc §2: a flat 5 minutes per level. getLevelConfig() has no
// duration field today, so this is hardcoded rather than read from
// levelConfig — move it there if levels ever need different durations.
const ROUND_DURATION_MS = 5 * 60 * 1000;
const POINTS_BY_RARITY = {
  basic: 10,
  rare: 25,
  epic: 60,
  legendary: 150
};

// Round summary order (#41): rarest first.
const RARITY_RANK = { legendary: 0, epic: 1, rare: 2, basic: 3 };

const FEEDBACK_MS = 2200;

// router.js re-mounts views from scratch on every showView() and has no
// unmount hook (see #13), so mountLevel() tracks and tears down its own
// previous instance — spawner, input listeners, AND now the round timer,
// otherwise leaving a level mid-round leaks a running setInterval too.
let activeSpawner = null;
let activeInput = null;
let activeTimerId = null;
// Everything else a level registers on window / with timers (name-box
// refocus listener, feedback timer, mini field guide) — each pushes its
// own cleanup here so teardownLevel() stays the single exit path.
let activeCleanups = [];

function teardownLevel() {
  activeSpawner?.destroy();
  activeInput?.destroy();
  if (activeTimerId != null) clearInterval(activeTimerId);
  activeCleanups.forEach((cleanup) => cleanup());
  activeSpawner = null;
  activeInput = null;
  activeTimerId = null;
  activeCleanups = [];
}

/** mm:ss, floor-safe and never negative. Exported for testing. */
export function formatClock(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Collapses a per-species tally (Map of bird.id -> { bird, count }) into
 * the array roundSummary.js renders: one entry per species caught, rarest
 * first (Legendary -> Basic), ties broken by name. Exported for testing.
 */
export function buildFoundDetail(tally) {
  return [...tally.values()].sort(
    (a, b) =>
      (RARITY_RANK[a.bird.rarity] ?? Number.MAX_SAFE_INTEGER) -
        (RARITY_RANK[b.bird.rarity] ?? Number.MAX_SAFE_INTEGER) ||
      String(a.bird.name).localeCompare(String(b.bird.name))
  );
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
    <form class="collect-form" data-collect-form autocomplete="off">
      <p class="collect-feedback" data-collect-feedback aria-live="polite"></p>
      <div class="collect-row">
        <input
          class="collect-input"
          data-collect-input
          type="text"
          placeholder="Type a bird's name"
          aria-label="Bird name"
          maxlength="60"
          autocomplete="off"
          autocapitalize="characters"
          autocorrect="off"
          spellcheck="false"
          enterkeyhint="go"
          disabled
        />
        <button type="submit" class="btn btn-primary collect-submit" disabled>Collect</button>
      </div>
    </form>
  </div>
  `;

  const sceneEl = container.querySelector('[data-level-scene]');
  const sceneHost = document.createElement('div');
  sceneEl.prepend(sceneHost);

  const timerEl = container.querySelector('[data-hud="timer"]');
  const counterEl = container.querySelector('[data-hud="counter"]');
  const backButton = container.querySelector('[data-action="back"]');
  const collectForm = container.querySelector('[data-collect-form]');
  const collectInput = container.querySelector('[data-collect-input]');
  const collectSubmit = container.querySelector('.collect-submit');
  const feedbackEl = container.querySelector('[data-collect-feedback]');

  // Round state, closed over by the spawner's onCatch and the timer tick.
  let birdsFoundCount = 0;
  let foundBirdIds = [];
  let pointsEarned = 0;
  const foundTally = new Map(); // bird.id -> { bird, count } — one entry per species (#41)
  let spawner = null;
  let feedbackTimerId = null;
  let finished = false; // guards against a catch and the timer racing each other

  function setFeedback(message, kind = '') {
    clearTimeout(feedbackTimerId);
    feedbackEl.textContent = message;
    feedbackEl.dataset.kind = kind;
    if (message) {
      feedbackTimerId = setTimeout(() => setFeedback(''), FEEDBACK_MS);
    }
  }
  activeCleanups.push(() => clearTimeout(feedbackTimerId));

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
        birdsFound: foundBirdIds,
        score: pointsEarned,
        levelTimestamps: [
          {
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
        birdsFoundDetail: buildFoundDetail(foundTally),
        minBirdsRequired,
        points: pointsEarned,
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

    const { birds } = await api.getBirds();

    if (!Array.isArray(birds) || birds.length === 0) {
      throw new Error('No official birds are available');
    }

    spawner = createBirdSpawner({
      scene,
      levelConfig,
      birdPool: birds,
      onCatch: ({ bird }) => {
        if (finished) return;

        foundBirdIds.push(bird.id);
        birdsFoundCount += 1;
        const points = POINTS_BY_RARITY[bird.rarity] ?? 0;
        pointsEarned += points;

        const tallied = foundTally.get(bird.id);
        if (tallied) tallied.count += 1;
        else foundTally.set(bird.id, { bird, count: 1 });

        setFeedback(`Collected ${bird.name}  +${points}`, 'hit');

        if (counterEl) {
          counterEl.textContent = `${birdsFoundCount} / ${minBirdsRequired}`;
        }

        if (birdsFoundCount >= minBirdsRequired) {
          finishRound('cleared');
        }
      }
    });

    spawner.start();
    activeSpawner = spawner;

    activeInput = attachLevelInput({ sceneHost, scene });

    // Mini field guide, bottom-right. Fetches its own approved-only
    // catalog and never touches round state.
    const fieldGuide = mountFieldGuide(sceneEl, { size: 'mini' });
    activeCleanups.push(() => fieldGuide.destroy());

    const roundEndsAt = Date.now() + ROUND_DURATION_MS;
    activeTimerId = setInterval(() => {
      const remaining = roundEndsAt - Date.now();
      if (timerEl) timerEl.textContent = formatClock(remaining);
      if (remaining <= 0) finishRound('timeout');
    }, 250);

    container.hidden = false;

    // Everything is live — let the player start typing.
    collectInput.disabled = false;
    collectSubmit.disabled = false;
    collectInput.focus();
  } catch (error) {
    console.error('Failed to start level scene:', error);
    container.innerHTML = `
    <div class="level-loading">Failed to load level.</div>
  `;
    container.hidden = false;
  }

  collectForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (finished || !spawner) return;

    const guess = collectInput.value;
    if (!normalizeGuess(guess)) return; // nothing typed

    if (spawner.attemptCatch(guess)) {
      collectInput.value = ''; // onCatch already set the "Collected ..." feedback
      return;
    }

    setFeedback('No bird by that name in view', 'miss');
    collectInput.classList.remove('is-miss');
    void collectInput.offsetWidth; // restart the shake animation on repeat misses
    collectInput.classList.add('is-miss');
    collectInput.select();
  });

  // Keep keyboard focus on the name box: clicking the scene shouldn't blur
  // it, and typing a letter while focus is elsewhere jumps back to it.
  // (Space is left alone — outside the box it still means "zoom".)
  sceneEl.addEventListener('mousedown', (event) => {
    if (event.target.closest('.field-guide, .level-back-btn, [data-collect-form]')) return;
    event.preventDefault();
    collectInput.focus();
  });

  function refocusOnTyping(event) {
    if (finished || collectInput.disabled || document.activeElement === collectInput) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key.length === 1 && event.key !== ' ') collectInput.focus();
  }
  window.addEventListener('keydown', refocusOnTyping);
  activeCleanups.push(() => window.removeEventListener('keydown', refocusOnTyping));

  if (backButton) {
    backButton.addEventListener('click', () => {
      // Leaving early does NOT call completeRun — the run is simply
      // abandoned (stays 'in_progress' in the DB forever; there's no
      // /abandon endpoint). Pre-existing behavior.
      if (finished) return;
      teardownLevel();
      showView('mainMenu', { user });
    });
  }
}