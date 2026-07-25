# Dynamic Soil Tiles

Runtime source package for the composited 94px soil tilesheet built by
`world/rendering/WorldRenderer.js`.

- `bases/` and `deep-bases/` contain depth-band base variants.
- `overlays/` contains hardness, rarity, damage, and material overlays.
- `previews/` contains contact sheets and tiled-repeat checks.
- `generated-sources/` preserves intermediate generation inputs.

Asset keys and composition rules remain authoritative in `values/dynamicSoil.js`
and `values/assetKeys.js`; do not hand-wire preview assets into runtime.
