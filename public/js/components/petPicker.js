// public/js/components/petPicker.js
// "Pick a companion" modal: a grid of every approved bird. Opened from the
// main menu's Pet button.
//
//   openPetPicker({ hostView, currentBirdId, onPick, onClose })
//     Same modal chrome + lifecycle as fieldGuide.js's openFieldGuideModal:
//     mounts into #modal-root, closes via X / backdrop click / Escape, and
//     watches hostView's `hidden` attribute so logging out or starting a
//     level closes it. Picking a bird closes the modal and calls
//     onPick(bird); picking the bird you already have just closes it.
//
// Bird text comes from the DB, so - same rule as dom.js - everything is
// built with createElement + textContent, never innerHTML.
import { api } from '../api.js';
import { el } from '../utils/dom.js';
import { loadBirdSprite } from '../utils/sprite.js';
import { capitalize } from './fieldGuide.js';

let openModal = null; // only one picker at a time

function buildChoice(bird, isCurrent, onChoose) {
  const button = el('button', 'pet-choice');
  button.type = 'button';
  button.setAttribute('aria-pressed', String(isCurrent));
  button.setAttribute('aria-label', `${bird.name}${isCurrent ? ' (current companion)' : ''}`);
  if (isCurrent) button.classList.add('is-current');

  const frame = el('span', 'pet-choice__frame');
  const img = el('img', 'pet-choice__img');
  img.alt = '';
  img.draggable = false;
  img.loading = 'lazy';
  loadBirdSprite(img, bird);
  frame.append(img);

  const rarity = el('span', 'fg-rarity', capitalize(bird.rarity));
  rarity.dataset.rarity = bird.rarity;

  button.append(frame, el('span', 'pet-choice__name', bird.name), rarity);
  button.addEventListener('click', () => onChoose(bird));
  return button;
}

/**
 * @param {object} [options]
 * @param {HTMLElement} [options.hostView]
 * @param {string|null} [options.currentBirdId] - highlighted as "current"
 * @param {(bird: object) => void} [options.onPick]
 * @param {() => void} [options.onClose]
 * @returns {{close: () => void}}
 */
export function openPetPicker({ hostView, currentBirdId = null, onPick, onClose } = {}) {
  if (openModal) return openModal;

  const opener = document.activeElement;
  const modalRoot = document.getElementById('modal-root') ?? document.body;

  const backdrop = el('div', 'modal-backdrop');
  const card = el('div', 'modal-card modal-card--pet');
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  card.setAttribute('aria-label', 'Choose your companion');

  const closeButton = el('button', 'modal-close', '\u00d7');
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', 'Close');

  const panel = el('div', 'pet-picker');
  const header = el('header', 'pet-picker__header');
  header.append(
    el('h3', 'pet-picker__title', 'Choose your companion'),
    el(
      'p',
      'pet-picker__hint',
      currentBirdId
        ? 'Switching birds keeps your current hunger and happiness.'
        : 'Pick a bird to keep you company on the main menu.'
    )
  );
  const grid = el('div', 'pet-picker__grid field-scroll');
  grid.append(el('p', 'pet-picker__status', 'Loading birds\u2026'));

  panel.append(header, grid);
  card.append(closeButton, panel);
  backdrop.append(card);
  modalRoot.append(backdrop);

  const previousOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = 'hidden';

  let pressStartedOnBackdrop = false;
  backdrop.addEventListener('mousedown', (event) => {
    pressStartedOnBackdrop = event.target === backdrop;
  });
  backdrop.addEventListener('click', (event) => {
    if (pressStartedOnBackdrop && event.target === backdrop) close();
    pressStartedOnBackdrop = false;
  });
  closeButton.addEventListener('click', () => close());

  const onKeydown = (event) => {
    if (event.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKeydown);

  let observer = null;
  if (hostView) {
    observer = new MutationObserver(() => {
      if (hostView.hidden) close();
    });
    observer.observe(hostView, { attributes: true, attributeFilter: ['hidden'] });
  }

  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    if (openModal === instance) openModal = null;
    document.removeEventListener('keydown', onKeydown);
    observer?.disconnect();
    backdrop.remove();
    document.documentElement.style.overflow = previousOverflow;
    if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    onClose?.();
  }

  function choose(bird) {
    close();
    if (bird.id !== currentBirdId) onPick?.(bird);
  }

  api
    .getFieldGuideBirds()
    .then((data) => {
      if (closed) return;
      const birds = Array.isArray(data?.birds) ? data.birds : [];
      if (birds.length === 0) {
        grid.replaceChildren(el('p', 'pet-picker__status', 'No birds available yet.'));
        return;
      }
      grid.replaceChildren(...birds.map((bird) => buildChoice(bird, bird.id === currentBirdId, choose)));
      // Keyboard users land on the bird they already have, if any.
      (grid.querySelector('.is-current') ?? grid.querySelector('.pet-choice'))?.focus();
    })
    .catch((error) => {
      console.error('Pet picker fetch failed:', error);
      if (!closed) grid.replaceChildren(el('p', 'pet-picker__status', "Couldn't load the birds."));
    });

  const instance = { close };
  openModal = instance;
  closeButton.focus();
  return instance;
}