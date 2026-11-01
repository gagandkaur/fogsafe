export const kmhToMs = (k) => k / 3.6;
// heading: 0 = north, clockwise
export const velocity = (speedKmh, heading) => {
  const v = kmhToMs(speedKmh), h = (heading * Math.PI) / 180;
  return { e: v * Math.sin(h), n: v * Math.cos(h) };
};
// Positive = vehicles approaching each other along the line of sight.
export const closingSpeedMs = (user, other, local, dist) => {
  if (dist === 0) return 0;
  const vu = velocity(user.speedKmh, user.heading), vo = velocity(other.speedKmh, other.heading);
  const losE = local.east / dist, losN = local.north / dist;
  return -((vo.e - vu.e) * losE + (vo.n - vu.n) * losN);
};
export const ttcSeconds = (dist, closing, minClosing) =>
  closing > minClosing ? dist / closing : null;
