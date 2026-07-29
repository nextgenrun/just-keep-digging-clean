# Whole-World Visual Expansion V5

This additive review and production package contains 50 scenic backgrounds, 40 underground terrain paintings, and 10 surface-ground edge sources. Every previous V2/V3/V4 asset remains installed.

## Runtime ownership

- Scenic cards are non-colliding background only.
- Terrain plates, exposed caps, and surface strips are clipped by the existing authoritative solid-terrain mask.
- No asset changes tile type, HP, collision, drops, resources, save data, or world layout.
- `?biomeBackdropExpansionV5=0`, `?undergroundTerrainExpansionV5=0`, and `?surfaceGroundVariation=0` independently restore the exact prior pool for each layer.

## Seam treatment

Background cards use a 16-frame irregular feather mask. Each next biome starts
128 px inside the previous raster composition and enters through that irregular
mask. Terrain plates use 192x128 px low-frequency irregular feathers and the
same 128 px depth-band overlap. Surface strips overlap by 192 px, fade into the
installed base ground, and are never mirrored.
