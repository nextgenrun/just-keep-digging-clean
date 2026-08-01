# V11 Sky Islands

Production art for the two authored portal platforms defined by
`values/v11SkyIslandLayout.js`.

- `level1-platform.webp` and `level2-platform.webp` are the complete island
  bases.
- `level1-eclipse-gate.webp` and `level2-eclipse-gate.webp` are the exact
  four-slot portal visuals.
- The alpha PNGs and `sources/` chroma images are retained build provenance;
  runtime loads only the WebPs.
- Platform collision, portal slots, arrival tiles, and interaction state remain
  authoritative in the world/config systems. Decorative sky props are
  presentation-only and must keep their complete rendered bounds outside every
  portal slot and arrival clearance zone.

