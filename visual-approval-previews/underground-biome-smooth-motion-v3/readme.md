# Underground biome smooth motion V3

Status: review only; production unchanged.

This folder contains one temporal-quality prototype for Weathered Roots. It
uses the exact approved 1536x1024 source painting and moves the complete image
through a subpixel affine sample before encoding an eight-second 60 fps H.264
loop.

It deliberately excludes:

- optical flow;
- painted-frame morphing;
- generated in-between art;
- Canvas, Phaser Graphics, particles, mist, or emissive overlays;
- CSS animation;
- production asset registration.

Open:

`/visual-approval-previews/underground-biome-smooth-motion-v3/index.html`

Rebuild:

`python ai-tools/2026-07-26-build-underground-biome-smooth-motion-v3.py`

The generated manifest records `reviewOnly: true` and
`productionChanged: false`. Do not generate the other nine biomes or wire this
candidate until its temporal quality is explicitly approved.
