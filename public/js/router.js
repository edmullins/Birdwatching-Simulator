// Minimal client-side router. Each "view" is a <section data-view="name">
// in index.html. registerView() associates a name with a mount function;
// showView() hides every view except the requested one and (re)runs its
// mount function, passing along any params (e.g. the logged-in user).
// Views are re-mounted from scratch on every show — fine at this app's
// size, and avoids needing separate mount/update lifecycles for now.

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