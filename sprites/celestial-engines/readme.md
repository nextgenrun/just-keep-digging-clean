# Celestial Engine runtime art

These 512 px black-background cores were generated on 2026-07-26 for the
approved Star Heart mockups, then downscaled with high-quality filtering for
Phaser.

- `star-heart-core-v1.png` — selection and HUD Heart.
- `wayward-star-core-v1.png` — ricochet projectile.
- `hollow-sun-core-v1.png` — gravity corona; runtime adds an opaque black core.
- `comet-engine-core-v1.png` — directional tunnel projectile.
- `stellar-lance-projectiles-v1.png` — retired transparent 3×512 px ImageGen
  sheet for the sliced Violet Edge, Amethyst Surge, and Voidpiercer version.
- `stellar-lance-wave-blue-v1.png`, `stellar-lance-wave-purple-v1.png`, and
  `stellar-lance-wave-red-v1.png` — approved full-frame transparent wave art.
  Runtime cycles these once per mining action and never crops them.
- `stellar-lance-impact-purple-v1.png` — dedicated transparent contact burst;
  runtime tints it to the active wave and reveals one at each tile arrival. Its
  bright core is the authored pivot, while the top-to-core axis is rotated into
  the incoming wave direction.

The luminous pixels use additive blending in engine. Keep the source framing
and black edge pixels intact to avoid rectangular VFX fringes.
