# World v11 Background Test Assets

High-resolution visual references and section assets for the Tiled-only v11 background test.

- Source gameplay tiles: `exports/dig-game-world-edit-v-7-30-06-2026-;layered.tmx`
- Target test map: `exports/dig-game-world-edit-v-11-08-07-2026-;1-img-test.tmx`
- These assets are not wired into game time until the complete background set is visually approved.
- The v11 composition master covers the full Level 1 depth using ten 250-row bands with 25-row alpha-feathered overlaps.
- Surface band 1 spans tiles x=0..158 and pins its painted NPC ground to tile row 65; underground bands span the authored mine at x=41..158.
- Generated source bands are normalized to 32 source pixels per tile; Tiled scales them to the map's 94-pixel tile grid using exact integer tile coordinates.
