import { registerView, showView } from './router.js';
import { api } from './api.js';
import { mountLogin } from './views/login.js';
import { mountMainMenu } from './views/mainMenu.js';

registerView('login', mountLogin);
registerView('mainMenu', mountMainMenu);

// On load, check for an existing session before showing anything.
// This is what makes root `/` correctly gate access on a page refresh,
// not just on first visit — a stale/expired session falls through to
// the 401 branch and shows login, same as a first-time visitor.
async function init() {
  try {
    const { user } = await api.me();
    showView('mainMenu', { user });
  } catch {
    showView('login');
  }
}

init();