import { showView } from '../router.js';
import { api } from '../api.js';

// Placeholder only — level select + leaderboard are a separate build
// (Milestone 2). This exists so login/register has somewhere real to
// navigate to, and so logout is testable now rather than later.
export function mountMainMenu(container, params) {
  const username = params?.user?.username ?? 'birder';

  container.innerHTML = `
    <header class="menu-topbar">
      <span class="menu-eyebrow">Field log</span>
      <button type="button" class="btn btn-ghost" data-action="logout">Log out</button>
    </header>
    <div class="menu-placeholder">
      <h1>Welcome back, ${escapeHtml(username)}.</h1>
      <p>Level select and leaderboard load here next.</p>
    </div>
  `;

  container.querySelector('[data-action="logout"]').addEventListener('click', async () => {
    try {
      await api.logout();
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      showView('login');
    }
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}