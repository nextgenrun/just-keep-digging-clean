# Modular Surface Props Runtime V1

**Date:** 2026-07-26  
**Status:** approved Variant C direction wired for Level 1 and Level 2  
**Runtime panorama:** none  
**Gameplay/state changed:** false

## Outcome

The complete playable surface now has a deterministic, camera-streamed prop
layer built from separate high-quality ImageGen cutouts. Level 1 uses moonlit
village wood, slate, rope, canvas, and restrained plants. Level 2 reuses the
same readable silhouettes in basalt, blackened iron, ash canvas, ember glass,
and heat-resistant vegetation.

The review panoramas are not loaded. Every well, wagon, pergola, bench,
handcart, supply stack, fence, plant cluster, and lantern remains an individual
sprite that can be moved, replaced, culled, or disabled independently.

[Open the full physical-scale kit](../visual-approval-previews/2026-07-26-modular-surface-props-scale-sheet-v1.png)

## Scale and clearance contract

- Authoritative player height: 1.75 m.
- Authoritative visible player height: 0.8 tile at 94 px per tile.
- World scale: approximately 42.97 px per meter.
- Existing approved village door: 2.10 m.
- Walk-through pergola clearance: 2.20 m.
- No placement has a manual or randomized scale multiplier.
- Props retain at least 2.25 source pixels per displayed world pixel.

| Prop | Physical height | Runtime height |
|---|---:|---:|
| well | 2.50 m | 107.4 px |
| wagon | 2.35 m | 101.0 px |
| pergola | 2.40 m | 103.1 px |
| bench | 0.95 m | 40.8 px |
| handcart / supplies | 1.10 m | 47.3 px |
| fence | 0.78 m | 33.5 px |
| plants | 0.68 m | 29.2 px |
| lantern | 2.25 m | 96.7 px |

## Placement and ground contract

- 68 explicit authored placements: 28 Level 1 and 40 Level 2.
- Required coverage spans are `x0..132` and `x132..280`.
- The approved town and the tunnel/bridge/Arc Core transition count as existing
  authored coverage; new props do not overlap those protected interaction pads.
- The coverage audit permits no visual gap larger than 0.5 tile; the current
  authored layout peaks at approximately 0.30 tile.
- Each sprite samples support beneath its left, center, and right footprint.
  Missing support or more than 2 px of ground disagreement skips and reports
  that placement instead of floating it.
- All images use bottom-center origin and a one-pixel terrain sink so their
  contact edge meets the rendered ground exactly.

## Layering, streaming, and safety

- Rear, mid, and restrained front lanes provide depth without turning props
  into collision or obscuring the whole player route.
- Only the camera window plus a four-tile horizontal margin is alive.
- Moving underground destroys active surface sprites.
- The layer changes no world cell, HP, collision, physics, input, resource,
  reward, progression, merchant, portal, or save value.
- Level 2 runtime assets use lossless, alpha-preserving v2 tone variants so
  dark structures remain readable against the forest. The untouched v1 files
  remain beside them as reversible sources.

## Rollback and inspection

- Full removal: `?surfaceProps=0`
- Level 1 only off: `?surfacePropsL1=0`
- Level 2 only off: `?surfacePropsL2=0`
- Runtime snapshot: `window.__jkdSurfaceProps.snapshot()`
- Save-safe cluster review: add `?jkd_e2e=1`, then press
  `Ctrl+Alt+F10`; plain `F10` remains the existing benchmark sequence.

## Verification

`testing/2026-07-26-surface-props-contract.mjs` passes and covers:

- 18 unique live preload keys and paths;
- exact source dimensions and alpha-bearing WebP encoding;
- physical scale, door/opening clearance, and source density;
- 68 unique scale-free placements and protected-zone exclusion;
- exact support beneath all 68 footprints in the deterministic production world;
- complete two-level coverage;
- flat, missing, and uneven terrain support behavior;
- camera creation/cleanup, tint, depth, and underground removal;
- preload/runtime/destroy lifecycle wiring;
- global and per-level rollback controls.

Candidates 301–350 remain deferred. They were not silently bundled into this
approved prop foundation.
