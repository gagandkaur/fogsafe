import { useCallback, useEffect, useRef } from 'react';

// Remembers each vehicle's recent speeds so the ML model can see braking (speed ~1 s ago vs now).
export function useSpeedHistory(vehicles) {
  const hist = useRef({});
  useEffect(() => {
    const now = Date.now();
    for (const v of vehicles) {
      const h = (hist.current[v.vehicleId] ||= []);
      if (!h.length || now - h[h.length - 1].t >= 250) h.push({ t: now, kmh: v.speedKmh });
      while (h.length && now - h[0].t > 3000) h.shift();
    }
  }, [vehicles]);
  return useCallback((id, currentKmh) => {
    const h = hist.current[id];
    if (!h) return currentKmh;
    const now = Date.now();
    const old = h.filter((p) => now - p.t >= 600).pop(); // newest sample that is at least 0.6 s old
    return old ? old.kmh : currentKmh;
  }, []);
}
