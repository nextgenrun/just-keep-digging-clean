# Values

Single Source of Truth — ALL numeric/string/config values.

- `firstFiveMinutes.js` owns the default-on opening profile: the in-camera
  practice and payoff Dirt sites, surface-safety feedback timing, persistent
  stage/Flight/payoff copy, the expected 3-hit to 2-hit result, and the single
  `?firstFive=0` rollback. Disabling the profile restores the former transient
  tutorial, x24 one-HP practice tile, unrestricted tutorial descent, legacy
  shop selection, and legacy pickaxe damage behavior.


- systemIntroduction.js owns the production staged-disclosure profile:
  persistent progression signals, depth thresholds, merchant/upgrade gates,
  one-next-system promises, and the ?systemPacing=0 rollback. It changes
  visibility and availability without creating a separate game fork.
- `loadingScreenPresentation.js` owns the dedicated ImageGen foundation,
  amber overall meter, cyan current-phase meter, authored retry plate, measured
  logo/meter/minigame/tool-rail slots, four contiguous load phases, copy,
  typography, a 0.9 MB source budget, and responsive 1280 by 720 reference
  geometry. It contains no runtime state or loading logic.

- `loadingMiningMinigame.js` owns the optional 8 by 4 loader-board inventory,
  13 square soil/resource materials, material HP/weights, seven simultaneously
  visible pickaxe tiers, transient strike/contact/drop timing, production
  earthquake fracture/debris/collapse FX, layout inside the dedicated mining
  chamber and tool rail, diagnostics, source budget, and `?loadingMine=0`
  rollback. The state and view do not own save rewards or loader progress.

- `runtimeAssetLoading.js` owns PlayScene's shared runtime queue, three bounded
  full-resolution decodes, scenery-first priorities, atomic feature demand,
  704/640 MiB decoded-texture watermarks, release delay, telemetry, and
  `?runtimeFeatureAssets=0`, `?runtimeAssetBitmap=0`, and
  `?runtimeAssetQueue=0` rollback selectors. The queue rollback changes loading
  only; it never enables Tiled or the legacy world renderer.

- `worldVisualAreaComposition.js` groups the modern backdrop and terrain cards
  into deterministic 6x5-card areas and ground structures into 8x6-card areas.
  Each area uses a small authored motif while successive depth areas advance
  through the complete approved library. `?naturalDepthAreas=0` restores the
  exact former one-step-per-card sequence without loading Tiled.

- `saveScheduling.js` owns routine-save debounce, maximum delay, idle timeout,
  lifecycle event names, telemetry sample bound, and autosave interval.

- `depthGateConfig.js` owns the three blocking depth thresholds, warning copy,
  typed-modal phrases (`100M`, `300M`, and `RISK`), legacy 999m migration, and
  safe-return feedback. The progression system owns decisions and saves; the
  injected Phaser modal owns visible presentation.

- `uiNotificationCarousel.js` owns the single-card queue timing, fixed
  navigation inputs, transition values, and mouse/touch drag safety lane,
  including viewport insets and grab cursors. Player-selected position data is
  normalized separately by `UserSettings`.

- `worldVisualSkyCohesion.js` owns the twenty additive sky assets, five semantic
  world chapters, four altitude-locked air bands, native source crops,
  per-source atmospheric grades, normalized overlap weights, render order, and
  `?skyCohesion=0` rollback. Each 1672x941 source contributes its clean
  1254x705 inner frame at 1:1 density. The resulting 28x12 field assigns each
  column to its nearest authored west-to-east world chapter and each row to its
  nearest altitude family, preventing unrelated mountain horizons from
  appearing beside or above one another. Quarter-frame overlaps fade every
  real neighbor on both sides of a join; complementary ADD weights sum to one
  over an opaque world-space matte, including at four-card corners.
- `worldVisualTerrainVariation.js -> cohesion` registers one approved alpha
  foreground painting per biome as a 0.88 source-density, world-anchored,
  terrain-mask-bound image while retaining the original five material plates
  unchanged. Ten distinct horizontal anchors keep every Level 1 and Level 2
  painting inside its playable corridor without repetition.
  `?undergroundForegroundCohesion=0` removes only those ten paintings.
- `worldVisualDepthBackdrops.js -> wholeWorldExpansion` adds fifty V5 scenic
  cards beside the retained 120-card V2/V3/motion pool and keeps the V5
  irregular edge-mask atlas available. Production excludes only each source's
  baked vignette, then combines all neighboring cards with generated
  complementary ADD masks over an opaque world-space matte. The 1152x768
  native safe frame uses 144x140 overlaps and a 1008x628 stride; authored
  `handoff` plates are reserved for the final row of their biome. Body cards
  now form broad deterministic areas with bounded neighboring motifs, while
  successive depth areas traverse the complete canyon-to-sanctum library.
  `?biomeBackdropExpansionV5=0` restores the exact prior pool and V4 mask.
- `worldVisualTerrainVariation.js -> expansionV5` allocates forty additional
  material plates plus ten second-generation cap atlases without changing the
  stored V4 inventory API. `?undergroundTerrainExpansionV5=0` removes only
  those additions.
