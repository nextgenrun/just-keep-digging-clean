# Milestone Pillar Concepts v1

This review-only Phaser canvas compares five ImageGen milestone-pillar
directions at five physical depth states. Open `index.html` through the local
server, or use:

`http://127.0.0.1:8080/visual-approval-previews/milestone-pillar-concepts-v1/`

Controls:

- `1`–`5`: select art direction.
- Left/right: select the 0m, 400m, 800m, 1200m, or 1600–2000m state.
- `U` or Enter: open the real production Milestone Pillar modal against the
  selected depth snapshot.
- Escape: close the modal.

The stage PNGs are split from the five transparent progression sheets by
`ai-tools/2026-07-26-build-milestone-pillar-review-assets.py`. Their differing
pixel heights are intentional: Phaser uses one shared pixels-per-meter scale,
so the structure grows instead of being normalized back to one size.

`milestone-pillar-five-option-runtime-contact-sheet.png` is the five-direction
comparison. `runtime-production-milestone-ui.png` records the production modal
after its pagination, typography, bounds, and foreground-layer fixes.

This folder itself remains review-only evidence. The user approved screenshot 1
(Option C, Dwarven Depth Engine) for the production Milestone Pillar and
screenshot 2 (Option A, carved blue slate) for the production Sky Island Star
Pillar on 2026-07-26. The exact transparent stages were copied under new runtime
names to `sprites/environment/approved-pillars-v1/`; BootScene never loads
assets from this preview folder. Options B, D, and E remain unselected.

The Star Pillar keeps the round sockets authored into Option A. Phaser fills
them with the existing approved Star Heart texture, a staggered glow pulse, and
a pop/beam celebration as saved constellation pairs are completed. This display
does not recreate collected stars in the persistent world.
