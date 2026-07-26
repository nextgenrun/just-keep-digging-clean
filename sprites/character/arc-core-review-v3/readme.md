# Arc Core Review v3

High-quality, review-only Arc Core artwork and presentation assets.

This package supersedes v2 inside `tanktest-v1`. It does not alter production
vehicle registration.

## Pipeline

1. ImageGen originals live in `source/`.
2. Transparent, normalized art is packed into editable `.piskel` documents.
3. `pipelines/piskel/2026-07-26-build-arc-core-piskel-package.py` reads those
   documents back, verifies the fixed anchors, and creates `runtime/`.
4. `values/arcCoreReview.sprite.json` is updated with runtime hashes and loads
   the package in Phaser.

The master machine bodies never change between animation phases. Motion comes
from independent authored raster layers positioned against the same anchor.
