// public/js/components/petCompanion.js
// Main-menu companion bird (tamagotchi-style pet).
//
//   const pet = mountPetCompanion(hostView);
//   pet.openPicker();   // wired to the Pet button in mainMenu.js
//   pet.destroy();      // automatic - see lifecycle below
//
// Behaviour
//   - On mount it asks the server for the player's pet. If there is one it
//     flies in from a screen edge, lands at a random spot (kept away from
//     the edges), idles, flies off, and later flies back in somewhere new.
//   - Clicking the landed bird starts a slow bounce and opens a popup above
//     it: Hunger n/100, Happiness n/100, and Pet / Feed buttons.
//       Pet  -> short hop + smiley fades out  (+25 happiness)
//       Feed -> food emoji fades out          (+25 hunger)
//   - While the popup is open the bird never wanders off.
//   - If hunger or happiness reaches 0 the server clears the pet; the bird
//     flies away for good and the player is back to "pick a bird".
//
// The server owns all stat math and time decay (see services/petCare.js);
// this file only renders what it is told. It re-syncs when the popup opens
// and every REFRESH_MS, so a bird that starved while the tab sat open still
// leaves.
//
// Rendering: one fixed, click-through layer (.pet-layer, z-index 9999)
// appended to <body>. The bird is a stack of single-purpose wrappers so
// their transforms never fight:
//   .pet-bird         position (translate3d) + flight (Web Animations)
//     .pet-bird__flip   facing (scaleX), and the click/keyboard target
//       .pet-bird__body   flap / bounce / landing squash
//         img             hop when petted
//     .pet-bubble       the popup (sibling of flip, so it is never mirrored)
//
// Sprites face LEFT, so travelling right mirrors them with scaleX(-1).
//
// Lifecycle: router.js has no unmount hook, so - like the Field Guide
// modal - this watches hostView's `hidden` attribute and tears itself
// down (layer, timers, listeners) the moment the main menu is hidden
// (logout, starting a level, ...).
import { api } from '../api.js';
import { el } from '../utils/dom.js';
import { loadBirdSprite } from '../utils/sprite.js';
import { openPetPicker } from './petPicker.js';

// How far (px) a landed bird stays from each viewport edge. The top margin
// is sized so the popup (~175px tall + 14px gap + bounce) always fits ABOVE
// the bird, and it also keeps the bird clear of the menu top bar. (On very
// short windows placeBubble() falls back to opening below.)
const MARGIN = { x: 120, top: 230, bottom: 100 };

const DWELL_MS = [9000, 20000];      // perched before flying off
const AFTER_POPUP_MS = [5000, 9000]; // extra calm after the popup closes
const AWAY_MS = [2000, 5000];        // off-screen before flying back
const FLIGHT_MS = [900, 2600];       // clamp for distance-based flight time
const FLIGHT_PX_PER_MS = 0.32;
const MIN_HOP_PX = 160;              // a new perch is at least this far away
const REFRESH_MS = 30000;
const NOTICE_MS = 7000;
const LOW_STAT = 25;                 // at/below this the stat bar turns red

const PET_EMOJI = '\u{1F60A}'; // smiley
const FEED_EMOJIS = ['\u{1F33B}', '\u{1F41B}', '\u{1F353}', '\u{1F33E}']; // sunflower, bug, strawberry, grain
const STATS = [
  ['hunger', 'Hunger'],
  ['happiness', 'Happiness'],
];

const OFFSCREEN = 'translate3d(-9999px, 0, 0)';

const rand = (min, max) => min + Math.random() * (max - min);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Restarts a one-shot CSS animation class on `node`. */
function retrigger(node, className) {
  node.classList.remove(className);
  void node.offsetWidth; // force reflow so the animation restarts
  node.classList.add(className);
  const onEnd = (event) => {
    if (event.target !== node) return; // ignore animations bubbling up from children
    node.classList.remove(className);
    node.removeEventListener('animationend', onEnd);
  };
  node.addEventListener('animationend', onEnd);
}

let activeCompanion = null; // only one at a time

/**
 * @param {HTMLElement} hostView - the mainMenu view section.
 * @returns {{openPicker: () => void, destroy: () => void}}
 */
