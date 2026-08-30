# World map UI assets

- `world-map-frame-foundation-v1-source.png` is the approved image-generated chroma source.
- `world-map-frame-foundation-v1.png` is the runtime RGBA frame.
- `world-map-symbol-atlas-v1-source.png` is the authored six-symbol ImageGen source.
- `world-map-symbol-atlas-v1.png` is the 3x2 runtime spritesheet for player,
  landmark, Titan, portal, biome, and resonance annotations.

The central viewport is intentionally transparent. Terrain, fog, player position,
labels, activities, and controls are runtime layers and must not be baked into the frame.
