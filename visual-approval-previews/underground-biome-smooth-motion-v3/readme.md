# Underground biome smooth motion V3

Status: approved temporal reference; promoted to production V3.

This folder preserves the approved temporal-quality reference for Weathered Roots. It
uses the exact approved 1536x1024 source painting and moves the complete image
through a subpixel affine sample before encoding an eight-second 60 fps H.264
loop.

It deliberately excludes:

- optical flow;
- painted-frame morphing;
- generated in-between art;
- Canvas, Phaser Graphics, particles, mist, or emissive overlays;
- CSS animation;
- any independent overlay or object-animation path.

Open:

`/visual-approval-previews/underground-biome-smooth-motion-v3/index.html`

Rebuild:

`python ai-tools/2026-07-26-build-underground-biome-smooth-motion-v3.py`

The reference manifest remains `reviewOnly: true` and
`productionChanged: false` because this folder is evidence, with
`status: approved`. The ten separately hashed production files and their
production manifest live under
`sprites/backgrounds/world-visual-v2/depth/biome-motion-v3/`.

Build all approved runtime loops with:

`python ai-tools/2026-07-26-build-underground-biome-smooth-motion-v3.py --production`
