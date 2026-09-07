// public/js/views/roundSummary.js
//
// Issue #14 — Round summary: shown after views/level.js completes a run
// (either the player hit minBirdsRequired, or the timer ran out). Shows
// score/coins/new max level, "Continue" routes back to main menu.
//
// All the numbers here (outcome, birdsFound, points, coins) come from
// params — this view doesn't recompute or re-verify anything server-side.
// Per level.js's header: points/coins are a client-side stand-in (the
// server doesn't compute or persist either yet), so what's shown here is
// this run's tally, not a confirmed, saved balance.

import { showView } from '../router.js';

export function mountRoundSummary(container, params = {}) {
  const {
    outcome = 'timeout',
    levelNumber,
    birdsFound = 0,
    minBirdsRequired = 0,
    points = 0,
    coins = 0,
    user
  } = params ?? {};

  const cleared = outcome === 'cleared';

  container.innerHTML = `
    <div class="round-summary">
      <div class="summary-card">
        <p class="summary-kicker">${cleared ? 'Level cleared' : "Time's up"}</p>
        <h1>Level ${escapeHtml(levelNumber ?? '?')}</h1>

        <div class="summary-stat-row">
          <div class="summary-stat">
            <span class="summary-stat-label">Birds found</span>
            <strong>${escapeHtml(birdsFound)} / ${escapeHtml(minBirdsRequired)}</strong>
          </div>
          <div class="summary-stat">
            <span class="summary-stat-label">Score</span>
            <strong>${escapeHtml(points)}</strong>
          </div>
          <div class="summary-stat">
            <span class="summary-stat-label">Coins earned</span>
            <strong>+${escapeHtml(coins)}</strong>
          </div>
        </div>

        <button type="button" class="btn btn-primary" data-action="continue">
          Continue
        </button>
      </div>
    </div>
  `;

  const continueButton = container.querySelector('[data-action="continue"]');
  if (continueButton) {
    continueButton.addEventListener('click', () => {
      showView('mainMenu', { user });
    });
  }
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = String(value);
  return div.innerHTML;
}