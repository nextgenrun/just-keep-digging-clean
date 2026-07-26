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
- `CaveHazardSystem.js` — cave-only timed gates, Flight-over spike runs, and ember vents; active contact drains all GP, manually extinguishes the torch, and returns the player to the safe approach checkpoint
- `GraveborerWurmSystem.js` — Hardcore-only noise predator state machine; it commits a readable two-curve breach path, emits bounded carve/hit events, never homes after the warning begins, and persists through `graveborerWurmPersistence.js`. Pure path sampling and collision live in `graveborerWurmPath.js`.
