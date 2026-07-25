# V11 Background Relief POC V3

Review-only comparison of the existing high-detail V11 `level1-silver-core-detail.png` background.

- The left panel shows the untouched source artwork.
- The right panel shows the same artwork with an aligned derived height map, GPU parallax displacement, and restrained relief lighting.
- This tests background depth only. It does not generate tiles, props, replacement artwork, or Meshy models.
- Nothing in this folder is loaded by the game. Approval is required before any Phaser integration.

Rebuild `silver-core-depth-map.png` with `ai-tools/2026-07-15-build-v11-background-relief-poc.py`.
