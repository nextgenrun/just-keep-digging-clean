# Lighting

Game system — lighting.

`LightSystem.getSunlightSnapshot()` is the production sunlight contract: it
combines the `DayNightCycle` sun position/alpha with smooth weather
transmittance, exposure, cloud cover, fog, and tint for atmosphere and shaders.

The player light uses the calibrated visible sprite center for its darkness
cutout, additive halo/core, and shader falloff. The natural profile is the
default; `?playerLight=legacy` restores the former feet-centered mask and glow
profile for direct visual comparison without changing visibility or gameplay.

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
