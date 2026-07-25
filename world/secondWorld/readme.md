# Second World

Runtime generation for the authored industrial magma marker area. The authored
surface shape remains authoritative, then `SecondWorldGenerator.js` extends the
right-side Level 2 region to 5,000 playable meters with Lava Dirt, Obsidian,
Ember Ore, Magma Crystal nodes, caves, and a sealed Level 1 boundary.

Because this generator runs after the authored Tiled override, it also restores
the configured Level 2 teleport anchors after cave/resource painting. Those
anchors are part of the real mine model and feed the Level 2 Sky Island route;
they are not renderer-only landmarks.
