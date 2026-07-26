# Values

Single Source of Truth — ALL numeric/string/config values.

- `lightConfig.js -> playerLightV2` owns the upper-body anchor, surface/day,
  night, rain, storm, deep-cave response, world-glow shaping, and
  `?playerLight=legacy` rollback. `shaderConfig.js -> darknessLight` owns the
  v2 penumbra, falloff, core, warmth, and alpha ceiling.

- `hardcoreMode.js` owns the versioned Casual/Hardcore save discriminator and
  armed-state sanitizer. `graveborerWurm.js` owns the two Wurm developer flags,
  post-Flight/depth gate, mining-noise weights, warning/travel/cooldown timing,
  committed-path geometry, one-hit GP damage, ImageGen asset paths, HUD motion,
  labels, persistence limits, and diagnostics key.

- `npcActivityConfig.js` owns the approved v11 Piskel merchant cadence: four
  chronological quiet-loop frames plus seven planted activities per merchant.
  Quiet frames use a slow 0-1-2-3-2-1 rhythm, 520 ms dissolves, and long rests;
  larger activities retain 1.15/1.35-second cross-fades and one-at-a-time town
  scheduling. It also owns preload paths, `?npcActivities=0`, and exact-anchor
  health. It contains no walking, roaming, whole-body translation, rotation,
  or runtime scale animation values.

- `runtimeCanaryConfig.js` owns runtime health globals, admin query/hotkey,
  timing thresholds, required scene collaborators, event copy, severity/status
  names, reporting endpoint hook, and panel presentation values.

- `earthquakeFeedback.js` owns the generated seismic frame/medallion preload
  contract, compact card geometry, entrance/exit/recap timing, auto-expiring
  route guidance, hazard-marker limits, restrained fall guides, and all
  player-facing seismic copy. Earthquake state and mutations remain owned by
  `earthquakes.js` and `EarthquakeSystem`.

- `gameConfig.js -> rendererQuality` owns the painterly WebGL sampling contract: antialiasing stays enabled, pixel rounding stays disabled, High 1.5x is the default backing density, Ultra is 2x, and all rollback query names/presets are centralized there. Logical gameplay coordinates remain 1280x720.

- `worldVisualDepthBackdrops.js` owns 60 streamed background-only plates across the ten row 65..5064 material bands: five deterministic 1536x1024 WebPs plus one approved 1536x1024, eight-second, 60 fps H.264 V3 loop per biome. It also owns the negative render depth that keeps all scenic architecture behind `terrainDepth: 0.1`, `?biomeBackdropVariants=0` legacy-pool rollback, and `?biomeBackdropMotion=0` whole-card motion rollback. The rejected Graphics, duplicate-emissive, drifting-mist, and choppy optical-flow V2 paths remain absent from production selection. V3 moves only the complete finished media card and automatically pauses video below its configured FPS floor. `?levelOneBackdrops=0` and `?shallowCavern=0` still disable the complete presentation without touching simulation state.

- `worldVisualDepthCameraMotion.js` owns the ten restrained relationships
  between camera movement and the finished backdrop media. Amber, Slagworks and
  Pressure Foundry are explicitly anchored; organic, crystalline and cosmic
  bands use bounded whole-image lag up to ten pixels. It also owns frame-delta
  clamping and teleport reset. The runtime may move the complete image object but
  may not draw a substitute effect over it.

- `undergroundBiomeMotionReview.js` owns only the promoted source-plate
  identities, labels, material ids, and gallery descriptions. Production media
  routing stays in `worldVisualDepthBackdrops.js`, so Phaser does not import
  review UI metadata.

- `titanDiscoveries.js` owns the 25 visual-only titan identities, canonical save order, archive lore/regions, transparent creature and generated-plinth paths, deterministic depth/x search anchors, clear-area thresholds, backdrop reveal/glow timing, 5x5 archive geometry, production-health labels, and the complete 25-position non-interactive Titan Walk. `?titans=0` disables and de-queues the complete presentation without changing terrain, rewards, collision, or saves.
- `ancientRelics.js` remains the authority for cache placement, count limits, and progression gates. `relicDiscoveryFxConfig.js` owns only the bounded visible-world pedestal wake, short residual floor mark, world-space player-collection orbit, reduced-motion modes, presentation depths, and warning-only health code; it never awards or persists a relic.

