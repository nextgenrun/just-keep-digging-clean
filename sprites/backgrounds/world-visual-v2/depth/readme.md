# Scenic-v2 Level 1 Depth Backdrops

`shallow-cavern-backwall-v1.png` is the opaque production backwall for runtime
rows `65..159`. It was generated with the built-in image-generation workflow at
1536x1024, using the approved moonlit-town mockup only for material, lighting,
and finish quality and the existing Level 1 depth plate only for underground
composition language.

The production prompt requested a horizontally repeatable, side-view dark-rock
cavern recess with roots, embedded timber silhouettes, restrained cobalt and
amber lighting, and no sky, town, player, UI, resource symbols, tile grid,
green artifacts, or false playable platforms.

The complete Level 1 runtime uses the original surface plate plus:

- `level1-blue-backwall-a-v1.png` and `level1-blue-backwall-b-v1.png` for rows `160..519`;
- `level1-amber-backwall-v1.png` for rows `520..1039`;
- `level1-silver-backwall-v1.png` for rows `1040..1599`;
- `level1-magma-backwall-v1.png` for rows `1600..2064`.

Runtime picks variants deterministically across world-anchored 24x16 tile
segments. Only the active/intersecting region is decoded, with both neighboring
regions allowed at an exact depth boundary. The real `WorldModel` remains
authoritative for digging, collision, HP, resources, and saves. Use
`?levelOneBackdrops=0` or compatibility alias `?shallowCavern=0` to restore the
generic material backdrop.
