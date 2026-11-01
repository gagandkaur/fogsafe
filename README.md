# FogSafe – Real-Time Fog Vehicle Visibility & Collision Warning System (Prototype)

## Problem
In dense fog, a driver may not see another vehicle until it is dangerously
close. FogSafe adds a digital visibility layer: participating vehicles
(prototyped here as phones/laptops) share GPS position, speed and heading, so
a driver can be shown a vehicle that exists beyond their visual range.

**Core idea: visual visibility ≠ digital vehicle visibility.**
Visibility 60 m, another vehicle 180 m away -> the app shows
"🚗 Vehicle ahead – 180 m – ⚠️ Beyond visual range" even though the driver
cannot see it.

## Architecture (see docs/ARCHITECTURE.md for full detail)
```
Phone/laptop (GPS+speed+heading) -> Socket.IO -> Backend (Node/Express)
   -> nearby-vehicle filter & broadcast -> other Phone/laptop
   -> shared risk/TTC/fog logic (same code on client & server) -> map + alerts
```

## Tech stack
- **shared/core** – pure JS: Haversine distance, direction, TTC, fog and risk
  logic. Unit-tested, used by both frontend and backend.
- **backend** – Node.js, Express, Socket.IO, MongoDB (optional). Live vehicle
  state stays in-memory for speed; MongoDB stores sessions, fog settings and a
  24h-TTL location history. If MongoDB isn't running, the backend logs a
  warning and keeps working with in-memory-only state — nothing breaks.
- **frontend** – React + Vite + Leaflet/OpenStreetMap (no API key needed).
- **CI/CD pipeline tested- Fogsafe

## Setup
```
npm run setup     # installs root, backend and frontend dependencies
npm run dev       # runs backend (:4000) + frontend (https, :5173) together
npm test          # runs the shared/core unit tests
```
Open the printed `https://localhost:5173` link. Your browser will warn about
the certificate (it's a self-signed dev certificate, required so phone GPS
works over HTTPS) — click Advanced -> Proceed.

## Simulation mode
Default mode. Fake vehicles move around a fixed starting point with preset
buttons (distance/speed), or press **Demo mode** to run the full fog scenario
automatically (visibility drops, a vehicle appears beyond visual range,
approaches, and risk moves Green → Yellow → Red → Critical).

## Real phone mode
1. In the terminal running `npm run dev`, find the **Network** URL, e.g.
   `https://192.168.x.x:5173`.
2. Open that URL on each phone (same Wi-Fi as the laptop running the backend).
3. Accept the certificate warning on each device.
4. Tap **Real phones** → **Join as Vehicle (GPS)**, allow location access.
5. Each device should appear on the other's map within a few seconds.

(Two browser tabs on one laptop can also test this without a real phone, using
the **Test vehicle A / Test vehicle B** buttons, which use simulated GPS.)

## MongoDB setup (optional)
The prototype runs fine without MongoDB. To enable persistence:
1. Install MongoDB locally, or use a free MongoDB Atlas cluster.
2. Copy `backend/.env.example` to `backend/.env` and set `MONGODB_URI` if it
   isn't the default `mongodb://127.0.0.1:27017/fogsafe`.
3. Start `mongod` (if local) before `npm run dev`.
4. Check `https://localhost:5173` isn't needed for this — check
   `http://localhost:4000/api/health`, which returns `db: true` once connected.

## Environment variables
`backend/.env` (see `backend/.env.example`): `MONGODB_URI`, `PORT`. Both are
optional — the app has working defaults. No Google Maps key is needed
(OpenStreetMap tiles are used, no billing/API key setup).

## Testing
`npm test` runs the shared core's unit tests, including the exact demo
scenario (180 m ahead, 60 m fog -> beyond visual range; a braking vehicle
moving through Yellow/Red/Critical as it closes).

## Deploying beyond one WiFi network
By default, `npm run dev` only works for devices on the same WiFi as your
laptop. To let any phone connect from anywhere (different WiFi, mobile data),
see `docs/DEPLOYMENT.md` — MongoDB Atlas + Render + Vercel, all free tiers.

## Documentation
- `docs/ARCHITECTURE.md` – components, why calculations run client-side, the modular adapter design
- `docs/FLOW.md` – step-by-step event flow (join, update loop, disconnect, demo)
- `docs/API.md` – REST + Socket.IO reference, VehicleState shape
- `docs/NOVELTY_NOTES.md` – prior art vs. this project, explicitly not a patent opinion

## Known limitations (see docs for detail)
- No MongoDB yet — state is in-memory and resets when the backend restarts.
- Bluetooth/BLE is an interface stub only; real BLE scanning needs a native
  (React Native) shell, not a browser.
- No destination search / navigation routing yet.
- Relevance/direction logic is a geometric approximation, not lane-level detection.
- All risk thresholds are prototype/demo values, not road-safety standards.

## Future improvements
MongoDB persistence, React Native BLE proximity, V2V/V2X adapter
implementations, destination search + routing, custom simulated-vehicle
sliders (distance/speed/heading), tap-for-full-detail vehicle panel.
