# World Visual v2

Production source plates for the scenic-v2 world renderer.

- `far/moonlit-mountain-forest-v1.png`: opaque far parallax plate.
- `mid/town-row-hero-v1.png`: alpha town midground aligned by its door baseline.
- `surface/town-surface-edge-v1.png`: alpha walk-surface cap aligned to the authoritative floor row.
- `materials/town-dark-earth-v1.png`: continuous terrain material for the surface mine.
- `depth/shallow-cavern-backwall-v1.png`: streamed opaque shallow-cavern plate covering runtime rows 65..159.
- `sources/`: retained chroma-key generations used to produce the alpha assets.

These are layered runtime sources, not flattened HTML mockups. Geometry, digging, damage, and resource authority remain in `WorldModel`.
