import { validCoord } from '../../../shared/core/index.js';
// Future: v2v.js, v2x.js, sensor.js export the same fromX(raw) -> VehicleState | null.
export function fromGps(raw) {
  if (!raw || !validCoord(raw.lat, raw.lng)) return null;
  return {
    lat: raw.lat,
    lng: raw.lng,
    speedKmh: Math.max(0, Number(raw.speedKmh) || 0),
    heading: Number.isFinite(raw.heading) ? ((raw.heading % 360) + 360) % 360 : 0,
    accuracyM: Number(raw.accuracyM) || null,
    timestamp: Number(raw.timestamp) || Date.now(),
    source: 'gps',
  };
}