- `worldVisualTerrainVariation.js -> seamBlendV6` selects complementary
  incoming-edge derivatives for all ninety retained V4/V5 terrain plates,
  their full-alpha `1152x768` overlap geometry, and deterministic natural-area
  sequencing with stable region/row/column draw order.
  `?undergroundSeamBlend=0` restores the untouched V4/V5 assets and
  `1344x896` geometry.
- `worldVisualGroundStructures.js -> seamBlendV6` applies the same additive
  full-alpha policy to all fifty approved structure compositions while
  preserving both the V4 and V3 selectors. Each broad area uses a restrained
  buttress-to-ceiling or arch-to-strata motif; successive depth areas advance
  naturally until every retained structure has participated.
- `worldVisualUndergroundDetails.js` owns the ten-biome, twenty-atlas,
  400-frame foreground texture/overlay library, deterministic placement,
  depths, and rollback queries. Its 320x256 frames use uniform source scales:
  textures `0.82-1.0`, localized props `0.50-0.82`, and the fifty guaranteed
  multi-tile prop identities `0.86-1.0`. No frame can exceed native density.
- `worldVisualRuntime.js -> surface` owns the native-scale ceilings for the
  1672x941 far/rollback-town plates, 1672x48 surface edge, and ten 1536x160
  additive ground paintings. Ground cards overlap by 192 px on a 1344 px
  stride; far cards retain their 576 px crossfade. No source is enlarged,
  assets remain non-mirrored where authored, and `?surfaceGroundVariation=0`
  retains its narrow rollback without replacing Town Square or mountain art.

- `starlightTalentTree.js` owns the shared 1116x467 authored composition,
  measured navigation/card centers, readable text floors, center-versus-flank
  hierarchy, and bounded motion. `starlightTalentSignArt.js` pins the visible
  alpha bounds of every approved constellation sign so runtime placement centers
  the painted symbol instead of its uneven transparent canvas. `uiLayout.js`
  gives the ESC talent page the same 1160px shell width as the Star Pillar.

- `uiIcons.js -> UI_RESOURCE_PRESENTATION`, `UI_INVENTORY_COPY`, and
  `UI_INVENTORY_LAYOUT` own the permanent `I`-menu resource identity key:
  explicit icon/name/color pairings remain visible before discovery, only
  quantities lock, and the full catalog fits the desktop three-column modal.
- `inventoryResourceGuide.js` owns the second `I`-menu tab's complete
  fourteen-material order, visual descriptions, six real-world comparison
  grounds, soil-type mappings, Lava Dirt dig stages, copy, and responsive
  layout. The guide renderer uses these values with the production semantic
  atlas plus the always-preloaded ground, hardness, and intact-crack textures;
  it does not manufacture replacement art.

- `weatherConfig.js` owns clear/drizzle/rain/storm/snow timing, winter and
  temperature eligibility, exact center/edge swept-collision dimensions,
  world-solid impact sampling, rain/snow pool budgets, secondary impact
  presentation, wind, wetness, audio, lighting, and sunlight response.
  `skylineWeatherVfx.js` owns the three atmospheric atlas sheets plus the
  compact 32-frame ImageGen particle sheet, its 256 px frames and 224 px safe
  content area, frame groups, and ambient ground-particle presentation.
  `?skylineVfx=0` is the explicit procedural rollback.

- `fireLightConfig.js` owns the carried-fire assets, socket, compact flame,
  default-hidden diagnostic rays, eye-adaptation rates, render depths, motion,
  and complete `?fireLight=legacy` rollback. `fireLightPresentation.js` owns the
  default `natural-fire-v1` composition: one authored flame, no visible volume,
  atmosphere, or expanded light textures, 0.98 legacy-style procedural world
  glow, 0.96 procedural shader energy, and a restrained 0.24 adaptation overlay.
  `?fireLightStyle=layered` restores the previous complete layered Fire V3.
  `fireIlluminationConfig.js` retains its five expanded 4x4 light-only atlases,
  four phased steady layers, environment rows, 96-frame total, and
  `?fireLightTextures=0` sub-rollback for that layered profile. These values do
  not own gameplay reveal radius or Star/surface light.
- `fireLightPiskelPolish.json` owns the ten-atlas Piskel package paths, fixed
  source-root/luminous-core/state-row grouping, three-pixel black border,
  integer shift ceiling, energy-retention limit, and accepted anchor-error
  thresholds used by the builder and contract. It is tooling SSOT and is not
  loaded by Phaser.

- `oldSchoolLampLightConfig.js` owns the review query, seven conditional preload
  descriptors, hanging fixture socket, glass-chamber offsets, independently
  phased authored layers, three default-hidden solid-clamped reflector rays,
  exposure mix, rain/low-GP response, and renderer depths. It composes the
  shared Fire Light socket/eye-adaptation contract at the system boundary and
  does not alter gameplay visibility.
- `carriedLightLiveComparison.js` is the shared values-only authority for the
  lamp review and natural-fire-versus-legacy live labs: separate save slots, one
  world identity, synchronized GP/weather/day/torch state, input forwarding,
  bounded sequential cold boot, and 140/700/1000/1800 m standing-tile profiles.
  Natural-versus-legacy starts at 1000 m; the retained lamp review stays at
  140 m unless its API explicitly selects another profile.
