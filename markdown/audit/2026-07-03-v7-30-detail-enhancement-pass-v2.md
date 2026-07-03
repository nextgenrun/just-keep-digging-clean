# v7-30 Detail Enhancement Pass v2

More visible review-only pass for assets referenced by `exports/dig-game-world-edit-v-7-30-06-2026-;layered.tmx`.

No source images, TSX files, TMX files, or runtime loaders were changed.

- Manifest: `exports/ai-enhanced/v7-30-runtime-preview/detail-pass-v2/2026-07-03-v7-30-detail-enhancement-pass-v2-manifest.json`
- Contact sheet: `exports/ai-enhanced/v7-30-runtime-preview/detail-pass-v2/contact-sheets/2026-07-03-v7-30-detail-pass-v2-contact-sheet.jpg`
- Zoom crop sheet: `exports/ai-enhanced/v7-30-runtime-preview/detail-pass-v2/contact-sheets/2026-07-03-v7-30-detail-pass-v2-zoom-crops.jpg`

## What Changed
- This pass is intentionally stronger than the first conservative upscale.
- It smooths block edges, increases local contrast, sharpens structure, and adds deterministic source-colored texture detail.
- The output is still source-preserving in path and composition, but it is not ready to wire automatically until visually approved.

## Samples
- `industrial-magma-l01-base-colour`: `exports/ai-enhanced/v7-30-runtime-preview/detail-pass-v2/enhanced/industrial-magma-l01-base-colour-detail-v2.png` (delta vs v1 7.93, edge gain 5.04x)
- `industrial-magma-l02-atmospheric-depth`: `exports/ai-enhanced/v7-30-runtime-preview/detail-pass-v2/enhanced/industrial-magma-l02-atmospheric-depth-detail-v2.png` (delta vs v1 8.93, edge gain 3.722x)
- `industrial-magma-l03-far-light`: `exports/ai-enhanced/v7-30-runtime-preview/detail-pass-v2/enhanced/industrial-magma-l03-far-light-detail-v2.png` (delta vs v1 9.99, edge gain 3.382x)
- `sky-horizon-glow`: `exports/ai-enhanced/v7-30-runtime-preview/detail-pass-v2/enhanced/sky-horizon-glow-detail-v2.png` (delta vs v1 9.88, edge gain 3.779x)
- `sky-nebula-veil`: `exports/ai-enhanced/v7-30-runtime-preview/detail-pass-v2/enhanced/sky-nebula-veil-detail-v2.png` (delta vs v1 14.15, edge gain 1.034x)
- `sky-base`: `exports/ai-enhanced/v7-30-runtime-preview/detail-pass-v2/enhanced/sky-base-detail-v2.png` (delta vs v1 5.3, edge gain 5.634x)
- `meteor-streak-cluster`: `exports/ai-enhanced/v7-30-runtime-preview/detail-pass-v2/enhanced/meteor-streak-cluster-detail-v2.png` (delta vs v1 4.4, edge gain 2.329x)
- `vine-arch`: `exports/ai-enhanced/v7-30-runtime-preview/detail-pass-v2/enhanced/vine-arch-detail-v2.png` (delta vs v1 11.15, edge gain 1.94x)

## Review Notes
- Use the zoom crop sheet first; it shows source pixel zoom, smoothed source zoom, v1, and v2 side by side.
- The industrial magma strips remain aspect-ratio problems in the TMX; this pass improves texture detail but does not solve wrong display shape.
- If this is still not enough, the next step should be a separate generative image-edit pass for selected assets, labeled as drift-risk experimental.
