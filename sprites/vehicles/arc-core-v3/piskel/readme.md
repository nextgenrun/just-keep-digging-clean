# Piskel Sources

Editable Piskel documents generated from the approved Arc artwork.

- `arc-core-body-and-fx-v4.piskel`: active fixed 512 x 512 body, energy, cloud,
  beam, and 2026-07-28 fracture-impact frames.
- `arc-core-body-and-fx-v3.piskel`: preserved pre-repair source for rollback.
- `arc-core-stage-background-v3.piskel`: the 1280 x 720 background plate.

Each project contains `jkdAlignment` metadata with role order, anchor pixels,
alpha bounds, and a zero-drift policy. The build fails if a role changes
canvas size, frame order, or anchor.

Run `pipelines/piskel/2026-07-28-update-arc-core-dig-impact-piskel.py` to rebuild
V4 from the preserved V3 roles plus the approved Small/Omega alpha sources.

The rejected stage-tile Piskel document is stored only in
`archive/2026-07-26-rejected-arc-review-random-art/piskel/`.
