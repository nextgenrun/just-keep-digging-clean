# ImageGen ground damage v1

Production material-neutral damage overlays for the scenic world renderer.

- Ten genuinely authored damage families.
- Twelve cumulative proportional-HP states per family.
- 120 unique transparent frames in total.
- Strict orthographic top-down 2D artwork.
- No holes, craters, missing terrain, baked ground squares, or collision ownership.
- One deterministic family is selected per world coordinate and remains fixed
  while that tile advances through states 1 to 12.

`sources/` preserves the accepted built-in ImageGen chroma sheets.
`alpha-sheets/` preserves the soft-matted, despilled RGBA sheets.
`manifest.json` pins the state-major frame order, coverage, source provenance,
runtime outputs, and SHA-256 hashes.

The runtime atlas is:

`../ground-damage-imagegen-v1.png`

Its frame formula is:

`frame = stateIndex * 10 + variantIndex`

Rebuild the atlas, manifest, and QA boards with:

```powershell
python ai-tools/2026-07-29-build-ground-damage-imagegen-v1.py
```

Runtime modes:

- default: ImageGen atlas
- `?groundDamage=procedural`: previous four-layer procedural renderer
- `?groundDamage=legacy`: original radial crack comparison

`WorldModel` remains authoritative for HP, tile type, digging, collision,
rewards, and saves. The art works with current and future ground materials
because every frame is a transparent overlay.