- `oldSchoolLampLightReview.json` is the tooling SSOT for the seven ImageGen
  masters, 4x4 slicing, fixed-anchor Piskel groups, black borders, shift and
  energy limits, source/output paths, hashes, and review-board paths.

- `arcCoreVisualConfig.js` owns Small/Omega action duration, real break progress,
  review-stage target textures, controls, and deterministic capture parameters.
  `arcCoreVisuals.sprite.json` owns the centered V4 Piskel roles, body-motion
  envelopes, beam reach, impact scale, layer depths, hashes, and round hulls.

- `titanDiscoveryExperience.js` owns the production creature-footprint encounter
  mode, 72-metre resonance range/cadence, the 50% covering threshold,
  reward-free automatic removal of the remaining footprint, the subtle
  art-backed location pointer and HUD-safe edge bounds,
  `?titanGuidance=0`, and the stricter rectangular-clear
  `?titanEncounter=legacy` rollback. It configures the transition but does not
  mutate terrain or award rewards itself.
- `titanCreatureFootprints.js` owns the versioned 25-row-mask inventory derived
  from each approved 768x768 stance PNG alpha. Every set bit identifies an
  authoritative covering cell that can glow, counts toward the 50% threshold,
  and is removed by `WorldModel` when the threshold is reached.
- `titanLore.js` is the single text authority for all 25 discovered identities:
  one unique epithet, surface-plinth inscription, and expanded ESC archive
  account per Titan. Locked UI never resolves these entries.
- `titanClueCatalog.js` owns the ESC `TITANS` locator-clue price curve, catalog
  copy/layout, index-only journal keys, result ids, and reversible
  `?titanClues=0` switch. Prices increase with Titan depth and the number of
  clues already bought.

- `lightConfig.js -> playerLightV2` owns the visible-player center anchor,
  positional-flutter lock, surface/day, night, rain, storm, deep-cave
  response, world-glow shaping, and
  `?playerLight=legacy` rollback. `shaderConfig.js -> darknessLight` owns the
  v2 penumbra, falloff, core, warmth, and alpha ceiling.

- `hardcoreMode.js` owns the versioned Casual/Hardcore save discriminator,
  post-Flight armed state, typed confirmation copy, stress sources and GP
  drain, the armed-Hardcore Flight/Torch one-GP upkeep floor, one-second live
  position/GP/stress checkpoint cadence, paid-teleport curve, run counters,
  50% unstuck penalty/cooldown, death-source labels, and approved ImageGen UI
  paths. `hardcoreMemorials.js` owns the independently persisted grave limits,
  near-death ground-search offsets, measured visible-base anchor,
  player-matched 0.8-tile height, paginated death/inspection recap layout, stat
  labels, action copy, and approved grave/button paths.
  `graveborerWurm.js` owns the versioned multi-pass Wurm
  profile: development-only flags and summon-control copy, post-Flight/depth
  gate, explicit production/development activity ratio, mining-noise weights,
  lethal depth/pass damage tiers, short committed-line telegraphs, breach speed,
  hit limits, critical/fatal feedback, ImageGen asset paths, HUD motion, labels,
  persistence limits, and diagnostics.
  key.

- `npcActivityConfig.js` owns the approved v13 calm baseline and
  Piskel-polished activity packs: seven planted activities per merchant,
  1.4/1.65-second cross-fades, long rests, and one-at-a-time town scheduling.
  Each merchant records its measured baseline foot-bottom row so runtime
  grounding scales with the actual display size and settles 1.5 px into the
  platform lip. It also owns preload paths, `?npcActivities=0`, exact-anchor
  health, and foot-contact health. It contains no walking, roaming, whole-body
  translation, rotation, or runtime scale animation values.

- `runtimeCanaryConfig.js` owns runtime health globals, admin query/hotkey,
  timing thresholds, required scene collaborators, event copy, severity/status
  names, reporting endpoint hook, and panel presentation values.

- `earthquakeFeedback.js` owns the generated seismic frame/medallion, tile
  fracture/collapse/rubble-return sprites, landing footprint, ceiling fracture,
  falling boulder, impact debris, 320x60 status signal, exact
  ground/player/falling/settling/debris depths, authored ground-contact squash,
  pooled motion, and active-event seismic copy. Completion has no recap copy.
  `earthquakes.js` owns the 1.8-second local warning,
  independently validated collapse widths, rock physics/hitbox/knockback,
  occupied-rubble retry, and the Level 99 + accepted-1000 m, 75,000 M permanent
  Seismic Suppression upgrade. Earthquake state and mutations remain owned by
  `EarthquakeSystem`.

- `gameConfig.js -> rendererQuality` owns the painterly WebGL sampling contract: antialiasing stays enabled, pixel rounding stays disabled, High 1.5x is the default backing density, Ultra is 2x, and all rollback query names/presets are centralized there. Logical gameplay coordinates remain 1280x720.

