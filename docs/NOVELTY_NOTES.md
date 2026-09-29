# FogSafe – Novelty & Prior Art Notes

This project does not claim to be the first, only, or automatically patentable
system in this space. This document records what already exists, what FogSafe
does, and where the differences lie, so any future patent/novelty discussion
starts from an honest baseline.

## Existing technology this project builds on
| Area | What it does | Examples |
|---|---|---|
| GPS vehicle tracking | Tracks a vehicle's location via GNSS | Fleet tracking apps, Google Maps location sharing |
| Connected vehicle / V2V | Vehicles exchange state (position, speed, heading) directly or via infrastructure | DSRC, C-V2X, SAE J2735 basic safety message |
| V2X | Vehicle-to-everything (infra, pedestrians, network) | 5G-V2X, roadside units |
| Forward collision warning | Warns of an imminent collision using onboard sensors | Radar/camera ADAS systems in production cars |
| Cooperative perception | Vehicles/infrastructure share sensed objects, not just own state | Research literature on cooperative perception, some V2X pilots |
| Fog/visibility-adaptive driving aids | Adjust lighting, headway, or alert distance based on measured visibility | Some ADAS fog-lamp automation, visibility sensors on highways |

## What FogSafe specifically does
- Combines a **user-configurable or measured fog-visibility value** with
  **peer-shared GPS state** (not onboard radar/camera) to classify each nearby
  participating vehicle as within or **beyond the driver's estimated visual
  range**, and surfaces that specifically as a UI concept ("digital detection"
  marker), rather than only a generic warning.
- Runs the **same open-source geometry/relevance/TTC/risk logic on both the
  phone and the server**, using smartphone GPS as the ingestion source, with an
  explicitly modular adapter layer so V2V/V2X/roadside/radar sources can be
  substituted later without changing the relevance/TTC/risk logic itself.
- Treats **Bluetooth/BLE strictly as an optional local-proximity confirmation**,
  never as a location source — a design choice made specifically to avoid the
  common but technically unsound conflation of "nearby BLE beacon" with
  "accurate 100–200m position," which this document explicitly flags as a
  limitation to avoid rather than a feature to claim.

## Technical problem addressed
Existing consumer navigation apps show other users' locations (e.g. ride-hailing,
fleet apps) but do not classify that location against the *driver's own,
momentarily degraded, visual detection range* — the same GPS distance is either
irrelevant or a hazard depending on fog density, and general navigation apps do
not compute or surface that distinction.

## Potential differences / candidate novel mechanisms (not verified against a
patent search — for internal discussion only)
1. Explicit **VISUAL RANGE vs DIGITAL DETECTION RANGE** duality as the primary
   UI/UX and alerting concept, driven by a live or user-set fog-visibility value.
2. A **prototype relevance classifier** (ahead/behind/left/right + high/
   potential-risk/low) computed purely from GPS heading geometry, deliberately
   documented as an approximation and not a lane-level claim.
3. A single shared, testable "core" ruleset used identically by both the
   client and the server, so risk classification is consistent regardless of
   which device computes it — relevant to how such a system might be certified
   or audited later.

## Explicitly NOT claimed
- Not claimed as first-ever, novel, or patentable as a whole.
- Not claimed to provide lane-level accuracy.
- Not claimed that Bluetooth alone can locate a vehicle at range.
- Not claimed to meet any official road-safety or automotive-grade standard —
  all thresholds in `shared/core/config.js` are demo/prototype values.

A real novelty assessment requires a professional prior-art/patent search;
this document is a development-time record, not a legal opinion.
