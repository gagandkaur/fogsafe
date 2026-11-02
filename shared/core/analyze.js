import { defaultConfig } from './config.js';
import { haversineM, toLocal, angleDiffDeg } from './geo.js';
import { closingSpeedMs, ttcSeconds } from './motion.js';
import { classify, relevanceOf } from './relevance.js';
import { visualStatus } from './fog.js';
import { riskLevel } from './risk.js';

export function analyzeVehicle(user, other, visibilityM, cfg = defaultConfig) {
  const dist = haversineM(user.lat, user.lng, other.lat, other.lng);
  const local = toLocal(user, other);
  const closing = closingSpeedMs(user, other, local, dist);
  const { direction } = classify(user, local, dist, closing, cfg);
  const relevance = relevanceOf(direction, angleDiffDeg(user.heading, other.heading), closing, cfg);
  const ttc = relevance === 'LOW' ? null : ttcSeconds(dist, closing, cfg.minClosingSpeedMs);
  const risk = riskLevel({ dist, ttc, closing, relevance, visibilityM }, cfg);
  const acc = Math.max(user.accuracyM ?? 0, other.accuracyM ?? 0);
  return {
    vehicleId: other.vehicleId,
    distanceM: Math.round(dist),
    direction,
    relevance,
    closingSpeedMs: +closing.toFixed(2),
    approaching: closing > cfg.minClosingSpeedMs,
    ttcS: ttc == null ? null : +ttc.toFixed(1),
    visual: visualStatus(dist, visibilityM),
    risk,
    lowConfidence: acc > dist / 3,
  };
}
