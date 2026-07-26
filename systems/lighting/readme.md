# Lighting

Game system — lighting.

`LightSystem.getSunlightSnapshot()` is the production sunlight contract: it
combines the `DayNightCycle` sun position/alpha with smooth weather
transmittance, exposure, cloud cover, fog, and tint for atmosphere and shaders.

The player light uses the calibrated visible sprite center for its darkness
cutout, additive halo/core, and shader falloff. The natural profile is the
default; `?playerLight=legacy` restores the former feet-centered mask and glow
profile for direct visual comparison without changing visibility or gameplay.

Star Blocks remain independent hard-darkness light sources. Their staggered
beacon opens with an additive Northstar flare, then carries constellation
points on a slow long-range ring while the darkness mask reveals a restrained
area beneath the wave.
