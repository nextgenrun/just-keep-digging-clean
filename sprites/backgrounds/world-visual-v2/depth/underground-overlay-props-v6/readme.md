# Underground Overlay Props V6

Ten production `1600x1024` RGBA WebP atlases, one per underground biome. Each
atlas holds twenty unique `320x256` decorative prop frames in a 5x4 grid.
Runtime placement is deterministic, terrain-masked, non-colliding, and below
resources, damage, and emissive gameplay feedback.

Five fixed identities per atlas form the multi-tile class and always span
roughly 9-17 terrain tiles. The other fifteen identities remain localized.

These 200 frames are additive and visual-only. Use
`?undergroundOverlayProps=0` to disable only this family.