- `worldVisualSurfacePacks.js` owns the reversible scenic-surface composition. `town-benchmark-v1` is the default: its approved 1801x941 beauty plate is cropped at the authored ground line and uniformly calibrated from the shared 1.75 m midpoint player reference so its measured 75 px lintel-to-threshold opening renders as a 2.10 m door. This produces a roughly 23.05-tile beauty span with a bounded 20.3% enlargement and no aspect distortion. Approved Option A now adds an 1801x139 Town Square facade whose 1672 px core is an unscaled pixel-exact mockup crop followed only by the matching 129 px alpha handoff. It shares the beauty scale and authoritative solid-terrain mask, renders above overlapping terrain semantics, and remains below damage feedback. The legacy 14x10 underground facade remains unchanged underneath for exact digging holes and rollback continuity. The pack also owns restrained SCREEN lightning plus cool, low-alpha wet-ground response. Use `?surfacePack=current-v2` to roll back to the previous split scenic surface assembly without changing gameplay state.

- `worldVisualRuntime.js`, `worldVisualMaterials.js`, `worldVisualRegions.js`, `worldVisualFeedback.js`, `worldVisualSemanticAssets.js`, and `worldVisualLandmarks.js` are the scenic-v2 visual SSOT. The surface-stage contract caps each far-background card at native source density, preserves aspect ratio, and keeps the transparent surface-edge strip disabled in production; use `?surfaceEdge=1` only for legacy comparison. The landmark contract owns decorative world anchors, crop/baseline alignment, additive response, and the independent `?mineEntrancePilot=0` rollback; it never owns collision or tile state. `worldVisualSemanticAssets.js` makes the generated raster presentation the production default (`terrainSemantics=1`): a 256 px resource atlas with deterministic variants, rarity-mapped sky-star beauty/emissive atlases, paired beauty/emissive atlases for the seven reward blocks, and a seamless bedrock material with an explicit visibility lift and cool tint. These images are read-only views of the authoritative resource, reward, `SKY_TILE`, `BEDROCK`, `CAVE_WALL`, `FLOOR_TOWN_1`, and `FLOOR_TOWN_2` cells, so digging, HP, collision, rewards, recognition, and saves remain in `WorldModel`. The town-floor types inherit the bedrock material so their unbreakable foundation is visibly distinct from ordinary earth. Non-stone ores are prioritized over sparse stone detail so common geology cannot exhaust the render pool. `?terrainSemantics=0` is the explicit procedural rollback; within that rollback, `?resourceVeins=0` also restores the older resource-emblem atlas. `worldVisualFeedback.js` still owns damage cracks and non-reward special markers, while `worldGameplayLayout.js` labels the hidden compatibility layout so saves cannot cross a future blueprint revision.
- `worldVisualDamage.js` owns the material-neutral nine-state damage ladder, deterministic fracture/scuff/chip geometry, adaptive MULTIPLY/SCREEN layer styling, and `?groundDamage=legacy` comparison rollback. It deliberately contains no material or tile-type map, so every current and future solid visual inherits the same pre-break feedback.

- `miningConfig.js` owns the shared `You cannot break this` and `0 damage` blocked-bedrock UI copy, styling, dedupe key, duration, and compact-cave status color. `DigSystem` identifies authoritative bedrock, cave-wall, and town-floor failures; presentation remains in the active world UI.
- `caveArchetypes.js` owns the six cave identities, four width forms, palettes, motifs, discovery copy, feature chances, depth gates, and streaming values. `worldGen.js -> caves.authoredGapSupplement` owns the five-band Level One refill targets and spacing; the generator may carve only non-authored resources or reuse authored AIR.
- `lightConfig.js -> caveLights` owns restrained local cave illumination that reveals identity art only while the player is at the cavern. `skyTileLights` separately owns Star Block beacon lighting: in-view `SKY_TILE` cells keep a strong, softly flattened pool of light through hard underground darkness beyond player vision. A coordinate-seeded 18% chance per 45-second window may send one faint 6.4-second ring across the area; its 1024 px linear-filtered gradient, feathered bloom, pearl filament, and soft node textures replace primitive ellipse/circle drawing. Cross flares are disabled and concurrent rings are capped at one. Geode and crystal lights remain proximity-limited.
- `starConstellations.js -> collectedStarReleaseFx` owns the UI-only mined Star Block presentation: source flash, expanding impact ring, bounded sparkle trail, slow swaying ascent, rarity duration, scale beats, and final fade. It never restores collected stars to the persistent world.

