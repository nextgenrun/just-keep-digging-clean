# v7-30 Halo Clean Detail Pass v3

Review-only pass for reducing green/black haloing and visible pixelation in v7-30 rendered assets.

No source images, TSX files, TMX files, or runtime loaders were changed.

- Manifest: `exports/ai-enhanced/v7-30-runtime-preview/detail-pass-v3-halo-clean/2026-07-03-v7-30-halo-clean-detail-pass-v3-manifest.json`
- Contact sheet: `exports/ai-enhanced/v7-30-runtime-preview/detail-pass-v3-halo-clean/contact-sheets/2026-07-03-v7-30-halo-clean-v3-contact-sheet.jpg`
- Zoom crop sheet: `exports/ai-enhanced/v7-30-runtime-preview/detail-pass-v3-halo-clean/contact-sheets/2026-07-03-v7-30-halo-clean-v3-zoom-crops.jpg`

## Samples
- `industrial-magma-l01-base-colour`: `exports/ai-enhanced/v7-30-runtime-preview/detail-pass-v3-halo-clean/enhanced/industrial-magma-l01-base-colour-halo-clean-v3.png` (v2 3984x456 -> v3 7968x912, green edge 0.0->0.0, dark edge 0.0->0.0)
- `industrial-magma-l02-atmospheric-depth`: `exports/ai-enhanced/v7-30-runtime-preview/detail-pass-v3-halo-clean/enhanced/industrial-magma-l02-atmospheric-depth-halo-clean-v3.png` (v2 3984x464 -> v3 7968x928, green edge 0.0->0.0, dark edge 0.0->0.0)
- `industrial-magma-l03-far-light`: `exports/ai-enhanced/v7-30-runtime-preview/detail-pass-v3-halo-clean/enhanced/industrial-magma-l03-far-light-halo-clean-v3.png` (v2 3984x460 -> v3 7968x920, green edge 0.0->0.0, dark edge 0.0->0.0)
- `sky-horizon-glow`: `exports/ai-enhanced/v7-30-runtime-preview/detail-pass-v3-halo-clean/enhanced/sky-horizon-glow-halo-clean-v3.png` (v2 8192x2048 -> v3 8192x2048, green edge 0.621->0.621, dark edge 3.653->3.651)
- `sky-nebula-veil`: `exports/ai-enhanced/v7-30-runtime-preview/detail-pass-v3-halo-clean/enhanced/sky-nebula-veil-halo-clean-v3.png` (v2 4096x4096 -> v3 4096x4096, green edge 1.321->1.321, dark edge 4.026->4.032)
- `sky-base`: `exports/ai-enhanced/v7-30-runtime-preview/detail-pass-v3-halo-clean/enhanced/sky-base-halo-clean-v3.png` (v2 4096x4096 -> v3 4096x4096, green edge 0.002->0.011, dark edge 10.722->13.08)
- `meteor-streak-cluster`: `exports/ai-enhanced/v7-30-runtime-preview/detail-pass-v3-halo-clean/enhanced/meteor-streak-cluster-halo-clean-v3.png` (v2 3328x2064 -> v3 6656x4128, green edge 0.009->0.001, dark edge 26.301->6.678)
- `vine-arch`: `exports/ai-enhanced/v7-30-runtime-preview/detail-pass-v3-halo-clean/enhanced/vine-arch-halo-clean-v3.png` (v2 1500x1160 -> v3 3000x2320, green edge 31.725->6.579, dark edge 10.713->7.263)

## Review Notes
- Use the zoom crop sheet first; the last column composites v3 on a black background so the preview is easier to judge in the game's dark context.
- Prop cutouts and industrial magma strips are output at 2x the v2 dimensions for this preview; large sky/background plates stay at v2 size to avoid impractical texture sizes.
- This is still not wired into gametime. Approve specific assets before any loader/TMX substitution work.
