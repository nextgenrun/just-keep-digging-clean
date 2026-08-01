# Piskel ground damage V2

Production provenance for the approved ten-family, twelve-state ground-damage
atlas. The game loads `../ground-damage-piskel-anchor-v2.png` by default through
`WorldVisualDamageImagePainter`.

Runtime contract:

- atlas: 1880 x 2256 RGBA;
- frame: 188 x 188;
- layout: ten variant columns by twelve damage-state rows;
- frame index: `(stateNumber - 1) * 10 + variant`;
- logical display: one centered 94 x 94 tile;
- transform seed and pivot: `94,94`.

Use `?groundDamageAtlas=legacy` to load the retained ImageGen V1 atlas through
the same painter. Use `?groundDamage=legacy` for the older procedural radial
renderer. Both switches are presentation-only. Reload the page after changing either
query because both atlases intentionally share one production texture key.

Editable registered and polished Piskel projects remain under
`exports/piskel/ground-damage-anchor-v2-review/` and are never game-loaded.
