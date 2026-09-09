# Visual

Game system — visual.

`PlayerContactShadowSystem.js` anchors the existing shadow to the custom physics
body's floor and speed, with Arcade/sprite fallbacks and airborne fading. The cave
composition rollback restores its prior presentation; see
`markdown/2026-09-05-cave-composition.md`.

`UiIconRenderer.js` creates and updates shared atlas or direct-texture icons,
including the pickaxe fallback. HUD views consume it within the visual layer;
`ui/UiIconAtlas.js` re-exports it alongside UI-specific label/catalog helpers.

`MiningImpactFeedback.js` adds bounded, owned contact-pose holds and delegates
same-frame shake to `CameraShakeSystem`. `CameraImpactOffset.js` bypasses camera
deadzone only during rendering and restores world scroll before input; the HUD
does not shake. `materialParticleFrame.js` chooses sufficient native pixels at
higher density without replacing any material art. `?impactPolish=0` restores
the preceding behavior; see `markdown/2026-09-03-high-resolution-contact-gamefeel.md`.

`CampfireEvolutionPresentation.js` gives successful purchases a short grounded
before/after reveal, pins the old texture until cleanup, and never owns input,
money or progression. `EmberDiscoveryEvolutionView.js` flies the actual ore icon
into the current Campfire form on the discovery card. Both support reduced
motion and dispose their timers/tweens. `EmberDiscoveryEventSystem` owns the
skippable card and its input handoff; the existing approved tooltip frame is
reused without a baked-in crystal.

The material-particle polish shares padded v3 shard aliases through
`materialParticleFrame.js`. Footsteps use current-sheet sole samples and low
scuffs; hits retain their contact points; destruction scatters mixed-size
material fragments earlier. All effects are bounded and disposable.
`?particlePolish=0` restores the prior presentation. See
`markdown/2026-09-03-material-particle-polish.md` for review and rollback.

`DigImpactFxSystem.js` presents successful ordinary mining contacts with the
existing material flash/shard atlases. `digImpactContact.js` projects measured
current-sheet tips at post-update, preserving front-plane overlap, actual
192/256 px geometry and both contacts of combos. It shares the point with Speed
Block sparks, caps live objects, supports reduced motion and owns no actor geometry
or gameplay mutations. Its MiningImpactFeedback child owns only the brief pose
pause and camera dispatch. Main and cave scenes both dispose it. `?digImpact=0` is the
rollback; see `markdown/2026-09-03-contact-local-dig-impact-polish.md`.

`SpeedBlockFxSystem.js` gives the active 20-second Speed Block buff bounded
yellow bitmap sparks around the player, a pickup burst, and authored-contact
bursts. It reuses the approved mining-spark atlas, supports reduced motion,
owns no player transforms/collision/stats, and is disposed in both worlds.
`?speedBlockFx=0` disables only this presentation. The existing approved buff
chip uses a yellow `ATK +50%` countdown, including before the normal HUD unlock.

Notable systems:
- `WorldrootSanctuaryView.js` is the normal-play town Worldroot: one tall,
  decorative trunk that grows with discovery and Campfire upgrades, five
  independently living/leafless canopy regions, fixed ground-level Talent and
  Crown access, and no one-way platforms. `WorldrootSanctuaryStars.js` projects
  each known Star or scar through the growing tree, using stable organic slots
  and actual game sprites without extra halo images. It preserves discovery
  privacy and routes clicks into the existing map/archive/Talent controllers.
  Each living region uses three mirrored/offset instances of the shared bush;
  its dead state resolves to one clean skeletal silhouette rather than a thicket.
  Real Campfire sprites and all ten tiers remain owned by `CampfireSystem`.
- `WorldrootSanctuaryGrowth.js` grows ten independent vine/fern details from
  each region's real known/consumed Stars and the Campfire level. Five bounded
  falling leaves and gentle sway stop for consumed regions or reduced motion.
  No plant layer owns collision, interaction, progression, or saves.
