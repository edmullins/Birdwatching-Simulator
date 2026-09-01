import { showView } from '../router.js';

export function mountLevel(container, params = {}) {
  const { run, user, levelNumber } = params ?? {};
  const level = Number(levelNumber ?? run?.level ?? '?');

  container.innerHTML = `
    <div class="level-placeholder">
      <span class="menu-eyebrow">Run started</span>
      <h1>Success!</h1>
      <p>Level ${escapeHtml(level)} was created successfully.</p>
      <p>Run ID: ${escapeHtml(run?._id ?? run?.id ?? 'unknown')}</p>
      <p class="success-message">
        The POST /api/runs endpoint is working and accepted the request.
      </p>
      <button type="button" class="btn btn-ghost" data-action="back">
        Back to menu
      </button>
    </div>
  `;

  const backButton = container.querySelector('[data-action="back"]');
  if (backButton) {
    backButton.addEventListener('click', () => {
      showView('mainMenu', { user });
    });
  }
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = String(value);
  return div.innerHTML;
}