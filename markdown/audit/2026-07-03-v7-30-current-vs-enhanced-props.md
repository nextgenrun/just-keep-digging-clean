# v7-30 Current vs Enhanced Props

Side-by-side comparison of current gametime-loaded props versus the enhanced candidates.

No source images, TSX files, TMX files, or runtime loaders were changed.

- Manifest: `exports/ai-enhanced/v7-30-runtime-preview/prop-current-comparison/2026-07-03-v7-30-current-vs-enhanced-props-manifest.json`
- Full sheet: `exports/ai-enhanced/v7-30-runtime-preview/prop-current-comparison/contact-sheets/2026-07-03-v7-30-current-vs-enhanced-props-full.jpg`
- Zoom sheet: `exports/ai-enhanced/v7-30-runtime-preview/prop-current-comparison/contact-sheets/2026-07-03-v7-30-current-vs-enhanced-props-zoom.jpg`

## Samples
- `prop_048_eclipse_gate`: current `exports/dig_game_runtime_bg_props_v1/sprites/background-props/generated-runtime-v1/prop_048_eclipse_gate.webp` vs enhanced `exports/ai-enhanced/v7-30-runtime-preview/prop-detail-examples/enhanced/prop_048_eclipse_gate-prop-detail-example.png`
- `prop_050_endcore_orb`: current `exports/cleaned/dig_game_palette_clean_overwrite_runtime_v3/sprites/background-props/generated-runtime-v1/prop_050_endcore_orb.webp` vs enhanced `exports/ai-enhanced/v7-30-runtime-preview/prop-detail-examples/enhanced/prop_050_endcore_orb-prop-detail-example.png`
- `prop_026_glowing_geode_arch`: current `exports/cleaned/dig_game_palette_clean_overwrite_runtime_v3/sprites/background-props/generated-runtime-v1/prop_026_glowing_geode_arch.webp` vs enhanced `exports/ai-enhanced/v7-30-runtime-preview/prop-detail-examples/enhanced/prop_026_glowing_geode_arch-prop-detail-example.png`
- `prop_030_prism_shard_totem`: current `exports/cleaned/dig_game_palette_clean_overwrite_runtime_v3/sprites/background-props/generated-runtime-v1/prop_030_prism_shard_totem.webp` vs enhanced `exports/ai-enhanced/v7-30-runtime-preview/prop-detail-examples/enhanced/prop_030_prism_shard_totem-prop-detail-example.png`
- `prop_015_spore_lantern_stalk`: current `exports/cleaned/dig_game_palette_clean_overwrite_runtime_v3/sprites/background-props/generated-runtime-v1/prop_015_spore_lantern_stalk.webp` vs enhanced `exports/ai-enhanced/v7-30-runtime-preview/prop-detail-examples/enhanced/prop_015_spore_lantern_stalk-prop-detail-example.png`
- `prop_016_vine_arch`: current `exports/cleaned/dig_game_palette_clean_overwrite_runtime_v3/sprites/background-props/generated-runtime-v1/prop_016_vine_arch.webp` vs enhanced `exports/ai-enhanced/v7-30-runtime-preview/prop-detail-examples/enhanced/prop_016_vine_arch-prop-detail-example.png`
- `prop_019_root_chandelier`: current `exports/cleaned/dig_game_palette_clean_overwrite_runtime_v3/sprites/background-props/generated-runtime-v1/prop_019_root_chandelier.webp` vs enhanced `exports/ai-enhanced/v7-30-runtime-preview/prop-detail-examples/enhanced/prop_019_root_chandelier-prop-detail-example.png`
- `prop_033_hanging_cables`: current `exports/cleaned/dig_game_palette_clean_overwrite_runtime_v3/sprites/background-props/generated-runtime-v1/prop_033_hanging_cables.webp` vs enhanced `exports/ai-enhanced/v7-30-runtime-preview/prop-detail-examples/enhanced/prop_033_hanging_cables-prop-detail-example.png`
- `prop_028_luminous_reed_cluster`: current `exports/cleaned/dig_game_palette_clean_overwrite_runtime_v3/sprites/background-props/generated-runtime-v1/prop_028_luminous_reed_cluster.webp` vs enhanced `exports/ai-enhanced/v7-30-runtime-preview/prop-detail-examples/enhanced/prop_028_luminous_reed_cluster-prop-detail-example.png`
- `prop_036_reactor_vent`: current `exports/cleaned/dig_game_palette_clean_overwrite_runtime_v3/sprites/background-props/generated-runtime-v1/prop_036_reactor_vent.webp` vs enhanced `exports/ai-enhanced/v7-30-runtime-preview/prop-detail-examples/enhanced/prop_036_reactor_vent-prop-detail-example.png`

## Review Notes
- The current gametime prop is resolved through the same cleaned prop directory that `BootScene` uses, except `prop_048_eclipse_gate.webp`, which uses the canonical portal path.
- Several enhanced candidates are not strict visual upgrades over the current gametime prop; compare the full sheet before approving any wiring.
- The neutral-background columns are the best place to spot remaining green/black leakage.
