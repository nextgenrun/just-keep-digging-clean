# Lighting

Game system — lighting.

`LightSystem.getSunlightSnapshot()` is the production sunlight contract: it
combines the `DayNightCycle` sun position/alpha with smooth weather
transmittance, exposure, cloud cover, fog, and tint for atmosphere and shaders.

Player light v2 is the production default. It anchors every reveal/glow layer
to the authoritative collider center plus the sprite's live rig/animation
displacement, so the visible character stays in the exact middle. Positional
flutter is disabled while radius and brightness retain restrained fire
variation. The compact inverse-style penumbra has no visible world torch and
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