- `CameraShakeSystem.setBaseFollowOffset` composes the surface tree's framing
  with existing shake offsets; ending a shake restores that baseline. The world
  layer owns when to frame the tree, and normal underground follow is retained.
- `WorldrootWhiteboxView.js` is the approval-gated collision-first replacement
  used only by `?worldrootWhitebox=1`. It draws strict side-elevation module
  silhouettes at native tile scale, exposes their literal top edges as the live
  one-way platforms, shows fifty unfilled Star sockets, and labels live
  merchant/Titan exclusion lines. It remains an explicit review route and does
  not replace normal gameplay presentation.
- `WorldrootNativeModuleView.js` places query-gated country art directly on
  that geometry at scale 1. The accepted Gate B and candidate Gate C configs
  share the renderer; it owns opacity-by-growth only, never collision or
  progression. The Rootways/Cobalt seat, Amber Temple cap, and Mirrorstone's
  main/reflection pieces remain independent sprites so generated pixels can be
  aligned whole and never stretched.
- `WorldrootModularV4View.js` is the explicit `?worldrootArt=v4` rollback for six paired
  living/consumed modules. It places every country at native scale on Gate A,
  crossfades each biome from its real consumed-Star ratio, applies aggregate
  consumption to the Crown, and transforms twenty-five sprite-relative,
  alpha-audited walkable segments into live one-way contacts. Broad Gate A
  rectangles are not reused for V4 collision, so sloped art never supports the
  player over transparent gaps.
  `?worldrootArt=v3` leaves the older composite available as a save-neutral
  visual rollback.
- `WorldrootStateResolver.js`, `WorldrootWorldVisual.js`,
  `WorldrootMemoryLayer.js`, and `WorldrootStarArrivalController.js` replace
  only the town Starpillar with the living
  Worldroot. They read the existing Star-territory, biome, Campfire, GP,
  Celestial Talent, and Titan authorities; render intact memories, permanent
  scars, tracked Titan resonance, and the Crown convergence; route inspections
  back into the M map, Titan Archive, or Talent view; and own no reward or save
  state. Consecutive Star arrivals use a Worldroot-owned frame lifecycle so
  hit-stop cannot strand them; active growth reveals survive periodic state
  sync, and scene teardown kills pending flights and tweens.
  Memory marks and their inspection hotspots stay hidden until their supporting
  branch has actually grown. Player-tile hotspot scans are shared across prompt,
  distance, priority, and interact queries; GP/Titan pulse updates do not rebuild
  the static tree; and map/archive feedback is shown only after the real route
  accepts the request.
  Territory signals whose exact Star tile has not been discovered stay anonymous
  on the tree: identity, rarity, and identity colour appear only after discovery.
  Snapshot normalization deduplicates invalid Star records, bounds GP/Campfire
  and talent progress, and attaches each Crown current to a named route so source
  branches cannot swap when authority arrays are reordered. The V4 rollback
  spans the Gate A side elevation at native scale. The legacy V3 rollback spans
  28 tiles at a bounded 1.75 source scale; its compact grounded hearth
  starts beyond the last merchant and ends 1.08 tiles before Titan #1; the
  cantilevered canopy keeps 1.49 tiles of live headroom above surfaced Titans
  and renders behind them. The real Campfire and separate Talent shrine remain
  reachable. V4's twelve exact one-way contacts follow broad visible branch
  tops, stay physical across growth states, accept ascent from below and use
  the existing Down action for drop-through. V3 retains thirteen normalized
  rollback contacts. The tree is never sliced by a rectangular crop.
- `CinematicVideoPlayer.js` owns reusable streamed-video playback, browser
  gesture admission, cancellable two-second keyboard hold-to-skip, error
  completion, music isolation, and gameplay
  suspension restoration. `CinematicVideoView.js` owns only the fullscreen
  poster/video/prompt layout plus the approved framed hold-progress indicator.
  `TitanDiscoveryCinematicController.js` admits the
  Mossback edit only for the newly accepted first-Titan discovery.
