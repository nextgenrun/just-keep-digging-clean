# Heavenblocks v1 Runtime Art

**Date:** 2026-07-26
**Status:** Native diggable-world progression integration
**Gameplay systems changed:** World generation, mining, access, persistence, rewards, and crafting

This folder retains the atmospheric and objective-art split derived from the
three approved upward-progression mockups:

- `lower-sky-backdrop-v1.png` and `lower-sky-facade-v1.png`
- `angel-heavenblock-backdrop-v1.png` and
  `angel-heavenblock-facade-v1.png`
- `devil-eclipse-backdrop-v1.png` and `devil-eclipse-facade-v1.png`

Each biome has an opaque painterly backdrop and a transparent concept façade.
Only the backdrop is loaded by the game, at distant atmosphere depth. It never
supplies collision, materials, digging, or island silhouettes.

The three `*-facade-v1.png` files are retained as review provenance only. They
are not preloaded, cropped, stamped, or rendered at runtime. Production island
foregrounds come from real 94px material/HP tiles plus
`sprites/tiles/approved-world/sky-island-{top,corner,under}.webp`, all masked by
the authoritative live `WorldModel`.

The three 512px component-heart sprites are production objectives embedded in
the island tile grid:

- `aether-turbine-heart-v2.png`
- `halo-regulator-heart-v2.png`
- `eclipse-crucible-heart-v2.png`

`values/heavenblocksWorldConfig.js` is the shape/material/location SSOT. Two
islands live in Level 1 and one in Level 2. Mining each component heart drives
`HeavenblocksProgressionSystem`; the component is no longer awarded by a
standalone shrine interaction. Relics are cumulative and never consumed.

The `sources/` folder retains chroma-key and transparent alpha masters.
Rebuild runtime relic, component, and heart art with
`ai-tools/2026-07-26-build-heavenblocks-progression-assets.py`.
