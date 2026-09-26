// public/js/components/fieldGuide.js
// ---------------------------------------------------------------------
// Field Guide (#38, #39): a two-page "flip book" of every approved bird.
//
//   mountFieldGuide(container, { size: 'mini' | 'large' })
//     Self-mounting component (same pattern as binocularMask.js and
//     leaderboard.js). Fetches GET /api/birds?visibility=approved once and
//     keeps the list for the component's lifetime - no refetch per flip.
//     'mini'  -> compact widget for views/level.js (bottom-right).
//     'large' -> roomier variant used inside the main-menu modal.
//
//   openFieldGuideModal({ hostView, onClose })
//     Modal chrome for the 'large' variant. Mounts into #modal-root (or
//     <body>), NOT through router.js's showView(), so it layers over the
//     main menu instead of replacing it.
//
// Spread model: left page = bird `index`, right page = bird `index + 1`.
// Each flip moves the spread by ONE bird. Clicking the left page steps
// back, the right page steps forward; both stop at the ends (no wrap).
//
// Read-only reference: nothing here touches the round timer or spawner.
// The component registers no document/window listeners, so destroy() only
// has to remove its own DOM.
// ---------------------------------------------------------------------

import { api } from '../api.js';
import { el } from '../utils/dom.js';

/**
 * Field order shown on a page, after the name. Exported so the round
 * summary (#41) renders the same labels in the same order.
 */
export const FIELD_GUIDE_FIELDS = [
  ['physicalDescription', 'Appearance'],
  ['breedingRegion', 'Breeding region'],
  ['size', 'Size'],
  ['food', 'Food'],
  ['habitat', 'Habitat'],
  ['song', 'Song'],
  ['funFact', 'Fun fact']
];

export function capitalize(value) {
  const text = String(value ?? '');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Was this pointer event on the page's own scrollbar (rather than on its
 * content)? Clicking a scrollbar must not flip the page.
 */
function isScrollbarHit(event, page) {
  if (event.target !== page) return false;
  return event.offsetX >= page.clientWidth || event.offsetY >= page.clientHeight;
}

/**
 * @param {HTMLElement} container
 * @param {{size?: 'mini'|'large'}} [options]
 * @returns {{root: HTMLElement, next: () => boolean, prev: () => boolean, destroy: () => void}}
 */
export function mountFieldGuide(container, { size = 'mini' } = {}) {
  if (!container) throw new Error('mountFieldGuide: container is required');

  const isLarge = size === 'large';
  let birds = [];
  let index = 0; // bird shown on the LEFT page
  let destroyed = false;

  const root = el('section', `field-guide field-guide--${isLarge ? 'large' : 'mini'}`);
  root.setAttribute('aria-label', 'Field Guide');

  const spread = el('div', 'fg-spread');
  const leftPage = el('div', 'fg-page fg-page--left field-scroll');
  const rightPage = el('div', 'fg-page fg-page--right field-scroll');
  spread.append(leftPage, rightPage);

  // In the level the name textbox must keep keyboard focus (and Space must
  // keep meaning "zoom"), so the mini widget's buttons are out of the tab
  // order. The large variant is a normal, keyboard-friendly dialog.
  const prevButton = el('button', 'fg-nav', 'Prev');
  const nextButton = el('button', 'fg-nav', 'Next');
  const positionLabel = el('span', 'fg-position');
  for (const [button, label] of [[prevButton, 'Previous bird'], [nextButton, 'Next bird']]) {
    button.type = 'button';
    button.setAttribute('aria-label', label);
    if (!isLarge) button.tabIndex = -1;
  }
  positionLabel.setAttribute('aria-live', 'polite');

  const toolbar = el('div', 'fg-toolbar');
  toolbar.append(prevButton, positionLabel, nextButton);

  root.append(spread, toolbar);
  container.append(root);

  const maxIndex = () => Math.max(0, birds.length - 2);

  function fillPage(page, bird) {
    page.scrollTop = 0;
    page.classList.toggle('is-blank', !bird);
    if (!bird) {
      page.replaceChildren();
      return;
    }

    const thumb = el('img', 'fg-thumb');
    thumb.src = bird.imageUrl;
    thumb.alt = '';
    thumb.draggable = false;
    thumb.loading = 'lazy';

    const titles = el('div', 'fg-titles');
    const rarity = el('span', 'fg-rarity', capitalize(bird.rarity));
    rarity.dataset.rarity = bird.rarity;
    titles.append(el('h3', 'fg-name', bird.name));
    if (bird.scientificName) titles.append(el('p', 'fg-scientific', bird.scientificName));
    titles.append(rarity);

    const header = el('header', 'fg-header');
    header.append(thumb, titles);

    const fields = el('dl', 'fg-fields');
    for (const [key, label] of FIELD_GUIDE_FIELDS) {
      if (!bird[key]) continue;
      fields.append(el('dt', null, label), el('dd', null, bird[key]));
    }

    page.replaceChildren(header, fields);
  }

  function setStatus(message) {
    leftPage.classList.remove('is-blank', 'can-flip');
    rightPage.classList.add('is-blank');
    rightPage.classList.remove('can-flip');
    leftPage.replaceChildren(el('p', 'fg-status', message));
    rightPage.replaceChildren();
    positionLabel.textContent = '';
    prevButton.disabled = true;
    nextButton.disabled = true;
  }

  function render() {
    fillPage(leftPage, birds[index]);
    fillPage(rightPage, birds[index + 1]);

    const last = Math.min(index + 2, birds.length);
    positionLabel.textContent = `${index + 1}\u2013${last} of ${birds.length}`;

    prevButton.disabled = index <= 0;
    nextButton.disabled = index >= maxIndex();
    leftPage.classList.toggle('can-flip', index > 0);
    rightPage.classList.toggle('can-flip', index < maxIndex());
  }

  /** Moves the spread by `delta` birds, clamped to the ends. True if it moved. */
  function step(delta) {
    if (destroyed || birds.length === 0) return false;
    const target = Math.min(Math.max(index + delta, 0), maxIndex());
    if (target === index) return false;
    index = target;
    render();
    return true;
  }

  function onPageClick(delta) {
    return (event) => {
      if (isScrollbarHit(event, event.currentTarget)) return;
      // Finishing a text selection shouldn't also turn the page.
      if (window.getSelection?.()?.toString()) return;
      step(delta);
    };
  }

  // Wheel events stay on the page under the pointer: never bubble to the
  // scene, and if the page has nothing to scroll, swallow the wheel so it
  // can't scroll the page/menu behind. (CSS overscroll-behavior: contain
  // covers scroll chaining at the ends of a scrollable page.)
  function onWheel(event) {
    event.stopPropagation();
    const page = event.currentTarget;
    if (page.scrollHeight <= page.clientHeight) event.preventDefault();
  }

  leftPage.addEventListener('click', onPageClick(-2));
  rightPage.addEventListener('click', onPageClick(2));
  prevButton.addEventListener('click', () => step(-2));
  nextButton.addEventListener('click', () => step(2));
  leftPage.addEventListener('wheel', onWheel, { passive: false });
  rightPage.addEventListener('wheel', onWheel, { passive: false });

  if (!isLarge) {
    // In-level: don't let clicks on the widget pull focus away from the
    // name textbox. (Skipped for scrollbar drags so they still work.)
    root.addEventListener('mousedown', (event) => {
      const page = event.target;
      if (page instanceof Element && page.classList.contains('fg-page') && isScrollbarHit(event, page)) return;
      event.preventDefault();
    });
  }

  setStatus('Loading field guide\u2026');

  api
    .getFieldGuideBirds()
    .then((data) => {
      if (destroyed) return;
      birds = Array.isArray(data?.birds) ? data.birds : [];
      index = 0;
      if (birds.length === 0) {
        setStatus('No birds in the field guide yet.');
        return;
      }
      render();
    })
    .catch((error) => {
      console.error('Field guide fetch failed:', error);
      if (!destroyed) setStatus("Couldn't load the field guide.");
    });

  return {
    root,
    next: () => step(1),
    prev: () => step(-1),
    destroy() {
      destroyed = true;
      root.remove();
    }
  };
}

