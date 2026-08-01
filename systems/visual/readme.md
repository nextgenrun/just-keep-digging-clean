# Visual

Game system — visual.

Notable systems:
- `TitanChamberStream.js` sends its camera-near, at-most-two chamber cards
  through the high-priority runtime asset lane and cancels cards that become
  obsolete before activation. Resident cards and archive pins keep their
  existing release-safe lifecycle and exact source art.
- `RenderDensitySystem.js` — keeps gameplay, cameras, UI, and pointer input in the existing 1280x720 logical coordinate space while WebGL renders to a denser backing canvas. Its CameraManager resize guard prevents browser-panel, fullscreen, and parent resizes from promoting a logical camera to the High/Ultra backing dimensions. `high` is the default 1.5x profile (1920x1080), `?renderQuality=ultra` selects 2x (2560x1440), and `?nativeDensity=0`, `?renderQuality=legacy`, or `?renderer=auto` restores the 1x compatibility path. Current runtime diagnostics are published as `window.__jkdRenderDensity`.
- `HUDSystem.js` — main HUD (depth and stats); transient status calls delegate
  to the shared notification carousel rather than drawing a second flash layer
- `MiningTargetVisualSystem.js` — image-backed four-corner world-space mining target shared by the main world and compact caves; its approved duplicate-art glow stays restrained on hover and tightens/brightens during held mouse digging; `?miningTargetVisuals=0` restores the former rectangle comparison
- `ApprovedHudSkin.js` — optional approved image-frame presentation layer that preserves HUDSystem runtime data and legacy fallback; its player core switches between matched illustrated torch ON/OFF frames instead of drawing a status dot
- `PickaxeHudView.js` — permanent owned-pickaxe presentation layered over the
  approved player core; it selects the generated tier overlay, exact label,
  purchase pulse, generic fallback, and `?pickaxeHud=0` rollback without owning
  upgrade state or GP values
- `FloatingTextSystem.js` — policy-gated world text + constellation UI progress;
  REDUCED is the uncluttered default and hides routine damage/resource numbers
  while keeping critical, special, status, and bonus feedback. Status-like event
  messages use `UINotificationSystem`; remaining floating labels stay attached
  to world impacts or collectibles. Mined Star Blocks remain UI-only and
  delegate their transient presentation to `SkyStarReleaseView.js`. The exact
  deterministic one-of-250 identity now travels through progress metadata,
  the popup, and release; saved constellation progress and callbacks remain
  authoritative without a pickup card
- `SkyStarReleaseView.js` — ImageGen-only mined Star Block release: the exact
  identity crystal and its separate light-only frame fade in below full alpha,
  reach the exact 94 px live-tile envelope before growth, then rise to a
  restrained 136 px core peak and levitate for at least 10.8 seconds behind
  six paced, frame-matched core echoes. The light follows one bounded
  three-tween path and cannot loop indefinitely. Matching rarity
  fracture/pulse art remains beneath it; the view never draws circles,
  graphics, tints art, or generates textures
- `StarDiscoveryPopupView.js` — one-active-popup rarity reveal with exact
  identity core plus matched authored light, name, Sign XP fill, reward copy,
  and an exact three-second settled hold. It uses the prior rarity pulse only
  as a missing-frame fallback.
- `starDiscoveryPopupPolicy.js` — pure anti-spam admission. Routine Stars can
  show once per 20 seconds; the first encounter of each rarity and Sign
  level-ups may bypass that interval, while only a higher-priority reveal may
  replace a live card. The persisted ESC Gameplay opt-out blocks and
  immediately closes this popup only; the long crystal release, rewards, and
  progression remain live.
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
- `UalNativeLocomotionTransitionSelector.js` / `UalGroundPhaseHandoffSelector.js` — Phaser-independent shared routing: every grounded speed uses Jog, moving actions resume its exact lower-body phase, and input-facing reversals flip immediately while replaying only the two closest planted Jog frames as pivot-stop/pivot-start. Survivor flight keeps one continuous loop, soft touchdowns skip landing, and harder landings expose a short movement-cancellable prefix (`values/ualNativeLocomotionTransitions.js`, `values/movingSideDigAnimation.js`; `?phaseHandoff=0`)
- `PlayerSolidOcclusionSystem.js` — WebGL-only inverted solid-cell mask that clips UAL limbs at authoritative tile faces in both the main world and compact caves (`values/playerTileContact.js`)
- `PlayerRigContactSystem.js` — marker-driven UAL action contact, separate fist/foot hitboxes, and capped sprite-only tile-face alignment that eases in and out across the main world and compact caves (`values/playerRigContact.js`); phase-locked moving strikes explicitly disable that translation so the physics-owned running feet cannot skate while marker validation remains diagnostic; pure geometry lives in `playerRigContactGeometry.js`
- `player/MovingSideDigStandOffController.js` — supplies the body-owned 18 px
  tile-face gap for moving SIDE mining and Quickslash; rig-contact teardown
  releases it, while the visual system never translates the running sprite.
