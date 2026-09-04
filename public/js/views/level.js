import { api } from '../api.js';
import { showView } from '../router.js';

export function mountLevel(container, params = {}) {
  const { run, user, levelNumber, levelConfig } = params ?? {};
  const level = Number(levelNumber ?? '?');
  const runId = run?._id;
  console.log('mountLevel called with params:', params, 'runId:', runId);

  container.innerHTML = `
  <div class="level-scene" data-level-scene>
    <div class="level-placeholder">
      <section class="level-config" aria-label="Level configuration">
        <h2>Difficulty Configuration</h2>
        <p>Minimum birds: ${escapeHtml(levelConfig?.minBirdsRequired ?? ' unavailable')}</p>
        <p>Bird density: ${escapeHtml(levelConfig?.birdDensity ?? ' unavailable')}</p>
        <p>
          Distance range:
          ${escapeHtml(levelConfig?.birdDistanceRange?.min ?? ' unavailable')}
          -
          ${escapeHtml(levelConfig?.birdDistanceRange?.max ?? ' unavailable')}
        </p>
        <p>Flee enabled: ${levelConfig?.fleeEnabled ? 'Yes' : 'No'}</p>
        <p>Background: ${escapeHtml(levelConfig?.backgroundAsset ?? ' unavailable')}</p>
      </section>
      <button type="button" class="btn btn-ghost" data-action="complete">
        Complete Level
      </button>
      <button type="button" class="btn btn-ghost" data-action="back">
        Back to menu
      </button>
    </div>
  </div>
  `;

  const scene = container.querySelector('[data-level-scene]');

  if (scene && levelConfig?.backgroundAsset) {
    scene.style.backgroundImage = `url("${levelConfig.backgroundAsset}")`;
  }

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