- `worldVisualDepthBackdrops.js` owns 120 streamed background-only plates across the ten row 65..5064 material bands: fifty previously approved 1536x1024 WebPs, fifty additive V3 static compositions, ten static WebP derivatives of the named motion-concept paintings, and ten approved 1536x1024, eight-second, 60 fps H.264 V3 loops. Every biome therefore has ten static compositions, one concept-static card, and one moving card. It also owns the negative render depth that keeps all scenic architecture behind `terrainDepth: 0.1`, the native 1152x768 safe crop inside every 1536x1024 source, 144x140 overlap, 1008x628 stride, normalized generated masks, `?biomeBackdropVariants=0` legacy-pool rollback, and `?biomeBackdropMotion=0` whole-card motion rollback. Complementary smoothstep weights sum to one over a black world-space matte, while partial tail cards crop instead of stretching and named handoff cards appear only at their biome boundary. Mirroring remains disabled. The rejected Graphics, duplicate-emissive, drifting-mist, and choppy optical-flow V2 paths remain absent from production selection. V3 moves only the complete finished media card and automatically pauses video below its configured FPS floor. `?levelOneBackdrops=0` and `?shallowCavern=0` still disable the complete presentation without touching simulation state.

- `worldVisualTerrainVariation.js` owns five additive 1536x1024 terrain plates and twenty painted exposed-top cuts per biome: 50 complete plates plus 200 cap frames. Plates overlap at the same 1344x896 stride with authored alpha, while caps are restricted to generic solid terrain with air above. `?undergroundTerrainVariation=0` disables both image layers without changing terrain, collision, HP, drops, or saves.

- `worldVisualGroundStructures.js` owns the fifty approved roots, ribs, arches, seams, and corners. Default assets are separate V4 alpha-feathered derivatives with no mirrored joins; every V3 file remains available through `?groundStructureBlend=0`. `?undergroundGroundStructures=0` disables the complete terrain-masked structure layer.

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

- `titanDiscoveries.js` owns the 25 visual-only Titan identities, canonical save order, regions, archived compact creature paths, opaque v2 rollback and organic-feather v3 routes for all 25 individually authored 1536x848 chamber cards, 25 independent 768x768 stance paths shared by the sharp underground reveal and surface gallery, the compact ImageGen basalt dais and per-Titan cover-resonance presentation, colossal 15-22 by 8-13 tile search windows, bounded two-card world streaming, archive pinning values, reveal/glow timing, 5x5 archive geometry, surface-inspection presentation values, and production-health labels. Underground Titans stand almost opaque on a 4.6 by 0.88 tile dais while the chamber card remains low-alpha context. The surface reuses that newer basalt footing at only 2.1 by 0.36 tiles and gives every identity a bounded 0.92-1.18 size profile over a larger 3.2-tile base envelope; all statues are larger than the former uniform 3x treatment while the 4.25-tile camera-safe height cap keeps them mostly in view. Surface stances retain normal blend, a 98.5% base alpha with only a 1.5% pulse, 3.4-tile spacing, and a start five tiles beyond the town benchmark. Only unlocked plinths expose the remapped interact prompt and shared inscription. `?titanStatueLore=0` removes that prompt/inspection without changing trophies; `?titanChamberBlend=0` restores opaque v2 cards; `?titanChambers=0` disables streamed chamber cards while retaining the sharp stance, compact dais, and tile resonance; `?titans=0` disables and de-queues the complete presentation. The 50% transition routes remaining covering cells through `WorldModel`; reward, collision, and save authority are not moved into presentation code.
  `density.maxSourceScale: 1` is shared by the chamber stream, underground
  stance, and surface gallery, so large search windows never enlarge 1536x848
  cards or 768x768 stances.
- `ancientRelics.js` remains the authority for cache placement, count limits, and progression gates. `relicDiscoveryFxConfig.js` owns only the bounded visible-world pedestal wake, short residual floor mark, world-space player-collection orbit, reduced-motion modes, presentation depths, and warning-only health code; it never awards or persists a relic.

- `worldVisualSurfacePacks.js` owns the reversible scenic-surface composition.
  `town-benchmark-v1` keeps the approved 1801x941 beauty and 1801x48 floor at
  exact 1:1 density. The 1.75 m player reference still records the requested
  2.10 m door target, but `maxWorldPixelsPerSourcePixel: 1` leaves the measured
  75 px door at 75 world pixels and the beauty at about 19.16 tiles. The 1672 px
  floor core plus 129 px handoff, terrain mask, feedback depth, wet/lightning
  response, and `?surfacePack=current-v2` rollback remain unchanged.

