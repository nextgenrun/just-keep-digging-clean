# Town Visual Benchmark

The approved moonlit NPC town and continuous natural earth establish the minimum
visual target for later world regions.

## Art benchmark

- Painterly high-detail silhouettes with clear far, middle, and near depth.
- Cool moonlit environment separated from warm local windows and lanterns.
- Natural material variation without visible square repetition or grid borders.
- Scenery remains fixed to authored world coordinates rather than following the player.
- No hard viewport edges inside an approved region.

## Gameplay contract

- `WorldModel` remains authoritative for type, HP, collision, air, and save state.
- The facade covers every pristine solid cell in the approved region, hiding the square base-tile artwork.
- A dug tile removes its facade on the next visual refresh.
- Resource and special identity is re-composed as a compact marker above the continuous soil rather than restoring a full square tile.
- Damage stages retain the authoritative crack progression above opaque scenic material, without revealing square base-tile art.
- Drops, mining timing, collision, and progression do not depend on scenic assets.

## Current town reference

- Source: `sprites/backgrounds/start-zone-scenic-v1/npc-town-scenic-composite-v2.webp`; the original mockup remains pixel-aligned across the first 13 tiles and a mirrored continuation fills tile 14 without stretching it.
- World span: 14 visible tiles from the left world edge; gameplay alignment remains the original 13-tile mockup span.
- Ground facade: ten rows across the complete Level 1 surface, 2,800 independently state-driven cells (`x0..279 / ty65..74`).
- Ground runtime: nine native-94px v2 chunks under `sprites/backgrounds/world-scenic-regions-v1/level1-ground-facade-*-v2.webp`; Boot loads only the recognition atlas and town-start chunk, runtime keeps current plus one horizontal neighbor per side, and every cell is exactly one tile so a dug hole has no neighboring bleed.
- Resource/special recognition: smaller transparent relief atlas including subtle stone identity and distinct geode/relic/glow silhouettes; structural bedrock/cave-wall placeholder stars are forbidden and missing marker sources fail the build.
- Living backdrop: pooled, world-anchored cool mist/aura and warm smoke/steam motion now spans both authored regions (`x0..279 / ty65..2064`); high sky clouds drift and softly bob behind gameplay at far-background depth.
- Full-depth streaming: the final Level 1 row remains inside ordered camera bounds and loads its authored depth chunk.
- Visual refresh: immediate authoritative renderer invalidation; revisited chunks rebuild from `WorldModel`, so no 2,800-cell recurring audit is retained.
- Runtime rollback: `?level1Facade=0` restores the former town-only facade; `?townScenic=0` removes the town plate; `?worldFacade=0` removes the streamed material facade below row 74; `?worldLiving=0` disables authored-region ambience (`?level1Living=0` is retained as an alias); `?deepWorldLiving=0` disables separated Level Two ambience; `?worldMotion=0` disables every optional motion pass.

## Port acceptance gate

A new region is not promoted until it matches the town's depth, lighting, material
richness, world anchoring, seamless ground treatment, digging response, and special
tile readability in live gameplay.
