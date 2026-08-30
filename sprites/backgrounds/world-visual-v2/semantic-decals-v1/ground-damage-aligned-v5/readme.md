# Aligned ground damage V5

Rejected comparison package for the fixed-registration ground-damage
expansion. V5
replaces the four scaled V4 raster anchors with twelve genuinely cumulative
fracture rasters per motif, all centered in the same 188 x 188 source frame and
drawn at the invariant 94 px gameplay footprint.

The deterministic builder emits:

- 24 crack motifs x 12 raster states = 288 fracture frames;
- 33 exact tile/resource profiles x 6 response tiers = 198 response frames;
- eight coordinate-stable right-angle and mirror transforms;
- 2,304 structural combinations before material response is counted.

Every fracture frame has a fixed center at `(94, 94)`, a 160 px maximum content
box, and a 7 px native safe inset. Runtime state scale remains `1.0`, so a crack
does not slide, shrink, or grow away from its tile/foreground sprite as damage
progresses.

Runtime atlases:

- `../ground-damage-fracture-aligned-v5.png`: 288 frames, 3008 x 3384,
  tier-major order (`state * 24 + motif`).
- `../ground-damage-response-aligned-v5.png`: 198 frames, 3008 x 2444,
  tier-major order (`tier * 33 + exact profile`).

The two atlases decode to 70,122,496 bytes, below the package's 72 MiB budget.
`manifest.json` pins source/output hashes, prompts, reference assets, frame
layouts, registration contracts, coverage, exact profile order, and rollbacks.

Universal V2 replaced all resource-specific response packages as the
production default on 2026-08-27. V5 is not normally preloaded;
`?groundDamageAtlas=v5` is retained only for local comparison and audit.

This package is presentation-only. Tile HP, digging, collision, rewards,
destruction, world generation, and saves remain owned by the existing domain
systems.
