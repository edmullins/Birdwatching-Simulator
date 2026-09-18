// public/js/components/binocularMask.js
// ---------------------------------------------------------------------
// Binocular mask overlay component: creates a vignette overlay and
// CSS-scales the scene behind it when zoomed. The overlay is appended
// game/input.js owns *when* to zoom (the spacebar hold) and *where the
// cursor is*; this owns *what zooming looks like* — the scale/pan math
// and edge-clamping (#27) — so it can be swapped (different mask shape,
// different zoom curve) without touching input handling.
// ---------------------------------------------------------------------

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

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
  target.style.setProperty('--pan-x', '0px');
  target.style.setProperty('--pan-y', '0px');

  let currentMultiplier = zoomMultiplier;
  // Last viewport coords we panned to — cached so a mid-zoom multiplier
  // change (once binoculars upgrades exist, per the issue's step 5) can
  // immediately re-clamp toward the same spot, instead of waiting on
  // the next mousemove.
  let lastPointer = null;

  /**
   * Pans `target` so the content under (clientX, clientY) — viewport
   * coordinates, straight off a mousemove event — ends up centered on
   * screen once scaled, i.e. under the (fixed, centered) binocular
   * lenses. Clamped so the zoomed viewport never reveals space beyond
   * `target`'s own edges: `target` is exactly `container`-sized
   * (renderer.js / game.css), so with transform-origin: center and
   * `transform: scale(s) translate(tx, ty)` (translate is applied
   * *before* scale here — CSS applies the rightmost function first —
   * so tx/ty are plain unscaled container px), the max pan on an axis
   * of length L is (L / 2) * (1 - 1 / s); beyond that the far edge of
   * the content would pull in past the viewport edge.
   */
  function applyPan(clientX, clientY) {
    const rect = container.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (!w || !h) return; // not laid out yet — nothing sane to clamp against

    const LENS_WIDTH_RATIO = 0.35;
    const LENS_HEIGHT_RATIO = 0.45;
    
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    const lensWidth = w * LENS_WIDTH_RATIO;
    const lensHeight = h * LENS_HEIGHT_RATIO;
    const maxPanX = Math.max(0, (w * currentMultiplier - lensWidth) / 2);
    const maxPanY = Math.max(0, (h * currentMultiplier - lensHeight) / 2);

    const panX = clamp(w / 2 - mouseX, -maxPanX, maxPanX);
    const panY = clamp(h / 2 - mouseY, -maxPanY, maxPanY);

    target.style.setProperty('--pan-x', `${panX}px`);
    target.style.setProperty('--pan-y', `${panY}px`);
  }

  return {
    /** Shows/hides the binocular vignette and scales `target` accordingly. */
    setZoomed(active) {
      overlay.classList.toggle('is-active', active);
      target.classList.toggle('is-zoomed', active);
      if (!active) {
        // "un-zoomed, un-panned state" (#27 acceptance criteria).
        // Removing .is-zoomed already drops the transform visually,
        // but reset the pan itself too so the *next* zoom-in starts
        // centered until the mouse moves again, same as pre-#27.
        lastPointer = null;
        target.style.setProperty('--pan-x', '0px');
        target.style.setProperty('--pan-y', '0px');
      }
    },
    /**
     * Pans the zoomed view toward viewport coordinates (clientX,
     * clientY) — pass straight through from a mousemove event. Safe to
     * call any time; game/input.js only calls this while zoomed, but
     * nothing here depends on that.
     */
    panTo(clientX, clientY) {
      lastPointer = { clientX, clientY };
      applyPan(clientX, clientY);
    },
    /** Updates the zoom amount without needing to re-create the mask. */
    setZoomMultiplier(multiplier) {
      currentMultiplier = multiplier;
      target.style.setProperty('--zoom-scale', String(multiplier));
      if (lastPointer) applyPan(lastPointer.clientX, lastPointer.clientY);
    },
    destroy() {
      overlay.remove();
      target.classList.remove('scene-zoom-target', 'is-zoomed');
      target.style.removeProperty('--pan-x');
      target.style.removeProperty('--pan-y');
    }
  };
}