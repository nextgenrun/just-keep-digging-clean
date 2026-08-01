# Second World

Runtime generation for the authored industrial magma marker area. The authored
surface shape remains authoritative, then `SecondWorldGenerator.js` extends the
right-side Level 2 region to 5,000 playable meters with Lava Dirt, Obsidian,
Ember Ore, Magma Crystal nodes, caves, and one continuous one-tile Level 1/2
divider. The divider runs from the map ceiling to the bottom. Its only passage
is the gate cell aligned to the bridge; the passage becomes `AIR` only after
`worldTwoTunnelAccess` is owned.

`UndergroundBedrockLayout.js` runs after world authority settles and replaces
every other underground `BEDROCK` cell with mineable Level 1 or Level 2
terrain. This removes stale TMX bedrock and the former deep Level 1 seal while
the final divider authority prevents flying over or digging beneath the gate.

Every carved Level Two cavern is also registered in `WorldModel.caveZones`.
That lets the same identity, discovery, atmosphere, local lighting, and
ceiling/floor reward framework serve both worlds instead of leaving Level Two
caves as anonymous AIR ellipses.

Because this generator runs after the authored Tiled override, it also restores
the configured Level 2 teleport anchors after cave/resource painting. Those
anchors are part of the real mine model and feed the Level 2 Sky Island route;
they are not renderer-only landmarks. Configured cardinal access offsets
guarantee an adjacent open cell, and cave-identity features may not repaint that
cell after the anchor is restored.

Modern Level Two composition interpolates independent Magma Crystal, Ember Ore,
Obsidian, and Gold chances from entrance to bottom, then uses the existing base
mix as fallback. Node weights likewise move from the original Obsidian-heavy
entrance toward Ember/Magma-heavy deep nodes. This fixes the former overlapping
Gold threshold and reduces bottom Lava Dirt dominance. Legacy mode executes the
old comparisons and static node weights exactly.