- uiLayout.js centralizes modal spacing, UI typography, depth ordering, and merchant presentation copy for the unified interface.
- `pillarVisuals.js` owns both approved five-stage production asset lists, player-readable world scale, transition/glow timing, Milestone depth thresholds, Star Pillar constellation thresholds, and normalized socket centers. `milestonePillarUi.js` owns the responsive modal geometry, pagination density, and readable type floor; `milestonePillarReview.js` remains the isolated five-option review-lab contract.
- `townSquareConfig.js` owns the approved Option A square layout id, surface-row offset, and five absolute door-aligned merchant slots. The Level 2 Arc Core merchant remains owned by `arcCoreConfig.js`.
- `branding.js` owns the approved UNDERSTAR product name and Rift Monolith
  runtime-logo path shared by the boot and menu scenes.
- `worldDepthConfig.js` owns the 2,000-row Level 1 boundary and 5,000-meter Level 2 runtime depth; `arcCoreConfig.js` owns both Arc Core material costs, the 2x2 base footprint, the final 8x8 Omega footprint, and vehicle presentation copy/style. `craftingRecipes.js` owns their permanent relic, Heavenblock, part, and Zenith requirements plus Forge presentation copy. `arcCoreVisualConfig.js` owns the approved Small/Omega motion language, cloud transition timing, `B`/`F` sandbox controls, health expectations, and `?arcCoreVisualsV3=0` rollback. `arcCoreVisuals.sprite.json` is the centralized Piskel-round-tripped Phaser pack for ten fixed-center production body/VFX roles plus one sandbox background; it owns paths, hashes, shared center, display sizes, depths, and layered-motion values.
- `ualNativePlayerAssetProfile.js` owns the production player's UAL sheets and the review manifest, plus the shared 1.75 m midpoint physical-height reference, 0.8-tile visible-height target, measured 31x75 collider, no-weapon policy, and direction-specific mappings. Idle and actions use the 109px base display size; grounded movement uses the 123px run-slot Jog with footfalls on its measured plant frames. Side digging keeps Jab/Cross/Jab/Cross; DOWN uses `OverhandThrow`; UP and UP-SIDE use a `Melee_Hook` strike followed by a sampled neutral recovery. Landing keeps the complete source sheet for loading but plays a short impact-readable sample.
- `survivalUalPlayerAssetProfile.js` owns the default `survivalUal` player. Existing saves that still name the former UAL mannequin default migrate to Survivor on load, while `?character=ualNative` remains the explicit visual rollback. Its 48-frame Blender idle plays at the authored 12 fps, its run slot uses the selected UAL `Jog_Fwd_Loop`, and its face-down `DG_SUPERMAN_FLIGHT_IDLE_PRONE_V3` uses one uninterrupted 36-frame loop at 16 fps while hover/travel state changes affect cadence and banking without restarting the pose. UP and UP-SIDE now use the complete 24-frame dedicated `MINER_dig_up` sheet after manifest-driven Piskel body-anchor/baseline polish; SIDE and DOWN remain on their compatible UAL actions. The shared 31x75 collider, cooldown, and no-weapon rules are unchanged.
- `survivalBlenderV2Runtime.js` names the approved Blender v2 core sheet paths, exact source frame groups, Piskel-polished dig-up presentation/contact contract, and Blender-only idle fidgets. The breath fidget continues through the settle tail so it returns to idle without a frame-27-to-frame-0 snap. `survivalSideComboReview.js` owns the four fist-only side-combo review candidates and stage constants; it is explicitly non-production.
- `ualNativeAuthoredKick.json` retains provenance for the rejected 26-frame grounded side-kick experiment; it is not referenced by the active combo or the 19-sheet game preload.
- `ualNativeActionTuning.js` is the single source for combo reset rules, authored visual-contact frames, cooldown-to-action time scaling, post-contact recovery replacement, the complete Thunder Strike hold, hysteretic velocity-matched flight playback, and frame-rate-independent flight-bank response. `DigSystem` cooldown admission is anchored to the visible action's start time while tile damage remains on authored contact.
- `playerKinematicMotion.js` owns the UAL grounded anchor, 94px-grid stride lengths, response/clamp values, teleport threshold, and falling hysteresis. Main world and caves use immediate post-collision body velocity for grounded Jog cadence while retaining smoothed displacement for climb and flight.
- `ualNativeLocomotionTransitions.js` selects the UAL run slot (`Jog_Fwd_Loop`) as the only production grounded gait and owns flight travel thresholds, rise/fall thresholds, source-facing rules, impact-gated landing thresholds, landing time scales, and the movement-cancel frame.
- `ualWalkReviewConfig.js` owns only the five-option, non-production walk chooser labels, evidence notes, control bounds, and persistent selection key.
- `ualAnimationTuningLab.js` owns the additive v2 animation-lab scenario catalog, review timeline presets, production asset routing, inspection defaults, and Option C draft identity; gameplay values continue to come from their production SSOT modules.
- `blenderAnimationLab.json` owns the review-only Blender 5.1 master-build contract: 17 unique Unreal-IK-retargeted FBX carriers covering 18 runtime actions, source/output/add-on paths, canonical Survival rig and marker bones, fixed orthographic camera/three-light review stage, exact 94px/0.8-tile/31x75 game geometry, start-through-end pose interpolation modes, and approved/rejected mesh-review candidates. It never promotes a draft or changes production assets.
- `supermanFlightReview.json` retains the isolated older Push Loop Superman-flight source recipe: the local retargeted source, approved Survivor v2 rig/camera, one-arm and trailing-leg pose-layer targets, 36-frame high-quality render, and the proposed 75x31 visual hull plus 70x34 tile-safe flight AABB. Its former runtime copy remains immutable rollback evidence but is no longer selected by the default profile.
- `supermanFlightProneV3Runtime.json` is the explicit production promotion recipe for the latest `DG_SUPERMAN_FLIGHT_IDLE_PRONE_V3` Blender pose. It owns the versioned 36-frame output, right-facing pack mirror, restrained whole-body hover offsets, 256px cell geometry, and rollback-safe runtime filename; the former Push Loop sheet remains untouched.
- `supermanPoseEditor.json` owns the isolated, upright-idle Superman pose workbook: the approved Survivor v2 source, the frozen review action, five large labelled pose controls, and the review-only output paths. It never changes runtime art, animation, or collision.
- `supermanHorizontalIdleReview.json` owns the simplified review-only Superman baseline: the frozen approved idle snapshot, a single 90-degree horizontal flip, and its clean no-controls output paths. It never changes runtime art, animation, or collision.
- `openingFlightArtifact.js` is the one opening-flight SSOT. It owns the legacy
  encounter, production Golden Five config, fresh/resume spawn eligibility,
  calm five-minute weather, 14-cell reward seam, artifact/escape geometry,
  protected ascent rings, paused-when-grounded 30-second bank, permanent cache
  rewards, remap-safe copy, v2 save schema, and `?openingFlightV2=0` rollback.
