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
grid. `WorldVisualSkyCohesionLayer` assigns each complete image to one fixed
world anchor at 0.88 source density. It does not crop or enlarge the art. A
four-edge irregular feather merges every card into the original
moonlit-mountain plate underneath, so gaps are continuous scenery rather than
stretched filler. The twenty images are each used once and never follow the
camera.

These files are additive production copies of the visually approved assets in
`visual-approval-previews/sky-underground-game-ready-assets-v1/`. The runtime
contract verifies byte-identical SHA-256 hashes against those review sources.
