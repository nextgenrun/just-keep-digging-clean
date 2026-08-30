# Environment

Game system — environment.

Notable systems:
- `DayNightCycle.js` — authoritative world clock, one smooth sun/moon orbit, surface-only celestial rendering, and tint cycles
- `WeatherSystem.js` — authoritative weather phase orchestration, including winter/temperature-gated snow and frame-rate-independent cloud/fog/sun attenuation snapshots
- `WeatherPrecipitationEnvelope.js` — shared frame-rate-independent rain, snow, and storm rise/fall signals so rendering, impacts, wetness, audio, and lighting do not cut at a director phase boundary
- `WeatherRecordedAmbienceController.js` — lazy-loads the six approved Sonniss weather derivatives and selects one contextual rain bed plus one restrained wind bed, with long gain crossfades and procedural fallback while loading
- `WeatherImpactRainController.js` / `WeatherSnowController.js` — pooled ImageGen rain and snow in world coordinates; center/edge swept rays let particles traverse real AIR shafts but stop at the first authoritative tile or authored cover without tunnelling
- `WeatherWorldCollision.js` / `weatherWorldRaycast.js` — exact world-grid and authored-cover segment collision shared by rain and snow, independent of camera/UI coordinates
- `WeatherSystem.getSnapshot()` exposes `approvedParticleVisualsReady` and the active particle texture key so admin/runtime health checks can distinguish approved artwork from rollback fallback
- `WeatherImpactParticleController.js` / `WeatherParticleController.js` — world-anchored ImageGen splashes, ripples, powder, drips, mist, dust, and steam; procedural textures are explicit `?skylineVfx=0` rollback only
- `SkylineWeatherVfxSystem.js` — approved generated clouds/fog/lightning; it intentionally does not own precipitation, avoiding a second camera-space rain/snow path
- `AtmosphereSystem.js` / `LightRayAtmosphere.js` — depth-safe clouds, horizon glow, and rays sourced from the live sun position and weather tint
- Carried-fire rays are intentionally not environment rays: the separate
  `systems/lighting/FireLightRayRenderer.js` hand-sockets and solid-tile-clamps
  its local authored gobos beneath the darkness mask.
- `AmbientParticleSystem.js` — underground dust motes + falling debris (values/ambientParticleConfig.js)
- `StarSanctuarySystem.js` / `StarConsumptionGuard.js` /
  `starSanctuaryProfile.js` — turn each intact Star
  into a deterministic Wellspring, Reservoir, or Haven mini-base. Standing
  nearly still restores GP only to that site's reserve; the system also owns
  the first-use typed `DESTROY` gate plus release-cancellable hold admission,
  and derives permanent scars from existing saved dug-Star source records
  without owning Star rewards, Stress, lighting, or save transport.
- `CampfireSystem.js` — campfire buffs, saved Ember Charges, slot-six
  consumption, and save-slot-aware texture residency. Every save starts with
  one use. Returning to the Town surface or interacting with the Campfire
  restores the reserve to at least one use; the first mined Ember Ore block
  permanently raises that refill to two, while every mined Ember still adds one
  immediate use through `DigSystem`.
  Every successful rare Ember collection also starts the short, skippable
  `EmberDiscoveryEventSystem` reward beat. Its approved frame and Ember icon
  name the gained charge, state that Ember fuels Campfire blessings, and show
  the first-find refill upgrade before the one-time Next Promise guide takes
  over.
  It adopts the current tier queued by `WorldLoadScene`, keeps that exact visual
  until an upgraded tier is fully ready, then releases the previous
  manager-owned texture without changing upgrade or persistence semantics.
  `CampfireUpgradeTransaction.js` loads and validates the next full-quality tier
  before spending, rechecks the level and wallet after the wait, and coalesces
  duplicate clicks. A failed, cancelled, or pressure-timed-out load spends no
  gold and writes no save.
- `BiomeSystem.js`, `SurfaceTunnelDoorSystem.js`
- `V11SkyIslandVisualSystem.js` submits the six Heavenblocks backdrops/facades
  as separate low-priority requests to the shared runtime coordinator. Each
  1672x941 source is now uniformly contained at maximum scale `1` and centered
  inside its reserved 1920x1080 world region; backdrop overscan can request
  coverage but can no longer magnify the source. All six layers still activate
  together after serialized decode, and `?runtimeAssetQueue=0` retains the
  loader-idle rollback.
- `V11SkyPropSystem.js` selects thirteen static details from the 60-asset V3
  sky library, using only portal-island outer bookends and one object per safe
  Heavenblock interaction gap. It
  validates complete rendered rectangles against all eight portal slots, both
  sky pillars, platform bounds, and arrival/altar/shrine radii, and exposes
  `window.__jkdSkyPropsV3`. `?skyPropsV3=0` is its isolated rollback.
  All prop transforms remain static after creation.
- `v11SkyPropGeometry.js` centralizes the player-calibrated size, density,
  frame, and rectangle-intersection math used by that static sky composition.
- `EarthquakeSystem.js` — world-space seismic events with independent
  epicenters, independently validated one-column FallZones, ground-aligned
  authored boulders, leading-edge swept player collision, retry-safe local
  rubble, authoritative tile-feedback callbacks, distance-attenuated player
  response, and immediate cancellation when the permanent Seismic Suppression
  player upgrade is owned. Event completion records intensity, distance, and
  opened passages silently; it does not reopen a cleared-status card
  The default LEO player-character runtime may request a contextual warning at
  the player-aware boundary; the shared voice director can queue it but can
  never interrupt active narration, player, or merchant speech. Biome entry is
  emitted only on a real underground biome transition, and a campfire-rest line
  is eligible only after the player deliberately ignites a blessing.
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
  `graveborerWurmPersistence.js`, pure path/render sampling lives in
  `graveborerWurmPath.js`, and static plus swept hit math lives in
  `graveborerWurmCollision.js`.
