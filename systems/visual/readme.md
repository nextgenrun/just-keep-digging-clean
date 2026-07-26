# Visual

Game system — visual.

Notable systems:
- `RenderDensitySystem.js` — keeps gameplay, cameras, UI, and pointer input in the existing 1280x720 logical coordinate space while WebGL renders to a denser backing canvas. Its CameraManager resize guard prevents browser-panel, fullscreen, and parent resizes from promoting a logical camera to the High/Ultra backing dimensions. `high` is the default 1.5x profile (1920x1080), `?renderQuality=ultra` selects 2x (2560x1440), and `?nativeDensity=0`, `?renderQuality=legacy`, or `?renderer=auto` restores the 1x compatibility path. Current runtime diagnostics are published as `window.__jkdRenderDensity`.
- `HUDSystem.js` — main HUD (depth, stats, status flashes)
- `ApprovedHudSkin.js` — optional approved image-frame presentation layer that preserves HUDSystem runtime data and legacy fallback
- `FloatingTextSystem.js` — floating world text + constellation UI progress + UI-only mined Star Block release: impact flash/ring, paced sparkle trail, and slow swaying upward fade
- `PostFxSystem.js` — camera vignette + depth-based color grading (values/postFxConfig.js)
- `PlayerBodyLanguageSystem.js` — landing squash, fall stretch, dig impact pop (values/gamefeel.js → bodyLanguage)
- `PlayerMotionPolishSystem.js` — contextual UAL idle fidgets, delayed wall bracing, native hit reactions, and action-safe animation priority (`values/playerMotionPolish.js`)
- `PlayerKinematicMotionSystem.js` — UAL feet anchoring plus signed walk/run/climb/flight velocity measured from post-collision body displacement, with teleport suppression and airborne hysteresis (`values/playerKinematicMotion.js`)
- `UalNativeLocomotionTransitionSelector.js` — Phaser-independent shared locomotion routing: grounded movement always uses the UAL Jog run slot, post-collision activity prevents wall-running, controller-facing makes reversals immediate without restarting the jog cycle, and takeoff/hover/travel/exit, rise/fall, and one-shot landing remain shared by main-world and cave runtimes (`values/ualNativeLocomotionTransitions.js`)
- `PlayerSolidOcclusionSystem.js` — WebGL-only inverted solid-cell mask that clips UAL limbs at authoritative tile faces in both the main world and compact caves (`values/playerTileContact.js`)
- `PlayerRigContactSystem.js` — marker-driven UAL action contact, separate fist/foot hitboxes, and capped sprite-only tile-face alignment that eases in and out across the main world and compact caves (`values/playerRigContact.js`); pure geometry lives in `playerRigContactGeometry.js`
- `PickaxeTrailSystem.js` / `ClimbTrailSystem.js` — motion ghost trails; flight ghosts are throttled, short-lived, and inherit velocity-bank angle so the native skeleton stays readable
- `FlightFootParticleSystem.js` — two restrained additive trails emitted from the approved Survivor Superman pose's trailing feet in both the main world and compact caves (`values/playerFlightFootFx.js`)
- `DepthMilestoneCinematic.js` — letterbox + title card cinematic at major depths (values/depthCinematicConfig.js)
- `CameraShakeSystem.js` — signature-based screen shake
- `ScreenRecordSystem.js` — F10 game-canvas WebM capture; uploads timestamped local files through `serve.py` to `/systems/screenrecord/`
- `EarthquakeFeedbackUI.js` / `EarthquakeHazardOverlay.js` — phase/intensity HUD, escape objective, cave-in countdowns, rock lanes, offscreen danger, and fresh-rubble outlines (`values/earthquakeFeedback.js`)
- `TitanDiscoverySystem.js` — tracks 25 deterministic clear-area windows without mutating tiles, reveals enormous silhouettes behind scenic terrain, plays a visual-only glow/echo unlock, persists discovered ids through retention data, and adds their non-interactive miniature echoes to the surface procession (`values/titanDiscoveries.js`, rollback `?titans=0`)
- `CelestialEngineHudSystem.js` — lower-right Star Heart icon, bounded charge bar, selected-Engine label, active impact budget, and context-sensitive `X` prompt.
- `StarPillarSystem.js` — retains the constellation chart and routes the mastered state into the Star Heart choice overlay when Celestial Engines are enabled.
