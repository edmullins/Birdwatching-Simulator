// public/js/game/input.js
//
// Issue #13 — Input handling: spacebar-hold binocular zoom.
//
// ---------------------------------------------------------------------
// This issue's other checkbox — click detection with slightly-larger-
// than-visual hitboxes — already exists: game/birdSpawner.js (#12) gives
// every .bird-sprite its own click listener, and game.css pads each
// sprite's clickable box beyond its drawn image (design doc §3). There's
// nothing left to add for that here; a second, centralized click handler
// on top of it would just be two systems racing over the same clicks.
// This file is the spacebar/zoom half only.
// ---------------------------------------------------------------------
//
// Wires game/renderer.js's scene handle together with
// components/binocularMask.js: holding Space zooms in (CSS-scale, no
// asset reload, per design doc §3), releasing it zooms back out.

import { createBinocularMask } from '../components/binocularMask.js';

/**
 * @param {object} options
 * @param {HTMLElement} options.sceneHost - the `.scene-root` container
 *   you passed into renderer.js's mountScene()/renderScene().
 * @param {{root: HTMLElement}} options.scene - the handle mountScene()
 *   returned; `.root` (the `.scene` node) is what gets CSS-scaled.
 * @param {number} [options.zoomMultiplier] - see binocularMask.js.
 * @param {(zoomed: boolean) => void} [options.onZoomChange]
 * @param {EventTarget} [options.eventTarget] - defaults to `window`.
 *   Tests pass a plain element instead of touching real global listeners.
 */
export function attachLevelInput({
  sceneHost,
  scene,
  zoomMultiplier = 2,
  onZoomChange = () => {},
  eventTarget = window
}) {
  if (!sceneHost || !scene?.root) {
    throw new Error('attachLevelInput: sceneHost and scene (with .root) are required');
  }

  const mask = createBinocularMask({ container: sceneHost, target: scene.root, zoomMultiplier });
  let zoomed = false;

  function isSpacebar(event) {
    // event.code is preferred (layout-independent); event.key covers
    // engines/tests that only set `key`.
    return event.code === 'Space' || event.key === ' ' || event.key === 'Spacebar';
  }

  function handleKeydown(event) {
    if (!isSpacebar(event) || zoomed) return; // ignore held-key repeat events
    event.preventDefault(); // Space's default action scrolls the page
    zoomed = true;
    mask.setZoomed(true);
    onZoomChange(true);
  }

  function handleKeyup(event) {
    if (!isSpacebar(event)) return;
    event.preventDefault();
    zoomed = false;
    mask.setZoomed(false);
    onZoomChange(false);
  }

  eventTarget.addEventListener('keydown', handleKeydown);
  eventTarget.addEventListener('keyup', handleKeyup);

  return {
    get zoomed() {
      return zoomed;
    },
    setZoomMultiplier(multiplier) {
      mask.setZoomMultiplier(multiplier);
    },
    /**
     * Removes listeners and the mask overlay. Forces zoom off first so
     * leaving a level mid-hold (e.g. clicking "Back to menu" while Space
     * is still down) doesn't leave a stuck-zoomed scene or fire
     * onZoomChange(false) after the caller's already torn things down.
     */
    destroy() {
      if (zoomed) {
        zoomed = false;
        mask.setZoomed(false);
        onZoomChange(false);
      }
      eventTarget.removeEventListener('keydown', handleKeydown);
      eventTarget.removeEventListener('keyup', handleKeyup);
      mask.destroy();
    }
  };
}