- `worldVisualRuntime.js`, `worldVisualMaterials.js`, `worldVisualRegions.js`, `worldVisualFeedback.js`, `worldVisualSemanticAssets.js`, and `worldVisualLandmarks.js` are the scenic-v2 visual SSOT. The surface-stage contract caps each far-background card at native source density, preserves aspect ratio, feathers repeated landscape cards through registered raster-mask frames, and repeats the approved 48 px slate cap across every one of the 280 surface columns with overlapping joins; `?surfaceEdge=0` is the tile-only rollback. The cap is presentation-only and never owns collision or tile state. The landmark contract owns decorative world anchors, crop/baseline alignment, additive response, and the independent `?mineEntrancePilot=0` rollback. `worldVisualSemanticAssets.js` makes the generated raster presentation the production default (`terrainSemantics=1`): a 188 px RGBA resource atlas with six deterministic, transparent, strict-orthographic, ground-embedded ImageGen variants per material, rarity-mapped sky-star beauty/emissive atlases, the approved 12-frame GP-tier special-block atlas, and an additive bedrock pair that keeps the seamless shale base plus a low-alpha megalith accent with an explicit visibility lift and cool tint. These images are read-only views of the authoritative resource, reward, `SKY_TILE`, `BEDROCK`, `CAVE_WALL`, `FLOOR_TOWN_1`, and `FLOOR_TOWN_2` cells, so digging, HP, collision, rewards, recognition, and saves remain in `WorldModel`. Non-stone ores are prioritized over sparse stone detail so common geology cannot exhaust the render pool. `?terrainSemantics=0` is the explicit scenic rollback; the rejected Phaser resource-vein comparison stays off unless `?resourceVeins=1` is requested explicitly. `worldVisualFeedback.js` still owns damage cracks and non-reward special markers, while `worldGameplayLayout.js` labels the hidden compatibility layout so saves cannot cross a future blueprint revision.
- `worldVisualDamage.js` owns the material-neutral twelve-state damage ladder and the production damage-atlas selector. The polished Piskel V2 atlas is the default; `?groundDamageAtlas=legacy` restores the byte-intact ImageGen V1 atlas through the same image painter, while `?groundDamage=legacy` switches to the older radial renderer as the full code-path rollback. Both atlases share the same 10-column, 188 px, 120-frame registration, so frame selection remains `state * 10 + variant` and each frame stays centered at the 94 px tile pivot. The presentation deliberately contains no material or tile-type map, so every current and future solid visual inherits the same proportional pre-break feedback, including very high-HP blocks.

- `miningConfig.js` owns mining cadence and base damage. `DigSystem` identifies
  authoritative bedrock, cave-wall, and town-floor failures; active-world
  presentation keeps those routine blocked contacts silent.
- `caveArchetypes.js` owns the six cave identities, four width forms, palettes, motifs, discovery copy, feature chances, depth gates, and streaming values. `worldGen.js -> caves.authoredGapSupplement` owns the five-band Level One refill targets and spacing; the generator may carve only non-authored resources or reuse authored AIR.
- `caveLevelConfig.js` owns the default 60x20 entered-cave level, safe floor,
  camera follow, reward coordinates, and six-to-three visual-family routing.
  `presentation.background` fixes the expected 2172x724 source, maximum scale
  `1`, 438 px horizontal card overlap, 384 px cavern-only canopy crop, 84 px
  vertical overlap, 128 px main handoff, and generated mask resolution. The
  compact `?caveLevel=legacy` rollback remains separate.