- `TitanChamberStream.js` sends its camera-near, at-most-two chamber cards
  through the high-priority runtime asset lane and cancels cards that become
  obsolete before activation. Resident cards and archive pins keep their
  existing release-safe lifecycle and exact source art.
- `RenderDensitySystem.js` — keeps gameplay, cameras, UI, and pointer input in the existing 1280x720 logical coordinate space while WebGL renders to a denser backing canvas. Its CameraManager resize guard prevents browser-panel, fullscreen, and parent resizes from promoting a logical camera to the High/Ultra backing dimensions. `high` is the default 1.5x profile (1920x1080), `?renderQuality=ultra` selects 2x (2560x1440), and `?nativeDensity=0`, `?renderQuality=legacy`, or `?renderer=auto` restores the 1x compatibility path. Current runtime diagnostics are published as `window.__jkdRenderDensity`.
- `HUDSystem.js` — main HUD (depth and stats); compatibility transient status
  calls reach the centrally disabled notification admission gate
- `HudQuickControls.js` — approved inventory-bag and ESC-chip bitmap controls;
  the remapped Inventory label now sits inside a subtle authored keycap while
  exact responsive alignment, larger invisible hit zones, and routing into the
  existing Inventory and Pause authorities remain unchanged. The quick-control
  input rail sits above gameplay/actionbar input and below canonical modals.
  Ten authored bag states now select from real carried-unit totals against a
  presentation-only 100-unit saturation target; inventory storage stays
  unbounded
- `CelestialActionBarSystem.js` keeps the five authored shortcut sockets plus
  the detached Campfire socket and ordering authority active. The full bar fits
  into the bottom rail between XP and the inventory hit area with measured
  clearance on both sides. Unowned abilities render as empty bays; hover help
  reuses the symmetric Star Pillar tooltip and opens left of the rail to avoid
  the Inventory, Menu, and World Map controls. Its bounded pulse is also the
  presentation port for an Ability Block choice; `HUDSystem` shows the selected
  free power and authoritative remaining seconds in the approved buff chip.
- `MiningTargetVisualSystem.js` — image-backed four-corner world-space mining target shared by the main world and compact caves; its approved duplicate-art glow stays restrained on hover and tightens/brightens during held mouse digging; `?miningTargetVisuals=0` restores the former rectangle comparison
- `ApprovedHudSkin.js` — optional approved image-frame presentation layer that preserves HUDSystem runtime data and legacy fallback; its player core switches between matched illustrated torch ON/OFF frames instead of drawing a status dot. The top-right world-state frame now selects one of five ImageGen-authored weather medallions, keeps live copy in two aligned bays, and shares the 14 px top rail with player, combo, and audio chrome.
- `ApprovedHudBuffView.js` keeps each live boost in the existing 131×30 approved
  chip, adds a restrained 16 px atlas icon, and owns a 131×44 invisible mouse
  target. Hovering opens an approved-art tooltip with the authoritative effect
  percentage and remaining duration; moving away closes it without a click.
- `EmberDiscoveryEventSystem.js` presents each rare Ember as a bounded reward
  moment with the real ore icon, Campfire connection, and first-find refill
  upgrade. It briefly isolates gameplay input and accepts click, Space, E,
  Enter, or Escape after the minimum readable dwell.
- `HardcoreStatusHud.js` — maps the canonical stress snapshot to explicit live
  sanity copy across stable, uneasy, fraying, fracturing, and straining stages.
  Its V2 shell has an empty socket; the current alpha-safe crest or panic icon
  is layered independently, so no opaque square or baked double-icon remains.
  Its detail line exposes the current level-shifted `PANIC LINE`; inside a
  destroyed-Star deadzone it switches to the 4x warning and `BURN TORCH OR
  FLEE` action.
  Its compact card breathes continuously with the live curve, then stays hidden
  until the critical banner has completely faded so the two surfaces never
  stack.
