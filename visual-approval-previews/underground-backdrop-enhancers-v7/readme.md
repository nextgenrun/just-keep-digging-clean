# Underground backdrop enhancers V7

This dated review library contains the 100 high-resolution background enhancer
overlays added on 2026-07-29.

- Ten assets belong to each of the ten retained underground biome bands.
- Every source and runtime asset is 1536 x 1024.
- The art is intentionally sparse. It augments an existing backdrop instead of
  replacing it.
- Runtime selection is stable per world card, motif-aware, and optional. Many
  backdrop cards intentionally receive no enhancer.
- Structural cards use normal blending. Sparse light, dust, ribbon, and curtain
  cards use restrained additive blending.
- The outer frame is transparent and receives an additional 192-source-pixel
  falloff to prevent visible card rectangles or fold seams.

Review outputs:

- `2026-07-29-backdrop-enhancers-contact-sheet-v7.jpg` shows processed alpha
  assets on a checkerboard.
- `2026-07-29-backdrop-enhancers-context-contact-sheet-v7.jpg` shows every
  enhancer over a retained backdrop from the correct biome.
- `2026-07-29-backdrop-enhancers-v7.json` records dimensions, occupied alpha,
  edge alpha, source hashes, runtime hashes, and paths.
- `2026-07-29-imagegen-prompt-manifest.md` records the generation contract and
  the complete named concept matrix.

Runtime files live in
`sprites/backgrounds/world-visual-v2/depth/biome-backdrop-enhancers-v7/`.
Use `?undergroundBackdropEnhancers=0` for an immediate additive-layer rollback.
