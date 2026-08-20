# Survival animation global polish v1 — audit summary

## Scope and invariants

The audit executed against the current-default Survival/UAL profile and its real
Phaser animation registry. It covers 78 animation keys, 1,617 referenced frame
instances, 22 unique spritesheets, and 81 active/runtime-relevant handoff edges.

The pass preserves animation keys, source clips, frame order, source frame rate,
contact frames, 31x75 collision geometry, movement authority, and the approved
prone-v3 flight. The rejected Blender `MINER_run` is not loaded or restored.

## Before and after

| Gate | Before | After |
|---|---:|---:|
| Defined animation keys | 78 | 78 |
| Animations measurable from real loaded sheets | 77 | 78 |
| Referenced frame instances | 1,617 | 1,617 |
| High active-runtime findings | 1 | 0 |
| Run stride | 1.55 tiles | 1.12 tiles |
| Marker-derived stride target | 1.115 tiles | 1.115 tiles |
| Foot-skating proxy | 40.862 px/cycle | 0.442 px/cycle |
| Standing quickslash apparent height | 77.918 px | 76.488 px |
| Largest audited active transition anchor seam | — | 4.066 px |
| Active transitions above 5 px anchor seam | — | 0 |
| Largest loop seam | — | 0.961 px |
| Loops above 4 px seam | — | 0 |
| Display-size cell range | 101–123 px | 101–123 px |
| Collision body | 31x75 px | 31x75 px |

## Family coverage

| Family | Animations | Result |
|---|---:|---|
| Transitions and recoveries | 11 | No active seam above 5 px; largest is fall-to-land at 4.066 px |
| Idle, crouch, wall poses | 19 | Lean-wall registration restored; idle baseline is locked |
| Mining and combat | 26 | Existing body-locked contacts and approved source timing retained |
| Abilities and other actions | 10 | Frame order, timing, and collision authority retained |
| Locomotion | 2 | Active run baseline remains zero-drift; cadence fitted to foot markers |
| Airborne and flight | 8 | Exact prone-v3 loop retained; continuous-flight graph audited correctly |
| Reactions and death | 2 | No baseline drift introduced |

## Implemented corrections

1. The active run now uses a Survival-profile-only 1.12-tile stride. At the
   normal 200 px/s body speed this changes playback from 1.281x to 1.773x and
   matches the 1.115-tile rig-marker travel without changing a single sprite
   frame.
2. `leanAgainstWallSheet` now points to the actually loaded approved Blender
   idle sheet. The 48-frame lean-wall loop therefore registers in real Phaser,
   bringing measurable coverage from 77/78 to 78/78.
3. The quality-v1 standing jab/quickslash cell is calibrated from 109 to 107 px.
   Its visible height now stays within 2.496 px of every 123 px moving variant,
   restoring the existing 3 px family-continuity gate without exceeding the
   123 px detail ceiling.
4. The audit graph now respects `continuousFlightLoop: true`; dormant
   enter/exit edges are not misreported as active production transitions.

## Review notes, not active defects

- The registered standby Blender walk loop has 3.656 px of alpha-baseline
  variation. Production grounded movement selects the approved `run` role,
  whose baseline drift is 0 px. The walk pixels were intentionally left
  unchanged because altering the approved motion source would violate the
  current-animation retention boundary.
- Landing, crouch, roll, and ground-strike frames briefly have a smaller
  vertical silhouette because the character compresses or rotates. Their
  display cell remains within 101–123 px; globally enlarging those frames would
  create size pops and exceed the reviewed detail ceiling.
- The wall-brace exit travels 10.81 px horizontally inside its authored exit
  animation. Its runtime handoff seam remains below the 5 px gate, so this is
  intentional wall-release motion rather than body drift.

## Evidence

- `before-inventory.json` and `after-inventory.json`: exact runtime registry,
  frame sequences, sheets, scales, origins, contacts, and handoff graph.
- `before-measurements.json` and `after-measurements.json`: per-animation alpha
  geometry, drift, seams, family summaries, and marker-derived skating data.
- `visual-approval-previews/2026-08-14-survival-animation-global-polish-v1/01-run-skating-before-vs-after.mp4`:
  synchronized moving-ground proof using the same approved frames and speed.
- `archive/2026-08-14-survival-animation-global-polish-v1/`: byte-exact source
  rollback for the two runtime files changed by this pass.
