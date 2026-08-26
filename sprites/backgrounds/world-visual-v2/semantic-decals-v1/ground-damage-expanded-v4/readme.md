# Expanded ground damage V4

Production package for the optimized expanded damage library. V4 combines the
sixteen retained V3 structural motifs with three new sixteen-motif ImageGen
sheets: compression/impact, directional shear/split, and brittle/delamination.

The deterministic builder emits four raster severity anchors for each of the
64 motifs. Runtime interpolates alpha and scale across the existing twelve HP
states and applies coordinate-stable right-angle rotation/reflection, producing
far more combinations without storing 768 full-size structural frames.

The response atlas contains four cumulative tiers for every tile identity in
`TILE_DESTRUCTION_FX_CONFIG.familyByTile`. This keeps exact tile tint and final
destruction FX in the same material language.

This package is visual-only. It does not own tile HP, collision, rewards,
destruction, world generation, or saves.

Runtime atlases:

- `../ground-damage-fracture-expanded-v4.png`: 256 frames, 3008 x 3008,
  tier-major order (`tier * 64 + motif`).
- `../ground-damage-response-expanded-v4.png`: 132 frames, 3008 x 1692,
  tier-major order (`tier * 33 + exact profile`).

The default route is V4. Use `?groundDamageAtlas=v3`,
`?groundDamageAtlas=v2`, or `?groundDamageAtlas=legacy` for progressively older
atlas pipelines; `?groundDamage=legacy` restores the radial renderer.
