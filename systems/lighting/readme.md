# Lighting

Game system — lighting.

`LightSystem.getSunlightSnapshot()` is the production sunlight contract: it
combines the `DayNightCycle` sun position/alpha with smooth weather
transmittance, exposure, cloud cover, fog, and tint for atmosphere and shaders.

Player light v2 is the production default. It anchors the reveal and warm
falloff to the authoritative upper-body collider instead of the sprite's feet,
uses a compact inverse-style penumbra without a visible world torch, and
responds as one profile across daylight, night, rain, storms, lightning, and
weather-insulated deep caves. `?playerLight=legacy` restores the earlier
player-origin glow and shader math for direct comparison.

Star Blocks remain independent hard-darkness light sources.
`SkyBeaconPulseRenderer` presents their staggered beacon as a linearly filtered
1024 px feathered bloom with a fine pearl filament and small soft-textured
constellation nodes. It remains a faint, slow long-range ring with a low
coordinate-seeded chance per 45-second window. Cross flares are intentionally
absent, and only one visible Star Block ring may exist at a time while the
darkness mask reveals a restrained area beneath the wave.

Integrated caves use identity-specific darkness profiles rather than one
constant reveal: Echo and Storm pulse sharply, Root and Gilded stay heavier,
Prism is clearer, and Ember flickers. Hazard lights share the same darkness
mask and switch between idle, telegraph, and active ratios using the collision
system's exact timing.
