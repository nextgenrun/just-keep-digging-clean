# Arc Core Piskel v3 Review

Review-only runtime-art mockups for the Small and Omega Arc directions.

- `2026-07-26-arc-core-piskel-v3-runtime-art-mockups.png` compares idle, dig,
  and cloud-exit states with the exact hashed runtime PNG roles.
- `captures/` contains the six clean 1280 x 720 source frames.
- The frames deliberately contain no HTML UI, debug shapes, ornamental HUD,
  or rejected border artwork.

These are deterministic asset-composition mockups, not browser screenshots.
They verify art hierarchy and authored-layer compatibility while the separate
live Phaser/browser capture remains the final in-engine presentation gate.

Historical reproduction only:

```text
python archive/2026-07-26-rejected-arc-review-random-art/tools/2026-07-26-build-arc-core-piskel-v3-mockups.py
python archive/2026-07-26-rejected-arc-review-random-art/tools/2026-07-26-build-legacy-arc-review-contact-sheet.py
```

Do not write the result back into active approval previews.
