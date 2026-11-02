// PROTOTYPE/DEMO thresholds. Not official road-safety standards.
export const defaultConfig = {
  nearbyRadiusM: 500,
  laneHalfWidthM: 2.0,
  corridorFactor: 1.5, // |cross| < laneHalfWidth * factor => same corridor
  minClosingSpeedMs: 0.3, // below this, TTC is N/A
  crossingAngleDeg: [60, 120],
  ttc: { criticalS: 3, redS: 6, yellowS: 12 },
  distance: { criticalM: 15, redM: 30 },
  yellowGapFactor: 1.5, // gap < factor * visibility while closing
  staleAfterMs: 5000, // frontend hides vehicles older than this
  serverStaleMs: 10000, // backend drops vehicles with no update for this long
  maxSpeedKmh: 400, // reject implausible speeds
  maxJumpMps: 120, // reject position jumps faster than this (spoofing / bad fix)
};
