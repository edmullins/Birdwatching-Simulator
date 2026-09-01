// public/js/views/mainMenu.js
import { showView } from '../router.js';
import { api } from '../api.js';
import { mountLevelSelect } from '../components/levelSelect.js';
import { mountLeaderboard } from '../components/leaderboard.js';

export function mountMainMenu(container, params) {
  const username = params?.user?.username ?? 'birder';
  const maxLevelReached = params?.user?.stats?.maxLevelReached ?? 0;


  container.innerHTML = `
    <header class="menu-topbar">
      <div class="menu-brand">
        <span class="menu-eyebrow">Birdwatching Simulator</span>
        <h1>Field Log</h1>
      </div>

      <button type="button" class="btn btn-ghost" data-action="logout">
        Log out
      </button>
    </header>

    <main class="menu-shell">
      <section class="menu-panel menu-panel--primary">
        <p class="menu-kicker">Welcome back</p>
        <h2>${escapeHtml(username)}</h2>
        <p class="menu-summary">
          The woods are active this morning. Current level: ${maxLevelReached}
        </p>

        <div class="menu-actions" id="level-select-container">
          <!-- Level carousel will be mounted here -->
        </div>
      </section>

      <aside class="menu-panel menu-panel--stats">
        <div class="panel-header">
          <span class="panel-label">Season stats</span>
        </div>

        <div class="stat-grid">
          <article class="stat-card">
            <span class="stat-label">Runs</span>
            <strong>12</strong>
          </article>

          <article class="stat-card">
            <span class="stat-label">Best score</span>
            <strong>2,450</strong>
          </article>

          <article class="stat-card">
            <span class="stat-label">Species ID</span>
            <strong>19</strong>
          </article>
        </div>

        <div class="mini-panel">
          <span class="panel-label">Recent sightings</span>
          <ul class="species-list">
            <li><span>Great Blue Heron</span><em>+120</em></li>
            <li><span>Red-winged Blackbird</span><em>+96</em></li>
            <li><span>Wood Duck</span><em>+82</em></li>
          </ul>
        </div>

        <div class="mini-panel leaderboard-panel">
          <div class="leaderboard-header">
            <span class="panel-label">Top levels reached</span>
            <span class="leaderboard-badge">Live</span>
          </div>

          <div class="leaderboard-container" data-leaderboard></div>
        </div>
      </aside>
    </main>
  `;

  // Mount level select component
  const levelSelectContainer = container.querySelector('#level-select-container');
  if (levelSelectContainer) {
    mountLevelSelect(levelSelectContainer, params?.user);
  }

  // Mount leaderboard — fetches real data and renders async; loading/
  // empty/error states are handled inside mountLeaderboard itself.
  const leaderboardContainer = container.querySelector('[data-leaderboard]');
  if (leaderboardContainer) {
    mountLeaderboard(leaderboardContainer, { currentUsername: username });
  }

  // Handle logout
  const logoutButton = container.querySelector('[data-action="logout"]');
  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      try {
        await api.logout();
      } catch (err) {
        console.error('Logout failed:', err);
      } finally {
        showView('login');
      }
    });
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}