- `HardcorePanicBoundaryView.js` — places the approved Hardcore edge strip at
  the exact first world tile where the level-shifted panic depth begins. An
  approved-shell marker reads `PANIC STARTS HERE`, follows the live resistance
  value, and is visible only for an armed Hardcore run during active gameplay.
- `HardcorePanicOverlay.js` — eases three restrained copies of the approved
  transparent edge frame across early peripheral unease, mid-stage breathing,
  and late reality slip. Its high-panic banner shares the same empty V2 shell,
  with the live critical icon fitted to that shell's socket. Independent
  rise/fall smoothing removes band-boundary
  snaps while the single critical/near-death banner remains below modal UI and
  disappears outside active gameplay.
- `TorchIntensityControl.js` — large percentage readout in the dedicated right
  module of the opaque V2 player HUD. The complete module is its click target,
  so dynamic power adds no detached chip or extra HUD row. Clicks move by 10%,
  wheel input is scene-wide in 1% steps during active gameplay, and the module
  title changes to warm-orange `OVERDRIVE` above 100% while lighting authority
  blocks input in modal states. Separate authored OFF and ON torch crops blend
  over the V2 shell from live flame alpha, preserving 1–200% burn and flicker.
- `PickaxeHudView.js` — permanent owned-pickaxe badge inside the V2 left socket;
  it selects the exact generated pickaxe icon and tier label from
  `UpgradeSystem.ownedPickaxe`, pulses after purchase, displays the authored
  starter fallback, and retains `?pickaxeHud=0` without owning upgrade gates,
  player levels, GP values, or save data
- `FloatingTextSystem.js` — policy-gated world text + constellation UI progress;
  FULL is the visible default. Resource pickup labels stay hidden in every
  mode; the exact-icon loot flight provides collection feedback. REDUCED also
  hides routine damage while keeping critical, special, status, and bonus feedback. Remaining
  floating labels stay attached to world impacts or collectibles and render
  above the full-screen weather/darkness stack while remaining below lightning
  flashes and the authored HUD. Mined Star
  Blocks remain UI-only and
  delegate their transient presentation to `SkyStarReleaseView.js`. The exact
  deterministic one-of-250 identity now travels through progress metadata,
  release, and the player-opened Star Atlas; saved constellation progress and callbacks remain
  authoritative without a pickup card
- `XPGatheringFxSystem.js` and `XPGatheringFlightView.js` present mined XP with
  the twelve-icon V2 library. Seven semantic reward profiles (`routine`,
  `cluster`, `surge`, `star`, `special`, `legend`, and `levelUp`) select from
  deterministic, recent-repeat-safe icon pools before travelling to the
  resolved XP-bar segment. `resolveXpFlightPose()` samples the shared reward
  curve tangent so flutter stays perpendicular to travel while bob, bank,
  breath, squash, trails, and echoes scale by reward importance. The reduced-
  motion route follows the base curve without those oscillations or in-flight
  emissions, limits rotation, and retains the concise arrival confirmation.
  These systems never award XP or mutate progression/save state.
- `RewardPickupVisualResolver.js`, `LootPickupFxSystem.js`, and
  `LootPickupFlightView.js` keep the exact resource, soil, special-tile, or
  one-of-250 Star frame continuous from its world source to the live inventory
  target. The shared deterministic router excludes the previous four eligible
  paths; special tiles and rarer Stars receive guaranteed larger route families,
  including ten rare/surge paths, plus restrained trails, banking, breath,
  exact-frame soft echoes, and arrival echoes. Presentation callbacks cannot
  grant loot, progress, or save state. `RewardPickupContinuityState.js` remembers
  only the latest landed resource or
  special descriptor for the active scene, so `I` reuses that exact atlas frame
  and GP tier without persisting presentation data. Reduced motion uses a direct
  route and a small confirmation pulse with travel echoes suppressed.
- `miningDamageFeedback.js` routes each authoritative main-world or compact-cave
  mining hit to exactly one normal or critical floating-number style.
