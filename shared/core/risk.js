export function riskLevel({ dist, ttc, closing, relevance, visibilityM }, cfg) {
  const isClosing = closing > cfg.minClosingSpeedMs;
  const relevant = relevance !== 'LOW';
  if (isClosing && relevant && (ttc < cfg.ttc.criticalS || dist < cfg.distance.criticalM)) return 'CRITICAL';
  if (relevant && ((ttc != null && ttc < cfg.ttc.redS) || dist < cfg.distance.redM)) return 'RED';
  if (relevant && isClosing && ((ttc != null && ttc < cfg.ttc.yellowS) || dist < cfg.yellowGapFactor * visibilityM)) return 'YELLOW';
  return 'GREEN';
}
