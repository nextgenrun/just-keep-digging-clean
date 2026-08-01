# Dynamic Soil Overlays

Transparent source overlays composited into the runtime soil tilesheet by
`world/rendering/WorldRenderer.js`.

- `crack-stage-1.png` through `crack-stage-5.png` are the five tile-damage
  stages.
- Hardness, rarity, material, and root overlays add deterministic soil
  variation without changing tile gameplay state.
- Runtime keys, stage counts, composition order, dimensions, and placement
  contracts belong in `values/dynamicSoil.js` and `values/assetKeys.js`.
- Editable Piskel sources and review evidence must stay outside this runtime
  folder; only validated exports are promoted here.
