# Fire Light Piskel polish V1

Production-change QA for the ten editable Fire Light V3 Piskel projects.

- `01-before-after-anchor-grid.png` shows every source and polished frame.
  Orange circles mark measured anchors, pink crosshairs mark group targets,
  and green circles show the registered result.
- `02-drift-summary.png` compares the maximum source and polished anchor range
  for every atlas.

The largest pre-polish group range was 79.57 px. Every accepted group is now
within 0.98 px without scaling or interpolation, while the four intentional
environment/state rows retain their separate identities.

These boards are evidence only. Phaser loads the verified 4x4 atlases from
`sprites/environment/fire-light-v3/`.
