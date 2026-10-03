// public/js/api.js
// ---------------------------------------------------------------------
// Lightweight fetch wrapper and api client: sends credentials, parses
// JSON, throws Errors with server error/details on non-2xx responses,
// and exposes auth, run, leaderboard, and birds endpoints.
// ---------------------------------------------------------------------
const BASE = '/api';

/**
 * Shared fetch wrapper. Parses JSON bodies, and on a non-2xx response
 * throws an Error carrying the server's `error` message and any
 * validation `details` array, so callers can display something useful
 * without re-parsing responses themselves.
 */
async function request(path, { method = 'GET', body, keepalive = false } = {}) {
  // inside request()
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'include',   // <--- ensure cookies are sent for session auth
    keepalive                 // lets a request finish while the tab is closing
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // No JSON body — expected for 204 responses (logout).
  }

  if (!res.ok) {
    // Auth middleware replies { error }, controllers reply { message }: accept both.
    const error = new Error((data && (data.error || data.message)) || `Request failed (${res.status})`);
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

    getRun: (runId) => request(`/runs/${runId}`),

  completeRun: (runId, payload = {}) =>
    request(`/runs/${runId}`, { method: 'PATCH', body: payload }),

  // Player left a level early. Pass { keepalive: true } from pagehide.
  abandonRun: (runId, { keepalive = false } = {}) =>
    request(`/runs/${runId}`, { method: 'DELETE', keepalive }),

  getLeaderboard: (limit) => request(`/leaderboard${limit ? `?limit=${limit}` : ''}`),

  getBirds: () => request('/birds'),

  // Field Guide catalog: strictly approved birds, same for every player.
  getFieldGuideBirds: () => request('/birds?visibility=approved')
};