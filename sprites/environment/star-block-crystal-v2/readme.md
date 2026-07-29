# Star Block Crystal V2

Production Choice 1 Star Block art.

The six normalized 512 px black-backed PNGs are deterministic derivatives of
the already approved ImageGen floating cores in
`../star-block-destruction-v1/`. They preserve the exact cyan, lavender, gold,
orange, turquoise, and violet rarity order.

The same normalized images drive both:

- the live 256 px beauty/emissive atlas frames under
  `sprites/backgrounds/world-visual-v2/semantic-decals-v1/`; and
- the upward collected-star release.

This shared source keeps the block and release visually identical. The live
block remains on its 94 px tile envelope; the approved refinement starts the
released core fully appears at the same 94 px envelope, then grows to about 136 px
during its calmer ascent. Phaser may position, scale, alpha-fade, rotate
slightly, and use SCREEN/ADD blending. It must not procedurally redraw or tint
the star.

Rebuild with:

```powershell
python ai-tools/2026-07-28-build-star-block-crystal-v2.py
```

`star-block-crystal-v2.manifest.json` pins the six original ImageGen sources,
crop boxes, runtime outputs, atlases, proof image, and SHA-256 hashes.
