# Underground Terrain Variation V4

This additive scenic-v2 package contains five asymmetric ImageGen-authored
foreground terrain plates for each of the ten underground visual regions.
Runtime plates are alpha-feathered and overlap in world space above the
existing continuous material field, so the approved base terrain remains
present while mirrored folds and obvious repeats are broken up.

The two newest plates in every biome deliberately use stronger fault fans,
pressure wakes, mineral currents, and upheavals instead of safe uniform noise.
High-contrast gestures that crossed a whole card were rejected before
packaging.

Ten derived edge atlases provide twenty image-backed exposed-top variants per
biome. They are sampled deterministically for solid tiles with air directly
above them and never change tile type, HP, collision, drops, saves, or world
generation.

Use `?undergroundTerrainVariation=0` to disable the complete package.
