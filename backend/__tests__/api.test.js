import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { io as ioc } from 'socket.io-client';
import { createApp } from '../src/app.js';

let ctx, base;
before(async () => {
  ctx = createApp({ dbUp: false });
  await new Promise((r) => ctx.server.listen(0, r));
  base = `http://127.0.0.1:${ctx.server.address().port}`;
});
after(async () => {
  await ctx.close();
});

let n = 0;
const post = (path, body, token) =>
  fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body ?? {}),
  });
const register = async () =>
  (
    await (
      await post('/api/auth/register', {
        name: 'Test User',
        email: `t${++n}-${Date.now()}@example.com`,
        password: 'password123',
      })
    ).json()
  ).token;
const connect = (token) =>
  new Promise((resolve, reject) => {
    const s = ioc(base, { auth: { token }, reconnection: false });
    s.on('connect', () => resolve(s));
    s.on('connect_error', reject);
  });
const once = (s, ev) => new Promise((r) => s.once(ev, r));
const M = 1 / 111195;

test('health endpoint responds', async () => {
  const j = await (await fetch(`${base}/api/health`)).json();
  assert.equal(j.ok, true);
});

test('register validates name and email, and rejects duplicates', async () => {
  assert.equal((await post('/api/auth/register', { name: '', email: 'a@b.com', password: 'password123' })).status, 400);
  assert.equal(
    (await post('/api/auth/register', { name: 'A', email: 'not-an-email', password: 'password123' })).status,
    400,
  );
  assert.equal((await post('/api/auth/register', {})).status, 400);
  assert.equal((await post('/api/auth/register', { name: 'A', email: 'a@b.com', password: 'short' })).status, 400);
  const email = `dup-${Date.now()}@example.com`;
  const r = await post('/api/auth/register', {
    name: '  Asha   Singh ',
    email: email.toUpperCase(),
    password: 'password123',
  });
  assert.equal(r.status, 201);
  const j = await r.json();
  assert.equal(j.user.name, 'Asha Singh');
  assert.equal(j.user.email, email);
  assert.ok(j.token);
  assert.ok(!JSON.stringify(j).includes('passwordHash'));
  assert.equal((await post('/api/auth/register', { name: 'Other', email, password: 'password123' })).status, 409);
});

test('login works for a registered email, fails for unknown, and /me + logout work', async () => {
  const email = `login-${Date.now()}@example.com`;
  await post('/api/auth/register', { name: 'Login Test', email, password: 'password123' });
  assert.equal((await post('/api/auth/login', { email: 'nobody@example.com', password: 'password123' })).status, 401);
  assert.equal((await post('/api/auth/login', { email, password: 'wrong-password' })).status, 401);
  assert.equal((await post('/api/auth/login', { email: 'bad', password: 'password123' })).status, 400);
  const r = await post('/api/auth/login', { email: ` ${email.toUpperCase()} `, password: 'password123' });
  assert.equal(r.status, 200);
  const { token, user } = await r.json();
  assert.equal(user.name, 'Login Test');
  const me = await fetch(`${base}/api/auth/me`, { headers: { authorization: `Bearer ${token}` } });
  assert.equal((await me.json()).user.email, email);
  assert.equal((await post('/api/auth/logout', {}, token)).status, 200);
  assert.equal((await fetch(`${base}/api/auth/me`, { headers: { authorization: `Bearer ${token}` } })).status, 401);
  await assert.rejects(connect(token)); // logged-out token can no longer open a socket
});

test('/me requires a token', async () => {
  assert.equal((await fetch(`${base}/api/auth/me`)).status, 401);
});

test('socket without a valid token is rejected', async () => {
  await assert.rejects(connect('bad-token'));
});

test('settings API requires auth', async () => {
  const r = await fetch(`${base}/api/fog/settings/V1`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
  assert.equal(r.status, 401);
});

test('settings API rejects another vehicle id and invalid bodies', async () => {
  const token = await register();
  const s = await connect(token);
  s.emit('vehicle:join');
  const { vehicleId } = await once(s, 'vehicle:joined');
  const h = { 'content-type': 'application/json', authorization: `Bearer ${token}` };
  const bad = JSON.stringify({ visibilityM: -5, fogMode: true, radiusM: 500 });
  assert.equal(
    (await fetch(`${base}/api/fog/settings/${vehicleId}`, { method: 'PUT', headers: h, body: bad })).status,
    400,
  );
  const ok = JSON.stringify({ visibilityM: 60, fogMode: true, radiusM: 500 });
  assert.equal((await fetch(`${base}/api/fog/settings/OTHER`, { method: 'PUT', headers: h, body: ok })).status, 403);
  assert.equal(
    (await fetch(`${base}/api/fog/settings/${vehicleId}`, { method: 'PUT', headers: h, body: ok })).status,
    200,
  );
  s.close();
});

test('two nearby vehicles see each other; far vehicle is not shown', async () => {
  const [a, b, far] = await Promise.all([register(), register(), register()].map(async (p) => connect(await p)));
  for (const s of [a, b, far]) s.emit('vehicle:join');
  await Promise.all([a, b, far].map((s) => once(s, 'vehicle:joined')));
  a.emit('vehicle:update', { lat: 30.9, lng: 76.85, speedKmh: 50, heading: 0 });
  b.emit('vehicle:update', { lat: 30.9 + 180 * M, lng: 76.85, speedKmh: 42, heading: 0 });
  far.emit('vehicle:update', { lat: 31.9, lng: 76.85, speedKmh: 40, heading: 0 });
  const seen = await new Promise((resolve) => {
    a.on('nearby:update', (d) => {
      if (d.vehicles.length) resolve(d.vehicles);
    });
  });
  assert.equal(seen.length, 1);
  assert.ok(!('radiusM' in seen[0]) && !('updatedAt' in seen[0]));
  [a, b, far].forEach((s) => s.close());
});

test('invalid and implausible locations are rejected', async () => {
  const s = await connect(await register());
  s.emit('vehicle:join');
  await once(s, 'vehicle:joined');
  s.emit('vehicle:update', { lat: 999, lng: 0 });
  assert.equal((await once(s, 'error:invalid')).code, 'INVALID_COORDS');
  s.emit('vehicle:update', { lat: 30.9, lng: 76.85, speedKmh: 50, heading: 0 });
  await new Promise((r) => setTimeout(r, 100));
  s.emit('vehicle:update', { lat: 35.0, lng: 76.85, speedKmh: 50, heading: 0 }); // ~450 km jump
  assert.equal((await once(s, 'error:invalid')).code, 'IMPLAUSIBLE');
  s.close();
});

test('vehicle disappears after leaving', async () => {
  const s = await connect(await register());
  s.emit('vehicle:join');
  await once(s, 'vehicle:joined');
  assert.ok(ctx.vehicles.size >= 1);
  s.emit('vehicle:leave');
  await new Promise((r) => setTimeout(r, 100));
  s.close();
});