- `directionalSidePunchReview.json` owns the review-only Blender Punch Cross source, the side/high/low torso-only layers, and their generated candidate paths. It never changes runtime action routing, collision, or mining contact timing.
- `playerCollision.js` owns body skin, ground probe, swept-step size, velocity cap, frame-delta cap, and overlap-recovery policy for the custom tile solver.
- `playerMotionPolish.js` owns deterministic UAL idle-fidget timing, calm 18 fps fidget cadence, the seven-second first-fidget delay, restrained breathing cadence, wall-push delay, falling threshold, and impact-reaction cooldowns.
- `playerFlightFootFx.js` owns the approved Survivor Superman-flight foot offsets, cadence, color, travel, lifetime, and visual-skin gate used identically in the main world and compact caves.
- `playerTileContact.js` owns body-edge targeting tolerance, target-direction variant/aim labels, and the UAL solid-tile visual-occlusion scan/mask values.
- `playerRigContact.js` owns the Game Rig v2 marker schema, hand/foot contact groups, attack hitbox proportions, tile-face bands, and capped visual-only alignment response. Marker validation is diagnostic only: it never vetoes mining or changes the 31x75 movement collider.
# World background master test

`worldBackgroundMasterTest.js` controls the reversible, camera-streamed v11 Level 1 + Level 2 background master. Its authored upper-world boundary remains the `x40..319 / y40..2039` source crop (`280x2000` tiles), while the gameplay model now continues to row 5064 for Level 2. With the master enabled, legacy v7 authored objects and their preload are skipped; start with `?worldMaster=0` to restore that rollback path.

