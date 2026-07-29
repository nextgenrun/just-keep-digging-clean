# Earthquake Dodge, FallZones, and World Layering

Date: 2026-07-28

Status: promoted to production and contract-tested.

## Result

Every damaging cave-in column is now independently validated before its warning
begins. A valid column becomes one authoritative FallZone with one ceiling
fracture, one predicted ground footprint, one authored falling boulder, one
leading-edge collision volume, and one grounded impact.

Major and cataclysmic collapses can no longer create hidden right-hand rocks at
collapse time. Current-frame walking or Flight movement resolves before the rock
collision check.

## Production sequence

1. The broad earthquake warning remains compact and auto-expiring.
2. At quake start, base ceiling candidates are selected near the world
   epicenter.
3. Collapse width is expanded immediately: minor/medium use one column, major
   uses two, and cataclysmic uses three.
4. Every expanded column independently requires a mutable ceiling, at least two
   air cells, at most eight air cells, and a real solid landing row.
5. Each accepted column receives a unique id, landing row, and 1,800 ms local
   warning.
6. An authored ceiling fracture appears at the source while an authored landing
   footprint pulses on the exact ground plane.
7. During the final warning stage, the exact tile plays the clearer authored
   fracture feedback.
8. At expiry, that one ceiling tile breaks, its world render updates, and the
   authored collapse feedback plays.
9. The authored boulder begins at the underside of the former ceiling and falls
   to the precomputed ground top.
10. Player walking/Flight movement updates before the leading-edge swept AABB
    collision.
11. On contact with the ground, a duplicate authored boulder squashes against
    the exact ground edge for one short settling beat while grounded authored
    impact debris blooms over it; both then fade.
12. The destroyed ceiling cell is queued to return as low-HP rubble after the
    existing delay. If occupied, it retries after 320 ms instead of disappearing.

## Coverage contract

| Intensity | Base cave-ins | Width | Maximum FallZones | Visual capacity |
|---|---:|---:|---:|---:|
| Minor | 0–1 | 1 | 1 | 24 |
| Medium | 1–2 | 1 | 2 | 24 |
| Major | 2–4 | 2 | 8 | 24 |
| Cataclysmic | 4–7 | 3 | 21 | 24 |

Both mechanics and presentation are capped at 24 concurrent FallZones, so the
maximum 21-rock cataclysmic event remains fully represented.

## Dodge geometry

The executable audit uses the live 94 px tile, 31 x 75 player body, 200 px/s
base movement, 0.62-tile rock hitbox width, and two-to-eight-tile fall.

| Measurement | Result |
|---|---:|
| Combined horizontal danger width | 89.28 px |
| Centered distance required to clear | 44.64 px |
| Base-speed clear time in open space | 223.2 ms |
| Falling time | 438.4–936.9 ms |
| Local warning start to impact | 2,238.4–2,736.9 ms |

The valid responses remain lateral movement, nearby cover, and held Shift
Flight. There is no jump action or jump-only counterplay.

## Collision and ground alignment

`earthquakeFallZoneMath.js` owns the Phaser-independent geometry.

- `resolveFallZoneGeometry()` refuses columns without a readable real landing.
- `expandFallZoneCandidate()` expands and validates wide collapses before
  warning.
- `rockSweptAabbCrossesBody()` sweeps the full rock hitbox from its previous
  bottom edge to its current bottom edge.

The rock model stores the ground top as `endY = landingTy * tileSize`. Its
authored image uses a 0.92 vertical origin, so the pointed boulder base meets
that ground top instead of hovering or sinking by a generic center offset.
At impact, a short 90 ms authored-boulder squash embeds only 0.04 tile into the
surface before fading. `EarthquakeRockImpactView.js` owns that bounded pool and
the impact debris with its separate ground-calibrated origin.

## Layer stack

| Layer | Depth | Role |
|---|---:|---|
| Cavern background | 0 or below | Ambient world |
| Terrain/base tiles | 0–2 | Collision world |
| Landing footprint | 18 | Danger beneath player |
| Ceiling fracture | 19 | Source warning |
| Player | 20 | Always readable |
| Falling boulder | 22 | Threat above player |
| Tile fracture/collapse | 23 | Exact damaged world cell |
| Settling boulder | 24 | Brief grounded contact |
| Impact debris | 25 | Brief foreground contact |
| Compact earthquake HUD | 3500 | Phase/status only |

No generated warning lanes, countdown circles, filled rectangles, or primitive
rock substitutes remain in the FallZone path.

## Tile damage clarity

The exact damaged cell now has two readable authored beats:

- last warning stage: `seismic-tile-fracture-v1.png` grows from the cell and
  holds long enough to read;
- destruction: `seismic-tile-collapse-v1.png` plays larger and longer after the
  renderer applies the destroyed cell.

Normal earthquake mutation damage uses the stronger fracture timing as well.
Rubble return retains its separate authored restoration sprite.

## Production assets

All nine earthquake assets preload through `getEarthquakeFeedbackPreloadAssets`.
The four promoted FallZone sprites are:

- `seismic-landing-footprint-v1.png`
- `seismic-ceiling-fracture-v1.png`
- `seismic-falling-boulder-v1.png`
- `seismic-impact-debris-v1.png`

Their retained transparent master and deterministic split script remain under
the review sandbox and `ai-tools/`.

## Validation

- `testing/2026-07-28-earthquake-dodge-audit.mjs`
- `testing/2026-07-13-earthquake-feedback-ui-smoke.mjs`
- `testing/2026-07-26-earthquake-feedback-lifecycle-contract.mjs`
- `testing/2026-07-28-earthquake-polish-and-suppression-contract.mjs`

These guard coverage, per-column validation, movement order, swept collision,
ground contact, authored asset loading, tile feedback, occupied-rubble retry,
UI expiry, and permanent Seismic Suppression.

## Remaining balance boundary

A direct rock hit still drains all current Gem Power and retains the existing
Hardcore consequence. This pass fixes visibility, attainability, collision
order, and presentation without silently changing that established damage rule.
