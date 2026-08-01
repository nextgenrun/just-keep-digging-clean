# Surface Hero Landmarks V4 Runtime

**Status:** Seven-chapter runtime composition complete, independently reversible, contract and live-QA validated  
**Date:** 2026-07-30

## Outcome

Every Level 2 surface chapter now has one high-resolution, physically scaled
hero landmark. These are separate transparent world assets, not flattened
backgrounds or HTML overlays.

| Chapter landmark | Production size | Physical height | Tile anchor | Distance / fade |
|---|---:|---:|---:|---|
| Arrival Forge shelter | 1207 x 896 PNG | 6.2 m | 155.2 | middle / 5% |
| Caravan Rest waystation | 1421 x 714 PNG | 5.7 m | 166.5 | middle / 5% |
| Starwell portal frame | 1149 x 1003 PNG | 8.1 m | 188.0 | portal middle / 3% |
| Timberwright lifting yard | 1145 x 923 PNG | 6.4 m | 207.6 | middle / 5% |
| Observatory telescope | 1174 x 1032 PNG | 8.7 m | 229.8 | middle / 5% |
| Frontier Survey pavilion | 1406 x 905 PNG | 5.4 m | 248.4 | middle / 5% |
| Three Kings overlook | 1344 x 954 PNG | 8.2 m | 262.8 | far / 17% |

The production player remains the authoritative 1.75 m character at 0.8 tile.
Every opening is visually player-scaled, every transform is static, and every
landmark remains behind the player render depth.

## Quality through subtraction

The live surface previously defined 46 retained placements plus 38 V3 support
placements. The seven-landmark composition suppresses eight retained and
sixteen V3 placements that duplicate, overlap, or compete with a landmark.
Adding the seven heroes therefore reduces the combined surface composition from
84 prior silhouettes to 67 rather than layering more art onto the world.

- Arrival Forge replaces its smaller shelter, scorched brace, and cooling
  trough while retaining edge supplies and the eastbound route.
- Caravan Rest unifies the former kitchen, wagon, saddle rack, cooking tripod,
  and water keg into one readable waystation.
- Starwell occupies the protected portal threshold without adding normal props
  to the portal approach.
- Timberwright replaces the smaller gantry, duplicate workbench, and rope spool;
  the outer stock and grindstone remain.
- Observatory replaces the older telescope and four instrument-court props.
- Frontier replaces the survey stand, irrigation jugs, tripod, and samples while
  retaining the garden edges and travel lanes.
- Three Kings remains a unified rear monument with nearby supplies, wagon, map
  cases, and climbing crate suppressed.

Level 1 town, Titan Walk, portals, gates, backgrounds, terrain, weather, player,
collision, drop-through behavior, and gameplay state are unchanged.

## Static quality and grounding

`WorldVisualSurfaceHeroLandmarkLayer` uses bottom-center origins, the existing
three-sample ground-contact resolver, native player-relative sizing, source
pixel-density validation, streamed visibility, and live day/night/weather tint.
It performs no pulse, bob, sway, rotation, random scale, runtime resize, physics,
or interaction mutation.

The full-canvas chroma and alpha masters remain under
`sprites/environment/surface-hero-landmarks-v4/sources/`. The dated preparation
tool trims transparent padding, validates the correct green or magenta key,
protects the Starwell opening, verifies existing-pixel parity, and writes exact
hashes to the package manifest.

## Rollback

Complete rollback:

`?surfaceHeroLandmarksV4=0`

This prevents all seven textures from preloading, skips the hero layer, and
restores every suppressed retained/V3 placement.

Independent comparison switches:

- `?arrivalForgeLandmarkV4=0`
- `?caravanLandmarkV4=0`
- `?starwellLandmarkV4=0`
- `?timberwrightLandmarkV4=0`
- `?observatoryLandmarkV4=0`
- `?frontierLandmarkV4=0`
- `?threeKingsLandmarkV4=0`

The older `?surfaceProps=0` and `?surfacePropsV3=0` switches remain independent.

## Validation and live evidence

Passing contracts:

- `testing/2026-07-30-surface-hero-landmarks-v4-contract.mjs`
- `testing/2026-07-30-surface-hero-landmarks-v4-runtime-contract.mjs`
- `testing/2026-07-26-surface-props-contract.mjs`
- `testing/2026-07-28-natural-surface-and-drop-through-contract.mjs`
- `testing/2026-07-28-additive-surface-landscape-contract.mjs`
- `testing/2026-07-29-surface-sky-props-v3-contract.mjs`

The live runner captured all seven chapters in default and complete-rollback
modes. It recorded seven resident hero textures in default, zero under rollback,
zero invalid ground contacts, zero UI errors, and zero browser exceptions. The
actual capture comparison is
`visual-approval-previews/surface-prop-worldbuilding-implementation-v2/2026-07-30-live-seven-chapter-before-after-overview-v4.png`.

The runtime canary still reports the pre-existing
`starlight-talent-tree-invariant` because its lazy UI textures are not resident
when PlayScene first samples that unrelated feature. No surface-landmark error
was reported or hidden.