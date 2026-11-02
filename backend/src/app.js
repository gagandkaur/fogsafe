import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import http from 'http';
import crypto from 'crypto';
import { promisify } from 'util';
import { Server } from 'socket.io';
import { User, VehicleSession, FogSettings, LocationHistory } from './models/index.js';
import { haversineM, defaultConfig } from '../../shared/core/index.js';
import { fromGps } from './adapters/gps.js';

const TOKEN_TTL_MS = 6 * 60 * 60 * 1000; // tokens expire after 6 h
const BROADCAST_MS = 1000; // nearby broadcast tick (replaces per-update O(n^2) broadcast)
const SAVE_EVERY_MS = 5000; // LocationHistory downsampling
const MAX_UPDATES_PER_SEC = 4; // per-socket flood limit

// Wraps an async Express handler so rejections reach the error middleware instead of hanging.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const cleanName = (v) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '');
const cleanEmail = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : '');
const publicUser = (u) => ({ id: String(u._id ?? u.id), name: u.name, email: u.email });

const scrypt = promisify(crypto.scrypt);
const PW_MIN = 8,
  PW_MAX = 128;
const hashPassword = async (pw) => {
  const salt = crypto.randomBytes(16);
  return `${salt.toString('hex')}:${(await scrypt(pw, salt, 64)).toString('hex')}`;
};
const DUMMY_HASH = await hashPassword('dummy-password'); // burned when the email is unknown, so timing doesn't reveal it
const verifyPassword = async (pw, stored) => {
  const [saltHex, hashHex] = String(stored || DUMMY_HASH).split(':');
  const expected = Buffer.from(hashHex || '', 'hex');
  const actual = await scrypt(pw, Buffer.from(saltHex, 'hex'), 64);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual) && !!stored;
};
const validPassword = (v) => typeof v === 'string' && v.length >= PW_MIN && v.length <= PW_MAX;

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function createApp({ dbUp = false, origins = [] } = {}) {
  const state = { dbUp };
  const corsOptions = { origin: origins.length ? origins : true };
  const app = express();
  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(express.json({ limit: '10kb' }));

  const server = http.createServer(app);
  const io = new Server(server, { cors: corsOptions });

  const tokens = new Map(); // token -> { exp, vehicleId, user }
  const memUsers = new Map(); // email -> user; used only when MongoDB is down (lost on restart)
  const vehicles = new Map(); // socket.id -> current vehicle state (in memory)

  const purgeTokens = () => {
    const now = Date.now();
    for (const [t, v] of tokens) if (v.exp < now) tokens.delete(t);
  };
  const bearer = (req) => (req.headers.authorization || '').replace(/^Bearer /, '');
  const requireToken = (req, res, next) => {
    const t = tokens.get(bearer(req));
    if (!t || t.exp < Date.now()) return res.status(401).json({ error: 'unauthorized' });
    req.tokenInfo = t;
    next();
  };
  const num = (v, lo, hi) => Number.isFinite(v) && v >= lo && v <= hi;

  app.get('/api/health', (_q, r) => r.json({ ok: true, vehicles: vehicles.size, db: state.dbUp }));
  app.get('/api/config/thresholds', (_q, r) => r.json(defaultConfig));

  const authLimit = rateLimit({ windowMs: 60_000, limit: 20 });

  const findUser = async (email) => (state.dbUp ? User.findOne({ email }).lean() : memUsers.get(email) || null);

  // Returns the created user, or null when the email is already registered.
  const createUser = async ({ name, email, passwordHash }) => {
    if (!state.dbUp) {
      if (memUsers.has(email)) return null;
      const u = { id: crypto.randomUUID(), name, email, passwordHash };
      memUsers.set(email, u);
      return u;
    }
    try {
      return (await User.create({ name, email, passwordHash })).toObject();
    } catch (e) {
      if (e.code === 11000) return null; // unique index on email
      throw e;
    }
  };

  const issueToken = (user) => {
    purgeTokens();
    if (tokens.size > 50_000) return null;
    const token = crypto.randomBytes(24).toString('hex');
    tokens.set(token, { exp: Date.now() + TOKEN_TTL_MS, vehicleId: null, user });
    return token;
  };

  app.post(
    '/api/auth/register',
    authLimit,
    wrap(async (req, res) => {
      const name = cleanName(req.body?.name);
      const email = cleanEmail(req.body?.email);
      if (name.length < 1 || name.length > 60)
        return res.status(400).json({ error: 'Enter your name (max 60 characters).' });
      if (email.length > 254 || !EMAIL_RE.test(email))
        return res.status(400).json({ error: 'Enter a valid email address.' });
      if (!validPassword(req.body?.password))
        return res.status(400).json({ error: `Password must be ${PW_MIN}-${PW_MAX} characters.` });
      const created = await createUser({ name, email, passwordHash: await hashPassword(req.body.password) });
      if (!created) return res.status(409).json({ error: 'That email is already registered. Log in instead.' });
      const user = publicUser(created);
      const token = issueToken(user);
      if (!token) return res.status(503).json({ error: 'busy' });
      res.status(201).json({ token, user });
    }),
  );

  app.post(
    '/api/auth/login',
    authLimit,
    wrap(async (req, res) => {
      const email = cleanEmail(req.body?.email);
      const password = req.body?.password;
      if (email.length > 254 || !EMAIL_RE.test(email) || !validPassword(password))
        return res.status(400).json({ error: 'Enter your email and password.' });
      const found = await findUser(email);
      // Same message for unknown email and wrong password.
      if (!(await verifyPassword(password, found?.passwordHash)) || !found)
        return res.status(401).json({ error: 'Incorrect email or password.' });
      const user = publicUser(found);
      const token = issueToken(user);
      if (!token) return res.status(503).json({ error: 'busy' });
      res.json({ token, user });
    }),
  );

  app.get('/api/auth/me', requireToken, (req, res) => res.json({ user: req.tokenInfo.user }));

  app.post('/api/auth/logout', requireToken, (req, res) => {
    tokens.delete(bearer(req));
    res.json({ ok: true });
  });

  app.get(
    '/api/fog/settings/:vehicleId',
    requireToken,
    wrap(async (req, res) => {
      if (req.tokenInfo.vehicleId !== req.params.vehicleId) return res.status(403).json({ error: 'forbidden' });
      if (!state.dbUp) return res.json(null);
      res.json(await FogSettings.findOne({ vehicleId: req.params.vehicleId }).lean());
    }),
  );
  app.put(
    '/api/fog/settings/:vehicleId',
    requireToken,
    wrap(async (req, res) => {
      if (req.tokenInfo.vehicleId !== req.params.vehicleId) return res.status(403).json({ error: 'forbidden' });
      const { visibilityM, fogMode, radiusM } = req.body || {};
      if (!num(visibilityM, 5, 1000) || typeof fogMode !== 'boolean' || !num(radiusM, 100, 2000))
        return res.status(400).json({ error: 'invalid settings' });
      if (!state.dbUp) return res.json({ saved: false });
      await FogSettings.findOneAndUpdate(
        { vehicleId: req.params.vehicleId },
        { $set: { visibilityM, fogMode, radiusM } },
        { upsert: true },
      );
      res.json({ saved: true });
    }),
  );

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error('Request error:', err.message);
    res.status(500).json({ error: 'internal error' });
  });

  io.use((socket, next) => {
    const t = tokens.get(socket.handshake.auth?.token);
    if (!t || t.exp < Date.now()) return next(new Error('unauthorized'));
    socket.data.token = socket.handshake.auth.token;
    next();
  });

  function broadcastNearby() {
    const now = Date.now();
    for (const [sid, me] of vehicles) {
      if (!me.updatedAt) continue; // joined but no location yet
      const list = [];
      for (const [oid, o] of vehicles) {
        if (oid === sid || !o.updatedAt || now - o.updatedAt > defaultConfig.serverStaleMs) continue;
        if (haversineM(me.lat, me.lng, o.lat, o.lng) > me.radiusM) continue;
        // eslint-disable-next-line no-unused-vars
        const { updatedAt, radiusM, lastSavedAt, ...pub } = o; // share only what is required
        list.push({ ...pub, ageMs: now - updatedAt });
      }
      io.to(sid).emit('nearby:update', { vehicles: list, serverTs: now });
    }
  }

  const newId = () => {
    const used = new Set([...vehicles.values()].map((v) => v.vehicleId));
    let id;
    do id = 'V' + crypto.randomBytes(3).toString('hex').toUpperCase();
    while (used.has(id));
    return id;
  };

  // Reject teleporting / impossible speed (spoofing or a bad GPS fix).
  const plausible = (prev, next) => {
    if (next.speedKmh > defaultConfig.maxSpeedKmh) return false;
    if (!prev.updatedAt) return true;
    const dt = Math.max((Date.now() - prev.updatedAt) / 1000, 0.5);
    return haversineM(prev.lat, prev.lng, next.lat, next.lng) / dt <= defaultConfig.maxJumpMps;
  };

  io.on('connection', (socket) => {
    let windowStart = Date.now(),
      count = 0;
    const allowed = () => {
      const now = Date.now();
      if (now - windowStart >= 1000) {
        windowStart = now;
        count = 0;
      }
      return ++count <= MAX_UPDATES_PER_SEC;
    };

    socket.on('vehicle:join', async ({ mode = 'real' } = {}) => {
      const isNew = !vehicles.has(socket.id);
      if (isNew)
        vehicles.set(socket.id, {
          vehicleId: newId(),
          lat: 0,
          lng: 0,
          speedKmh: 0,
          heading: 0,
          radiusM: defaultConfig.nearbyRadiusM,
          updatedAt: 0,
          lastSavedAt: 0,
        });
      const me = vehicles.get(socket.id);
      const t = tokens.get(socket.data.token);
      if (t) t.vehicleId = me.vehicleId; // binds settings API access to this vehicle
      socket.emit('vehicle:joined', { vehicleId: me.vehicleId, config: defaultConfig });
      // Only one session row per socket, not one per re-join.
      if (isNew && state.dbUp) {
        try {
          await VehicleSession.create({
            vehicleId: me.vehicleId,
            mode: mode === 'sim' ? 'sim' : 'real',
            startedAt: new Date(),
          });
        } catch (e) {
          console.warn('session save failed:', e.message);
        }
      }
    });

    socket.on('vehicle:update', (raw) => {
      const me = vehicles.get(socket.id);
      if (!me) return;
      if (!allowed()) return; // silently drop floods
      const s = fromGps(raw);
      if (!s) return socket.emit('error:invalid', { code: 'INVALID_COORDS', message: 'Invalid location rejected' });
      if (!plausible(me, s))
        return socket.emit('error:invalid', { code: 'IMPLAUSIBLE', message: 'Implausible location rejected' });
      Object.assign(me, s, { updatedAt: Date.now() }); // mutate in place so lastSavedAt is never lost
      // Fire-and-forget, downsampled, TTL-expired after 24 h; never blocks the live path.
      if (state.dbUp && Date.now() - me.lastSavedAt > SAVE_EVERY_MS) {
        me.lastSavedAt = Date.now();
        LocationHistory.create({
          vehicleId: me.vehicleId,
          lat: s.lat,
          lng: s.lng,
          speedKmh: s.speedKmh,
          heading: s.heading,
        }).catch(() => {});
      }
    });

    socket.on('settings:radius', ({ radiusM } = {}) => {
      const me = vehicles.get(socket.id);
      if (me && num(radiusM, 100, 2000)) me.radiusM = radiusM;
    });

    const remove = () => {
      const me = vehicles.get(socket.id);
      if (!me) return;
      vehicles.delete(socket.id);
      broadcastNearby();
      if (state.dbUp)
        VehicleSession.findOneAndUpdate(
          { vehicleId: me.vehicleId, endedAt: null },
          { endedAt: new Date() },
          { sort: { _id: -1 } },
        ).catch(() => {});
    };
    socket.on('vehicle:leave', remove);
    socket.on('disconnect', remove);
  });

  const tick = setInterval(() => {
    const now = Date.now();
    for (const [sid, v] of vehicles)
      if (v.updatedAt && now - v.updatedAt > defaultConfig.serverStaleMs) vehicles.delete(sid);
    broadcastNearby();
  }, BROADCAST_MS);

  async function close() {
    clearInterval(tick);
    await io.close();
    if (server.listening) await new Promise((r) => server.close(r));
  }
  return { app, server, io, state, vehicles, close };
}