export function mountPetCompanion(hostView) {
  activeCompanion?.destroy();

  const layer = el('div', 'pet-layer');
  document.body.append(layer);

  let destroyed = false;
  let runToken = 0;       // bumped to cancel the wander loop
  let statSeq = 0;        // discards out-of-order stat responses
  let pet = null;         // { hunger, happiness, max, bird } for the current companion
  let ui = null;          // DOM refs for the current bird (see buildBird)
  let x = 0;              // bird's top-left, viewport px
  let y = 0;
  let perched = false;    // landed and clickable
  let popupOpen = false;
  let busy = false;       // a Pet/Feed request is in flight
  let currentAnim = null; // active flight animation
  let wake = null;        // wakes the current sleep() early
  let picker = null;
  let noticeTimer = null;

  // ------------------------------------------------------------------
  // DOM
  // ------------------------------------------------------------------
  function buildBird(bird) {
    const root = el('div', 'pet-bird');
    root.style.transform = OFFSCREEN;

    const flip = el('div', 'pet-bird__flip');
    flip.setAttribute('role', 'button');
    flip.setAttribute('aria-haspopup', 'true');
    flip.setAttribute('aria-expanded', 'false');
    flip.setAttribute('aria-label', `${bird.name}, your companion. Open care menu`);
    flip.tabIndex = 0;

    const body = el('div', 'pet-bird__body');
    const img = el('img', 'pet-bird__img');
    img.alt = '';
    img.draggable = false;
    body.append(img);
    flip.append(body);

    // ---- popup ----
    const bubble = el('div', 'pet-bubble');
    bubble.hidden = true;
    bubble.setAttribute('role', 'group');
    bubble.setAttribute('aria-label', `${bird.name} care`);

    const rows = {};
    bubble.append(el('p', 'pet-bubble__name', bird.name));
    for (const [key, label] of STATS) {
      const row = el('div', 'pet-stat');
      const head = el('div', 'pet-stat__head');
      const value = el('span', 'pet-stat__value', '');
      head.append(el('span', 'pet-stat__label', label), value);
      const bar = el('div', 'pet-stat__bar');
      bar.setAttribute('role', 'meter');
      bar.setAttribute('aria-label', label);
      bar.setAttribute('aria-valuemin', '0');
      const fill = el('div', 'pet-stat__fill');
      bar.append(fill);
      row.append(head, bar);
      bubble.append(row);
      rows[key] = { value, bar, fill };
    }

    const actions = el('div', 'pet-bubble__actions');
    const petBtn = el('button', 'btn btn-primary pet-bubble__btn', 'Pet');
    const feedBtn = el('button', 'btn btn-primary pet-bubble__btn', 'Feed');
    petBtn.type = feedBtn.type = 'button';
    actions.append(petBtn, feedBtn);
    bubble.append(actions);

    root.append(flip, bubble);

    // ---- events ----
    flip.addEventListener('click', togglePopup);
    flip.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        togglePopup();
      }
    });
    petBtn.addEventListener('click', () => doAction('pet'));
    feedBtn.addEventListener('click', () => doAction('feed'));

    return { root, flip, body, img, bubble, rows, petBtn, feedBtn };
  }

  function renderStats() {
    if (!ui || !pet) return;
    for (const [key] of STATS) {
      const value = pet[key];
      const row = ui.rows[key];
      row.value.textContent = `${value}/${pet.max}`;
      row.fill.style.width = `${(value / pet.max) * 100}%`;
      row.fill.classList.toggle('is-low', value <= LOW_STAT);
      row.bar.setAttribute('aria-valuemax', String(pet.max));
      row.bar.setAttribute('aria-valuenow', String(value));
    }
  }

  function setActionsDisabled(disabled) {
    if (!ui) return;
    ui.petBtn.disabled = disabled;
    ui.feedBtn.disabled = disabled;
  }

  /** Fades a bird out and removes it; safe to call twice. */
  function retire(node) {
    if (!node) return;
    if (ui === node) ui = null;
    node.root.classList.add('is-retiring');
    setTimeout(() => node.root.remove(), 300);
  }

  function showNotice(text) {
    clearTimeout(noticeTimer);
    layer.querySelector('.pet-notice')?.remove();
    const note = el('p', 'pet-notice', text);
    note.setAttribute('role', 'status');
    layer.append(note);
    noticeTimer = setTimeout(() => note.remove(), NOTICE_MS);
  }

  // ------------------------------------------------------------------
  // Popup
  // ------------------------------------------------------------------
  /** Keeps the popup on-screen: flips below if there is no room above, nudges sideways at the edges. */
  function placeBubble() {
    const { bubble } = ui;
    bubble.classList.remove('is-below');
    bubble.style.setProperty('--shift', '0px');
    let rect = bubble.getBoundingClientRect();
    if (rect.top < 8) {
      bubble.classList.add('is-below');
      rect = bubble.getBoundingClientRect();
    }
    const pad = 8;
    let shift = 0;
    if (rect.left < pad) shift = pad - rect.left;
    else if (rect.right > window.innerWidth - pad) shift = window.innerWidth - pad - rect.right;
    bubble.style.setProperty('--shift', `${shift}px`);
  }

  function openPopup() {
    if (!ui || !perched || popupOpen) return;
    popupOpen = true;
    ui.root.classList.add('is-active'); // slow bounce
    ui.flip.setAttribute('aria-expanded', 'true');
    ui.bubble.hidden = false;
    placeBubble();
    refresh(); // pick up any decay since the last poll
  }

  function closePopup() {
    if (!popupOpen) return;
    popupOpen = false;
    if (!ui) return;
    ui.root.classList.remove('is-active');
    ui.flip.setAttribute('aria-expanded', 'false');
    ui.bubble.hidden = true;
  }

  function togglePopup() {
    if (popupOpen) closePopup();
    else openPopup();
  }

  const onPointerDown = (event) => {
    if (popupOpen && ui && !ui.root.contains(event.target)) closePopup();
  };
  const onKeydown = (event) => {
    if (event.key === 'Escape' && popupOpen) closePopup();
  };

  // ------------------------------------------------------------------
  // Care actions
  // ------------------------------------------------------------------
  function floatEmoji(node, char) {
    const emoji = el('span', 'pet-emoji', char);
    emoji.setAttribute('aria-hidden', 'true');
    node.root.append(emoji);
    emoji.addEventListener('animationend', () => emoji.remove(), { once: true });
    setTimeout(() => emoji.remove(), 1500); // fallback if animations are disabled
  }

  async function doAction(action) {
    if (busy || !pet || !ui) return;
    busy = true;
    setActionsDisabled(true);
    const node = ui;

    // React immediately; the server confirms (and sets the real numbers) below.
    if (action === 'pet') {
      retrigger(node.img, 'is-petted');
      floatEmoji(node, PET_EMOJI);
    } else {
      floatEmoji(node, FEED_EMOJIS[Math.floor(Math.random() * FEED_EMOJIS.length)]);
    }

    const seq = ++statSeq;
    try {
      const data = await api.petAction(action);
      if (destroyed || ui !== node) return;
      if (!data.pet) {
        await handleDeparted(data.departed);
        return;
      }
      if (seq === statSeq) {
        pet = { ...pet, ...data.pet };
        renderStats();
      }
    } catch (error) {
      console.error('Pet action failed:', error);
    } finally {
      busy = false;
      if (ui === node) setActionsDisabled(false);
    }
  }

  /** Re-syncs with the server (decay happens there). */
  async function refresh() {
    if (destroyed || !pet) return;
    const seq = ++statSeq;
    try {
      const data = await api.getPet();
      if (destroyed || seq !== statSeq) return;
      if (!data.pet) {
        if (pet) await handleDeparted(data.departed);
        return;
      }
      if (data.pet.bird.id !== pet.bird.id) {
        await adoptPet(data.pet); // changed from another tab/device
        return;
      }
      pet = data.pet;
      renderStats();
    } catch (error) {
      console.error('Pet refresh failed:', error);
    }
  }

  const refreshTimer = setInterval(() => {
    if (!document.hidden) refresh();
  }, REFRESH_MS);

  // ------------------------------------------------------------------
  // Flight
  // ------------------------------------------------------------------
  function setPosition(nx, ny) {
    x = nx;
    y = ny;
    if (ui) ui.root.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  /** Sleeps `ms`; stopRun() wakes it early. */
  function sleep(ms) {
    return new Promise((resolve) => {
      const timer = setTimeout(done, ms);
      function done() {
        clearTimeout(timer);
        if (wake === done) wake = null;
        resolve();
      }
      wake = done;
    });
  }

  /** Stops an in-progress flight where the bird currently is. */
  function cancelFlight() {
    if (!currentAnim || !ui) return;
    const rect = ui.root.getBoundingClientRect(); // read BEFORE cancelling
    currentAnim.cancel();
    currentAnim = null;
    ui.root.classList.remove('is-flying');
    setPosition(rect.left, rect.top);
  }

  function stopRun() {
    runToken += 1;
    wake?.();
    cancelFlight();
  }

  /**
   * Flies along a shallow arc to (tx, ty). Resolves true on arrival, false
   * if the flight was cancelled.
   */
  async function flyTo(tx, ty, { land = false } = {}) {
    const node = ui;
    const dx = tx - x;
    const dy = ty - y;
    const dist = Math.hypot(dx, dy);
    const ms = reducedMotion() ? 0 : clamp(dist / FLIGHT_PX_PER_MS, FLIGHT_MS[0], FLIGHT_MS[1]);

    if (Math.abs(dx) > 24) node.flip.style.transform = dx > 0 ? 'scaleX(-1)' : 'scaleX(1)';

    // Quadratic Bezier with its control point lifted, sampled into keyframes.
    const lift = Math.min(90, 20 + dist * 0.12);
    const cx = (x + tx) / 2;
    const cy = (y + ty) / 2 - lift * 2;
    const frames = [];
    const STEPS = 18;
    for (let i = 0; i <= STEPS; i += 1) {
      const t = i / STEPS;
      const u = 1 - t;
      const px = u * u * x + 2 * u * t * cx + t * t * tx;
      const py = u * u * y + 2 * u * t * cy + t * t * ty;
      frames.push({ transform: `translate3d(${px}px, ${py}px, 0)` });
    }

    node.root.classList.add('is-flying');
    setPosition(tx, ty); // resting transform; the animation overrides it until it ends
    const anim = node.root.animate(frames, { duration: ms, easing: 'ease-in-out' });
    currentAnim = anim;
    try {
      await anim.finished;
    } catch {
      return false; // cancelled
    }
    if (currentAnim !== anim) return false;
    currentAnim = null;
    node.root.classList.remove('is-flying');
    if (land) retrigger(node.body, 'is-landing');
    return true;
  }

  function pickPerch(from) {
    const w = ui.root.offsetWidth;
    const h = ui.root.offsetHeight;
    const mx = Math.min(MARGIN.x, window.innerWidth * 0.18);
    const minX = mx;
    const maxX = Math.max(minX, window.innerWidth - mx - w);
    const minY = MARGIN.top;
    const maxY = Math.max(minY, window.innerHeight - MARGIN.bottom - h);
    let spot = { x: minX, y: minY };
    for (let i = 0; i < 8; i += 1) {
      spot = { x: rand(minX, maxX), y: rand(minY, maxY) };
      if (!from || Math.hypot(spot.x - from.x, spot.y - from.y) >= MIN_HOP_PX) break;
    }
    return spot;
  }

  async function flyIn() {
    const w = ui.root.offsetWidth;
    const fromLeft = Math.random() < 0.5;
    setPosition(fromLeft ? -w - 60 : window.innerWidth + 60, rand(MARGIN.top * 0.4, window.innerHeight * 0.45));
    const spot = pickPerch({ x, y });
    const arrived = await flyTo(spot.x, spot.y, { land: true });
    if (arrived) perched = true;
    return arrived;
  }

  async function flyOff() {
    perched = false;
    const w = ui.root.offsetWidth;
    const toLeft = x + w / 2 < window.innerWidth / 2;
    return flyTo(toLeft ? -w - 60 : window.innerWidth + 60, Math.max(-60, y - rand(40, 160)));
  }

  /** Stays put while the popup is (or was just) open. */
  async function lingerWhileInteracting(alive) {
    while (alive() && popupOpen) {
      while (alive() && popupOpen) await sleep(1000);
      if (alive()) await sleep(rand(...AFTER_POPUP_MS));
    }
  }

  /** The wander loop: fly in -> idle -> fly off -> away -> fly in ... */
  async function run() {
    const token = ++runToken;
    const alive = () => !destroyed && token === runToken;

    await flyIn();
    while (alive()) {
      await sleep(rand(...DWELL_MS));
      if (!alive()) return;
      await lingerWhileInteracting(alive);
      if (!alive()) return;
      await flyOff();
      if (!alive()) return;
      await sleep(rand(...AWAY_MS));
      if (!alive()) return;
      await flyIn();
    }
  }

  // ------------------------------------------------------------------
  // Pet lifecycle
  // ------------------------------------------------------------------
  /** Makes `next` ({ hunger, happiness, max, bird }) the on-screen companion. */
  async function adoptPet(next) {
    stopRun();
    closePopup();
    retire(ui);
    pet = next;
    perched = false;

    const built = buildBird(next.bird);
    ui = built;
    layer.append(built.root);
    renderStats();

    await loadBirdSprite(built.img, next.bird); // need real dimensions before flying
    if (destroyed || ui !== built) return;
    run().catch((error) => console.error('Pet loop failed:', error));
  }

  /** A meter hit 0: fly away for good and go back to "pick a bird". */
  async function handleDeparted(departed) {
    const node = ui;
    pet = null;
    closePopup();
    stopRun();

    if (node) {
      const onScreen = x + node.root.offsetWidth > 0 && x < window.innerWidth && y + node.root.offsetHeight > 0 && y < window.innerHeight;
      if (onScreen) await flyOff();
      retire(node);
    }
    if (!destroyed && !pet) {
      showNotice(`${departed?.name ?? 'Your bird'} has flown away. Choose a new companion from the Pet menu.`);
    }
  }

  async function choose(bird) {
    try {
      const data = await api.choosePet(bird.id);
      if (destroyed) return;
      await adoptPet(data.pet);
    } catch (error) {
      console.error('Choosing pet failed:', error);
      if (!destroyed) showNotice(`Couldn't choose ${bird.name}. Please try again.`);
    }
  }

  function openPicker() {
    if (destroyed) return;
    closePopup();
    picker = openPetPicker({ hostView, currentBirdId: pet?.bird.id ?? null, onPick: choose });
  }

  // Keep a landed bird inside the safe area if the window shrinks.
  const onResize = () => {
    if (!ui || !perched) return;
    const w = ui.root.offsetWidth;
    const h = ui.root.offsetHeight;
    const mx = Math.min(MARGIN.x, window.innerWidth * 0.18);
    setPosition(
      clamp(x, mx, Math.max(mx, window.innerWidth - mx - w)),
      clamp(y, MARGIN.top, Math.max(MARGIN.top, window.innerHeight - MARGIN.bottom - h))
    );
    if (popupOpen) placeBubble();
  };

  // ------------------------------------------------------------------
  // Teardown + startup
  // ------------------------------------------------------------------
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    stopRun();
    clearInterval(refreshTimer);
    clearTimeout(noticeTimer);
    observer.disconnect();
    document.removeEventListener('pointerdown', onPointerDown);
    document.removeEventListener('keydown', onKeydown);
    window.removeEventListener('resize', onResize);
    picker?.close();
    layer.remove();
    if (activeCompanion === instance) activeCompanion = null;
  }

  const observer = new MutationObserver(() => {
    if (hostView.hidden) destroy();
  });
  observer.observe(hostView, { attributes: true, attributeFilter: ['hidden'] });
  document.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('keydown', onKeydown);
  window.addEventListener('resize', onResize);

  const instance = { openPicker, destroy };
  activeCompanion = instance;

  (async () => {
    try {
      const data = await api.getPet();
      if (destroyed) return;
      if (data.pet) await adoptPet(data.pet);
      else if (data.departed) {
        showNotice(`${data.departed.name} has flown away. Choose a new companion from the Pet menu.`);
      }
    } catch (error) {
      console.error('Loading pet failed:', error);
    }
  })();

  return instance;
}