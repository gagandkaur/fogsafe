// Prototype approximation from geometry + heading. NOT lane detection.
export function classify(user, local, dist, closing, cfg) {
  const h = (user.heading * Math.PI) / 180;
  const along = local.east * Math.sin(h) + local.north * Math.cos(h);
  const cross = local.east * Math.cos(h) - local.north * Math.sin(h); // right = +
  const inCorridor = Math.abs(cross) < cfg.laneHalfWidthM * cfg.corridorFactor;
  const direction = inCorridor ? (along >= 0 ? 'ahead' : 'behind') : cross > 0 ? 'right' : 'left';
  return { along, cross, direction };
}
export function relevanceOf(direction, headingDiff, closing, cfg) {
  const [lo, hi] = cfg.crossingAngleDeg;
  if (direction === 'ahead') return 'HIGH';
  if (headingDiff >= lo && headingDiff <= hi && closing > cfg.minClosingSpeedMs) return 'POTENTIAL_RISK';
  return 'LOW';
}
