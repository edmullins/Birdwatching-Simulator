// public/js/components/levelSelect.js
import { showView } from '../router.js';
import { api } from '../api.js';

export function mountLevelSelect(container, user) {
  const maxLevelReached = user?.stats?.maxLevelReached ?? 0;
  const maxLevelCount = 50;

  function getStatus(n) {
    if (n <= maxLevelReached) return 'completed';
    if (n === maxLevelReached + 1) return 'available';
    return 'locked';
  }

  const id = 'level-carousel-' + Date.now();
  const cards = Array.from({ length: maxLevelCount }, (_, i) => {
    const n = i + 1;
    const st = getStatus(n);
    const badge = st === 'completed' ? '✓' : st === 'locked' ? '🔒' : '';
    return `
      <div class="level-card level-card--${st}" data-level="${st === 'locked' ? '' : n}">
        <div class="level-badge">${badge}</div>
        <div class="level-number">${n}</div>
        <div class="level-status">${st}</div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="level-carousel-wrapper">
      <button class="carousel-btn left" aria-label="scroll left">◀</button>
      <div id="${id}" class="level-carousel">${cards}</div>
      <button class="carousel-btn right" aria-label="scroll right">▶</button>
    </div>
    <div class="level-message" aria-live="polite"></div>
  `;

  const carousel = container.querySelector(`#${id}`);
  const left = container.querySelector('.carousel-btn.left');
  const right = container.querySelector('.carousel-btn.right');
  const msg = container.querySelector('.level-message');

  function toast(text, ok = true) {
    msg.textContent = text;
    msg.className = 'level-message ' + (ok ? 'success' : 'error');
    setTimeout(() => { msg.textContent = ''; msg.className = 'level-message'; }, 3000);
  }

  const step = Math.max(300, Math.floor(carousel.clientWidth * 0.6));
  left.addEventListener('click', () => carousel.scrollBy({ left: -step, behavior: 'smooth' }));
  right.addEventListener('click', () => carousel.scrollBy({ left: step, behavior: 'smooth' }));

  // delegate clicks
  carousel.addEventListener('click', async (e) => {
    const card = e.target.closest('.level-card');
    if (!card) return;
    const levelAttr = card.getAttribute('data-level');
    if (!levelAttr) { toast('Level locked', false); return; }
    const levelNumber = parseInt(levelAttr, 10);
    card.classList.add('pending');
    try {
      const res = await api.createRun(levelNumber);
      const run = res?.run;
      const levelConfig = res?.levelConfig;

      toast(`Started level ${levelNumber} — good luck!`, true);

      if (run) {
        showView('level', { run, levelNumber, levelConfig, user });
      }
    } catch (err) {
      console.error(err);
      toast(err.message || 'Failed to start level', false);
    } finally {
      card.classList.remove('pending');
    }
  });

  const highestAvailableLevel = Math.min(maxLevelReached + 1, maxLevelCount);
  const availableCard = carousel.querySelector(
    `.level-card--available[data-level="${highestAvailableLevel}"]`
  );

  if (availableCard) {
    requestAnimationFrame(() => {
      const targetScroll =
        availableCard.offsetLeft -
        (carousel.clientWidth - availableCard.offsetWidth) / 2;

      carousel.scrollLeft = Math.max(
        0,
        Math.min(targetScroll, carousel.scrollWidth - carousel.clientWidth)
      );
    });
  }
}