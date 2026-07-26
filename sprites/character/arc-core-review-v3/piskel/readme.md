# Piskel Sources

Editable Piskel documents generated from the approved Arc artwork.

- `arc-core-body-and-fx-v3.piskel`: fixed 512 x 512 body, energy, cloud, beam,
  and impact frames.
- `arc-core-stage-tiles-v3.piskel`: four fixed 512 x 512 world tile frames.
- `arc-core-stage-background-v3.piskel`: the 1280 x 720 background plate.

Each project contains `jkdAlignment` metadata with role order, anchor pixels,
alpha bounds, and a zero-drift policy. The build fails if a role changes
canvas size, frame order, or anchor.
