// public/js/game/renderer.js
//
// Issue #11 — Scene renderer.
//
// Composites a level's background + occlusion layers + bird layers into
// the DOM, following the z-index model from the design doc (§3):
//
//   background -> occlusionLayer[0] -> birds(z:1) -> occlusionLayer[1] -> birds(z:2) -> ...
//
// Scope: this module owns COMPOSITING and ASSET PRELOADING only.
//   - Zoom (spacebar binocular mask) CSS-scales the `.scene` node this
//     module returns; that's components/binocularMask.js's job (#13).
//   - Spawning/animating/fleeing birds is game/birdSpawner.js's job (#12).
//     This module just hands back, for each depth, the DOM node a bird
//     sprite should be appended into (`getBirdLayer(depth)`), so a bird
//     "behind occlusionLayer[1]" ends up actually behind it in the DOM.
//
// Data shape expected:
//
//   background = {
//     imageUrl: string,
//     occlusionLayers: [
//       {
//         imageUrl: string,
//         zIndex: number,
//         // Optional — omit all four for a full-bleed layer (wide
//         // foreground art spanning the whole scene). Give all four to
//         // place a discrete object (e.g. one bush) at a specific spot,
//         // as percentages (0-100) of the scene's width/height so it
//         // stays correctly placed at any container size.
//         x, y, width, height: number
//       }, ...
//     ]
//   }
//
// ---------------------------------------------------------------------
// No backend dependency: backgrounds are dev-curated static content
// (only birds get user uploads / admin review), not a DB collection.
// difficultyEngine resolves `background` from level number and returns
// it as part of the level config payload (e.g. from POST /api/runs) —
// this module has no fetch of its own. Pass that object straight into
// mountScene()/renderScene(); there is nothing to load by id here.
// ---------------------------------------------------------------------

/**
 * Preloads (decodes) every image a background references, so callers
 * never composite a scene with un-decoded images (no pop-in / layout
 * shift when a level starts).
 *
 * A broken *background* image is fatal — there's nothing to render
 * without it, so this rejects. A broken *occlusion layer* is dropped
 * (with a console warning) rather than blocking the whole scene, since
 * losing one occlusion layer just makes a level briefly easier instead
 * of unplayable.
 *
 * @param {{imageUrl: string, occlusionLayers?: {imageUrl:string, zIndex:number}[]}} background
 * @returns {Promise<object>} the background doc, with `occlusionLayers`
 *   filtered to only the ones that loaded successfully and sorted
 *   ascending by zIndex.
 */
export async function preloadBackgroundAssets(background) {
  if (!background || !background.imageUrl) {
    throw new Error('preloadBackgroundAssets: background.imageUrl is required');
  }

  await preloadImage(background.imageUrl);

  const requested = [...(background.occlusionLayers ?? [])].sort(
    (a, b) => a.zIndex - b.zIndex
  );

  const loaded = [];
  for (const layer of requested) {
    try {
      await preloadImage(layer.imageUrl);
      loaded.push(layer);
    } catch (err) {
      console.warn(`renderer: dropping occlusion layer, failed to load ${layer.imageUrl}`, err);
    }
  }

  return { ...background, occlusionLayers: loaded };
}

function preloadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load image: ${url}`));
    img.src = url;
  });
}

/**
 * Composites a (already-preloaded) background into `container`.
 *
 * DOM/z-index order produced:
 *
 *   .scene-background            (z: 0)
 *   .scene-bird-layer  [depth 0] (z: 1)
 *   .scene-occlusion-layer [0]   (z: 2)
 *   .scene-bird-layer  [depth 1] (z: 3)
 *   .scene-occlusion-layer [1]   (z: 4)
 *   ...
 *   .scene-bird-layer  [depth N] (z: 2N+1)   <- N = occlusionLayers.length
 *
 * There is always exactly one more bird layer than there are occlusion
 * layers, so early levels with zero occlusion still get a bird layer
 * (depth 0, directly above the background) instead of having nowhere to
 * spawn birds at all.
 *
 * @param {HTMLElement} container - element to render into (its existing
 *   content is replaced).
 * @param {object} background - as returned by preloadBackgroundAssets, or
 *   the raw object from the level config payload if you don't need
 *   preload guarantees (e.g. a quick dev check).
 * @returns {{
 *   root: HTMLElement,
 *   birdLayers: HTMLElement[],
 *   getBirdLayer: (depth: number) => HTMLElement,
 *   destroy: () => void
 * }}
 */
export function renderScene(container, background) {
  if (!container) throw new Error('renderScene: container is required');
  if (!background || !background.imageUrl) {
    throw new Error('renderScene: background.imageUrl is required');
  }

  container.innerHTML = '';
  container.classList.add('scene-root');

  const root = document.createElement('div');
  root.className = 'scene';

  let z = 0;

  const backgroundEl = document.createElement('div');
  backgroundEl.className = 'scene-layer scene-background';
  backgroundEl.style.backgroundImage = `url("${background.imageUrl}")`;
  backgroundEl.style.zIndex = String(z++);
  root.appendChild(backgroundEl);

  const occlusionLayers = [...(background.occlusionLayers ?? [])].sort(
    (a, b) => a.zIndex - b.zIndex
  );

  const birdLayers = [];

  function addBirdLayer(depth) {
    const layer = document.createElement('div');
    layer.className = 'scene-layer scene-bird-layer';
    layer.dataset.depth = String(depth);
    layer.style.zIndex = String(z++);
    root.appendChild(layer);
    birdLayers.push(layer);
    return layer;
  }

  addBirdLayer(0);

  occlusionLayers.forEach((occ, i) => {
    const occEl = document.createElement('div');
    occEl.className = 'scene-layer scene-occlusion-layer';
    occEl.dataset.zIndex = String(occ.zIndex);
    occEl.style.backgroundImage = `url("${occ.imageUrl}")`;
    occEl.style.zIndex = String(z++);

    // x/y/width/height are optional, given as percentages of the scene
    // (0-100) so placement stays correct at any container size. A layer
    // with all four set is placed and sized like a discrete object (e.g.
    // one bush in a corner); a layer with none of them set falls back to
    // full-bleed cover, for wide foreground art meant to span the whole
    // scene. Mixing (e.g. only `x` given) is treated as "no rect" —
    // partial placement isn't supported, to avoid silently-wrong layout.
    const hasRect = [occ.x, occ.y, occ.width, occ.height].every(
      (v) => typeof v === 'number'
    );

    if (hasRect) {
      occEl.style.inset = 'auto';
      occEl.style.left = `${occ.x}%`;
      occEl.style.top = `${occ.y}%`;
      occEl.style.width = `${occ.width}%`;
      occEl.style.height = `${occ.height}%`;
      occEl.style.backgroundSize = 'contain';
    }

    root.appendChild(occEl);

    addBirdLayer(i + 1);
  });

  container.appendChild(root);

  return {
    root,
    birdLayers,
    /** Returns the layer for `depth`, clamped to the deepest layer that exists. */
    getBirdLayer(depth) {
      const i = Math.max(0, Math.min(depth, birdLayers.length - 1));
      return birdLayers[i];
    },
    destroy() {
      root.remove();
    }
  };
}

/**
 * Convenience wrapper: preloads a background's assets, then composites
 * it. This is the one most callers want — e.g. level.js (#14) receiving
 * a `background` object as part of its level config and mounting the
 * scene in one call:
 *
 *   const scene = await mountScene(container, levelConfig.background);
 */
export async function mountScene(container, background) {
  const preloaded = await preloadBackgroundAssets(background);
  return renderScene(container, preloaded);
}