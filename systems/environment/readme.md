# Environment

Game system — environment.

Notable systems:
- `DayNightCycle.js` — authoritative world clock, one smooth sun/moon orbit, surface-only celestial rendering, and tint cycles
- `WeatherSystem.js` — authoritative weather phase orchestration, including winter/temperature-gated snow and frame-rate-independent cloud/fog/sun attenuation snapshots
- `WeatherImpactRainController.js` / `WeatherSnowController.js` — pooled ImageGen rain and snow in world coordinates; center/edge swept rays let particles traverse real AIR shafts but stop at the first authoritative tile or authored cover without tunnelling
- `WeatherWorldCollision.js` / `weatherWorldRaycast.js` — exact world-grid and authored-cover segment collision shared by rain and snow, independent of camera/UI coordinates
- `WeatherSystem.getSnapshot()` exposes `approvedParticleVisualsReady` and the active particle texture key so admin/runtime health checks can distinguish approved artwork from rollback fallback
- `WeatherImpactParticleController.js` / `WeatherParticleController.js` — world-anchored ImageGen splashes, ripples, powder, drips, mist, dust, and steam; procedural textures are explicit `?skylineVfx=0` rollback only
- `SkylineWeatherVfxSystem.js` — approved generated clouds/fog/lightning; it intentionally does not own precipitation, avoiding a second camera-space rain/snow path
- `AtmosphereSystem.js` / `LightRayAtmosphere.js` — depth-safe clouds, horizon glow, and rays sourced from the live sun position and weather tint
- `AmbientParticleSystem.js` — underground dust motes + falling debris (values/ambientParticleConfig.js)
- `CampfireSystem.js` — campfire buffs
- `BiomeSystem.js`, `SurfaceTunnelDoorSystem.js`
- `V11SkyIslandVisualSystem.js` waits for the shared Phaser loader to become
  idle before starting the six large Heavenblocks backdrops/facades. This keeps
  scenic demand streaming and Heavenblocks from joining the same in-flight
  loader cycle and losing the late-queued visual files.
- `EarthquakeSystem.js` — world-space seismic events with independent
  epicenters, independently validated one-column FallZones, ground-aligned
  authored boulders, leading-edge swept player collision, retry-safe local
  rubble, authoritative tile-feedback callbacks, distance-attenuated player
  response, and immediate cancellation when the permanent Seismic Suppression
  player upgrade is owned. Event completion records intensity, distance, and
  opened passages silently; it does not reopen a cleared-status card
- `earthquakeFallZoneMath.js` — Phaser-independent collapse-width expansion,
  per-column landing validation, and swept rock/body AABB math
- `CaveHazardSystem.js` — cave-only timed gates, Flight-over spike runs, and
  ember vents; active contact drains all GP, manually extinguishes the torch,
  returns the player to the safe approach checkpoint, and reports hazard plus
  recovery in one shared danger card instead of stacked status/floating text
- `GraveborerWurmSystem.js` — Hardcore-only noise predator state machine; one
  hunt makes two to six short independently telegraphed passes, commits each
  readable two-curve breach path before moving, and never homes during a
  warning or breach. Its fast movement uses swept head/body collision so a
  low-FPS frame cannot tunnel through the player, while clearing the marked
  lane remains safe. Depth and pass difficulty are frozen by
  `graveborerWurmDifficulty.js`; lifecycle/snapshot state lives in
  `graveborerWurmState.js`, persistence and safe mid-hunt reloads live in
  `graveborerWurmPersistence.js`, and pure path/collision math lives in
  `graveborerWurmPath.js`.
