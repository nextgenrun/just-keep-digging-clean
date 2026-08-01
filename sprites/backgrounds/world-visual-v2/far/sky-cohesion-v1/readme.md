# Sky Cohesion v1

Twenty approved 1672x941 opaque WebPs cover five horizontal world chapters and
four flight altitudes:

- western: stormbreak, aurora shelf, base flight corridor, mist valleys;
- Level 1: quiet departure, ruin beacons, cloud reef, cyan approach;
- central: cloud veil, star river, open aurora, horizon saddle;
- Level 2: stormbreak corridor, chain citadels, ruin belt, forge haze;
- eastern: crimson atmosphere, Heavenblock ascent, thunder sea, expedition
  overlook.

`values/worldVisualSkyCohesion.js` owns the exact file inventory and selection
grid. `WorldVisualSkyCohesionLayer` builds a complete native-density 28x12
overlap field. All twenty images are retained and used. The renderer selects
the clean 1254x705 inner frame from each 1672x941 source, excluding only the
baked dark edge and never enlarging a source pixel. Columns select the nearest
authored west-to-east chapter center, while rows select the nearest authored
altitude center. Far/open sky therefore remains above upper structures,
mid-atmosphere, and lower horizon/ground art instead of shuffling mountains
through unrelated locations.

Every real left/right/top/bottom neighbor receives a generated smoothstep
weight. Adjacent weights are exact complements and are ADD-composed over one
opaque world-space matte; they sum to one along edges and at four-card corners.
Outer world edges stay fully opaque, so neither a fold nor clear color can
appear. The quarter-frame 314x176 overlap gives neighboring horizons enough
shared area to read as one painting. Per-source multiplicative atmosphere
grades bring the daylight, crimson, and storm outliers into the same live
weather palette without baking replacements. Cards remain fixed in world space
and never follow the camera.

These files are additive production copies of the visually approved assets in
`visual-approval-previews/sky-underground-game-ready-assets-v1/`. The runtime
contract verifies byte-identical SHA-256 hashes against those review sources.
