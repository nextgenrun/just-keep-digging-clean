# Titan Chambers v2

Retained high-resolution source and rollback cards for the 25 visual-only Cave
Titans. Production streaming defaults to the organic-feather derivatives in
`../titan-chambers-v3/`.

- Rollback cards are opaque 1536x848 WebP images.
- Each card preserves its compact v1 Titan identity while giving it a unique
  authored chamber.
- `?titanChamberBlend=0` streams these opaque cards near a discovery zone or
  while a discovered archive entry is selected.
- Compact v1 alpha sprites remain the Boot-loaded archive thumbnail,
  underground footprint authority, and `?titanChambers=0` rollback assets.
- Surface collection creatures use the separate 768x768 cutouts in
  `../titan-surface-stances-v1/`; chamber cards are never repurposed there.
- These images never define terrain, collision, rewards, stats, combat, or save
  authority. Live terrain remains in front and masks the cards.

ImageGen source PNGs and provenance live in `sources/`. The dated promotion tool
normalizes sources, writes runtime WebP cards, validates dimensions, and builds
the visual-QA contact sheet. Exact prompt provenance is recorded in
`2026-07-26-imagegen-prompt-manifest-v2.md`; runtime hashes and encoded sizes
are recorded in `2026-07-26-titan-chambers-production-manifest-v2.json`.
No v2 source or runtime asset was overwritten by the seamless-edge pass.
