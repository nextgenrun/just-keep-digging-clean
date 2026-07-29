# Starlight Talent Tree V3

Proportion-safe ImageGen runtime artwork for the shared ESC and Star Pillar
talent tree. V3 keeps the complete V2 asset set for rollback compatibility and
adds an authored ultra-wide page, live-copy plaques, and carousel controls.

## V3 presentation assets

- `starlight-ultrawide-foundation-v3.png` — native 2.39:1 page with three
  separated card alcoves, three integrated navigation bays, and a full-width
  inspection rail. It is reused by constellation and Engine pages.
- `navigation-plaque-idle-v3.png` and
  `navigation-plaque-selected-v3.png` — generated tab states behind live copy.
- `talent-ribbon-idle-v3.png` and `talent-ribbon-selected-v3.png` — generated
  card label states behind resource or Engine names and progress.
- `status-seal-v3.png` and `progress-plaque-v3.png` — generated state and footer
  surfaces.
- `carousel-left-v3.png`, `carousel-right-v3.png`,
  `carousel-step-idle-v3.png`, and `carousel-step-active-v3.png` — generated
  carousel controls; no text glyph or Phaser primitive substitutes are used.

The page shows three large cards at a time while retaining all five talents per
ability branch through left/right carousel selection. Phaser owns only live
text, interaction, alpha, and motion. `manifest-v3.json` pins dimensions,
alpha properties, and SHA-256 hashes for the complete inherited-plus-new pack.

Run `ai-tools/2026-07-29-build-starlight-talent-tree-v3.py` to rebuild it.
