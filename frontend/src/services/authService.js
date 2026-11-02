// Talks to /api/auth/*. Empty BASE in dev (Vite proxy); set VITE_BACKEND_URL in production.
const BASE = import.meta.env.VITE_BACKEND_URL || '';
const KEY = 'fogsafe.session';

export const loadSession = () => {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    return s?.token && s?.user ? s : null;
  } catch {
    return null;
  }
};
export const saveSession = (s) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage blocked: user simply has to log in again next visit */
  }
};
export const clearSession = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
};

// Returns { ok, status, data }. status 0 means the server could not be reached.
// Free hosting sleeps when idle, so network failures are retried a few times.
async function request(path, { method = 'POST', body, token, onWaking, retries = 4 } = {}) {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(`${BASE}${path}`, {
        method,
        headers: {
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    } catch {
      if (i >= retries) return { ok: false, status: 0, data: { error: 'Server unreachable. Is the backend running?' } };
      if (i === 0) onWaking?.();
      await new Promise((r) => setTimeout(r, 4000));
    }
  }
}

export const registerUser = (name, email, password, onWaking) =>
  request('/api/auth/register', { body: { name, email, password }, onWaking });
export const loginUser = (email, password, onWaking) =>
  request('/api/auth/login', { body: { email, password }, onWaking });
export const fetchMe = (token) => request('/api/auth/me', { method: 'GET', token, retries: 0 });
export const logoutUser = (token) => request('/api/auth/logout', { token, retries: 0 });
