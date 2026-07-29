# Sky and Underground Cohesion Runtime

Date: 2026-07-28

Runtime correction: 2026-07-29

## Outcome

The approved thirty-file visual library is wired into scenic-v2 additively:

- twenty opaque 1672x941 sky plates;
- ten transparent 1536x1024 underground foreground plates.

No existing production asset was overwritten, moved, removed, or deregistered.
The original `moonlit-mountain-forest-v1.png` remains the continuous sky base.
Every underground biome retains its five existing terrain-variation plates,
cap atlas, ground structures, material field, backdrops, and motion assets.

## Sky composition

`values/worldVisualSkyCohesion.js` is the placement SSOT. It maps five
horizontal world chapters and four air bands to twenty fixed world anchors.
Every complete plate is assigned exactly once.
`WorldVisualSkyCohesionLayer` streams only cards intersecting the expanded
world window and never derives a card position from the camera.

The original cell-fill implementation enlarged the 1672x941 sources by
roughly 3.4x to 4.2x. The corrected renderer displays every complete frame at
0.88 source density with no cover crop, no aspect distortion, and no
enlargement. The shared four-edge irregular mask feathers each card into the
continuous retained sky beneath it; the base intentionally fills space between
authored cards. The layer renders at depth `-9.6`, above the retained far base
at `-10` and below clouds at `-8.8`.

Use `?skyCohesion=0` for an isolated comparison.

## Underground composition

`values/worldVisualTerrainVariation.js` preserves the original five V4 plates
in every region's `plates` pool and registers one separate `cohesionPlate`.
`WorldVisualTerrainCohesionView` gives that plate one deterministic world
placement in its matching biome. All ten are reachable exactly once.

The initial 24x16-tile placement enlarged each 1536x1024 source about 1.47x.
The corrected dedicated image uses its complete frame at 0.88 source density.
It renders at depth `0.16`, above the retained opaque material/backdrop stack,
and uses both the authored transparent edge feather and authoritative terrain
geometry mask. Ten distinct horizontal anchors distribute the paintings across
their playable corridors; the five deep-biome cards no longer sit at the
Level 1 x=28 anchor outside Level 2. It can decorate solid terrain but cannot
become a randomly selected complete background, paint dug air, or change
gameplay. The original five plates, cap atlases, ground structures, opaque
backdrops, motion cards, and material fields remain active.

Use `?undergroundForegroundCohesion=0` to remove only the ten dedicated
paintings. `?undergroundTerrainVariation=0` continues to disable the complete
terrain-variation system.

## Verification

`testing/2026-07-28-sky-underground-cohesion-runtime-contract.mjs` verifies:

- 20 unique sky paths and 10 unique underground paths;
- production copies are SHA-256-identical to the approved review files;
- exact WebP dimensions and expected opacity/alpha;
- all twenty sky cards are unique, world anchored, and reachable;
- sky and underground display scale never exceeds source density;
- every card preserves its complete authored frame and aspect ratio;
- every sky card retains its four-edge raster feather mask;
- all ten underground paintings have unique dedicated biome placements;
- all five deep-biome paintings remain wholly inside the Level 2 corridor;
- no cohesion painting enters an opaque/material plate selection pool;
- the original far asset path and original five-card biome pools remain;
- both independent rollback selectors;
- scenic runtime create, sync, update, and destroy lifecycle wiring.
