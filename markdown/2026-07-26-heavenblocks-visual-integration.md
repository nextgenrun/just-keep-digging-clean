# Heavenblocks Native World Integration

**Date:** 2026-07-26
**Corrected:** 2026-07-28
**Scope:** Three playable upward regions, relic access, component progression,
and tile-native presentation

Cloud Reef and Angel Heavenblock live in Level 1; Devil Eclipse Scar lives in
Level 2. Their 21x12 masks are inserted into the authoritative `WorldModel`.
Every solid cell owns a real type, HP, collision, reward, save identity, and
digging lifecycle.

## Runtime ownership

- `values/heavenblocksWorldConfig.js` owns region positions, collision masks,
  material palettes, safe arrivals, relic/core cells, and biome tile styling.
- `HeavenblockTileVisualLayer` renders one real 94x94 image per live cell.
  Material cells use the same stone, ore, and five-stage damage assets as the
  main mine. Exposed island geometry uses the approved sky-island top, corner,
  and underside tiles.
- `HeavenblockArtifactVisualLayer` renders the three visible relic caches,
  component hearts, and vault markers over their mineable backing cells.
- `HeavenblockWorldVisualSystem` owns distant atmosphere and the existing
  portal art. Painted façade concepts are never loaded or sliced at runtime.

Destroying a cell immediately hides that tile and recomputes the four adjacent
surface/edge roles. `WorldModel` remains authoritative for collision and save
restoration; presentation never creates substitute collision.

## Progression

Three permanent relic discoveries activate the Sky Altar. Cloud Reef is the
first route. Completing its component heart unlocks the later region routes;
Devil Eclipse Scar additionally respects Level 2 access. Installed components
are then checked by the existing Arc/Omega Core crafting recipes.

## Reversible comparison and QA

- `?heavenblocksVisuals=0` restores the ordinary WorldRenderer tile view.
- `?heavenblocksGameplay=0` disables the feature without rewriting save data.
- `?relicGuidance=0` disables relic guidance presentation only.
- With `?jkd_e2e=1`, `Ctrl+Alt+H` cycles through the three live regions for
  visual QA without changing progression.