- `SkyStarReleaseView.js` — ImageGen-only mined Star Block release: the exact
  identity crystal and its separate light-only frame fade in below full alpha,
  reach the exact 94 px live-tile envelope before growth, then rise to a
  restrained 136 px core peak and levitate for at least 10.8 seconds behind
  six paced, frame-matched core echoes. The light follows one bounded
  three-tween path and cannot loop indefinitely. Matching rarity
  fracture/pulse art remains beneath it; the view never draws circles,
  graphics, tints art, or generates textures
- `StarlessScarView.js` / `StarlessScarAssetLayer.js` — camera-cull consumed
  Star territory and layer an opaque readable ground plane, transparent
  blackglass corruption, authored dead-Star center, and rotatable outer
  frontier. During a deliberate mining hold the mask grows radially from the
  Star; the authoritative `star-consumed` event continues that front before
  revealing the complete nearest-Star territory. Saved scars load complete,
  and sacrificing the final intact Star still previews every underground
  territory together.
  `StarlessScarBiomeAssetLayer.js`, `StarlessScarPaletteView.js`, and
  `starlessScarPaletteResolver.js` add twenty biome-matched, demand-streamed
  ground/center/frontier/prop kits. A separate solid-cell mask prevents opaque
  footing and props from painting mined air, while the territory mask still
  carries darkness and the radial corruption front.
  `StarScarResourcePresentationSystem.js` removes every depleted resource and
  crack sprite as that same front reaches its cell, while
  `StarScarResourceCollapseFxSystem.js` reuses the authored tile-break core and
  shard atlas for a bounded camera-visible collapse wave. The solid WorldModel
  cells remain intact, so this is presentation-only and reloads directly from
  consumed-Star territory authority.
  `StarConsumptionHoldView.js` pairs that
  preview with the approved HUD frame, percentage, lost-service copy, and
  release-to-cancel instruction. Both are presentation-only and cannot destroy
  a tile, grant a Star reward, or mutate Panic.
- `PostFxSystem.js` — camera vignette + depth-based color grading (values/postFxConfig.js)
- `FullWorldMaterialSystem.js` — review-only (`?fullWorldMaterials=1`) whole-frame WebGL material pass. It recovers bounded local detail, adds restrained directional relief to existing composed assets, varies strength by depth, publishes `window.__jkdFullWorldMaterials`, and shuts itself down after sustained low FPS. The production default and original source textures remain unchanged (`values/fullWorldMaterialConfig.js`).
- `PlayerBodyLanguageSystem.js` — landing squash, fall stretch, dig impact pop (values/gamefeel.js → bodyLanguage)
- Unified Survival V1 disables the older procedural body-scale layer because
  the approved sheets own their silhouettes. Legacy profiles retain it and now
  restore their exact base scale after each deformation
  (`?presentationContinuity=0`).
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
- `PlayerKinematicMotionSystem.js` — UAL feet anchoring plus signed post-collision displacement; grounded Jog cadence can use the immediate body velocity while airborne flight retains smoothed travel and teleport suppression (`values/playerKinematicMotion.js`)
- `UalNativeLocomotionTransitionSelector.js` / `UalGroundPhaseHandoffSelector.js` — Phaser-independent shared routing: every grounded speed uses the production gait, Standard Walk resumes its pose-matched phase after start and selects a stop entry frame from the interrupted gait phase, moving actions resume their exact lower-body phase, and input-facing reversals flip immediately while replaying only the two closest planted frames. Survivor flight keeps one continuous loop whose travel phase responds to total 2D speed; playback rate and climb/dive pitch follow momentum, soft touchdowns skip landing, and harder landings expose a short movement-cancellable prefix (`values/survivalMixamoWalkRuntime.js`, `values/ualNativeLocomotionTransitions.js`, `values/ualNativeActionTuning.js`, `values/movingSideDigAnimation.js`; `?mixamoWalk=0`, `?phaseHandoff=0`)
- `PlayerSolidOcclusionSystem.js` — positive air-cell geometry mask that lets the complete UAL animation continue while terrain hides only limb pixels extending into authoritative solid cells. The same presentation-only path works in WebGL and Canvas in both the main world and compact caves; `?playerSolidOcclusion=0` is its rollback (`values/playerTileContact.js`).
- `PlayerRigContactSystem.js` — marker-driven UAL action contact, separate fist/foot hitboxes, and capped sprite-only tile-face alignment that eases in and out across the main world and compact caves (`values/playerRigContact.js`); phase-locked moving strikes explicitly disable that translation so the physics-owned running feet cannot skate while marker validation remains diagnostic; pure geometry lives in `playerRigContactGeometry.js`
- `player/MovingSideDigStandOffController.js` — supplies the body-owned 18 px
  tile-face gap for moving SIDE mining and Quickslash; rig-contact teardown
  releases it, while the visual system never translates the running sprite.
