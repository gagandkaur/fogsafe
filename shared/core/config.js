// PROTOTYPE/DEMO thresholds. Not official road-safety standards.
export const defaultConfig = {
  nearbyRadiusM: 500,
  laneHalfWidthM: 2.0,
  corridorFactor: 1.5,       // |cross| < laneHalfWidth * factor => same corridor
  minClosingSpeedMs: 0.3,    // below this, TTC is N/A
  crossingAngleDeg: [60, 120],
  ttc: { criticalS: 3, redS: 6, yellowS: 12 },
  distance: { criticalM: 15, redM: 30 },
  yellowGapFactor: 1.5,      // gap < factor * visibility while closing
  staleAfterMs: 5000,
};