- `PickaxeTrailSystem.js` / `ClimbTrailSystem.js` — motion ghost trails; flight ghosts are throttled, short-lived, and inherit velocity-bank angle so the native skeleton stays readable
- `FlightFootParticleSystem.js` — two restrained additive trails emitted from the approved Survivor Superman pose's trailing feet in both the main world and compact caves (`values/playerFlightFootFx.js`)
- `DepthMilestoneCinematic.js` — letterbox + title card cinematic at major depths (values/depthCinematicConfig.js)
- `CameraShakeSystem.js` — signature-based screen shake
- `ThunderStrikeTimingBarSystem.js` / `ThunderStrikeTimingBarView.js` /
  `ThunderStrikeImpactFxSystem.js` — the approved-art exact-timing panel records
  the needle position actually presented to the player, then drives ten staged
  lightning impacts, rings, sparks, flash, effective-damage labels, and bounded
  shake tiers. The ornate three-socket frame reads I/V/X as milestones while
  the live copy shows `SLAM n/10`. Its badge previews the cumulative +20%
  combo-local damage gained by each timing success. Only the initial 3x GP
  payment is charged; all nine earned follow-ups are free, and God Mode labels
  the initial cast `FREE`. The timing target and moving lightning needle are
  authored transparent v2 sprites whose displayed bounds are the exact input
  bounds; procedural yellow-target, white-needle, and badge rectangles are not
  used. V3 supplies authored dormant/challenge/completed milestone rings,
  lightning checks, I/V/X glyphs, and backplates beneath every dynamic copy
  row, so the timing view creates no Phaser `Graphics` object. Miss feedback
  reports `CHAIN ENDED` with no retry state, and the prompt exposes
  movement/Escape cancellation.
- `ScreenRecordSystem.js` — F10 game-canvas WebM capture; uploads timestamped local files through `serve.py` to `/systems/screenrecord/`
- `EarthquakeFeedbackUI.js` / `earthquakeFeedbackPresentation.js` /
  `EarthquakeHazardOverlay.js` / `EarthquakeFallZoneView.js` /
  `EarthquakeRockImpactView.js` / `EarthquakeTileFeedbackSystem.js` —
  generated-art 320x60 seismic
  warning/quake/aftermath status, auto-expiring route guidance, 24 one-to-one landing footprints
  that remain visible through the fall, ceiling fractures, authored falling
  boulders, a 90 ms exact-ground boulder squash, grounded impact debris,
  compact offscreen danger, and a
  camera-culled twenty-sprite pool that
  distinguishes warning fracture, tile destruction, and rubble return on exact
  world cells. Completion records statistics and newly opened passages without
  a separate recap card
  (`values/earthquakeFeedback.js`)
- `GraveborerWurmVisualSystem.js` / `GraveborerWurmHudSystem.js` — ImageGen-authored head/body/tail animation, committed-path pressure seams, and the fixed-camera threat medallion. In development only, the generated medallion is also the clickable summon control and identifies disabled/normal/10x state without introducing HTML or primitive placeholder art. Missing production art hides the presentation.
- `HardcoreMemorialWorldSystem.js` — plants the approved ImageGen grave near
  each same-slot Hardcore death position in later Casual or Hardcore runs.
  Airborne death coordinates search down and slightly sideways for the nearest
  authoritative solid floor with clear air above; the measured visible stone
  base, rather than its transparent canvas margin, touches that floor. A mined
  support makes the grave settle onto the next valid floor. Its 0.8-tile canvas
  height matches the authored visible player height while preserving the
  grave's 512x768 aspect ratio. Nearby graves receive bounded lateral
  separation, remain below the player, and open the large approved Hardcore
  record modal instead of a transient notification.
- `CaveAtmosphereSystem.js` / `CaveInteriorOcclusionSystem.js` — stream identity-specific cave backwalls and motes in both renderer modes, retain opaque interiors until the player crosses the shell, then celebrate in world and record the named discovery in the Journey without a second popup (`values/caveArchetypes.js`)
- `CaveLevelBackdropView.js` / `CaveLevelPresentationSystem.js` — give entered
  caves a 60x20-tile camera-traversed environment without enlarging the
  2172x724 panorama. Three alternating 1:1 main cards cover the floor while
  four rows of cavern-only native crops cover the upper camera range. Generated
  smoothstep masks feather every horizontal, vertical, and main/canopy overlap;
  the art remains world-space and the fallback color is never exposed. Six cave
  identities still route through the same three authored families, and only
  unbreakable structural collision cells are hidden.
