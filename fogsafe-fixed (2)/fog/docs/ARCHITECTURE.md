# FogSafe – Architecture

## Overview

FogSafe uses smartphones/laptops as prototype "vehicle devices". Each device gets GPS
location, speed and heading, sends it to a backend, and receives nearby participating
devices in return. All distance/risk math is done locally on each device using a
shared "core" library — this keeps the maths identical on both server and client and
lets it be unit-tested in isolation.

## Components

```
shared/core/        Pure JS, no I/O. Geometry, fog, TTC, risk. Used by BOTH
                     frontend (per-driver risk view) and backend (future logging).
backend/             Express + Socket.IO. Session/token issuing, in-memory vehicle
                     state, spatial radius filter, broadcast of neighbour lists.
backend/src/adapters/  One file per data source (gps.js today). Each adapter's job
                     is only to turn raw input into the common VehicleState shape.
                     Future: v2v.js, v2x.js, sensor.js — same output shape, so
                     nothing else in the backend needs to change when a new data
                     source is added.
frontend/            React + Vite + Leaflet. Two operating modes:
   - Simulation: an in-browser fake-physics engine (simulation/simEngine.js) moves
     vehicles; no backend/network needed. Used for development and demos.
   - Real: services/geolocationService.js reads the phone's GPS, services/
     socketClient.js sends/receives over Socket.IO.
frontend/src/services/proximity/  BLE stub — an interface only. Browsers cannot
     scan/advertise BLE in the background, so a real implementation needs a native
     (React Native) shell. Kept modular so it can be swapped in without touching
     the rest of the app.
```

## Why calculations run on the client, not just the server

Fog visibility is a per-driver setting (each driver may set a different visibility
estimate). The server does not know each driver's chosen visibility, so it only
does the network-relevant job — filtering by radius and broadcasting raw neighbour
state. Each phone applies its own visibility value through the shared core to get
its own risk view.

## Data flow (real mode)

```
Phone A: GPS fix -> geolocationService -> socketClient.send() -> Socket.IO
         -> backend vehicleStore (in-memory) -> broadcast to nearby sockets
         -> Phone B: socketClient receives "nearby:update"
         -> shared/core analyzeVehicle(user, other, visibility)
         -> MapView + SidePanel render risk/distance/TTC
```

## Modular ingestion (future V2V/V2X)

```
   GpsAdapter ─┐
   V2vAdapter ─┼─► common VehicleState { lat, lng, speedKmh, heading,
   V2xAdapter ─┤                          accuracyM, timestamp, source }
  SensorAdapter┘
```

Only `backend/src/adapters/*.js` needs a new file; server.js, the socket events,
and the entire frontend are unchanged, since they only ever see VehicleState.

## Key design choices

- **In-memory vehicle store, not DB, for live state.** Current position must be
  fast and fresh; MongoDB (planned) is for sessions, settings and short history,
  not the hot path.
- **Temporary vehicle IDs.** No phone number, name or persistent identity is ever
  sent to another device.
- **Stale data is hidden, never shown as live.** Both the server (drops vehicles
  silent > 10 s) and the client (hides neighbours whose age > 5 s, shows "last
  updated Ns ago" on disconnect) enforce this.