// ---------------------------------------------------------------------
// Main-menu modal (#39)
// ---------------------------------------------------------------------

let openModal = null; // only one Field Guide modal at a time

/**
 * Opens the Field Guide in a centered modal over a dimmed backdrop.
 * Closes via the X button, a click on the backdrop, or Escape, and
 * removes every listener/DOM node it added when it does. Arrow keys flip
 * pages while it's open.
 *
 * @param {object} [options]
 * @param {HTMLElement} [options.hostView] - the view section (e.g. the
 *   mainMenu container) this modal belongs to. router.js has no unmount
 *   hook, so the modal watches this element's `hidden` attribute and
 *   closes itself the moment the view is hidden (logout, starting a
 *   level, ...).
 * @param {() => void} [options.onClose]
 * @returns {{close: () => void}}
 */
export function openFieldGuideModal({ hostView, onClose } = {}) {
  if (openModal) return openModal;

  const opener = document.activeElement;
  const modalRoot = document.getElementById('modal-root') ?? document.body;

  const backdrop = el('div', 'modal-backdrop');
  const card = el('div', 'modal-card');
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  card.setAttribute('aria-label', 'Field Guide');

  const closeButton = el('button', 'modal-close', '\u00d7');
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', 'Close field guide');

  const host = el('div', 'modal-guide-host');
  card.append(closeButton, host);
  backdrop.append(card);
  modalRoot.append(backdrop);

  const guide = mountFieldGuide(host, { size: 'large' });

  // Lock background scrolling while the modal is up.
  const previousOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = 'hidden';

  // Only close on a backdrop click if the press ALSO started on the
  // backdrop — otherwise dragging a text selection out of the card and
  // releasing outside would dismiss it.
  let pressStartedOnBackdrop = false;
  backdrop.addEventListener('mousedown', (event) => {
    pressStartedOnBackdrop = event.target === backdrop;
  });
  backdrop.addEventListener('click', (event) => {
    if (pressStartedOnBackdrop && event.target === backdrop) close();
    pressStartedOnBackdrop = false;
  });
  closeButton.addEventListener('click', () => close());

  function onKeydown(event) {
    if (event.key === 'Escape') close();
    else if (event.key === 'ArrowLeft') guide.prev();
    else if (event.key === 'ArrowRight') guide.next();
  }
  document.addEventListener('keydown', onKeydown);

  let observer = null;
  if (hostView) {
    observer = new MutationObserver(() => {
      if (hostView.hidden) close();
    });
    observer.observe(hostView, { attributes: true, attributeFilter: ['hidden'] });
  }

  function close() {
    if (openModal !== instance) return; // idempotent, and never closes a newer modal
    openModal = null;
    document.removeEventListener('keydown', onKeydown);
    observer?.disconnect();
    guide.destroy();
    backdrop.remove();
    document.documentElement.style.overflow = previousOverflow;
    if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    onClose?.();
  }

  const instance = { close };
  openModal = instance;
  closeButton.focus();
  return instance;
}
