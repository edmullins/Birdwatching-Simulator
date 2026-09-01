const BASE = '/api';

/**
 * Shared fetch wrapper. Parses JSON bodies, and on a non-2xx response
 * throws an Error carrying the server's `error` message and any
 * validation `details` array, so callers can display something useful
 * without re-parsing responses themselves.
 */
async function request(path, { method = 'GET', body } = {}) {
  // inside request()
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'include'   // <--- ensure cookies are sent for session auth
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // No JSON body — expected for 204 responses (logout).
  }

  if (!res.ok) {
    const error = new Error((data && data.error) || `Request failed (${res.status})`);
    error.status = res.status;
    error.details = data && data.details;
    throw error;
  }

  return data;
}

export const api = {
  register: (username, password, confirmPassword) =>
    request('/auth/register', { method: 'POST', body: { username, password, confirmPassword } }),

  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: { username, password } }),

  logout: () => request('/auth/logout', { method: 'POST' }),

  me: () => request('/auth/me'),

  createRun: (levelNumber) =>
    request('/runs', { method: 'POST', body: { levelNumber } }),

};