`v11PolishedSurfaceRuntimeManifest.js` and `v11DepthBackgroundRuntimeManifest.js` provide the approved high-resolution surface and underground art for that crop. `tiledWorldOverrideData.js` supplies the matching upper-world tile authority from `dig-game-world-edit-v-11-08-07-2026-;1-img-test-saved-before-runtime-wire.tmx`; procedural Level 2 terrain/resources extend below that authored crop.

`worldBackgroundAmbientMotion.js` defines the deterministic, camera-culled v11 town/L1/L2 ambient anchors and all rendering/performance values. It is limited to runtime rows `54..74.41176470588235` and can be rolled back with `?worldMotion=0`.

`levelOneGroundFacade.js` owns the exact `x0..279 / ty65..74` benchmark facade, native 94px nine-piece v2 chunk manifest, current-plus-neighbor streaming margins, semantic stone/resource/special recognition mapping, always-opaque damage treatment, exact dug-cell boundaries, render depths, and independent `?level1Facade=0` rollback.

`levelOneLivingBackdrop.js` owns the complete active authored backdrop field through `ty65..2064`. Its cool field reaches `x0..131` and warm field begins at `x113`, deliberately overlapping through the authored visual transition while gameplay ownership still changes at `x132`. It uses four fixed atlas pools, depth-faded weather/day-night response, slow world-space motion, and `?worldLiving=0` rollback. `?level1Living=0` remains a compatibility alias, while shared `?worldMotion=0` overrides either enable flag.

`worldScenicFacade.js` owns the static streamed solid-material contract from `x0..279 / y75..5064`: nine native-density depth bands, dynamic material paths, camera/FPS limits, master requirements, render depths, surface weather tint, and `?worldFacade=0` rollback. The facade never owns tile state; it only masks world-space material through non-air `WorldModel` cells.

`worldBackgroundMasterTest.js` also owns the deep continuation contract: approved Level Two plates are camera-streamed across `x132..279 / y2065..5064`, cropped at gameplay boundaries, and graded by the existing facade-band ids. `?worldDepthMaster=0` remains the single rollback for authored and continued depth backgrounds.

`deepWorldLivingBackdrop.js` owns the separated Level Two living pass at `x132..279 / y2065..5064`. Its pure config maps ember, steam, ash, and magma-aura atlas treatments onto `WORLD_SCENIC_FACADE` band ids, fixes pool/FPS limits, attenuates surface weather underground, and provides `?deepWorldLiving=0` plus shared `?worldMotion=0` rollback.

`celestialEngines.js` is the sole balance and presentation contract for Star Hearts and the three Celestial Engines. It owns the all-ten-constellation unlock, permanent one-of-three attunement, sky-star-only recharge, charge capacity, per-activation lifetime/impact/bounce/redirect/tile caps, modal/HUD and God Mode switch copy, sanitization, and the explicit `?starHearts=0` rollback.

`thunderStrikeChain.js` owns the three-slam Thunderstrike contract: one 3x
upfront GP payment, free earned follow-ups, 1x/3x/10x base stage damage, a
cumulative +20% combo-local damage buff for every successful timing hit
(effective 1x/3.6x/14x), practical 220 ms / 140 ms continuation windows,
left-to-right challenge restarts, timing against the last needle position
actually presented on-screen, responsive approved-art HUD presentation, and
escalating impact/shake signatures.

`caveGameplay.js` owns deterministic cave-wall resource seams, challenge-room
density, safe checkpoints, all-GP failure consequences, hazard timing, and
hazard rendering values. `caveArchetypes.js` owns cave identity art and seam
glints; `lightConfig.js` owns each identity's darkness rhythm and synchronized
hazard-light phases.

## Modular surface props

`worldVisualSurfacePropAssets.js` owns the physical height, exact source
dimensions, walk-through clearance, and visual-influence radius for the nine
Level 1 and nine Level 2 prop assets. `worldVisualSurfacePropLayout.js` owns the
68 deterministic placements, protected interaction zones, existing authored
coverage bands, and complete Level 1/Level 2 surface ranges.

`worldVisualSurfaceProps.js` owns streaming margins, three-point ground
validation, render lanes, source-density floor, maximum visual gap, and the
presentation-only `?surfaceProps=0`, `?surfacePropsL1=0`, and
`?surfacePropsL2=0` rollback controls. Placements never carry a free scale
multiplier; the shared 1.75 m UAL player profile is authoritative.
