import { api } from '../api.js';
import { showView } from '../router.js';
import { mountScene } from '../game/renderer.js';
import {
  createBirdSpawner,
  DEV_FIXTURE_BIRD_POOL
} from '../game/birdSpawner.js';
import { attachLevelInput } from '../game/input.js';

// router.js re-mounts views from scratch on every showView() and has no
// unmount hook, so mountLevel() has to track and tear down its own
// previous instance — otherwise every level visit leaves its spawner
// timers and its window keydown/keyup listeners (input.js, #13) running
// forever in the background, stacking up on every replay.
let activeSpawner = null;
let activeInput = null;

function teardownLevel() {
  activeSpawner?.destroy();
  activeInput?.destroy();
  activeSpawner = null;
  activeInput = null;
}

export async function mountLevel(container, params = {}) {
  teardownLevel(); // in case a previous level is still running

  container.hidden = true;
  container.innerHTML = `
    <div class="level-loading">Loading level...</div>
  `;

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

  const sceneHost = document.createElement('div');
  container.querySelector('[data-level-scene]').prepend(sceneHost);

  try {
    const scene = await mountScene(sceneHost, {
      imageUrl: levelConfig?.backgroundAsset ?? '/assets/backgrounds/bg1.jpg',
      occlusionLayers: [
        { imageUrl: '/assets/occlusion/tree.png', zIndex: 1, x: 40, y: 10, width: 75, height: 150 }
      ]
    });

    const spawner = createBirdSpawner({
      scene,
      levelConfig,
      birdPool: DEV_FIXTURE_BIRD_POOL
    });

    spawner.start();
    activeSpawner = spawner;
    activeInput = attachLevelInput({ sceneHost, scene });

    container.hidden = false;
  } catch (error) {
    console.error('Failed to start level scene:', error);
    container.innerHTML = `
    <div class="level-loading">Failed to load level.</div>
  `;
    container.hidden = false;
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

        teardownLevel();
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
      teardownLevel();
      showView('mainMenu', { user });
    });
  }
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = String(value);
  return div.innerHTML;
}