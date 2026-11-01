import { useRef, useState } from 'react';
import { connectSocket } from '../services/socketClient.js';
import { watchGps, keepAwake } from '../services/geolocationService.js';
import { step, START } from '../simulation/simEngine.js';

// fake = null (real phone GPS) | 'A' | 'B' (test vehicles with simulated GPS, for one-laptop demos)
export function useRealtime() {
  const [status, setStatus] = useState('offline');
  const [joined, setJoined] = useState(false);
  const [vehicleId, setVehicleId] = useState(null);
  const [user, setUser] = useState(null);
  const [neighbors, setNeighbors] = useState({ list: [], at: 0 });
  const [message, setMessage] = useState(null);
  const r = useRef({}),
    userRef = useRef(null);
  userRef.current = user;
  const attempt = useRef(0); // bumped on every join/leave so a stale async join can detect it was cancelled

  const leave = () => {
    const x = r.current;
    clearInterval(x.sim);
    clearInterval(x.send);
    x.stopGps?.();
    x.lock?.release?.();
    x.c?.close();
    attempt.current++;
    r.current = {};
    setJoined(false);
    setUser(null);
    setNeighbors({ list: [], at: 0 });
    setStatus('offline');
    setVehicleId(null);
  };
  const join = async (fake = null) => {
    if (joined) return;
    setMessage(null);
    setJoined(true);
    const mine = ++attempt.current;
    const c = await connectSocket({
      onStatus: setStatus,
      onJoined: (d) => setVehicleId(d.vehicleId),
      onNearby: (d) => setNeighbors({ list: d.vehicles, at: Date.now() }),
      onError: setMessage,
    });
    if (!c) {
      setJoined(false);
      return;
    }
    if (mine !== attempt.current) {
      c.close();
      return;
    } // user pressed Leave while connecting
    r.current.c = c;
    if (fake) {
      setUser(fake === 'B' ? { ...START, lat: START.lat + 180 / 111195, speedKmh: 42 } : START);
      r.current.sim = setInterval(() => setUser((u) => step(u, 0.5)), 500);
    } else {
      r.current.stopGps = watchGps(
        (fix) => {
          setMessage(null);
          setUser((u) => ({ ...fix, heading: fix.heading ?? u?.heading ?? 0 }));
        },
        (e) => setMessage(e.message),
      );
      const lock = await keepAwake();
      if (mine !== attempt.current) {
        lock?.release?.();
        return;
      }
      r.current.lock = lock;
    }
    r.current.send = setInterval(() => userRef.current && c.send(userRef.current), 1000);
  };
  return { status, joined, vehicleId, user, neighbors, message, join, leave };
}
