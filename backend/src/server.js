import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import crypto from 'crypto';
import { Server } from 'socket.io';
import { connectDb } from './config/db.js';
import { VehicleSession, FogSettings, LocationHistory } from './models/index.js';
import { haversineM, defaultConfig } from '../../shared/core/index.js';
import { fromGps } from './adapters/gps.js';

const PORT = process.env.PORT || 4000;
// Comma-separated list of allowed frontend origins, e.g. https://fogsafe.vercel.app
// Empty/unset -> allow all (fine for local dev; set this in Render's env vars for production).
const ORIGINS = (process.env.CORS_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
const corsOptions = { origin: ORIGINS.length ? ORIGINS : true };
const STALE_MS = 10000;
let dbUp = false; // if false, save*() calls below are skipped, not queued
const app = express();
app.use(cors(corsOptions));
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, { cors: corsOptions });

const tokens = new Set();          // anonymous session tokens (no personal data)
const vehicles = new Map();        // socket.id -> current vehicle state (in memory)

app.get('/api/health', (_q, r) => r.json({ ok: true, vehicles: vehicles.size, db: dbUp }));
app.get('/api/config/thresholds', (_q, r) => r.json(defaultConfig));

// Fog settings persist per vehicleId so returning drivers keep their preference (DB-backed; no-op if DB is down).
app.get('/api/fog/settings/:vehicleId', async (req, res) => {
  if (!dbUp) return res.json(null);
  res.json(await FogSettings.findOne({ vehicleId: req.params.vehicleId }).lean());
});
app.put('/api/fog/settings/:vehicleId', async (req, res) => {
  if (!dbUp) return res.json({ saved: false });
  const { visibilityM, fogMode, radiusM } = req.body;
  await FogSettings.findOneAndUpdate({ vehicleId: req.params.vehicleId },
    { $set: { visibilityM, fogMode, radiusM } }, { upsert: true });
  res.json({ saved: true });
});
app.post('/api/auth/register', (_q, r) => {
  const token = crypto.randomBytes(24).toString('hex');
  tokens.add(token); r.json({ token });
});

io.use((socket, next) =>
  tokens.has(socket.handshake.auth?.token) ? next() : next(new Error('unauthorized')));

function broadcastNearby() {
  const now = Date.now();
  for (const [sid, me] of vehicles) {
    const list = [];
    for (const [oid, o] of vehicles) {
      if (oid === sid || now - o.updatedAt > STALE_MS) continue;
      if (haversineM(me.lat, me.lng, o.lat, o.lng) > me.radiusM) continue;
      const { updatedAt, radiusM, ...pub } = o; // share only what is required
      list.push({ ...pub, ageMs: now - updatedAt });
    }
    io.to(sid).emit('nearby:update', { vehicles: list, serverTs: now });
  }
}
const newId = () => { let id; do id = 'V' + String(Math.floor(Math.random() * 900) + 100); while ([...vehicles.values()].some(v => v.vehicleId === id)); return id; };

io.on('connection', (socket) => {
  socket.on('vehicle:join', async ({ mode = 'real' } = {}) => {
    if (!vehicles.has(socket.id)) vehicles.set(socket.id, { vehicleId: newId(), lat: 0, lng: 0, speedKmh: 0, heading: 0, radiusM: defaultConfig.nearbyRadiusM, updatedAt: 0 });
    const me = vehicles.get(socket.id);
    socket.emit('vehicle:joined', { vehicleId: me.vehicleId, config: defaultConfig });
    if (dbUp) try { await VehicleSession.create({ vehicleId: me.vehicleId, mode, startedAt: new Date() }); } catch {}
  });
  socket.on('vehicle:update', (raw) => {
    const me = vehicles.get(socket.id); const s = fromGps(raw);
    if (!me) return;
    if (!s) return socket.emit('error:invalid', { code: 'INVALID_COORDS', message: 'Invalid location rejected' });
    vehicles.set(socket.id, { ...me, ...s, updatedAt: Date.now() });
    broadcastNearby();
    // Fire-and-forget, downsampled (every ~5s), TTL-expired after 24h — never blocks the live update path.
    if (dbUp && Date.now() - (me.lastSavedAt || 0) > 5000) {
      me.lastSavedAt = Date.now();
      LocationHistory.create({ vehicleId: me.vehicleId, lat: s.lat, lng: s.lng, speedKmh: s.speedKmh, heading: s.heading }).catch(() => {});
    }
  });
  socket.on('settings:radius', ({ radiusM }) => {
    const me = vehicles.get(socket.id);
    if (me && radiusM >= 100 && radiusM <= 2000) me.radiusM = radiusM;
  });
  const remove = () => {
    const me = vehicles.get(socket.id);
    if (vehicles.delete(socket.id)) broadcastNearby();
    if (dbUp && me) VehicleSession.findOneAndUpdate({ vehicleId: me.vehicleId, endedAt: null }, { endedAt: new Date() }, { sort: { _id: -1 } }).catch(() => {});
  };
  socket.on('vehicle:leave', remove);
  socket.on('disconnect', remove);
});

setInterval(() => {
  const now = Date.now(); let changed = false;
  for (const [sid, v] of vehicles) if (v.updatedAt && now - v.updatedAt > STALE_MS) { vehicles.delete(sid); changed = true; }
  if (changed) broadcastNearby();
}, 3000);

connectDb().then((ok) => { dbUp = ok; server.listen(PORT, () => console.log(`FogSafe backend on :${PORT}${ok ? '' : ' (no DB — in-memory only)'}`)); });
