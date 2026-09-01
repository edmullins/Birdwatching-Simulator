import { registerView, showView } from './router.js';
import { api } from './api.js';
import { mountLogin } from './views/login.js';
import { mountMainMenu } from './views/mainMenu.js';
import { mountLevel } from './views/level.js';

registerView('login', mountLogin);
registerView('mainMenu', mountMainMenu);
registerView('level', mountLevel);
// On load, check for an existing session before showing anything.
async function init() {
  try {
    const { user } = await api.me();
    showView('mainMenu', { user });
  } catch {
    showView('login');
  }
}

init();