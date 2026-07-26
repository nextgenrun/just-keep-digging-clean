# Visual

Game system — visual.

Notable systems:
- `RenderDensitySystem.js` — keeps gameplay, cameras, UI, and pointer input in the existing 1280x720 logical coordinate space while WebGL renders to a denser backing canvas. Its CameraManager resize guard prevents browser-panel, fullscreen, and parent resizes from promoting a logical camera to the High/Ultra backing dimensions. `high` is the default 1.5x profile (1920x1080), `?renderQuality=ultra` selects 2x (2560x1440), and `?nativeDensity=0`, `?renderQuality=legacy`, or `?renderer=auto` restores the 1x compatibility path. Current runtime diagnostics are published as `window.__jkdRenderDensity`.
- `HUDSystem.js` — main HUD (depth, stats, status flashes)
- `ApprovedHudSkin.js` — optional approved image-frame presentation layer that preserves HUDSystem runtime data and legacy fallback; its player core switches between matched illustrated torch ON/OFF frames instead of drawing a status dot
- `FloatingTextSystem.js` — floating world text + constellation UI progress + UI-only mined Star Block release: impact flash/ring, paced sparkle trail, and slow swaying upward fade
- `PostFxSystem.js` — camera vignette + depth-based color grading (values/postFxConfig.js)
- `PlayerBodyLanguageSystem.js` — landing squash, fall stretch, dig impact pop (values/gamefeel.js → bodyLanguage)
- `PlayerMotionPolishSystem.js` — contextual calm idle fidgets, delayed wall bracing, native hit reactions, and action-safe animation priority (`values/playerMotionPolish.js`)
- `NPCActivitySystem.js` — v11 Piskel merchant motion direction: four
  chronological quiet frames animate localized eyes, hands, ears, tails,
  props, glow, chains, and embers; seven larger activities provide profession
  and personality beats. Three visual layers are rewritten to the exact X/Y
  anchor, zero rotation, and one fixed display size every frame. Quiet loops
  dissolve slowly and rest between cycles; there is no walking, pacing,
  roaming, whole-body sway, stretch, or wobble. A town-wide gate permits only
  one large activity at a time. `?npcActivities=0` restores the v6/static
  baseline (`values/npcActivityConfig.js`).
- `PlayerKinematicMotionSystem.js` — UAL feet anchoring plus signed post-collision displacement; grounded Jog cadence can use the immediate body velocity while climb/flight retain smoothed travel and teleport suppression (`values/playerKinematicMotion.js`)
- `UalNativeLocomotionTransitionSelector.js` — Phaser-independent shared routing: every grounded speed uses Jog, input-facing reversals preserve its cycle, Survivor flight keeps one continuous loop, soft touchdowns skip landing, and harder landings expose a short movement-cancellable prefix (`values/ualNativeLocomotionTransitions.js`)
- `PlayerSolidOcclusionSystem.js` — WebGL-only inverted solid-cell mask that clips UAL limbs at authoritative tile faces in both the main world and compact caves (`values/playerTileContact.js`)
- `PlayerRigContactSystem.js` — marker-driven UAL action contact, separate fist/foot hitboxes, and capped sprite-only tile-face alignment that eases in and out across the main world and compact caves (`values/playerRigContact.js`); pure geometry lives in `playerRigContactGeometry.js`
- `PickaxeTrailSystem.js` / `ClimbTrailSystem.js` — motion ghost trails; flight ghosts are throttled, short-lived, and inherit velocity-bank angle so the native skeleton stays readable
- `FlightFootParticleSystem.js` — two restrained additive trails emitted from the approved Survivor Superman pose's trailing feet in both the main world and compact caves (`values/playerFlightFootFx.js`)
- `DepthMilestoneCinematic.js` — letterbox + title card cinematic at major depths (values/depthCinematicConfig.js)
- `CameraShakeSystem.js` — signature-based screen shake
- `ThunderStrikeTimingBarSystem.js` / `ThunderStrikeTimingBarView.js` /
  `ThunderStrikeImpactFxSystem.js` — the approved-art exact-timing panel records
  the needle position actually presented to the player, while staged world
  lightning, rings, sparks, flash, effective-damage labels, and 1x/3x/10x shake
  escalate. Its badge previews and confirms the combo-local +20% damage gained
  by each timing success. These views render shared chain state but never
  authorize a follow-up or mutate a tile. The initial-slam label derives from
  the authoritative GP cost, so God Mode shows `FREE` instead of paid-cast copy.
