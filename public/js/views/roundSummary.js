// public/js/views/roundSummary.js
// ---------------------------------------------------------------------
// Round summary: shown after views/level.js completes a run
// (either the player hit minBirdsRequired, or the timer ran out). Shows
// score/new max level, a tiered recap of the species caught (#41), and a
// "Continue" button that routes back to the main menu.
//
// All the numbers here (outcome, birdsFound, points, birdsFoundDetail)
// come from params - this view doesn't recompute or re-verify anything
// server-side.
// ---------------------------------------------------------------------

import { showView } from '../router.js';
import { el } from '../utils/dom.js';
import { FIELD_GUIDE_FIELDS, capitalize } from '../components/fieldGuide.js';

// Recap stack order: name, then funFact, then the rest in field-guide order.
const RECAP_FIELDS = [
  ...FIELD_GUIDE_FIELDS.filter(([key]) => key === 'funFact'),
  ...FIELD_GUIDE_FIELDS.filter(([key]) => key !== 'funFact')
];

export function mountRoundSummary(container, params = {}) {
  const {
    outcome = 'timeout',
    levelNumber,
    birdsFound = 0,
    birdsFoundDetail = [],
    minBirdsRequired = 0,
    points = 0,
    run,
    user
  } = params ?? {};

  const cleared = outcome === 'cleared';
  const timeTaken = run?.endedAt && run?.startedAt
    ? ((new Date(run.endedAt) - new Date(run.startedAt)) / 1000).toFixed(1) + 's'
    : 'N/A';

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
            <span class="summary-stat-label">Time</span>
            <strong>${escapeHtml(timeTaken)}</strong>
          </div>
        </div>

        <section class="found-section" aria-label="Birds found this round" data-found-section></section>

        <button type="button" class="btn btn-primary" data-action="continue">
          Continue
        </button>
      </div>
    </div>
  `;

  container.querySelector('[data-found-section]')?.append(...buildFoundSection(birdsFoundDetail));

  const continueButton = container.querySelector('[data-action="continue"]');
  if (continueButton) {
    continueButton.addEventListener('click', () => {
      showView('mainMenu', { user });
    });
  }
}

/**
 * The recap: a heading plus either a rarest-first list (one row per
 * species) or an empty state. Built with DOM APIs so bird data can't
 * inject markup.
 *
 * @param {Array<{bird: object, count: number}>} detail - already sorted by
 *   views/level.js's buildFoundDetail().
 */
function buildFoundSection(detail) {
  const heading = el('h2', 'found-heading', 'Birds you found');

  if (!Array.isArray(detail) || detail.length === 0) {
    return [
      heading,
      el('p', 'found-empty', 'No birds collected this round. Look one up in the Field Guide, then type its name to collect it.')
    ];
  }

  const list = el('ol', 'found-list');
  for (const { bird, count } of detail) list.append(buildFoundRow(bird, count));
  return [heading, list];
}

function buildFoundRow(bird, count) {
  const row = el('li', 'found-row');
  row.dataset.rarity = bird.rarity;

  // Left: the bird's sitting image on a white "logo" tile.
  const logo = el('div', 'found-logo');
  const image = el('img');
  image.src = bird.imageUrl;
  image.alt = bird.name;
  image.draggable = false;
  logo.append(image);

  // Right: fixed-height, independently scrolling stack.
  const stack = el('div', 'found-stack field-scroll');

  const title = el('h3', 'found-title');
  title.append(el('span', 'found-name', bird.name));
  if (count > 1) title.append(el('span', 'found-count', `\u00d7${count}`));
  const rarity = el('span', 'fg-rarity', capitalize(bird.rarity));
  rarity.dataset.rarity = bird.rarity;
  title.append(rarity);
  stack.append(title);

  for (const [key, label] of RECAP_FIELDS) {
    if (!bird[key]) continue;
    const field = el('p', 'found-field');
    field.append(el('strong', 'found-field-label', label), bird[key]);
    stack.append(field);
  }

  row.append(logo, stack);
  return row;
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = String(value);
  return div.innerHTML;
}