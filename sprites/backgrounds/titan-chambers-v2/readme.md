# Titan Chambers v2

Production high-resolution environmental cards for the 25 visual-only Cave
Titans.

- Runtime cards are opaque 1536x848 WebP images.
- Each card preserves its compact v1 Titan identity while giving it a unique
  authored chamber.
- Cards stream only near their discovery zone or while their discovered archive
  entry is selected.
- Compact v1 alpha sprites remain the Boot-loaded thumbnail, surface-miniature,
  and `?titanChambers=0` rollback assets.
- These images never define terrain, collision, rewards, stats, combat, or save
  authority. Live terrain remains in front and masks the cards.

ImageGen source PNGs and provenance live in `sources/`. The dated promotion tool
normalizes sources, writes runtime WebP cards, validates dimensions, and builds
the visual-QA contact sheet.
