# Source

Accepted ImageGen source files for Arc Core production v3.

- `*-chroma.png` files are untouched generated originals.
- `*-alpha.png` files are chroma-keyed intermediates.
- The stage background has no alpha requirement.
- The `2026-07-28-small-arc-impact-v4-*` pair is the compact cyan electrical
  rock burst used by the 2x2 miner.
- The `2026-07-28-omega-arc-impact-v4-*` pair is the obsidian/violet lattice
  rupture used by the 8x8 miner.
- The rejected four-tile atlas and ornamental frame are archived outside this
  production package.

Runtime code must not load files from this directory.
