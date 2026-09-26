// public/js/utils/dom.js
// ---------------------------------------------------------------------
// Tiny DOM builder. Field Guide and round-summary content comes from the
// database (bird names, descriptions, image URLs), so it's built with
// createElement + textContent instead of innerHTML template strings —
// nothing in a bird document can inject markup.
// ---------------------------------------------------------------------

/**
 * @param {string} tag
 * @param {string|null} [className]
 * @param {string|null} [text] - set via textContent (never parsed as HTML).
 * @returns {HTMLElement}
 */
export function el(tag, className = null, text = null) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}
