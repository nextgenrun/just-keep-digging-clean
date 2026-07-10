# Current Prop Faithful Cleanup

Preview-only matte cleanup and upscale from exact current gametime-loaded props.

No source images, TMX/TSX files, or runtime loaders were changed.

- Manifest: `exports/ai-enhanced/v7-30-runtime-preview/current-prop-faithful-cleanup/2026-07-03-current-prop-faithful-cleanup-manifest.json`
- Full sheet: `exports/ai-enhanced/v7-30-runtime-preview/current-prop-faithful-cleanup/contact-sheets/2026-07-03-current-prop-faithful-cleanup-full.jpg`
- Zoom sheet: `exports/ai-enhanced/v7-30-runtime-preview/current-prop-faithful-cleanup/contact-sheets/2026-07-03-current-prop-faithful-cleanup-zoom.jpg`

## Samples
- `prop_048_eclipse_gate`: current 822x616 -> cleanup 3072x2302, `exports/ai-enhanced/v7-30-runtime-preview/current-prop-faithful-cleanup/enhanced/prop_048_eclipse_gate-faithful-cleanup.png`
- `prop_050_endcore_orb`: current 295x285 -> cleanup 2360x2280, `exports/ai-enhanced/v7-30-runtime-preview/current-prop-faithful-cleanup/enhanced/prop_050_endcore_orb-faithful-cleanup.png`
- `prop_026_glowing_geode_arch`: current 332x287 -> cleanup 2656x2296, `exports/ai-enhanced/v7-30-runtime-preview/current-prop-faithful-cleanup/enhanced/prop_026_glowing_geode_arch-faithful-cleanup.png`
- `prop_030_prism_shard_totem`: current 165x324 -> cleanup 1320x2592, `exports/ai-enhanced/v7-30-runtime-preview/current-prop-faithful-cleanup/enhanced/prop_030_prism_shard_totem-faithful-cleanup.png`
- `prop_015_spore_lantern_stalk`: current 185x321 -> cleanup 1480x2568, `exports/ai-enhanced/v7-30-runtime-preview/current-prop-faithful-cleanup/enhanced/prop_015_spore_lantern_stalk-faithful-cleanup.png`
- `prop_016_vine_arch`: current 375x290 -> cleanup 3000x2320, `exports/ai-enhanced/v7-30-runtime-preview/current-prop-faithful-cleanup/enhanced/prop_016_vine_arch-faithful-cleanup.png`
- `prop_019_root_chandelier`: current 255x349 -> cleanup 2040x2792, `exports/ai-enhanced/v7-30-runtime-preview/current-prop-faithful-cleanup/enhanced/prop_019_root_chandelier-faithful-cleanup.png`
- `prop_033_hanging_cables`: current 271x310 -> cleanup 2168x2480, `exports/ai-enhanced/v7-30-runtime-preview/current-prop-faithful-cleanup/enhanced/prop_033_hanging_cables-faithful-cleanup.png`
- `prop_028_luminous_reed_cluster`: current 328x298 -> cleanup 2624x2384, `exports/ai-enhanced/v7-30-runtime-preview/current-prop-faithful-cleanup/enhanced/prop_028_luminous_reed_cluster-faithful-cleanup.png`
- `prop_036_reactor_vent`: current 334x280 -> cleanup 2672x2240, `exports/ai-enhanced/v7-30-runtime-preview/current-prop-faithful-cleanup/enhanced/prop_036_reactor_vent-faithful-cleanup.png`

## Review Notes
- This pass compares the same current gametime prop against the cleanup at the same visible sheet scale.
- Zoom tiles intentionally enlarge the current crop with nearest-neighbor sampling so source pixelation is visible.
- The cleanup removes low-alpha green/black matte contamination before upscaling, then applies only mild local contrast so the prop does not drift into a different design.
