# World Visual v2

Production source plates for the scenic-v2 world renderer.

- `far/moonlit-mountain-forest-v1.png`: opaque far parallax plate.
- `far/sky-cohesion-v1/`: twenty additive, complete native-density sky cards in
  a gap-free overlap grid. Balanced reuse covers the whole sky; deterministic
  incoming-edge crossfades retain an opaque card beneath every join.
- `mid/town-row-hero-v1.png`: alpha town midground aligned by its door baseline.
- `surface/town-surface-edge-thin-v2.png`: production 1672x48 approved-slate
  walk-surface cap, mirrored and overlapped across all 280 columns without
  owning collision.
- `surface/town-surface-edge-v1.png`: retained deeper natural-edge provenance.
- `materials/town-dark-earth-v1.png`: continuous terrain material for the surface mine.
- `depth/shallow-cavern-backwall-v1.png`: streamed opaque shallow-cavern plate covering runtime rows 65..159.
- `depth/foreground-cohesion-v1/`: ten additive alpha-foreground plates, one
  dedicated terrain-masked world placement per biome.
- `sources/`: retained chroma-key generations used to produce the alpha assets.

These are layered runtime sources, not flattened HTML mockups. Geometry, digging, damage, and resource authority remain in `WorldModel`.
