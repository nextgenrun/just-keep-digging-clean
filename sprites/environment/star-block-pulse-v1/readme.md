# Star Block Pulse V1

Six production ImageGen sprites for the rare long-range Star Block beacon.
Every source is a 1254x1254 RGB PNG on a near-pure black background so additive
blending preserves the authored bloom without procedural Phaser drawing.

Runtime rarity order:

1. `star-block-pulse-cyan-v1.png`
2. `star-block-pulse-lavender-v1.png`
3. `star-block-pulse-gold-v1.png`
4. `star-block-pulse-orange-v1.png`
5. `star-block-pulse-turquoise-v1.png`
6. `star-block-pulse-violet-v1.png`

The base ImageGen brief requested one centered, continuous 360-degree
star-energy wave with a fine pearl filament, feathered mineral bloom, uniform
black surround, and no central star, second ring, cross, rays, detached sparks,
text, logo, or watermark. The five derived prompts changed only the emissive
colour to match the production Star Block rarity atlas.

Phaser may preload, position, scale, alpha-fade, and additively composite these
sprites. It must not redraw, procedurally replace, tint, or add primitive
geometry to the pulse.
