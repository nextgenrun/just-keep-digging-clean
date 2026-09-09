# Ground Observatory Background Pack V1

Review-only runtime assets generated from scratch with the approved Heavenblocks
Observatory panel used only as composition and art-direction reference.

- `observatory-static-base-v1.webp` owns the immutable moon, mountains, forest,
  and terrain silhouette. Runtime code never displaces this texture.
- Ten manifest-selected `observatory-atmosphere-*-v1.png` files are independent
  alpha cloud and mist sprites. They stream in one direction and reset only
  while fully offscreen. Two empty generated cells are excluded.
- `observatory-star-ids-v1.png` keeps individual stars above the authored
  mountain skyline and excludes the fixed moon.
- `manifest-v1.json` records hashes, dimensions, source provenance, and the
  zero-reference-pixel contract.

The generated sources remain in Codex's generated-image store. Rebuild with
`ai-tools/2026-08-31-build-ground-observatory-background-pack.py` and explicit
`--base-source`, `--cloud-source`, and `--output` arguments.

The accepted built-in generation prompts are recorded in
`2026-08-31-imagegen-prompts.md`.

Town Square video content is not read or modified by this pack.
