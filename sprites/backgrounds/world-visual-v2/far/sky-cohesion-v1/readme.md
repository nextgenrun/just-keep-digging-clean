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
grid. `WorldVisualSkyCohesionLayer` builds a complete native-scale 18x8 overlap
field without cropping or enlarging the art. All twenty images are used, with
balanced seven/eight-use repetition being the minimum needed to cover the full
world at source density. Only incoming left/top edges feather over an opaque
retained card; outer world edges remain opaque, so no join or sky boundary can
reveal clear color. Cards remain fixed in world space and never follow the
camera.

These files are additive production copies of the visually approved assets in
`visual-approval-previews/sky-underground-game-ready-assets-v1/`. The runtime
contract verifies byte-identical SHA-256 hashes against those review sources.
