// public/js/game/input.js
//
// ---------------------------------------------------------------------
// Birds are no longer collected by clicking - the player types a bird's
// name into the textbox in views/level.js, and game/birdSpawner.js's
// attemptCatch() checks it. So this file is the spacebar/zoom half only.
//
// Space vs. the name textbox: names contain spaces ("Northern Cardinal"),
// but Space is also the zoom key. The rule, in one line: while the textbox
// has text in it, Space types a space; otherwise (empty box, or focus
// somewhere else) Space zooms. A zoom that started on an empty box keeps
// swallowing Space until it's released, so a held zoom never types spaces
// into a name you start typing mid-zoom.
// ---------------------------------------------------------------------
//
// Wires game/renderer.js's scene handle together with
// components/binocularMask.js: holding Space zooms in (CSS-scale, no
// asset reload, per design doc #3), releasing it zooms back out.

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
  zoomMultiplier = 3,
  onZoomChange = () => {},
  eventTarget = window
}) {
  if (!sceneHost || !scene?.root) {
    throw new Error('attachLevelInput: sceneHost and scene (with .root) are required');
  }

  const mask = createBinocularMask({ container: sceneHost, target: scene.root, zoomMultiplier });
  let zoomed = false;

  function isTextEntry(target) {
    return (
      target instanceof HTMLElement &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
    );
  }

  function isSpacebar(event) {
    // event.code is preferred (layout-independent); event.key covers
    // engines/tests that only set `key`.
    return event.code === 'Space' || event.key === ' ' || event.key === 'Spacebar';
  }

  // #27: cursor-following pan. Only listens while zoomed — attaching a
  // mousemove handler for the entire (non-zoomed) round would just be
  // unnecessary work on every mouse tick for a value nothing reads.
  function handleMousemove(event) {
    mask.panTo(event.clientX, event.clientY);
  }

  function handleKeydown(event) {
    if (!isSpacebar(event)) return;
    if (zoomed) {
      // Held-key repeat: already zooming. Still swallow it so it can't
      // type spaces into the name textbox while Space is held down.
      event.preventDefault();
      return;
    }
    // Mid-name in the textbox: this Space is part of the name.
    if (isTextEntry(event.target) && event.target.value.trim() !== '') return;

    event.preventDefault(); // Space's default action scrolls the page
    zoomed = true;
    mask.setZoomed(true);
    eventTarget.addEventListener('mousemove', handleMousemove);
    onZoomChange(true);
  }

  function handleKeyup(event) {
    if (!isSpacebar(event) || !zoomed) return; // a Space typed into the name box
    event.preventDefault();
    zoomed = false;
    mask.setZoomed(false);
    eventTarget.removeEventListener('mousemove', handleMousemove);
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
      // Unconditional and harmless if it was never attached (e.g.
      // destroy() called while not zoomed) — removeEventListener on a
      // listener that isn't registered is a silent no-op.
      eventTarget.removeEventListener('mousemove', handleMousemove);
      eventTarget.removeEventListener('keydown', handleKeydown);
      eventTarget.removeEventListener('keyup', handleKeyup);
      mask.destroy();
    }
  };
}