# Surface Prop Worldbuilding Implementation V2

## Purpose

The original five camera-width frames bridged the approved surface-world
direction to the authored Phaser composition. The 2026-07-30 extension now
covers all seven Level 2 chapters with actual PlayScene default-versus-rollback
captures. Every sheet remains review evidence rather than a runtime background:
transparent landmarks, live terrain, lighting, player, portals, Titans, and
collision remain separate.

The first `v2` sequence established the camera compositions but rendered the
miner too small. The `v3-scale-correct` sequence is the current reference and
uses the production native-player target of 0.8 terrain tile for judging every
other silhouette.

## Current camera sequence

1. `2026-07-29-01-arrival-forge-camera-composition-v3-scale-correct.png`
   establishes a dominant forge shelter, two compact work clusters, and an
   open eastbound route.
2. `2026-07-29-02-starwell-camera-composition-v3-scale-correct.png` keeps the
   portal interior and approach empty while bookending it with west garden and
   east apothecary work.
3. `2026-07-29-03-observatory-camera-composition-v3-scale-correct.png` groups
   the telescope, chart, dial, weights, vane, and restrained lantern into one
   low-profile instrument court with a wide skyline release.
4. `2026-07-29-04-frontier-camera-composition-v3-scale-correct.png` compresses
   gardening and survey work into the west side, preserves the middle walking
   lane, and uses the next caravan silhouette as an eastward handoff.
5. `2026-07-29-05-far-east-camera-composition-v3-scale-correct.png` composes a
   wagon handoff, rear telescope, hero shelter, and two low supply clusters
   around a clean travel route.

## Runtime translation

- Every chapter has one retained hero anchor above player scale.
- Selected V3 props remain support silhouettes below player height.
- Six-prop chapters use exactly two rear, two mid, and two front placements;
  four-prop chapters use one rear, one mid, and two grounding fronts.
- V3 surface opacity is 82% rear, 95% mid, and 100% front.
- A 1.32 `feature` variant is reserved for one or two structurally important
  support silhouettes per chapter; density is checked at each actual authored
  use.
- No prop pulses, bobs, sways, rotates, drifts, fades, or resizes after
  creation.
- Titan Walk, portal interiors and approaches, Heavenblock interactions,
  tunnel, bridge, Arc Core, and flight-lane exclusions remain authoritative.
- Any 14-tile gameplay camera is capped at eleven combined retained and V3
  props, preventing another asset-dump composition.

## Actual runtime comparison

The five `2026-07-29-runtime-*-camera-v3.png` files remain the original direct
PlayScene evidence. The seven dated `2026-07-30-live-*-before-after-v4.png`
sheets add identical-camera rollback and production captures for Arrival Forge,
Caravan Rest, Starwell, Timberwright, Observatory, Frontier Survey, and Three
Kings. The combined overview is
`2026-07-30-live-seven-chapter-before-after-overview-v4.png`.

The production side uses one physically scaled hero landmark per chapter while
suppressing eight retained and sixteen V3 placements that would overlap or
compete. This reduces the combined surface composition from 84 earlier prop
placements to 67 retained/support/hero silhouettes. Backgrounds, terrain, HUD,
player, weather, portal logic, Titan Walk, and collision are unchanged.

The live QA recorded all seven default textures resident, zero invalid contacts,
zero UI errors, zero browser exceptions, and complete texture/placement rollback
under `?surfaceHeroLandmarksV4=0`. Runtime does not load any comparison sheet as
a background.

## Review boundary

`reviewOnly: true`; `productionChanged: true`. None of these PNGs or the prompt
manifest is registered, preloaded, or loaded by Phaser. Production recreates
the approved hierarchy through authored prop selection, tile positions,
physical scale, lane depth, opacity, grounding, and protected clear zones.

Runtime rollback remains `?surfacePropsV3=0` for the new supporting layer and
`?surfaceProps=0` for the retained primary-anchor layer.