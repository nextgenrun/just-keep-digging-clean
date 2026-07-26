# Visual

Game system — visual.

Notable systems:
- `RenderDensitySystem.js` — keeps gameplay, cameras, UI, and pointer input in the existing 1280x720 logical coordinate space while WebGL renders to a denser backing canvas. Its CameraManager resize guard prevents browser-panel, fullscreen, and parent resizes from promoting a logical camera to the High/Ultra backing dimensions. `high` is the default 1.5x profile (1920x1080), `?renderQuality=ultra` selects 2x (2560x1440), and `?nativeDensity=0`, `?renderQuality=legacy`, or `?renderer=auto` restores the 1x compatibility path. Current runtime diagnostics are published as `window.__jkdRenderDensity`.
- `HUDSystem.js` — main HUD (depth, stats, status flashes)
- `ApprovedHudSkin.js` — optional approved image-frame presentation layer that preserves HUDSystem runtime data and legacy fallback
- `FloatingTextSystem.js` — floating world text + transient sky-star release FX + constellation UI progress
- `PostFxSystem.js` — camera vignette + depth-based color grading (values/postFxConfig.js)
- `PlayerBodyLanguageSystem.js` — landing squash, fall stretch, dig impact pop (values/gamefeel.js → bodyLanguage)
- `PlayerMotionPolishSystem.js` — contextual UAL idle fidgets, delayed wall bracing, native hit reactions, and action-safe animation priority (`values/playerMotionPolish.js`)
- `PlayerKinematicMotionSystem.js` — UAL feet anchoring plus signed walk/run/climb/flight velocity measured from post-collision body displacement, with teleport suppression and airborne hysteresis (`values/playerKinematicMotion.js`)
- `UalNativeLocomotionTransitionSelector.js` — Phaser-independent 15-phase walk/start/run/stop/pivot, takeoff/hover/travel/exit, rise/fall, and one-shot landing state shared by main-world and cave runtimes (`values/ualNativeLocomotionTransitions.js`)
- `PlayerSolidOcclusionSystem.js` — WebGL-only inverted solid-cell mask that clips UAL limbs at authoritative tile faces in both the main world and compact caves (`values/playerTileContact.js`)
- `PlayerRigContactSystem.js` — marker-driven UAL action contact, separate fist/foot hitboxes, and capped sprite-only tile-face alignment that eases in and out across the main world and compact caves (`values/playerRigContact.js`); pure geometry lives in `playerRigContactGeometry.js`
- `PickaxeTrailSystem.js` / `ClimbTrailSystem.js` — motion ghost trails; flight ghosts are throttled, short-lived, and inherit velocity-bank angle so the native skeleton stays readable
- `FlightFootParticleSystem.js` — two restrained additive trails emitted from the approved Survivor Superman pose's trailing feet in both the main world and compact caves (`values/playerFlightFootFx.js`)
- `DepthMilestoneCinematic.js` — letterbox + title card cinematic at major depths (values/depthCinematicConfig.js)
- `CameraShakeSystem.js` — signature-based screen shake
- `ScreenRecordSystem.js` — F10 game-canvas WebM capture; uploads timestamped local files through `serve.py` to `/systems/screenrecord/`
- `EarthquakeFeedbackUI.js` / `EarthquakeHazardOverlay.js` — phase/intensity HUD, escape objective, cave-in countdowns, rock lanes, offscreen danger, and fresh-rubble outlines (`values/earthquakeFeedback.js`)
- `AncientRelicBeaconSystem.js` — native image-based relic discoverability: a persistent 0/3 Sky Altar objective, three world-space altar sockets, a bounded underground signal, and a close-range pulsing locator that automatically advances to the next unmined cache. `?relicGuidance=0` is its presentation-only rollback.
- `HeavenblocksPresentationSystem.js` — relic discovery/unlock cinematics, arrival/return prompts, image-based open-shaft beacons, in-island component-heart direction HUD, component claims, gate interaction, lifecycle cleanup, and health publication for the three upward regions.
- `HeavenblockWorldVisualSystem.js` / `HeavenblockTileVisualLayer.js` / `HeavenblockArtifactVisualLayer.js` — full native island presentation. Each solid `WorldModel` cell receives one real 94x94 game tile: live material and HP-stage textures remain recognizable, while exposed surfaces, corners, and undersides use the approved sky-island tile family. Mining hides the destroyed cell, changes native damage art, and recomputes its four neighboring edges immediately. Painted concept facades are never preloaded or sliced at runtime; the large plates are atmosphere only. The artifact layer renders every mineable `R` cell as an approved ornate cache plus a pulsing relic token, pulses each generated component heart, and owns vault markers. Approved portal art remains at surface and island anchors. While enabled, `WorldRenderer` keeps collision authoritative but hides its duplicate base tile; `?heavenblocksVisuals=0` restores ordinary tile rendering.
