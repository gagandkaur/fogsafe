import { analyzeVehicle } from './analyze.js';
import { toLocal } from './geo.js';
import { classify } from './relevance.js';
import { defaultConfig } from './config.js';

// Runs the exported decision tree (ml/train.py -> risk_model.json). Pure JS, no ML library needed.
export function runTree(model, x) {
  let n = 0;
  while (model.left[n] !== -1)
    n = x[model.features[model.feature[n]]] <= model.threshold[n] ? model.left[n] : model.right[n];
  return model.value[n];
}

const NAMES = ['GREEN', 'YELLOW', 'RED', 'CRITICAL'];

/**
 * Predicts the worst risk level expected within the next ~3 s.
 * otherPrevSpeedKmh = the other vehicle's speed about 1 s ago (lets the model see braking).
 */
export function predictRisk(model, user, other, visibilityM, otherPrevSpeedKmh = other.speedKmh, cfg = defaultConfig) {
  const a = analyzeVehicle(user, other, visibilityM, cfg);
  const local = toLocal(user, other);
  const { along, cross } = classify(user, local, a.distanceM, a.closingSpeedMs, cfg);
  const dh = Math.abs(((((user.heading - other.heading) % 360) + 540) % 360) - 180);
  const x = {
    dist: a.distanceM,
    closing: a.closingSpeedMs,
    ttc: a.ttcS ?? -1,
    other_dv: other.speedKmh - otherPrevSpeedKmh,
    user_kmh: user.speedKmh,
    other_kmh: other.speedKmh,
    cross,
    along,
    visibility: visibilityM,
    acc: Math.max(user.accuracyM ?? 0, other.accuracyM ?? 0),
    heading_diff: dh,
  };
  const level = runTree(model, x);
  return { predicted: NAMES[level], predictedLevel: level, current: a.risk, early: level > NAMES.indexOf(a.risk) };
}
