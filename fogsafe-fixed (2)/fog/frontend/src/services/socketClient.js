import { io } from 'socket.io-client';
// Empty in dev (Vite proxies /api and /socket.io to localhost:4000).
// Set VITE_BACKEND_URL in production (e.g. Vercel env var) to the deployed Render URL.
const BASE = import.meta.env.VITE_BACKEND_URL || '';

export async function connectSocket({ onStatus, onJoined, onNearby, onError }) {
  let token;
  // Free hosting sleeps when idle and can take ~30 s to wake, so retry a few times before giving up.
  for (let i = 0; i < 6 && !token; i++) {
    try {
      const res = await fetch(`${BASE}/api/auth/register`, { method: 'POST' });
      if (!res.ok) throw new Error('bad status ' + res.status);
      token = (await res.json()).token;
    } catch {
      if (i === 0) onError('Waking up the server, this can take up to 30 s…');
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
  if (!token) {
    onStatus('offline');
    onError('Backend unavailable. Is the server running?');
    return null;
  }
  const s = io(BASE, { auth: { token }, reconnection: true });
  s.on('connect', () => {
    onStatus('connected');
    s.emit('vehicle:join');
  }); // re-join after reconnect
  s.on('disconnect', () => onStatus('reconnecting'));
  s.io.on('reconnect_attempt', () => onStatus('reconnecting'));
  s.io.on('reconnect_failed', () => onStatus('offline'));
  s.on('connect_error', (e) => {
    onStatus('reconnecting');
    onError('Socket error: ' + e.message);
  });
  s.on('vehicle:joined', onJoined);
  s.on('nearby:update', onNearby);
  s.on('error:invalid', (e) => onError(e.message));
  return {
    send: (v) => s.emit('vehicle:update', v),
    close: () => {
      s.emit('vehicle:leave');
      s.close();
    },
  };
}
