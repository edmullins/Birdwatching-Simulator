// public/js/utils/sprite.js
// Loads a bird image into an <img>, preferring the small thumbnail
// (bird.thumbUrl) and falling back to the full-size sprite (bird.imageUrl)
// if the thumbnail 404s - e.g. `npm run thumbs:birds` hasn't been run yet.
// Resolves once an image has loaded (or both sources failed), so callers
// can safely measure the element afterwards.

/**
 * @param {HTMLImageElement} img
 * @param {{thumbUrl?: string, imageUrl?: string}} bird
 * @returns {Promise<void>}
 */
export function loadBirdSprite(img, bird) {
  const sources = [bird.thumbUrl, bird.imageUrl].filter(Boolean);
  return new Promise((resolve) => {
    const tryNext = () => {
      const src = sources.shift();
      if (!src) return resolve();
      img.src = src;
    };
    img.addEventListener('load', () => resolve());
    img.addEventListener('error', tryNext);
    tryNext();
  });
}