// public/js/router.js
// ---------------------------------------------------------------------
// Minimal client-side router: registerView, getContainer, showView.
// Hides all [data-view] sections and re-mounts the requested view.
// ---------------------------------------------------------------------

const mounts = new Map();

export function registerView(name, mountFn) {
  mounts.set(name, mountFn);
}

export function getContainer(name) {
  return document.querySelector(`[data-view="${name}"]`);
}

export function showView(name, params) {
  document.querySelectorAll('[data-view]').forEach((el) => {
    el.hidden = el.dataset.view !== name;
  });

  const mount = mounts.get(name);
  const container = getContainer(name);

  if (!mount || !container) {
    console.error(`No registered view/container for "${name}"`);
    return;
  }

  mount(container, params);
}