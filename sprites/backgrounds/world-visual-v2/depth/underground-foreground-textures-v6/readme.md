# Underground Foreground Textures V6

Ten production `1600x1024` RGBA WebP atlases, one per underground biome. Each
atlas holds twenty unique `320x256` organic texture-island frames in a 5x4
grid. `WorldVisualUndergroundDetailLayer` streams the intersecting biome and
clips every frame through the authoritative terrain mask.

These 200 frames are additive and visual-only. Use
`?undergroundForegroundTextures=0` to disable only this family.
