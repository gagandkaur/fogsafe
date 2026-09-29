const CODES = ['', 'DENIED', 'UNAVAILABLE', 'TIMEOUT'];
const MSG = {
  DENIED: 'Location permission denied. FogSafe needs your location to share your position with nearby vehicles. Allow it in browser settings.',
  UNAVAILABLE: 'Location unavailable. Turn on GPS / location services.',
  TIMEOUT: 'GPS timed out. Move to open sky and retry.',
  UNSUPPORTED: 'This browser has no geolocation support.',
};
export function watchGps(onFix, onError) {
  if (!('geolocation' in navigator)) { onError({ code: 'UNSUPPORTED', message: MSG.UNSUPPORTED }); return () => {}; }
  const id = navigator.geolocation.watchPosition(
    (p) => { const c = p.coords;
      onFix({ lat: c.latitude, lng: c.longitude, speedKmh: (c.speed ?? 0) * 3.6,
        heading: Number.isFinite(c.heading) ? c.heading : null, accuracyM: c.accuracy, timestamp: p.timestamp }); },
    (e) => { const code = CODES[e.code] || 'UNAVAILABLE'; onError({ code, message: MSG[code] }); },
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 });
  return () => navigator.geolocation.clearWatch(id);
}
// Browsers pause GPS when the screen locks; keep it on while driving.
export async function keepAwake() {
  try { return await navigator.wakeLock?.request('screen'); } catch { return null; }
}