- `CaveHazardView.js` — renders cave-only resonance gates, real spike silhouettes, vent telegraphs, and erupting columns below the existing cave occlusion; `CaveAtmosphereSystem` adds restrained glints only while its underlying resource seam tile still exists
- `TitanDiscoverySystem.js` / `TitanUnlockController.js` / `TitanCoverageGlowSystem.js` / `TitanDiscoveryGuidance.js` / `TitanGuidanceIndicator.js` / `titanCreatureFootprint.js` / `titanCoverageThreshold.js` / `TitanChamberStream.js` / `TitanChamberTextureReleases.js` / `TitanSurfaceGallery.js` / `TitanSurfaceInspection.js` — track 25 deterministic colossal search windows, project each sharp 768x768 stance alpha into authoritative covering cells, and keep that same near-opaque high-resolution stance behind terrain on a compact ImageGen basalt dais. While the player approaches, the subtle ImageGen location pointer targets the chamber; once inside, it disappears and the still-solid footprint tiles pulse with the Titan's color using authored resonance art on the shared below-darkness emissive layer. Reaching `ceil(total * 0.5)` dug cover cells destroys the remaining footprint cells through `WorldModel`, redraws them without mining rewards, and admits the canonical discovery/trophy/save path. The old 1536x848 chamber paintings stream as faint depth-graded environmental context rather than the dominant creature/platform. The reveal, guidance pointer, gallery, and Journey entry communicate discovery without a redundant center card. On the surface, the same newer basalt footing replaces the oversized walk plinth at a compact 2.1 by 0.36 tiles. The 25 sharp stance cutouts use bounded identity-specific sizes, a camera-safe height cap, measured transparent-bottom grounding, normal blend, 98.5% base alpha, a prop-free corridor, unlocked-only inspection, and expanded ESC lore. Zone/threshold/glow/slot/stream/art/guidance/inspection state is published through `__jkdTitanDiscoveries` (`values/titanDiscoveries.js`, `values/titanDiscoveryExperience.js`, `values/titanCreatureFootprints.js`, `values/titanLore.js`; `?titanStatueLore=0`; `?titanGuidance=0`; `?titanEncounter=legacy`; `?titanChamberBlend=0`; `?titanChambers=0`; `?titans=0`)
- `RelicDiscoveryFxSystem.js` / `relicDiscoveryFxBurst.js` — present the already-authoritative Ancient Relic award as a visible world-space pedestal wake, generated-token orbit into the live player, short residual floor mark, and bounded count reveal. Reduced-motion and low-FX modes preserve the state-independent cleanup contract; presentation exceptions remain unable to roll back awards but publish a warning to runtime health.
- `HeavenblocksPresentationSystem.js` / `heavenblocksAltarProgression.js` — render three ImageGen-authored dormant/attuning/awakened surface altar families from real relic and region state, while retaining sky-region arrival/return rings, component claims, interaction prompts, lifecycle cleanup, and health publication.
- `CelestialEngineHudSystem.js` — lower-right Star Heart icon, bounded charge bar, selected-Engine label, active impact budget, and context-sensitive `X` prompt.
- `ProgressivePillarSprite.js` — shared bottom-anchored renderer for approved five-stage pillar art; it preserves the source sheets' natural height growth and adds only restrained in-engine transition light.
- `StarPillarWorldVisual.js` / `StarPillarSystem.js` — screenshot-2 blue stone monument on the Level 1 Sky Island. The world visual grows across five constellation thresholds, layers the sharper Wayward Star core over a Star Heart halo inside its authored sockets, intensifies paired unlocks, and owns staggered glow/pop/beam animation. `StarPillarSystem` opens the same ten-node Starlight Talent Tree used by the ESC `TALENTS` tab, routes its three Engine cards into the Star Heart overlay, and queues the one-time first-star reveal for each material section; no collected sky star is restored to the persistent world.
- `MilestoneBoardSystem.js` / `MilestonePillarModal.js` — Town Square depth
  pillar and journal. The world object uses the approved screenshot-1 Dwarven
  Depth Engine and advances at 0/500/1000/1500/2000 m while preserving
  nearest-interaction arbitration. The modal keeps eight bounded milestone cards
  per page, a large next-depth summary rail, and a responsive two-panel journal.
  The modal delegates its two views to `MilestonePillarMilestonesView.js` and
  `MilestonePillarJournalView.js`; sizing lives in
  `values/milestonePillarUi.js`.
- `UalGroundPhaseHandoffSelector.js` /
  `UalNativeLocomotionTransitionSelector.js` — preserve the live Jog foot phase
  through two-frame planted starts/stops, immediate pivots, and authored
  soft/hard landing exits. The landing animation is the sole squash owner when
  this polish is enabled.
- `UalActionRecoverySelector.js` / `UalWallBraceSelector.js` — replace
  frame-zero stationary combat-idle recovery with matched two-frame settles and
  give blocked movement a planted brace entrance, hold, and phase-aware Jog
  release. These are presentation selectors only; they do not delay input or
  alter collision, mining cadence, or action authority.

- `StarDiscoveryPopupView.js` — one-active, screen-space Star discovery readout
  using the six authored rarity plates and fills. It shows rarity, material
  Sign, exact Sign XP, material multiplier, current level, and cropped
  per-level progress; rarer or level-up discoveries may replace a weaker
  active popup. All tweens end and the view owns no infinite ambient loop.

`StarPillarSystem` mounts the same full-shell V4 Starlight view used by ESC
Talents. While open it hides the older shell skin to prevent a double frame,
keeps the authored close control, retains the deferred Starlight asset group,
and exposes the existing health snapshot to the runtime canary/worker path.
Closing releases the view and its retained texture consumer.
