# Underground biome baked motion V2 — rejected

Status: rejected review evidence.

This folder contains the ten composition-locked painted keyframe-B images used
to create the V2 optical-flow loops. The paintings remain useful, but all ten
WebMs were rejected for choppy movement and deformation. `index.html` preserves
the actual rejected files; it does not redraw motion with Canvas, HTML elements,
or Phaser Graphics.

## Review

Serve the repository over HTTP and open:

`/visual-approval-previews/underground-biome-baked-motion-v2/index.html`

Only one rejected file decodes at a time. The buttons switch immutable review
evidence, and the pause control freezes that file rather than substituting an
effect.

## Runtime

- Rejected evidence:
  `sprites/backgrounds/world-visual-v2/depth/biome-motion-v2/`
- Builder:
  `ai-tools/2026-07-26-build-underground-biome-baked-motion-v2.py`
- Source plates:
  `../underground-biome-motion-mockups-v1/2026-07-26-*.png`
- Generated keyframes:
  `2026-07-26-*-keyframe-b-v2.png`
- ImageGen prompts and source/output mapping:
  `2026-07-26-imagegen-prompt-manifest-v2.md`

Each rejected loop is 1536 × 1024, VP9, 24 fps, four seconds and silent.
Production does not register, preload, stream, or play these files. The live
biome pools contain only the fifty approved WebPs. Authoritative collision
terrain remains the WorldModel ground in front.
