const M_PER_DEG = 111195;
const rad = (d) => (d * Math.PI) / 180;
export const START = { lat: 30.901, lng: 75.8573, speedKmh: 50, heading: 0, accuracyM: 3 };

export function step(v, dt) {
  const d = (v.speedKmh / 3.6) * dt,
    h = rad(v.heading);
  return {
    ...v,
    lat: v.lat + (d * Math.cos(h)) / M_PER_DEG,
    lng: v.lng + (d * Math.sin(h)) / (M_PER_DEG * Math.cos(rad(v.lat))),
    timestamp: Date.now(),
  };
}
// `along` m ahead (negative = behind), `cross` m to the right of the user.
export function spawnRelative(user, vehicleId, along, cross, speedKmh, heading = user.heading) {
  const h = rad(user.heading);
  const e = along * Math.sin(h) + cross * Math.cos(h),
    n = along * Math.cos(h) - cross * Math.sin(h);
  return {
    vehicleId,
    source: 'sim',
    accuracyM: 3,
    speedKmh,
    heading,
    timestamp: Date.now(),
    lat: user.lat + n / M_PER_DEG,
    lng: user.lng + e / (M_PER_DEG * Math.cos(rad(user.lat))),
  };
}