- `lightConfig.js -> caveLights` owns restrained local cave illumination that reveals identity art only while the player is at the cavern. `skyTileLights` separately owns …569 tokens truncated…otificationCarousel.js` separately owns the exact transient-card 15-visible-second selection timer, bounded queue, always-present arrow/`X` control art, interruptible transitions, disabled-control alpha, and legacy fallback metrics; `approvedHudSkin.js -> layout.notification` owns its approved-art geometry. `pickaxeHudThemes.js` owns the seven exact tier labels, accent colors, overlay/label geometry, purchase pulse, and `?pickaxeHud=0` rollback contract while `assetKeys.js -> ui.pickaxeHud` owns the generated overlay inventory. `gambleTileConfig.js`, `teleportPortalConfig.js`, `specialBlocks.js`, and `miningConfig.js` own their producer copy and stable dedupe keys without owning another renderer.
- `pillarVisuals.js` owns both approved five-stage production asset lists, player-readable world scale, transition/glow timing, Milestone depth thresholds, Star Pillar constellation thresholds, and normalized socket centers. `milestonePillarUi.js` owns the responsive modal geometry, pagination density, and readable type floor; `milestonePillarReview.js` remains the isolated five-option review-lab contract.
- `townSquareConfig.js` owns the approved Option A square layout id, surface-row offset, and five absolute door-aligned merchant slots. The Level 2 Arc Core merchant remains owned by `arcCoreConfig.js`.
- `branding.js` owns the approved UNDERSTAR product name and Rift Monolith
  runtime-logo path shared by the boot and menu scenes.
- `worldDepthConfig.js` owns the 2,000-row Level 1 boundary and 5,000-meter Level 2 runtime depth; `arcCoreConfig.js` owns both Arc Core material costs, the 2x2 base footprint, the final 8x8 Omega footprint, and vehicle presentation copy/style. `craftingRecipes.js` owns their permanent relic, Heavenblock, part, and Zenith requirements plus Forge presentation copy. `arcCoreVisualConfig.js` owns the approved Small/Omega motion language, cloud transition timing, `B`/`F` sandbox controls, health expectations, and `?arcCoreVisualsV3=0` rollback. `arcCoreVisuals.sprite.json` is the centralized Piskel-round-tripped Phaser pack for ten fixed-center production body/VFX roles plus one sandbox background; it owns paths, hashes, shared center, display sizes, depths, and layered-motion values.
- `ualNativePlayerAssetProfile.js` owns the production player's UAL sheets and the review manifest, plus the shared 1.75 m midpoint physical-height reference, 0.8-tile visible-height target, measured 31x75 collider, no-weapon policy, and direction-specific mappings. Idle and authored actions use the 109px base display size; grounded movement uses the 123px run-slot Jog with footfalls on its measured plant frames. Side digging keeps Jab/Cross/Jab/Cross; DOWN uses `OverhandThrow`; UP and UP-SIDE use a `Melee_Hook` strike followed by a sampled neutral recovery. Landing keeps the complete source sheet for loading but plays a short impact-readable sample.
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
- `retentionConfig.js` owns the production Town Square tutorial choices,
  movement/dig/sell/upgrade stages, guaranteed starter cargo, Flight reward,
  30-second flying-only bank, copy, markers, and modal/HUD layout.
- `playerPersistence.js` validates the exact pixel body coordinates, facing, and
  GP snapshot stored in save schema v13.
- `openingFlightArtifact.js` retains the rejected legacy and Golden Five
  configuration only as rollback/reference data. Its production facade is
  disabled and cannot alter spawn routing.
- `directionalSidePunchReview.json` owns the review-only Blender Punch Cross source, the side/high/low torso-only layers, and their generated candidate paths. It never changes runtime action routing, collision, or mining contact timing.
- `playerCollision.js` owns body skin, ground probe, swept-step size, velocity cap, frame-delta cap, and overlap-recovery policy for the custom tile solver.
- `playerMotionPolish.js` owns deterministic UAL idle-fidget timing, calm 18 fps fidget cadence, the seven-second first-fidget delay, restrained breathing cadence, wall-push delay, falling threshold, and impact-reaction cooldowns.
- `playerFlightFootFx.js` owns the approved Survivor Superman-flight foot offsets, cadence, color, travel, lifetime, and visual-skin gate used identically in the main world and compact caves.
- `playerTileContact.js` owns body-edge targeting tolerance, target-direction variant/aim labels, and the UAL solid-tile visual-occlusion scan/mask values.
- `miningTargetFeedback.js` owns the generated target-overlay asset, hover/held
  frame-and-glow motion, mouse click buffer, primary-button policy, diagnostics
  key, and independent visual/input rollback queries.
- `playerRigContact.js` owns the Game Rig v2 marker schema, hand/foot contact groups, attack hitbox proportions, tile-face bands, and capped visual-only alignment response. Marker validation is diagnostic only: it never vetoes mining or changes the 31x75 movement collider.
# World background master test

`worldBackgroundMasterTest.js` controls the reversible, camera-streamed v11 Level 1 + Level 2 background master. Its authored upper-world boundary remains the `x40..319 / y40..2039` source crop (`280x2000` tiles), while the gameplay model now continues to row 5064 for Level 2. With the master enabled, legacy v7 authored objects and their preload are skipped; start with `?worldMaster=0` to restore that rollback path.

`v11PolishedSurfaceRuntimeManifest.js` and `v11DepthBackgroundRuntimeManifest.js` provide the approved high-resolution surface and underground art for that crop. `tiledWorldOverrideData.js` supplies the matching upper-world tile authority from `dig-game-world-edit-v-11-08-07-2026-;1-img-test-saved-before-runtime-wire.tmx`; procedural Level 2 terrain/resources extend below that authored crop.

`worldBackgroundAmbientMotion.js` defines the deterministic, camera-culled v11 town/L1/L2 ambient anchors and all rendering/performance values. It is limited to runtime rows `54..74.41176470588235` and can be rolled back with `?worldMotion=0`.

`levelOneGroundFacade.js` owns the exact `x0..279 / ty65..74` benchmark facade, native 94px nine-piece v2 chunk manifest, audited 78-frame v7 RGBA recognition atlas with six transparent ImageGen variants per resource, the latest approved Teleport Up, five distinct GP tiers, current-plus-neighbor streaming margins, semantic stone/resource/special recognition mapping, always-opaque damage treatment, exact dug-cell boundaries, render depths, and independent `?level1Facade=0` rollback.

`levelOneLivingBackdrop.js` owns the complete active authored backdrop field through `ty65..2064`. Its cool field reaches `x0..131` and warm field begins at `x113`, deliberately overlapping through the authored visual transition while gameplay ownership still changes at `x132`. It uses four fixed atlas pools, depth-faded weather/day-night response, slow world-space motion, and `?worldLiving=0` rollback. `?level1Living=0` remains a compatibility alias, while shared `?worldMotion=0` overrides either enable flag.

`worldScenicFacade.js` owns the static streamed solid-material contract from `x0..279 / y75..5064`: nine native-density depth bands, dynamic material paths, camera/FPS limits, master requirements, render depths, surface weather tint, and `?worldFacade=0` rollback. The facade never owns tile state; it only masks world-space material through non-air `WorldModel` cells.

`worldBackgroundMasterTest.js` also owns the deep continuation contract: approved Level Two plates are camera-streamed across `x132..279 / y2065..5064`, cropped at gameplay boundaries, and graded by the existing facade-band ids. `?worldDepthMaster=0` remains the single rollback for authored and continued depth backgrounds.

`deepWorldLivingBackdrop.js` owns the separated Level Two living pass at `x132..279 / y2065..5064`. Its pure config maps ember, steam, ash, and magma-aura atlas treatments onto `WORLD_SCENIC_FACADE` band ids, fixes pool/FPS limits, attenuates surface weather underground, and provides `?deepWorldLiving=0` plus shared `?worldMotion=0` rollback.

`celestialEngines.js` is the sole balance and presentation contract for Star Hearts and the three Celestial Engines. It owns the first Heart after all ten constellations, additional Hearts after 20 and 50 capped Engine activations, permanent ownership of up to all three Engines, one equipped Engine at a time, sky-star-only recharge, charge capacity, per-activation lifetime/impact/bounce/redirect/tile caps, modal/HUD and God Mode switch copy, save-v1 migration, sanitization, and the explicit `?starHearts=0` rollback.

`thunderStrikeChain.js` owns the ten-slam Thunderstrike contract: one 3x
upfront GP payment, nine free earned follow-ups, and the
1x/3x/10x/12x/15x/20x/28x/40x/60x/100x base damage curve. Every timing success
adds another +20% combo-local damage, reaching effective 27x at Slam V and
280x at Slam X. Slam II-V windows are 280/230/190/150 ms; the drastic post-V
ramp tightens Slam VI-X to 90/62/42/28/16 ms. A miss immediately ends the
chain; there are zero retries and no level setback. Citadel Storm now supplies
+10% Thunderstrike damage and cannot override that failure rule. The first
charge is a short 180 ms anticipation, while the approved three-socket HUD uses
authored v2 target/needle art, v3 milestone/glyph/copy-backplate art, and
viewport-aware scaling with no visible procedural indicator shapes. Input
evaluates the exact last-rendered needle position so a visually correct press
cannot drift into a later wall-clock miss.

`caveGameplay.js` owns deterministic cave-wall resource seams, challenge-room
density, safe checkpoints, all-GP failure consequences, hazard timing, and
hazard rendering values. `caveArchetypes.js` owns cave identity art and seam
glints; `lightConfig.js` owns each identity's darkness rhythm and synchronized
hazard-light phases.

## Modular surface props

`worldVisualSurfacePropAssets.js` owns the physical height, exact source
dimensions, walk-through clearance, and visual-influence radius for the nine
retained Level 1 props, nine retained Level 2 props, and seven additive
ImageGen Level 2 chapter anchors. `worldVisualSurfacePropLayout.js` keeps Level
1 modular placements empty so the enlarged 25-slot Titan Walk remains fully
unobstructed. Its 34 deterministic Level 2 placements reuse the original kit
around the seven new anchors, protect the portal/Titan/transition footprints,
enforce a low-profile Heavenblocks flight lane, and preserve irregular cluster
spacing plus complete Level 1/Level 2 visual coverage.

`worldVisualSurfaceProps.js` owns streaming margins, three-point ground
validation, three named natural-size variants, lane perspective, source-density
floor, maximum visual gap, and the
presentation-only `?surfaceProps=0`, `?surfacePropsL1=0`, and
`?surfacePropsL2=0` rollback controls. Placements never carry a free numeric
scale; the shared 1.75 m UAL player profile remains the baseline.

`worldVisualSurfaceAtmosphere.js` adds six restrained smoke, steam, and
ground-mist anchors to those Level 2 chapters using only the already approved
ImageGen atmosphere atlas. It does not add a sky, moon, landscape, terrain
texture, or gameplay state. `?surfaceAtmosphere=0` removes only these accents;
the parent `?surfaceProps=0` rollback removes them together with the props.

`playerCollision.js -> surfaceDropThrough` owns the continuous one-way surface
contact, open-row requirement, downward release speed, and `?surfaceDrop=0`
rollback. `worldVisualRuntime.js -> surfaceEdgeFeature` keeps the approved
full-width raster ground edge enabled across both surfaces; `?surfaceEdge=0`
restores the former tile-only presentation.

`earthquakeDodgeReview.js` owns only the test-only earthquake world-layer
mockup: viewport, live player geometry, proposed warning/fall/impact timing,
layer depths, compact copy, and authored review asset paths. It is not imported
by production earthquake systems.

`movingSideDigProduction.json` is the authored production SSOT for the approved
phase-locked Jog + Jab/Cross clips and phase handoff: sheet/animation identities,
22-frame upper-body sampling over a 14-frame Jog advance, stable 109/123 upper
normalization, body-locked moving contact, an original-timing 16-frame moving
Quickslash retime, an 18 px solid-face body gap, eight compact entry variants,
seven-frame enter/release envelopes, exact Jog resume, planted pivot, movement
eligibility, and the
`?movingSideDig=0` / `?phaseHandoff=0` rollbacks. The Piskel builder emits
`movingSideDigAnimation.generated.js`; `movingSideDigAnimation.js` is its stable
runtime import boundary. `movingSideDigReview.json` remains the shared visual
recipe used by the review sandbox and production builder.

`phaseHandoffReview.json` is strictly review-only. It owns the measured
moving-dig enter/release and instant-turn comparison scenarios, two-frame
upper-body blend and planted-pivot limits, live collider/tile scale, review
stage presentation, source paths, and generated output names. Production does
not import it; the approved values are copied into the authored production SSOT.

`heldDigNextFiveReview.json` is strictly review-only and now owns the V2
attack-size/anchor comparison. It records the measured 109 px current attack
size, 123 px proposed family size, 88.6% current moving-torso scale, 100%
proposed scale, current/proposed silhouette envelopes, fixed origin,
collider/tile/cadence values, contact indexes and generated outputs. Production
files do not import it. Its uniform 123px/100% proposal was rejected after live
testing because it increased apparent size drift and contact-driven skating;
production retains the review as evidence and restores the earlier normalized
silhouette.

`playerAnimationPolishProduction.json` is the production SSOT for planted
Jog/idle bridges, four-phase moving diagonal mining, stationary action settles,
authored landing thresholds/exits, and wall-brace enter/hold/release. The Piskel
builder emits `playerAnimationPolish.generated.js`;
`playerAnimationPolish.js` is the stable runtime boundary and
`survivalUalAnimationPolishProfile.js` maps the generated sheets into the
Survival profile. `?animationPolish=0` is the parent rollback; the narrower
switches are `?jogIdleHandoff=0`, `?movingDiagonalDig=0`, `?actionSettle=0`,
`?landingContinuity=0`, and `?wallBrace=0`.

`worldVisualRuntime.js -> streaming.demandAssetStreaming` owns visible-card
residency, its zero-neighbor demand margin, and the
`?scenicDemandStreaming=0` eager-residency rollback.
`performanceTelemetryConfig.js` owns the thirty-frame phase-sampling cadence,
stable metric names, admin ordering, and labels; runtime systems do not embed
their own timing thresholds or display copy.

`worldVisualSurfaceSkyPropsV3.js` owns the 200-asset palette's query switches,
physical size variants, far/middle/near perspective, atmospheric opacity,
source-density floor, streaming, and render depths. The exact ten-atlas
inventory and asset definitions are generated under
`generated/worldVisualPropLibraryV3/`; its candidate placements are provenance
only.

`worldVisualSurfacePropCompositionV3.js` selects 38 static Level 2 details as
two-to-three story clusters around the retained chapter anchors and records
deliberate open ranges. `worldVisualSkyPropCompositionV3.js` selects thirteen
static sky details: two outer bookends per portal island and one object per
safe Heavenblock interaction gap. No prop has runtime transform animation.

`worldVisualBackdropEnhancers.js` owns the 100 native-1536x1024 V7
underground enhancer assets, per-biome optional coverage, stable coordinate
hashes, motif compatibility rules, blend families, alpha bounds, render offset,
and the `?undergroundBackdropEnhancers=0` rollback. Runtime classes do not
embed these content or density values.

`starRarityProgression.js` owns the exact 80% Star Block spawn reduction, six
depth-gated weighted rarity tiers, their expanded color palettes, Sign XP,
material multipliers, Engine charge, five-level totals, popup layout, and
ImageGen asset paths. Its popup contract holds every reveal for exactly three
seconds, rate-limits routine repeats to one per 20 seconds, and preserves
first-rarity and Sign-level-up exceptions. `starRarityProgressionMath.js` owns
deterministic rarity selection, level curves, legacy count migration, and
config/timing health validation. `retentionConfig.js` owns the persistent
ESC Gameplay setting label, hint, and enabled-by-default migration.

`starIdentityLibrary.js` owns 250 named colour identities, distributed
60/50/50/40/30/20 across the six rarities. The original fifty indices remain
stable; `starIdentityExpansionV2.js` appends 200 colours, flavours, exact atlas
frames, source-page definitions, and bounded light characters. The six 256 px
atlases stay below a 64 MiB decoded package cap and fit the existing byte tile
storage. `starIdentityLibraryMath.js` owns deterministic within-rarity
selection, uniqueness checks, frame validation, and storage-capacity health.
Reward rarity is selected first; a second coordinate hash selects identity
without consuming the primary world RNG. `inventory` owns the authored Star
Atlas foundation, twelve-selector pages, authored arrow positions, copy, and
proportional layout.

`pauseFeatureLoading.js` is the SSOT for the compact ESC feature-loader
composition: approved decoration assets, Starlight/Titan copy, phase thresholds,
three-stage labels, responsive reference geometry, readable count/phase/percent
placement, motion timings, and the short 100% handoff beat. The moving authored
energy lane never owns status text, so the constellation leader cannot obscure
real download progress.

`resourceEconomy.js` is the SSOT for the reversible modern depth economy:
piecewise Level One/Two yield curves, deterministic rounding salt, the 7,500
final-tile cap, Milestone speed/crit caps, price precision, configuration
health, and `?depthEconomy=legacy`. `dynamicSoil.js` owns modern rarity
yield/HP separation plus exact legacy multipliers. `worldGen.js` and
`secondWorldConfig.js` own depth-biased composition only; runtime systems do
not embed economy tunables.

`starlightTalentTree.js` owns the V4 mockup-fidelity Starlight composition:
the `1.7768:1` authored foundation, full-shell inset, header/tab positions,
three large alcoves, selected/flank scale, lower dossier, readability floors,
and bounded motion. Asset paths point at
`sprites/UI/starlight-talent-tree-v4/`; talent rewards, Engine authority,
Bobo locks, and save state remain owned by their existing progression
definitions and systems.