- `PickaxeTrailSystem.js` — motion ghost trail for mining; powered flight uses the restrained foot-particle layer so the native skeleton stays readable
- `FlightFootParticleSystem.js` — two restrained additive trails emitted from the approved Survivor Superman pose's trailing feet in both the main world and compact caves (`values/playerFlightFootFx.js`)
- `GroundFootstepFxSystem.js` — emits at most three tiny material-matched fragments from the planted Game Rig foot on authored grounded contacts, using all explicit non-air material routes into the promoted seventeen-family shard atlas in both world implementations. Fragments stay at or below 0.09 tile, the global live cap is twelve, sound remains contact-driven below the visual speed threshold, legacy profiles retain their former cadence fallback, and `?groundFootFx=0` disables only the bitmap fragments (`values/playerGroundFootstepFx.js`, `values/tileDestructionFx.js`).
- `DepthMilestoneCinematic.js` — letterbox + title card cinematic at major depths (values/depthCinematicConfig.js)
- `CameraShakeSystem.js` / `cameraShakeMath.js` — signature-based screen shake
  with real-Hz deterministic motion, bounded secondary waves, duplicate-impact
  merging, shared FPS/accessibility gates, and one clean zero-amplitude tail
- `ThunderStrikeTimingBarSystem.js` / `ThunderStrikeTimingBarView.js` /
  `ThunderStrikeImpactFxSystem.js` — the minimal exact-timing view records the
  needle position actually presented to the player, then drives ten staged
  lightning impacts, rings, sparks, flash, effective-damage labels, and bounded
  shake tiers. Only a 680x60 authored rail crop, the v2 target gate, and the v2
  moving needle are created, and the rail is visible only while continuation
  input is live. Charge, strike, success, cancel, and failure phases never open
  a Thunderstrike panel; the existing compact HUD status lane handles rejected
  GP and broken-chain copy. There are no milestone sockets, title, prompt,
  badge, dynamic text, or Phaser `Graphics` objects in the timing view.
- `ScreenRecordSystem.js` — development-only F9 `SHORT` (clean 9:16, no HUD) or `BROAD` (complete fullscreen canvas) WebM capture; production omits the action and recorder; development uploads timestamped local files through `serve.py` to `/systems/screenrecord/`
- `EarthquakeFeedbackUI.js` / `earthquakeFeedbackPresentation.js` /
  `EarthquakeHazardOverlay.js` / `EarthquakeFallZoneView.js` /
  `EarthquakeRockImpactView.js` / `EarthquakeTileFeedbackSystem.js` —
  generated-art 390x72 persistent seismic
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
- `NextPromiseHudSystem.js` — one current action plus one next-promise detail in
  the approved HUD-cohesion bitmap frame. Its live circular badge distinguishes
  tutorial steps, events, unlocks, and ordinary goals; single-line copy is
  fitted within the authored text bay. It sits above the bottom-left currency
  strip, so guided Step 1 is visible on the first playable frame.
