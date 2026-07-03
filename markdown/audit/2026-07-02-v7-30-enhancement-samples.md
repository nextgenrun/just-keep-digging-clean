# v7-30 Enhancement Samples

Source-preserving preview pass for assets referenced by `exports/dig-game-world-edit-v-7-30-06-2026-;layered.tmx`.

No source images, TSX files, TMX files, or runtime loaders were changed.

- Manifest: `exports/ai-enhanced/v7-30-runtime-preview/samples/2026-07-02-v7-30-enhancement-samples-manifest.json`
- Contact sheet: `exports/ai-enhanced/v7-30-runtime-preview/samples/contact-sheets/2026-07-02-v7-30-enhancement-samples-contact-sheet.jpg`

## Samples
- `industrial-magma-l01-base-colour`: `exports/pallet-v9/dig_game_empty_backgrounds_and_separate_props_v1/sprites/backgrounds/l01_base_colour_field/industrial_magma_sanctum__l01__base_colour_field.png` -> `exports/ai-enhanced/v7-30-runtime-preview/samples/enhanced/industrial-magma-l01-base-colour-enhanced.png` (996x114 to 3984x456, mode `strip_upscale`)
- `industrial-magma-l02-atmospheric-depth`: `exports/pallet-v9/dig_game_empty_backgrounds_and_separate_props_v1/sprites/backgrounds/l02_atmospheric_depth/industrial_magma_sanctum__l02__atmospheric_depth.png` -> `exports/ai-enhanced/v7-30-runtime-preview/samples/enhanced/industrial-magma-l02-atmospheric-depth-enhanced.png` (996x116 to 3984x464, mode `strip_upscale`)
- `industrial-magma-l03-far-light`: `exports/pallet-v9/dig_game_empty_backgrounds_and_separate_props_v1/sprites/backgrounds/l03_far_light_volume/industrial_magma_sanctum__l03__far_light_volume.png` -> `exports/ai-enhanced/v7-30-runtime-preview/samples/enhanced/industrial-magma-l03-far-light-enhanced.png` (996x115 to 3984x460, mode `strip_upscale`)
- `sky-horizon-glow`: `sprites/backgrounds/background-database/sky-background-v3/sky-v3-horizon-glow.webp` -> `exports/ai-enhanced/v7-30-runtime-preview/samples/enhanced/sky-horizon-glow-enhanced.png` (2048x512 to 8192x2048, mode `strip_upscale`)
- `sky-nebula-veil`: `sprites/backgrounds/background-database/sky-background-v3/sky-v3-nebula-veil.webp` -> `exports/ai-enhanced/v7-30-runtime-preview/samples/enhanced/sky-nebula-veil-enhanced.png` (2048x2048 to 4096x4096, mode `background_upscale`)
- `sky-base`: `sprites/backgrounds/background-database/sky-background-v3/sky-v3-base.webp` -> `exports/ai-enhanced/v7-30-runtime-preview/samples/enhanced/sky-base-enhanced.png` (2048x2048 to 4096x4096, mode `background_upscale`)
- `meteor-streak-cluster`: `exports/dig_game_runtime_bg_props_v1/sprites/background-props/generated-runtime-v1/prop_003_meteor_streak_cluster.webp` -> `exports/ai-enhanced/v7-30-runtime-preview/samples/enhanced/meteor-streak-cluster-enhanced.png` (832x516 to 3328x2064, mode `prop_upscale`)
- `vine-arch`: `exports/dig_game_runtime_bg_props_v1/cleaned/dig_game_palette_clean_overwrite_runtime_v3/sprites/background-props/generated-runtime-v1/prop_016_vine_arch.webp` -> `exports/ai-enhanced/v7-30-runtime-preview/samples/enhanced/vine-arch-enhanced.png` (375x290 to 1500x1160, mode `prop_upscale`)

## Review Notes
- The two extreme industrial magma strips are conservative no-drift upscales. A display-fit attempt created visible repeated bands, so it was rejected for this sample pass.
- The worst v7-30 industrial placements still need either TMX placement/aspect correction or a separate generative large-panel pass if the near-square display shape is intentional.
- `background_upscale` and `prop_upscale` samples are conservative and should preserve identity better than generative reinterpretation.
- These files are not wired into gametime; they are visual candidates only.