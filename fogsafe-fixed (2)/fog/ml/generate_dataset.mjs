// Builds a training set for an EARLY-WARNING model: given the situation now (plus how fast the
// other vehicle has been accelerating/braking), predict the worst rule-engine risk in the next 3 s.
// The rule engine in shared/core is used as the labeller, so no real-world data is needed to start.
import { analyzeVehicle } from '../shared/core/index.js';
import fs from 'node:fs';

const M = 1 / 111195;
const rnd = (a, b) => a + Math.random() * (b - a);
const RISK = { GREEN: 0, YELLOW: 1, RED: 2, CRITICAL: 3 };
const kmh = (ms) => ms * 3.6;

const move = (v, dt) => {
  const h = (v.heading * Math.PI) / 180,
    d = (v.speedKmh / 3.6) * dt;
  return {
    ...v,
    lat: v.lat + d * Math.cos(h) * M,
    lng: v.lng + (d * Math.sin(h) * M) / Math.cos((v.lat * Math.PI) / 180),
  };
};
const accel = (v, a, dt) => ({ ...v, speedKmh: Math.max(0, v.speedKmh + kmh(a * dt)) });

const cols = [
  'dist',
  'along',
  'cross',
  'user_kmh',
  'other_kmh',
  'other_dv',
  'heading_diff',
  'visibility',
  'closing',
  'ttc',
  'acc',
  'now_risk',
  'future_risk',
];
const rows = [cols.join(',')];

for (let i = 0; i < 60000; i++) {
  let u = { lat: 30.9, lng: 76.85, speedKmh: rnd(0, 100), heading: rnd(0, 360), accuracyM: rnd(2, 20) };
  const along = rnd(-100, 300),
    cross = Math.random() < 0.7 ? rnd(-3, 3) : rnd(-50, 50);
  const h = (u.heading * Math.PI) / 180;
  let o = {
    vehicleId: 'X',
    speedKmh: rnd(0, 100),
    accuracyM: rnd(2, 20),
    lat: u.lat + (along * Math.cos(h) - cross * Math.sin(h)) * M,
    lng: u.lng + ((along * Math.sin(h) + cross * Math.cos(h)) * M) / Math.cos((u.lat * Math.PI) / 180),
    heading: Math.random() < 0.7 ? (u.heading + rnd(-10, 10) + 360) % 360 : rnd(0, 360),
  };
  // the other vehicle's behaviour: steady, braking hard, or speeding up
  const mode = Math.random();
  const a = mode < 0.5 ? rnd(-0.3, 0.3) : mode < 0.8 ? rnd(-8, -2.5) : rnd(1, 3);
  const vis = [20, 40, 60, 100, 200][Math.floor(rnd(0, 5))];

  // the last second of history (this is how the model "sees" braking)
  const prevSpeed = accel(o, -a, 1).speedKmh;
  const other_dv = o.speedKmh - prevSpeed;

  const now = analyzeVehicle(u, o, vis);
  let worst = 0;
  for (let t = 0; t < 3; t += 0.5) {
    u = move(u, 0.5);
    o = move(accel(o, a, 0.5), 0.5);
    worst = Math.max(worst, RISK[analyzeVehicle(u, o, vis).risk]);
  }
  // features use the state at t=0, so recompute heading diff from original
  const dh = Math.abs(((((u.heading - o.heading) % 360) + 540) % 360) - 180);
  rows.push(
    [
      now.distanceM,
      along.toFixed(1),
      cross.toFixed(1),
      u.speedKmh.toFixed(1),
      (o.speedKmh - kmh(a * 3)).toFixed(1),
      other_dv.toFixed(2),
      dh.toFixed(1),
      vis,
      now.closingSpeedMs,
      now.ttcS ?? -1,
      Math.max(u.accuracyM, o.accuracyM).toFixed(1),
      RISK[now.risk],
      worst,
    ].join(','),
  );
}
fs.writeFileSync(new URL('./dataset.csv', import.meta.url), rows.join('\n'));
console.log('rows', rows.length - 1);