- `RandomEventWorldView.js` — world event sigils plus an active-event ribbon
  whose authored frame is responsively clamped to the exact safe lane between
  the approved player and weather panels. The 16 px side gaps prevent active
  Choir or Blackout copy from covering persistent HUD data.
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
- `TitanDiscoverySystem.js` / `TitanUnlockController.js` / `TitanCoverageGlowSystem.js` / `TitanDiscoveryGuidance.js` / `TitanGuidanceIndicator.js` / `titanCreatureFootprint.js` / `titanCoverageThreshold.js` / `TitanChamberStream.js` / `TitanChamberTextureReleases.js` / `TitanEnvironmentEnvelopeStream.js` / `TitanEnvironmentTextureBank.js` / `titanEnvironmentAssets.js` / `TitanSurfaceGallery.js` / `TitanSurfaceInspection.js` — track 25 deterministic colossal search windows and keep progression authority in the existing creature-footprint encounter. Underground stances are bottom-anchored to a fixed foot baseline, share the active depth grade, sit over a mostly buried dais, and receive an authored terrain-tinted contact foreground. The nearest two chambers demand-stream identity-matched `side-arches`, `ceiling-crown`, and `hanging-network` assets from the existing ten-biome V7 library; all 75 mappings and stream failures publish through `__jkdTitanDiscoveries`. Unlocks use the authored mineral resonance plus a short compression/lift/settle to the same baseline, with no lateral chamber crossing or idle horizontal drift. The faint v3 chamber card remains context behind the sharp stance. Surface gallery, clues, archive, trophy/save path, 50% threshold, and `WorldModel` remainder clear are unchanged (`values/titanDiscoveries.js`; `?titanEnvironment=0`; `?titanStatueLore=0`; `?titanGuidance=0`; `?titanEncounter=legacy`; `?titanChamberBlend=0`; `?titanChambers=0`; `?titans=0`).
- `RelicDiscoveryFxSystem.js` / `relicDiscoveryFxBurst.js` — present the already-authoritative Ancient Relic award as a visible world-space pedestal wake, generated-token orbit into the live player, short residual floor mark, and bounded count reveal. Reduced-motion and low-FX modes preserve the state-independent cleanup contract; presentation exceptions remain unable to roll back awards but publish a warning to runtime health.
- `HeavenblocksPresentationSystem.js` / `heavenblocksAltarProgression.js` — render three ImageGen-authored dormant/attuning/awakened surface altar families from real relic and region state, while retaining sky-region arrival/return rings, component claims, interaction prompts, lifecycle cleanup, and health publication.
- `CelestialEngineHudSystem.js` / `stellarLanceHudBuffEntry.js` — lower-right Star Heart icon, selected-power label, Wayward swarm count/impact budget, Hollow black-hole count/aggregate target budget, and context-sensitive `X` prompt. While Stellar Lance is active, the lower-right bar becomes a purple remaining-duration meter and the approved three-chip lane gains a highest-priority `LANCE` timer with its authored power icon plus infinite-range/lane/damage/state tooltip. Its three purple projectile states stay in world space and add no persistent legacy icon to the character model.
- `ProgressivePillarSprite.js` — shared bottom-anchored renderer for approved five-stage pillar art; it preserves the source sheets' natural height growth and adds only restrained in-engine transition light.
- `StarPillarWorldVisual.js` / `StarPillarSystem.js` — screenshot-2 blue stone monument on the Level 1 Sky Island. The world visual grows across five constellation thresholds, layers the sharper Wayward Star core over a Star Heart halo inside its authored sockets, intensifies paired unlocks, and owns staggered glow/pop/beam animation. `StarPillarSystem` is the sole production host for the ten-node Starlight Talent Tree, routes its three Engine cards into the Star Heart overlay, and queues the one-time first-star reveal for each material section; no collected sky star is restored to the persistent world.
- `MilestoneBoardSystem.js` / `MilestonePillarModal.js` — Town Square depth
  pillar and journal. The world object uses the approved screenshot-1 Dwarven
  Depth Engine and advances at 0/500/1000/1500/2000 m while preserving
  nearest-interaction arbitration. The journal contains 27 rewards through
  4,800m, keeps eight bounded milestone cards per page, and displays GP, speed,
  crit, and material-yield totals in its responsive summary rail.
  The modal delegates its two views to `MilestonePillarMilestonesView.js` and
  `MilestonePillarJournalView.js`; sizing lives in
  `values/milestonePillarUi.js`.
