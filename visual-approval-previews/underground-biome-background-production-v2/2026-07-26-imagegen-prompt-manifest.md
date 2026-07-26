# ImageGen Prompt Manifest - Underground Biome Backgrounds V2

Date: 2026-07-26
Generation mode: built-in ImageGen
Output range: mockups 51-100
Production status: wired as scenic runtime backgrounds

## Shared production prompt

Create a new 1536x1024 side-view scenic background plate for a polished 2D
Phaser mining game. Use a cinematic, painterly, high-detail concept-art finish
with atmospheric depth, readable silhouettes, controlled glow, and dark values
that remain suitable for runtime lighting and tinting.

This is a background-only plate. Do not include a player, enemies, HUD, text,
torch vignette, terrain tiles, a playable floor, a close foreground ledge, a
platform, or any collision silhouette. Leave gameplay ground to the separate
opaque terrain renderer. Any bridge, building, ruin, root, rail, pipe, or
machine must read as distant scenic architecture embedded in the cave back
plane, softened by depth haze, and never as a foreground walkable surface.
Compose a continuous cave wall or chasm that tolerates cropping, alternating
mirrors, and partial masking by foreground terrain. No frame or border.

For prompts 51-95, the representative approved biome mockup was supplied only
as a style and palette reference; the requested composition remained a new
background-only plate. Prompts 96-100 used the same locked production contract
without an image reference.

## Variant directives

### Weathered Roots - rows 65-159

| # | Variant directive |
|---|---|
| 51 | Vast eroded root canyon, layered ancient roots spanning a damp earthen abyss, subtle fungal pinlights. |
| 52 | Drowned timber bridge network far across a flooded root cavern, rotten pylons and cool reflected haze. |
| 53 | Fungal lantern hollow, monumental roots framing distant mushroom lights and soft drifting spores. |
| 54 | Collapsed stone cistern swallowed by roots, broken arches and wet masonry receding into darkness. |
| 55 | Quiet loam pocket, restrained open cave space, braided roots, clay strata, sparse warm bioluminescence. |

### Blue Caverns - rows 160-519

| # | Variant directive |
|---|---|
| 56 | Deep cobalt crystal ravine with layered mineral needles and cold blue depth fog. |
| 57 | Suspended ice bridge in the far plane, crystalline spans crossing a blue-black chasm. |
| 58 | Water-veil chamber, distant translucent falls catching sapphire light without a foreground shoreline. |
| 59 | Cobalt ruins, ancient blue-stone towers and arches half buried in crystal growth. |
| 60 | Quiet sapphire pocket, broad negative space, smooth blue rock and sparse crystal glints. |

### Amber Depths - rows 520-1039

| # | Variant directive |
|---|---|
| 61 | Amber canyon with glowing resin seams and monumental honey-colored strata. |
| 62 | Far chain-bridge gallery, multiple hanging bridges crossing a resin-lit abyss. |
| 63 | Dustfall chamber with shafts of golden particulate descending through layered rock. |
| 64 | Resin archive ruins, distant shelves, pillars, and chambers entombed in translucent amber. |
| 65 | Quiet honey pocket, calm open cavern with restrained amber glow and soft mineral bands. |

### Silver Core - rows 1040-1599

| # | Variant directive |
|---|---|
| 66 | Cleaved silver canyon, sharp metallic strata and pale reflected light cutting through the void. |
| 67 | Suspended rib bridge, distant silver structural arches spanning a deep core chamber. |
| 68 | Shimmerfall curtain, fine luminous mineral particles falling against cool metallic rock. |
| 69 | Forgotten mint ruins, monumental circular vault architecture and oxidized silver machinery. |
| 70 | Quiet mirror pocket, polished mineral planes, sparse pale highlights, large calm negative space. |

### Core Magma - rows 1600-2064

| # | Variant directive |
|---|---|
| 71 | Lava ravine with distant molten rivers and black basalt walls, no playable lava shore. |
| 72 | Basalt bridgeworks, monumental dark spans and supports above layered magma glow. |
| 73 | Ashfall chamber with distant lava light diffused through a thick falling ash curtain. |
| 74 | Volcanic watchtower ruins, black stone towers silhouetted against deep orange vents. |
| 75 | Quiet ember pocket, broad dark basalt chamber with sparse lava fissures and floating embers. |

### Slagworks - rows 2065-2664

| # | Variant directive |
|---|---|
| 76 | Industrial slag trench with distant molten runoff, cranes, chains, and black iron silhouettes. |
| 77 | Dense gantry-bridge maze in the back plane, suspended ironworks and a central furnace dome. |
| 78 | Steamfall condenser, monumental pipes and towers veiled by vertical steam plumes. |
| 79 | Abandoned smelter barracks, layered factory ruins, furnaces, and broken iron walkways. |
| 80 | Quiet cooling chamber, sparse machinery, dark metal reservoirs, and restrained residual heat. |

### Obsidian Catacombs - rows 2665-3264

| # | Variant directive |
|---|---|
| 81 | Black-glass ravine with razor-edged obsidian layers and muted violet reflections. |
| 82 | Distant black arch bridge crossing a cathedral-like volcanic chamber. |
| 83 | Ashfall curtain drifting through black pillars and faint purple ember light. |
| 84 | Shattered crypt city, stacked obsidian tomb architecture and broken monumental spires. |
| 85 | Quiet void pocket, glossy black planes, minimal purple highlights, and deep negative space. |

### Pressure Foundry - rows 3265-3864

| # | Variant directive |
|---|---|
| 86 | Pressure trench packed with distant tanks, gauges, conduits, and cold cyan vents. |
| 87 | Layered pipe-bridge network spanning a huge mechanical excavation. |
| 88 | Steam curtain obscuring monumental foundry machinery and cool backlights. |
| 89 | Control citadel, distant stacked command towers, pressure vessels, and luminous windows. |
| 90 | Quiet maintenance bay with sparse pipework, dormant machines, and soft cyan haze. |

### Blackglass Abyss - rows 3865-4464

| # | Variant directive |
|---|---|
| 91 | Mirror chasm with reflective black-glass walls and deep blue dimensional light. |
| 92 | Angular prism bridge in the far plane, refracting restrained blue-violet highlights. |
| 93 | Stardust fall descending through a vast glossy abyss and fractured crystal silhouettes. |
| 94 | Eclipse city ruins, distant impossible towers and circular dark celestial architecture. |
| 95 | Quiet void gallery, monumental empty black-glass chamber with sparse stellar pinlights. |

### Starfire Rift - rows 4465-5064

| # | Variant directive |
|---|---|
| 96 | Cosmic ravine with layered violet rock, luminous rift light, and distant star fields. |
| 97 | Monumental ring bridge suspended across a magenta-blue celestial cavern. |
| 98 | Starfall curtain, countless restrained luminous particles descending through the rift. |
| 99 | Celestial citadel, distant radiant towers and circular cosmic architecture in deep haze. |
| 100 | Silent core pocket, calm open void with sparse starfire veins and a subdued central glow. |

## Runtime derivation

The source PNGs are preserved unchanged. The runtime builder normalizes only a
near-exact source-size discrepancy, converts every plate to RGB WebP at quality
88, and verifies 50 unique outputs at exactly 1536x1024.
