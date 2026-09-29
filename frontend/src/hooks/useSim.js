import { useEffect, useRef, useState } from 'react';
import { step, spawnRelative, START } from '../simulation/simEngine.js';
export function useSim(enabled) {
  const [user, setUser] = useState(START);
  const [vehicles, setVehicles] = useState([]);
  const [running, setRunning] = useState(true);
  const n = useRef(1), uref = useRef(user); uref.current = user;
  useEffect(() => {
    if (!enabled || !running) return;
    const t = setInterval(() => { setUser((u) => step(u, 0.5)); setVehicles((vs) => vs.map((v) => step(v, 0.5))); }, 500);
    return () => clearInterval(t);
  }, [enabled, running]);
  const addVehicle = (along, speed, cross = 0, heading) => {
    const id = 'V' + String(n.current++).padStart(3, '0');
    setVehicles((vs) => [...vs, spawnRelative(uref.current, id, along, cross, speed, heading)]);
  };
  return { user, vehicles, running, setRunning, addVehicle,
    remove: (id) => setVehicles((vs) => vs.filter((v) => v.vehicleId !== id)),
    clear: () => setVehicles([]),
    brake: () => setVehicles((vs) => vs.map((v) => ({ ...v, speedKmh: 10 }))),
    reset: () => { setUser(START); setVehicles([]); n.current = 1; setRunning(true); } };
}
