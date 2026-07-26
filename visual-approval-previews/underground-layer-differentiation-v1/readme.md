# Underground Layer Differentiation V1

Review-only gameplay mockups for improving underground biome identity without
changing `WorldModel`, digging, collision, saves, HUD layout, player scale, or
the hard-black exploration contract.

- `reviewOnly: true`
- `productionChanged: false`
- Generated with the built-in ImageGen workflow on 2026-07-26.
- Edit target: `ai-tools/2026-07-17-steam-screenshot-04-torchlit-depths.png`.
- Art-direction reference: the existing V11 underground approval package.

## Mockups

### Blue Caverns

`2026-07-26-blue-caverns-layer-mockup-v1.png`

Final prompt direction: preserve the exact live gameplay composition and
solid/air silhouette; add a dim blue far-cavern void, midground rock arches and
crystal silhouettes, sparse cyan navigation lights, restrained mist, and dark
edge-only foreground occluders. Keep the player, HUD, geometry, and unexplored
blackness unchanged.

### Amber Depths

`2026-07-26-amber-depths-layer-mockup-v1.png`

Final prompt direction: preserve the exact live gameplay composition and
solid/air silhouette; add distant amber mineral windows, faint abandoned mining
silhouettes, layered rock arches, suspended dust, localized gold emissive
landmarks, and a cool-shadow/warm-local-light hierarchy. Avoid a flat orange
wash.

### Pressure Foundry

`2026-07-26-pressure-foundry-layer-mockup-v1.png`

Final prompt direction: preserve the exact live gameplay composition and
solid/air silhouette; add a deep Level 2 foundry void with distant pressure
pipes, lift frames, furnace pools, midground industrial ribs, steam, obsidian
gameplay terrain, and localized ember light. Avoid neon sci-fi treatment and
uniform red grading.

## Layer Contract Demonstrated

1. Far void or cavern plate.
2. Slow midground silhouette plane.
3. Authoritative solid-terrain facade.
4. Resource, special-block, and damage feedback.
5. Region-specific emissive and atmospheric pass.
6. Sparse edge-only foreground occluders.
7. Darkness and torch compositor above the world presentation.

Nothing in this folder is preloaded, registered, or referenced by Phaser.
Promotion requires selecting a direction, splitting it into production layer
assets, and validating the result behind a reversible runtime flag.
