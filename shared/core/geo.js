const R = 6371000;
const rad = (d) => (d * Math.PI) / 180;
export const haversineM = (lat1, lng1, lat2, lng2) => {
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};
// Metres east/north of origin (equirectangular; accurate at ≤ a few km).
export const toLocal = (o, p) => ({
  east: rad(p.lng - o.lng) * R * Math.cos(rad(o.lat)),
  north: rad(p.lat - o.lat) * R,
});
export const angleDiffDeg = (a, b) => {
  const d = Math.abs((((a - b) % 360) + 360) % 360);
  return d > 180 ? 360 - d : d;
};
export const validCoord = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
