import { api } from '../api.js';

/**
 * Fetches and renders the leaderboard into `container`, reusing the
 * exact <ol class="leaderboard-list"><li><span class="rank">...
 * markup the mainMenu placeholder previously hardcoded, so the existing
 * menu.css styling applies with no changes needed there beyond the
 * loading/empty/error/you-row additions below.
 */
export async function mountLeaderboard(container, { currentUsername } = {}) {
  container.innerHTML = `<p class="leaderboard-loading">Loading leaderboard&hellip;</p>`;

  let data;
  try {
    data = await api.getLeaderboard();
  } catch (err) {
    container.innerHTML = `<p class="leaderboard-error">Couldn't load the leaderboard.</p>`;
    console.error('Leaderboard fetch failed:', err);
    return;
  }

  const { entries = [], you } = data ?? {};

  if (entries.length === 0) {
    container.innerHTML = `<p class="leaderboard-empty">No runs yet — be the first on the board.</p>`;
    return;
  }

  const isCurrentUserInTop = entries.some((entry) => entry.username === currentUsername);
  const rows = entries.map((entry) => renderRow(entry, entry.username === currentUsername)).join('');

  // If the player isn't in the visible top N, append their own row (with
  // a divider) so they can always see where they stand — this is what
  // the server's `you` field exists for.
  const youRow =
    !isCurrentUserInTop && you
      ? `<li class="leaderboard-you-divider" aria-hidden="true"></li>${renderRow(you, true)}`
      : '';

  container.innerHTML = `<ol class="leaderboard-list">${rows}${youRow}</ol>`;
}

function renderRow(entry, isYou) {
  return `
    <li class="${isYou ? 'is-you' : ''}">
      <span class="rank">#${entry.rank}</span>
      <strong>${escapeHtml(entry.username)}</strong>
      <em>Lv ${entry.maxLevelReached}</em>
    </li>
  `;
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = String(value);
  return div.innerHTML;
}