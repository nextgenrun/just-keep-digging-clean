# Environment

Game system — environment.

Notable systems:
- `DayNightCycle.js` — authoritative world clock, one smooth sun/moon orbit, surface-only celestial rendering, and tint cycles
- `WeatherSystem.js` — surface weather plus frame-rate-independent cloud/fog/sun attenuation snapshots
- `SkylineWeatherVfxSystem.js` — approved generated clouds/fog/lightning; generated atlas precipitation stays disabled because its current frames contain rectangular matte artifacts, while `WeatherImpactRainController` remains the collision-aware rain authority
- `AtmosphereSystem.js` / `LightRayAtmosphere.js` — depth-safe clouds, horizon glow, and rays sourced from the live sun position and weather tint
- `AmbientParticleSystem.js` — underground dust motes + falling debris (values/ambientParticleConfig.js)
- `CampfireSystem.js` — campfire buffs
- `BiomeSystem.js`, `SurfaceTunnelDoorSystem.js`
- `EarthquakeSystem.js` — world-space seismic events with independent epicenters, local cave-ins/rubble, and distance-attenuated player feedback
- `HeavenblocksAtmosphereSystem.js` — atmosphere-only generated backplates behind the three native upward-progression regions
