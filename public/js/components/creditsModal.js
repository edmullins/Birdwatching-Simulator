// public/js/components/creditsModal.js
// ---------------------------------------------------------------------
// Photo Credits modal (#43): a general credit to the Cornell Lab of
// Ornithology | Macaulay Library, followed by one line per approved bird
// crediting its photographer and linking back to that photo's Macaulay
// Library asset page.
//
// openCreditsModal({ hostView, onClose })
//   Same modal chrome/lifecycle as fieldGuide.js's openFieldGuideModal:
//   mounts into #modal-root (or <body>), closes via the X button, a
//   backdrop click, or Escape, and watches hostView's `hidden` attribute
//   so navigating away (logout, starting a level, ...) closes it too.
//
// Bird names/authors come straight from the DB, so - same rule as
// dom.js - everything here is built with createElement + textContent,
// never innerHTML, and only the `href` (a URL Claude/the server builds
// from creditId, not free text) is ever set as an attribute.
// ---------------------------------------------------------------------

import { api } from '../api.js';
import { el } from '../utils/dom.js';

const MACAULAY_LIBRARY_URL = 'https://www.macaulaylibrary.org/';
const UNKNOWN_AUTHOR_LABEL = 'Unknown photographer';

function assetUrl(creditId) {
  return `https://macaulaylibrary.org/asset/${encodeURIComponent(creditId)}`;
}

function buildCreditsList(birds) {
  const list = el('ul', 'credits-list field-scroll');

  const credited = birds.filter((bird) => bird.creditId);
  let number = 1;
  for (const bird of credited) {
    const item = el('li', 'credits-item');
    item.append(el('span', 'credits-bird-name', `${number++}. ${bird.name}`));

    const author = el('a', 'credits-author', bird.imageAuthor || UNKNOWN_AUTHOR_LABEL);
    author.href = assetUrl(bird.creditId);
    author.target = '_blank';
    author.rel = 'noopener noreferrer';
    item.append(author);

    list.append(item);
  }

  return list;
}

function buildContent(birds) {
  const root = el('div', 'credits-body');

  const header = el('header', 'credits-header');
  header.append(el('h3', 'credits-title', 'Photo Credits'));
  const general = el('p', 'credits-general');
  general.append(
    document.createTextNode('Bird photographs are courtesy of the '),
    (() => {
      const link = el('a', null, 'Cornell Lab of Ornithology | Macaulay Library');
      link.href = MACAULAY_LIBRARY_URL;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      return link;
    })(),
    document.createTextNode('. Each photographer is credited individually below.')
  );
  header.append(general);
  root.append(header);

  if (birds.length === 0) {
    root.append(el('p', 'credits-status', 'No credited photos yet.'));
  } else {
    root.append(buildCreditsList(birds));
  }

  return root;
}

let openModal = null; // only one Credits modal at a time

/**
 * Opens the Credits list in a centered modal over a dimmed backdrop.
 *
 * @param {object} [options]
 * @param {HTMLElement} [options.hostView] - view section to watch; the
 *   modal closes itself when this element's `hidden` attribute flips on.
 * @param {() => void} [options.onClose]
 * @returns {{close: () => void}}
 */
export function openCreditsModal({ hostView, onClose } = {}) {
  if (openModal) return openModal;

  const opener = document.activeElement;
  const modalRoot = document.getElementById('modal-root') ?? document.body;

  const backdrop = el('div', 'modal-backdrop');
  const card = el('div', 'modal-card modal-card--credits');
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  card.setAttribute('aria-label', 'Photo Credits');

  const closeButton = el('button', 'modal-close', '\u00d7');
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', 'Close photo credits');

  const panel = el('div', 'credits-panel');
  const status = el('p', 'credits-status', 'Loading credits\u2026');
  panel.append(status);

  card.append(closeButton, panel);
  backdrop.append(card);
  modalRoot.append(backdrop);

  const previousOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = 'hidden';

  let destroyed = false;

  api
    .getFieldGuideBirds()
    .then((data) => {
      if (destroyed) return;
      const birds = Array.isArray(data?.birds) ? data.birds : [];
      panel.replaceChildren(buildContent(birds));
    })
    .catch((error) => {
      console.error('Credits fetch failed:', error);
      if (!destroyed) status.textContent = "Couldn't load photo credits.";
    });

  // Only close on a backdrop click if the press ALSO started on the
  // backdrop, matching the Field Guide modal's behavior.
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
    destroyed = true;
    document.removeEventListener('keydown', onKeydown);
    observer?.disconnect();
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