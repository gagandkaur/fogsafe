# FogSafe – Data & Event Flow

## 1. Startup / join
1. Client calls `POST /api/auth/register` -> gets a random session token
   (no personal data attached to it).
2. Client opens a Socket.IO connection with the token in the handshake.
3. Server validates the token; unknown/invalid token -> connection rejected.
4. Client emits `vehicle:join` -> server allocates a temporary `vehicleId`
   (e.g. `V512`) -> replies `vehicle:joined` with `{ vehicleId, config }`.

## 2. Location update loop (every ~1s while joined)
```
Client: GPS fix (or simulated step)
   -> emits vehicle:update { lat, lng, speedKmh, heading, accuracyM, timestamp }
Server:
   -> adapters/gps.js validates & normalizes the payload
      (invalid coords -> emits error:invalid, state NOT updated)
   -> stores as this socket's current VehicleState with updatedAt = now
   -> recomputes nearby vehicles for EVERY connected socket (radius filter,
      Haversine distance, drop entries stale > 10s)
   -> emits nearby:update { vehicles: [...], serverTs } to each socket
Client:
   -> receives nearby:update
   -> drops any vehicle whose age exceeds 5s (never renders stale as live)
   -> shared/core.analyzeVehicle(me, other, visibilityM) for each neighbour
   -> MapView / StatusCard / AlertBanner re-render
```

## 3. Disconnection / leave
- Explicit: client emits `vehicle:leave`.
- Implicit: socket `disconnect` (app closed, network lost).
- Either way: server removes the vehicle from the store and immediately
  re-broadcasts `nearby:update` to remaining clients, so it disappears promptly
  rather than lingering until the 10s stale sweep.
- Client-side: `ConnectionStatus` shows 🟡 Reconnecting while Socket.IO retries,
  🔴 Offline if reconnection fails, and a banner shows "last update Ns ago" so
  the driver is never shown a stale position as if it were current.

## 4. Demo Mode (scripted, for presentations)
`simulation/demoScenario.js` is a list of `{ t, msg, run }` steps fired with
`setTimeout` after pressing "Demo mode": start with visibility=200/fog off ->
fog on -> visibility drops to 60 -> a vehicle spawns 180m ahead (beyond visual
range) -> it "brakes" (closing speed rises) -> risk visibly moves
GREEN -> YELLOW -> RED -> CRITICAL as distance closes, matching the thresholds
in `shared/core/config.js`.
