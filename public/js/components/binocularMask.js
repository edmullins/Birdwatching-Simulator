// public/js/components/binocularMask.js

// game/input.js owns *when* to zoom (the spacebar hold); this owns
// *what zooming looks like*, so it can be swapped (different mask
// shape, different zoom curve) without touching input handling.

/**
 * @param {object} options
 * @param {HTMLElement} options.container - element the mask overlay is
 *   appended into. Expected to be position:relative + overflow:hidden
 *   (renderer.js's .scene-root already is) so the overlay and the
 *   scaled content behind it stay bounded to it.
 * @param {HTMLElement} options.target - the element to CSS-scale when
 *   zoomed — renderer.js's `scene.root` (the `.scene` node), NOT
 *   .scene-root itself, so the mask overlay doesn't get scaled along
 *   with the content it's masking.
 * @param {number} [options.zoomMultiplier] - defaults to 2. There's no
 *   binoculars-upgrade system yet (design doc's `binoculars` collection
 *   / users.unlockedBinoculars aren't built), so this is just a
 *   constant for now — swap it for the equipped binoculars'
 *   zoomMultiplier once that exists; nothing else here changes shape.
 */
export function createBinocularMask({ container, target, zoomMultiplier = 2 }) {
  if (!container || !target) {
    throw new Error('createBinocularMask: container and target are required');
  }

  const overlay = document.createElement('div');
  overlay.className = 'binocular-mask';
  container.appendChild(overlay);

  target.classList.add('scene-zoom-target');
  target.style.setProperty('--zoom-scale', String(zoomMultiplier));

  return {
    /** Shows/hides the binocular vignette and scales `target` accordingly. */
    setZoomed(active) {
      overlay.classList.toggle('is-active', active);
      target.classList.toggle('is-zoomed', active);
    },
    /** Updates the zoom amount without needing to re-create the mask. */
    setZoomMultiplier(multiplier) {
      target.style.setProperty('--zoom-scale', String(multiplier));
    },
    destroy() {
      overlay.remove();
      target.classList.remove('scene-zoom-target', 'is-zoomed');
    }
  };
}