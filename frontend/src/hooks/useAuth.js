import { useEffect, useState } from 'react';
import {
  loadSession,
  saveSession,
  clearSession,
  registerUser,
  loginUser,
  fetchMe,
  logoutUser,
} from '../services/authService.js';

export function useAuth() {
  const [session, setSession] = useState(loadSession); // { token, user } | null
  const [checking, setChecking] = useState(() => !!loadSession());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);

  // A stored token may have expired or the server restarted: confirm it before trusting it.
  useEffect(() => {
    const s = loadSession();
    if (!s) return;
    let live = true;
    fetchMe(s.token).then((r) => {
      if (!live) return;
      if (r.status === 401) {
        clearSession();
        setSession(null);
      } else if (r.ok) {
        const next = { token: s.token, user: r.data.user };
        saveSession(next);
        setSession(next);
      } // server unreachable: keep the session, the socket layer will report the connection problem
      setChecking(false);
    });
    return () => {
      live = false;
    };
  }, []);

  const finish = (r) => {
    setBusy(false);
    setNote(null);
    if (!r.ok) {
      setError(r.data?.error || 'Something went wrong. Try again.');
      return false;
    }
    const s = { token: r.data.token, user: r.data.user };
    saveSession(s);
    setSession(s);
    return true;
  };
  const run = async (call) => {
    setBusy(true);
    setError(null);
    return finish(await call(() => setNote('Waking up the server, this can take up to 30 s…')));
  };

  const register = (name, email, password) => run((w) => registerUser(name, email, password, w));
  const login = (email, password) => run((w) => loginUser(email, password, w));
  const logout = () => {
    if (session) logoutUser(session.token);
    clearSession();
    setSession(null);
    setError(null);
  };
  // Called when the server rejects our token (expired, or server restarted).
  const expire = () => {
    clearSession();
    setSession(null);
    setError('Your session expired. Please log in again.');
  };

  return {
    session,
    user: session?.user ?? null,
    token: session?.token ?? null,
    checking,
    busy,
    error,
    note,
    register,
    login,
    logout,
    expire,
  };
}
