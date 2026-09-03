import { api } from '../api.js';
import { showView } from '../router.js';

export function mountLevel(container, params = {}) {
  const { run, user, levelNumber } = params ?? {};
  const level = Number(levelNumber ?? '?');
  const runId = run?._id;
  console.log('mountLevel called with params:', params, 'runId:', runId);

  container.innerHTML = `
    <div class="level-placeholder">
      <span class="menu-eyebrow">Run started</span>
      <h1>Success!</h1>
      <p>Level ${escapeHtml(level)} was created successfully.</p>
      <p>Run ID: ${escapeHtml(run?._id ?? run?.id ?? 'unknown')}</p>
      <p class="success-message">
        The POST /api/runs endpoint is working and accepted the request.
      </p>
      <button type="button" class="btn btn-ghost" data-action="complete">
        Complete Level
      </button>
      <button type="button" class="btn btn-ghost" data-action="back">
        Back to menu
      </button>
    </div>
  `;

  const completeButton = container.querySelector('[data-action="complete"]');
  const backButton = container.querySelector('[data-action="back"]');

  if (completeButton) {
    completeButton.addEventListener('click', async () => {
      // Handle complete level action
      if (!runId) {
        console.error('Level view missing run id; cannot complete run');
        return;
      }

      const originalText = completeButton.textContent;
      completeButton.disabled = true;
      completeButton.textContent = 'Completing...';

      try {
        await api.completeRun(runId, {
          birdsFound: [],
          levelTimestamps: run?.levelTimestamps ?? []
        });

        const { user } = await api.me();
        showView('mainMenu', { user });
      } catch (error) {
        console.error('Failed to complete run:', error);
        completeButton.disabled = false;
        completeButton.textContent = originalText;
        window.alert(error.message || 'Failed to complete level');
      }
    });
  }

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