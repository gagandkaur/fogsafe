import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeVehicle, haversineM } from '../index.js';

const M = 1 / 111195; // degrees latitude per metre
const user = { lat: 30.9, lng: 76.85, speedKmh: 50, heading: 0, accuracyM: 3 };
const ahead = (m, kmh, heading = 0, dLng = 0) =>
  ({ vehicleId: 'A', lat: user.lat + m * M, lng: user.lng + dLng, speedKmh: kmh, heading, accuracyM: 3 });

test('haversine ~ 180 m', () => {
  assert.ok(Math.abs(haversineM(user.lat, user.lng, user.lat + 180 * M, user.lng) - 180) < 1);
});
test('demo: 180 m ahead, fog 60 m -> beyond visual range, GREEN, TTC ~81 s', () => {
  const r = analyzeVehicle(user, ahead(180, 42), 60);
  assert.equal(r.direction, 'ahead');
  assert.equal(r.visual, 'BEYOND_VISUAL_RANGE');
  assert.equal(r.risk, 'GREEN');
  assert.ok(Math.abs(r.ttcS - 81) < 3);
});
test('braking vehicle: 80 m YELLOW, 50 m RED, 30 m CRITICAL', () => {
  assert.equal(analyzeVehicle(user, ahead(80, 10), 60).risk, 'YELLOW');
  assert.equal(analyzeVehicle(user, ahead(50, 10), 60).risk, 'RED');
  assert.equal(analyzeVehicle(user, ahead(30, 10), 60).risk, 'CRITICAL');
});
test('moving apart -> TTC N/A, GREEN', () => {
  const r = analyzeVehicle(user, ahead(100, 80), 60);
  assert.equal(r.ttcS, null); assert.equal(r.risk, 'GREEN');
});
test('vehicle behind is LOW relevance', () => {
  const r = analyzeVehicle(user, ahead(-100, 50), 60);
  assert.equal(r.direction, 'behind'); assert.equal(r.relevance, 'LOW');
});
test('side vehicle crossing path is POTENTIAL_RISK', () => {
  const o = { vehicleId: 'X', lat: user.lat + 40 * M, lng: user.lng + 40 / (111195 * Math.cos(user.lat * Math.PI / 180)), speedKmh: 40, heading: 270, accuracyM: 3 };
  const r = analyzeVehicle(user, o, 60);
  assert.equal(r.direction, 'right'); assert.equal(r.relevance, 'POTENTIAL_RISK');
});