- `ScreenRecordSystem.js` — F10 game-canvas WebM capture; uploads timestamped local files through `serve.py` to `/systems/screenrecord/`
- `EarthquakeFeedbackUI.js` / `earthquakeFeedbackPresentation.js` /
  `EarthquakeHazardOverlay.js` — generated-art compact seismic status/recap,
  auto-expiring route guidance, image-backed cave-in countdowns, restrained
  fall guides, offscreen danger, and short-lived fresh-rubble outlines
  (`values/earthquakeFeedback.js`)
- `GraveborerWurmVisualSystem.js` / `GraveborerWurmHudSystem.js` — ImageGen-authored head/body/tail animation, committed-path pressure seams, and the fixed-camera threat medallion. Missing production art hides the presentation; no primitive or HTML placeholder is allowed.
- `CaveAtmosphereSystem.js` / `CaveInteriorOcclusionSystem.js` — stream identity-specific cave backwalls and motes in both renderer modes, retain opaque interiors until the player crosses the shell, then publish the named discovery and gameplay hint (`values/caveArchetypes.js`)
- `CaveHazardView.js` — renders cave-only resonance gates, real spike silhouettes, vent telegraphs, and erupting columns below the existing cave occlusion; `CaveAtmosphereSystem` adds restrained glints only while its underlying resource seam tile still exists
- `TitanDiscoverySystem.js` / `TitanDiscoveryGuidance.js` / `TitanChamberStream.js` / `TitanSurfaceGallery.js` — track 25 deterministic colossal clear-area windows without mutating tiles, keep one approved-HUD direction/depth resonance active near an undiscovered chamber, admit discovery after a readable partial reveal plus player entry, stream at most two unique 1536x848 chamber cards, retain compact fallback art, play the visual-only glow/echo unlock, persist canonical ids through retention, pin one discovered archive vignette, maintain all 25 surface Titan Walk plinths, and publish zone/slot/stream/art/guidance state through `__jkdTitanDiscoveries` (`values/titanDiscoveries.js`, `values/titanDiscoveryExperience.js`; `?titanGuidance=0`; `?titanEncounter=legacy`; `?titanChambers=0`; `?titans=0`)
- `RelicDiscoveryFxSystem.js` / `relicDiscoveryFxBurst.js` — present the already-authoritative Ancient Relic award as a visible world-space pedestal wake, generated-token orbit into the live player, short residual floor mark, and bounded count reveal. Reduced-motion and low-FX modes preserve the state-independent cleanup contract; presentation exceptions remain unable to roll back awards but publish a warning to runtime health.
- `HeavenblocksPresentationSystem.js` — relic projection, arrival/return rings, component claims, gate altars, interaction prompts, lifecycle cleanup, and health publication for the three upward regions.
- `CelestialEngineHudSystem.js` — lower-right Star Heart icon, bounded charge bar, selected-Engine label, active impact budget, and context-sensitive `X` prompt.
- `ProgressivePillarSprite.js` — shared bottom-anchored renderer for approved five-stage pillar art; it preserves the source sheets' natural height growth and adds only restrained in-engine transition light.
- `StarPillarWorldVisual.js` / `StarPillarSystem.js` — screenshot-2 blue stone monument on the Level 1 Sky Island. The world visual grows across five constellation thresholds, layers the sharper Wayward Star core over a Star Heart halo inside its authored sockets, intensifies paired unlocks, and owns staggered glow/pop/beam animation. `StarPillarSystem` retains the constellation chart and Star Heart choice routing; no collected sky star is restored to the persistent world.
- `MilestoneBoardSystem.js` / `MilestonePillarModal.js` — Town Square depth
  pillar and journal. The world object uses the approved screenshot-1 Dwarven
  Depth Engine and advances at 0/500/1000/1500/2000 m while preserving
  nearest-interaction arbitration. The modal keeps eight bounded milestone cards
  per page, a large next-depth summary rail, and a responsive two-panel journal.
  The modal delegates its two views to `MilestonePillarMilestonesView.js` and
  `MilestonePillarJournalView.js`; sizing lives in
  `values/milestonePillarUi.js`.
