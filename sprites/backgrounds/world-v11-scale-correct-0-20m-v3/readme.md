# V11 Scale-Correct 0–20m Backgrounds

Approval-only Tiled background generation for
`exports/dig-game-world-edit-v-11-08-07-2026-;1-img-test.tmx`.

- `sources/` contains newly generated art sources.
- `chunks/` contains native 94-pixels-per-tile WebP pieces used by Tiled.
- `v11-scale-correct-0-20m-v3.tsx` is the generated image-collection tileset.
- Tiled uses 90 independently placed image objects; AI-painted panels are at most
  13 tiles (1,222px) wide so they are never enlarged across oversized spans.
- Ground line: TMX row 105.
- Character scale: 0.8 tile = 1.70m.
- Physical tile scale: 2.125m per tile.
- Door/entry/exit scale: exactly 1 tile.
- Fence height: 0.30 tile, visibly below the character.
- Generation cutoff: exactly 20m below ground, TMX row 114.4117647.
- The prior deeper background group stays underneath; the final 0.75 tile fades
  into it, and hiding this new group is the visual rollback.

This asset set is not wired into game-time.
