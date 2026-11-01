export function riskLevel({ dist, ttc, closing, relevance, visibilityM }, cfg) {
  const isClosing = closing > cfg.minClosingSpeedMs;
  const relevant = relevance !== 'LOW';
  if (isClosing && relevant && ((ttc != null && ttc < cfg.ttc.criticalS) || dist < cfg.distance.criticalM))
    return 'CRITICAL';
  // Distance alone only escalates when the vehicles are actually closing (avoids false RED in normal same-speed traffic).
  if (relevant && ((ttc != null && ttc < cfg.ttc.redS) || (isClosing && dist < cfg.distance.redM))) return 'RED';
  if (relevant && isClosing && ((ttc != null && ttc < cfg.ttc.yellowS) || dist < cfg.yellowGapFactor * visibilityM))
    return 'YELLOW';
  return 'GREEN';
}
