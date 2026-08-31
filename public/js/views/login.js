import { showView } from '../router.js';
import { api } from '../api.js';

let mode = 'login'; // 'login' | 'register'

export function mountLogin(container) {
  render(container);
}

function render(container) {
  container.innerHTML = `
    <div class="auth-page">
      <p class="auth-wordmark">Birdwatching&nbsp;Simulator</p>
      <div class="auth-card">
        <span class="specimen-tag">${mode === 'login' ? 'Unlogged species' : 'New entry'}</span>

        <div class="auth-tabs" role="tablist" aria-label="Choose sign-in method">
          <button
            type="button"
            class="auth-tab ${mode === 'login' ? 'is-active' : ''}"
            data-mode="login"
            role="tab"
            aria-selected="${mode === 'login'}"
          >Log in</button>
          <button
            type="button"
            class="auth-tab ${mode === 'register' ? 'is-active' : ''}"
            data-mode="register"
            role="tab"
            aria-selected="${mode === 'register'}"
          >Register</button>
        </div>

        <form class="auth-form" novalidate>
          <label class="field">
            <span class="field-label">Username</span>
            <input
              type="text"
              name="username"
              autocomplete="username"
              required
              minlength="3"
              maxlength="20"
            />
          </label>

          <label class="field">
            <span class="field-label">Password</span>
            <input
              type="password"
              name="password"
              autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}"
              required
              minlength="8"
            />
          </label>

          ${
            mode === 'register'
              ? `<label class="field"><span class="field-label">Confirm Password</span>
                  <input
                    type="password"
                    name="confirmPassword"
                    autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}"
                    required
                    minlength="8"
                  />
                </label>`
              : ''
          }

          <p class="auth-error" role="alert" aria-live="polite" hidden></p>

          <button type="submit" class="btn btn-primary">
            ${mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  `;

  wireEvents(container);
}

function wireEvents(container) {
  container.querySelectorAll('.auth-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      mode = tab.dataset.mode;
      render(container);
    });
  });

  const form = container.querySelector('.auth-form');
  const errorEl = container.querySelector('.auth-error');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideError(errorEl);

    const formData = new FormData(form);
    const username = (formData.get('username') || '').toString().trim();
    const password = (formData.get('password') || '').toString();
    const confirmPassword = (formData.get('confirmPassword') || '').toString();

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      const { user } =
        mode === 'login'
          ? await api.login(username, password)
          : await api.register(username, password, confirmPassword);
      showView('mainMenu', { user });
    } catch (err) {
      showError(errorEl, formatError(err));
    } finally {
      submitBtn.disabled = false;
    }
  });
}

function formatError(err) {
  if (Array.isArray(err.details) && err.details.length > 0) {
    return err.details.join(' ');
  }
  return err.message || 'Something went wrong. Try again.';
}

function showError(el, message) {
  el.textContent = message;
  el.hidden = false;
}

function hideError(el) {
  el.textContent = '';
  el.hidden = true;
}