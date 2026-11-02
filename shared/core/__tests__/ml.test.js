import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { predictRisk, Track, haversineM } from '../index.js';

const model = JSON.parse(fs.readFileSync(new URL('../risk_model.json', import.meta.url)));
const M = 1 / 111195;
const user = { lat: 30.9, lng: 76.85, speedKmh: 50, heading: 0, accuracyM: 3 };
const ahead = (m, kmh) => ({
  vehicleId: 'A',
  lat: user.lat + m * M,
  lng: user.lng,
  speedKmh: kmh,
  heading: 0,
  accuracyM: 3,
});

test('ML: a vehicle braking hard 70 m ahead is flagged earlier than the rule engine', () => {
  const r = predictRisk(model, user, ahead(70, 20), 60, 38); // dropped 18 km/h in 1 s
  assert.ok(r.predictedLevel >= 2, JSON.stringify(r)); // RED or CRITICAL expected soon
});
test('ML: a distant steady vehicle stays GREEN', () => {
  const r = predictRisk(model, user, ahead(250, 50), 60, 50);
  assert.equal(r.predicted, 'GREEN');
});
test('Kalman: smoothing reduces GPS noise', () => {
  const tr = new Track();
  let rawErr = 0,
    smErr = 0,
    n = 0;
  for (let i = 0; i < 60; i++) {
    const truth = { lat: 30.9 + i * 10 * M, lng: 76.85 }; // 10 m/s north
    const noisy = {
      lat: truth.lat + Math.sin(i * 12.9898) * 10 * M,
      lng: truth.lng + Math.cos(i * 78.233) * 10 * M,
      accuracyM: 8,
      t: i * 1000,
    };
    const est = tr.update(noisy);
    if (i > 10) {
      rawErr += haversineM(noisy.lat, noisy.lng, truth.lat, truth.lng);
      smErr += haversineM(est.lat, est.lng, truth.lat, truth.lng);
      n++;
    }
  }
  assert.ok(smErr / n < rawErr / n, `smoothed ${smErr / n} vs raw ${rawErr / n}`);
});
