# FogSafe – API & Socket Reference

## REST

| Method | Path                     | Body | Response                                  |
| ------ | ------------------------ | ---- | ----------------------------------------- |
| POST   | `/api/auth/register`     | –    | `{ token }` — anonymous session token     |
| GET    | `/api/config/thresholds` | –    | current `defaultConfig` (risk thresholds) |
| GET    | `/api/health`            | –    | `{ ok: true, vehicles: <count> }`         |

## Socket.IO — client → server

| Event             | Payload                                                 | Notes                                                 |
| ----------------- | ------------------------------------------------------- | ----------------------------------------------------- |
| `vehicle:join`    | –                                                       | Allocates a temporary vehicleId                       |
| `vehicle:update`  | `{ lat, lng, speedKmh, heading, accuracyM, timestamp }` | ~1 Hz. Invalid coords are rejected, not stored        |
| `vehicle:leave`   | –                                                       | Removes this vehicle immediately                      |
| `settings:radius` | `{ radiusM }`                                           | 100–2000, changes this vehicle's nearby search radius |

## Socket.IO — server → client

| Event             | Payload                                            | Notes                                                                                              |
| ----------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `vehicle:joined`  | `{ vehicleId, config }`                            | Sent once after join                                                                               |
| `nearby:update`   | `{ vehicles: [VehicleState & {ageMs}], serverTs }` | Sent whenever any nearby vehicle's state changes                                                   |
| `vehicle:removed` | `{ vehicleId }`                                    | Reserved for explicit single-vehicle removal push (currently folded into the next `nearby:update`) |
| `error:invalid`   | `{ code, message }`                                | e.g. invalid coordinates rejected                                                                  |

## VehicleState (common format, all adapters output this)

```js
{
  vehicleId: "V024",
  lat: 30.9012, lng: 76.8503,
  speedKmh: 42, heading: 180,
  accuracyM: 8, timestamp: 1738000000000,
  source: "gps",      // gps | sim | v2v | v2x | sensor
  status: "active"
}
```

## Core function (shared/core, used identically by client & server)

```js
analyzeVehicle(user, other, visibilityM, config?) -> {
  vehicleId, distanceM, direction,        // ahead | behind | left | right
  relevance,                              // HIGH | POTENTIAL_RISK | LOW
  closingSpeedMs, approaching,
  ttcS,                                   // null = N/A (not closing / not relevant)
  visual,                                 // WITHIN_VISUAL_RANGE | BEYOND_VISUAL_RANGE
  risk,                                   // GREEN | YELLOW | RED | CRITICAL
  lowConfidence                           // true if GPS error is large vs. distance
}
```
