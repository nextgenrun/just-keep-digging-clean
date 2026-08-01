# ImageGen ground damage v1 QA

- `01-library-120-states.png` shows all ten authored families across all twelve
  cumulative states at native 94 px gameplay size.
- `02-all-materials-runtime-scale.png` composites a fixed family per row over
  every currently registered world material. It verifies that a tile's family
  does not change while its HP state advances.

These are review outputs only. Runtime uses the transparent 188 px atlas in
`sprites/backgrounds/world-visual-v2/semantic-decals-v1/`.