- `UalGroundPhaseHandoffSelector.js` /
  `UalNativeLocomotionTransitionSelector.js` — preserve the live gait foot phase
  through pose-matched Mixamo start/stop entries (or two-frame Piskel rollback
  bridges), immediate pivots, and authored soft/hard landing exits. The landing
  animation is the sole squash owner when this polish is enabled.
- `UalActionRecoverySelector.js` / `UalWallBraceSelector.js` — replace
  frame-zero stationary combat-idle recovery with matched two-frame settles and
  give blocked movement a planted brace entrance, hold, and phase-aware Jog
  release. These are presentation selectors only; they do not delay input or
  alter collision, mining cadence, or action authority.
- `ualCrouchTransitionSelection.js` — one Phaser-independent enter/hold/exit
  crouch selector shared by the main world and compact caves. Playback restart
  requests are accepted only from the selection that owns the final animation,
  preventing an overridden one-shot from restarting at frame zero.

`StarPillarSystem` mounts the full-shell V4 Starlight view only at the physical
pillar. While open it hides the older shell skin to prevent a double frame,
keeps the authored close control, retains the deferred Starlight asset group,
and exposes the existing health snapshot to the runtime canary/worker path.
Closing releases the view and its retained texture consumer.

`LevelUpRewardPresentation.js` uses the dedicated V2 level shell and layers the
live XP crest into its empty socket. No text or symbol is baked into the shell.
The short nonblocking sequence presents the meaningful level, permanent panic
resistance, mining power, GP-cap growth, GP refill, and any Talent Point earned
from Level 3 onward, then cleans itself up without acquiring modal or gameplay
input ownership.

`TitanDiscoverySystem` emits the LEO `titanDiscovery` request only for the
newly unlocked Titan identities returned by discovery authority. The request
uses Titan identity deduplication and queues behind active speech; the selected
variant-one line therefore cannot replay from ordinary proximity updates.

`TitanDiscoverySystem` emits the LEO `titanDiscovery` request only for the
newly unlocked Titan identities returned by discovery authority. The request
uses Titan identity deduplication and queues behind active speech; the selected
variant-one line therefore cannot replay from ordinary proximity updates.

## 2026-09-05 merchant motion

`MerchantMotionSystem` owns articulated merchant textures, visible-only uploads and cleanup. `MerchantMotionRenderer`, `merchantMotionMath` and `merchantMotionShaders` share the approved sandbox animation; `MerchantMotionPlayback` advances only with gameplay. `NPCActivitySystem` schedules the gestures, retaining its legacy still-pose fallback. See `markdown/2026-09-05-merchant-motion-runtime.md`.

`DynamicEventAwarenessView` keeps Shadowminer/Wurm phase and response text in
the approved frame below the seismic card, clear of the menu and wallet.
`DynamicEventDevPanel` supplies the local-only EVENTS / F2 control, five Wurm
size/behavior choices, latest outcome and per-controller counts/reasons.
`eventScreenLayout` keeps these notices and the seismic card at a stable screen
size when the world camera is zoomed. Wurm views now render arc-length-spaced
segments and at most two smaller child views, retry delayed artwork and clean
up completed child presentation.


## Destruction and pickup timing - 2026-09-05

The current timing cleanup and native Phaser proof are in `testing/audio-destruction-pickup-2026-09-05/`; see `markdown/2026-09-05-destruction-pickup-audio-timing.md`. Five approved recordings now use short playback windows from `values/coreSfxWindows.js`. Only resource arrival owns pickup audio; XP cannot replay it later. Original files and review IDs are preserved. Prior audio comparisons remain historical snapshots.
