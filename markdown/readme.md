# Dig Game Dev Environment — README

Implemented follow-up: [2026-09-12 Runtime smoothing](2026-09-12-runtime-smoothing.md)
records video texture cleanup, CPU reductions, and before/after validation.

Full performance audit and reproduced video texture retention:
[2026-09-12 Full performance audit](2026-09-12-full-performance-audit.md).
Includes surface/deep rain timings, texture residency, travel/cooldown evidence,
Boot/package inventory, CPU hotspots, validation, and ordered optimization work.

`2026-09-07-character-grounding-polish.md` records the wired character crispness, ground contact, measured gait and validation evidence.

**Last updated:** 2026-07-30

Surface drop regression and verified cause:
[2026-09-06 Ledge assist interrupted moving surface drops](persistant-bugs/solved-at-root/2026-09-06-surface-drop-ledge-regrab.md).



Downward attack animation gap:
[2026-09-06 Downward mining pose hold](2026-09-06-downward-mining-pose-hold.md).
Keeps the ground strike and low downward punch, removes the rejected turning step,
and prevents crouch from interrupting the existing cooldown pose.

Living-tree composition and proof:
[2026-09-03 Taller, naturally coloured Root Sanctuary](2026-09-03-worldroot-tree-composition-v3.md).
Includes modular artwork/provenance, growth, fixed ground controls, restrained
Star light, surface-camera framing and real-input RoboPlay screenshots.

Campfire/Ember implementation and proof:
[2026-09-03 Campfire and Ember evolution](2026-09-03-campfire-ember-evolution.md).
Includes the ten-stage size ramp, live upgrade reveals, preserved charge rules,
the current shop-scaled price ladder, and active transparent Worldroot-v2 art.

Progression balance and migration contract:
[2026-09-03 Talent and shop progression rebalance](2026-09-03-talent-shop-progression-rebalance.md).
Defines Level-earned Talent Points, Star-funded node ranks, the 121-rank shop
tail, gradual depth and Relic unlocks, save migration, and current-game exclusions.

Celestial tree readability and power audit:
[2026-09-03 Celestial talent and skill audit](2026-09-03-celestial-talent-and-skill-audit.md).
Covers all 33 node ranks, clearer graph states, bounded ability envelopes, and
Hollow Sun's alternating pulse wave plus dig-directed drift.

Celestial tree readability and power audit:
[2026-09-03 Celestial talent and skill audit](2026-09-03-celestial-talent-and-skill-audit.md).
Covers all 33 node ranks, clearer graph states, bounded ability envelopes, and
Hollow Sun's alternating pulse wave plus dig-directed drift.

## Table of Contents
1. [Directory Structure Overview](#directory-structure-overview)
2. [Naming Policy](#naming-policy)
3. [Import Rules](#import-rules)
4. [Value System (Single Source of Truth)](#value-system)
5. [Scene Lifecycle](#scene-lifecycle)
6. [System Categories](#system-categories)
7. [Tools & Pipelines](#tools--pipelines)
8. [Archive Policy](#archive-policy)
9. [Related Documents](#related-documents)

---

## Directory Structure Overview

```
dig-game-dev-env/
├── index.php / index.html          ← Entry point (loads Phaser + js/main.js)
├── serve.py, package.json          ← Dev server & tooling
│
├── values/                         ← SINGLE SOURCE OF TRUTH for ALL config
│   ├── constants.js                ← Viewport, tile grid, physics, spawns
│   ├── player.js                   ← Player stats, abilities, characters
│   ├── ui.js                       ← HUD layout, UI colors, UI config
│   ├── tileTypes.js                ← TILE_TYPES enum (AIR=0…GLOW_CRYSTAL=30)
│   ├── upgrades.js                 ← Upgrade definitions, costs, formulas
│   ├── abilities.js                ← Ability configs (gem power, flight, etc.)
│   ├── resources.js                ← Resource prices, depth yield, spawn rates
│   ├── world.js                    ← World gen params, soil bands, tile health
│   ├── gamefeel.js                 ← Camera shake and screen flash
│   ├── lighting.js                 ← Light system config
│   ├── combo.js                    ← Combo system config
│   ├── assetKeys.js                ← ALL asset keys (single source for paths)
│   ├── audioConfig.js              ← Audio levels, categories
│   ├── miningConfig.js             ← Mining damage, cooldowns, pickaxes
│   ├── merchants/                  ← Merchant configs (bobo, gear, gem, etc.)
│   ├── timeConfig.js               ← Day/night cycle config
│   ├── weatherConfig.js            ← Weather system config
│   ├── shaderConfig.js             ← Shader uniforms/config
│   └── levelConfig.js              ← Leveling XP curves
│
├── world/                          ← World generation + model + rendering
│   ├── PlayScene.js                ← Primary game scene orchestrator
│   ├── model/
│   │   ├── TileGrid.js             ← Typed array tile storage (types + HP)
│   │   ├── WorldState.js           ← Runtime world state (overlays, etc.)
│   │   ├── Queries.js              ← Read-only tile queries (isSolid, isDiggable)
│   │   ├── WorldModel.js           ← Coordinates grid + state + queries
│   │   ├── SeededRandom.js         ← Deterministic PRNG
│   │   └── SaveManager.js          ← Save/load/backup/export system
│   ├── generation/
│   │   ├── WorldGenerator.js       ← Orchestrates generation pipeline
│   │   ├── CaveGenerator.js        ← Cave carving system
│   │   ├── GeodeGenerator.js       ← Geode pocket generation
│   │   ├── TerrainGenerator.js     ← Base terrain + depth bands
│   │   └── BiomeSystem.js          ← Biome distribution
│   ├── rendering/
│   │   ├── WorldRenderer.js        ← Phaser tilemap + tilesheet management
│   │   ├── TilesheetBuilder.js     ← Runtime canvas tilesheet composition
│   │   └── tileRenderMap.js        ← Tile type → render index mapping
│   └── playScene/                  ← PlayScene sub-modules
│       ├── PlayScene.js            ← Main scene class (in world/ root)
│       ├── PlaySceneSetup.js       ← create() logic
│       ├── PlaySceneUpdate.js      ← update() logic
│       ├── PlaySceneGameplay.js    ← Mining/dig gameplay methods
│       ├── PlaySceneUI.js          ← UI management methods
│       ├── BackgroundRenderer.js   ← Parallax background compositing
│       ├── GameInputHandler.js     ← Global game input handling
│       ├── PlayerInputHandler.js   ← Player-specific input handling
│       ├── NPCManager.js           ← NPC placement & interaction
│       └── OverlayManager.js       ← Shop/inventory/level-up overlays
│
├── player/                         ← Player logic ONLY
│   ├── PlayerController.js         ← Player state machine & coordination
│   ├── PhysicsBody.js              ← Custom physics (gravity, collision)
│   ├── PlayerInput.js              ← Input mapping & state
│   ├── PlayerMovement.js           ← Movement state machine
│   ├── PlayerState.js              ← Player state enum & transitions
│   ├── PlayerAbilities.js          ← Ability logic (gem dash, vision, flight)
│   └── ShadowMiner/
│       ├── ShadowMinerSystem.js    ← Shadow miner NPC behavior
│       └── ShadowMinerPhysicsBody.js ← Shadow miner physics
│
├── systems/                        ← Game systems (non-player, non-world)
│   ├── mining/
│   │   ├── DigSystem.js            ← Mining/digging coordination
│   │   ├── TileCollisionSystem.js  ← Tile-level collision detection
│   │   ├── SpecialTileSystem.js    ← Special block effects
│   │   └── SpecialBlockEffectsManager.js ← Visual FX for special blocks
│   ├── progression/
│   │   ├── PlayerLevelSystem.js    ← XP, levels, milestones
│   │   ├── UpgradeSystem.js        ← Purchaseable upgrades
│   │   └── DepthGateSystem.js      ← Depth-based unlock gates
│   ├── visual/
│   │   ├── HUDSystem.js            ← HP/GP bars, depth, interact prompts
│   │   ├── FloatingTextSystem.js   ← Floating damage/collect numbers
│   │   ├── EarthquakeFeedbackUI.js ← Seismic phase/intensity and escape HUD
│   │   ├── EarthquakeHazardOverlay.js ← Cave-in, rock-lane, and rubble telegraphs
│   │   ├── ScreenFlashSystem.js    ← Screen flash effects
│   │   ├── CameraShakeSystem.js    ← Camera shake on dig/hit
│   │   ├── PickaxeTrailSystem.js   ← Pickaxe swing trail particles
│   │   ├── StarPillarSystem.js     ← Depth milestone star pillars
│   │   └── MilestoneBoardSystem.js ← Milestone display board
│   ├── audio/
│   │   ├── SoundSystem.js          ← Sound playback & management
│   │   ├── SoundLibraryManager.js  ← SFX library loading
│   │   └── VoiceLineManager.js     ← NPC voice line scheduling
│   ├── environment/
│   │   ├── DayNightCycle.js        ← Day/night transitions
│   │   ├── WeatherSystem.js        ← Weather effects (rain, fog)
│   │   ├── AtmosphereSystem.js     ← Atmospheric effects (fog layers)
│   │   ├── EarthquakeSystem.js     ← World-space seismic events and cave-ins
│   │   ├── AboveGroundDecorationSystem.js ← Trees, grass, clouds
│   │   ├── CampfireSystem.js       ← Campfire visuals & mechanics
│   │   ├── SurfaceTunnelDoorSystem.js ← Town exit tunnel door
│   │   └── BiomeSystem.js          ← Biome state & transitions
│   ├── lighting/
│   │   ├── LightSystem.js          ← Runtime point light management
│   │   └── ShaderSystem.js         ← Pipeline shader management
│   ├── health/
│   │   ├── RuntimeCanarySystem.js  ← Runtime lifecycle/error/invariant monitor
│   │   ├── RuntimeCanaryReporter.js ← Local critical report + optional endpoint
│   │   └── runtimeCanaryChecks.js  ← Deterministic canvas/scene/loop checks
│   └── combo/
│       └── ComboSystem.js          ← Dig combo multiplier
│
├── ui/                             ← UI components & scenes
│   ├── admin/
│   │   └── AdminHealthPanel.js     ← Opt-in admin canary status panel
│   ├── scenes/                     ← Phaser scene classes
│   │   ├── BootScene.js            ← Asset preloading + splash
│   │   ├── MenuAudioScene.js       ← Audio manager scene (runs alongside menus)
│   │   ├── MainMenuScene.js        ← Title screen with PLAY/SETTINGS/CREDITS
│   │   ├── StartMenuScene.js       ← Save slot selection + character select
│   │   ├── WorldLoadScene.js       ← Loading screen → PlayScene transition
│   │   └── PlayScene.js            ← Re-export from world/PlayScene.js
│   ├── shared/
│   │   └── LoadingScreenView.js    ← Reusable loading screen component
│   ├── hud/
│   │   ├── HUDSystem.js            ← Re-export from systems/visual/HUDSystem.js
│   │   ├── XPProgressBar.js        ← XP bar component
│   │   ├── UIResourceBar.js        ← Resource inventory bar
│   │   ├── UIMuteToggle.js         ← Mute button
│   │   └── UIOverlay.css           ← UI styles
│   ├── overlays/
│   │   ├── ShopOverlay.js          ← NPC shop overlay
│   │   ├── UIInventoryPopup.js     ← Inventory popup
│   │   └── SettingsPanelContent.js ← Settings panel content
│   ├── PhaserUiKit.js              ← Button/UI component library
│   ├── GeneratedHudTextures.js     ← Runtime HUD texture generation
│   ├── NotificationCarouselState.js ← Bounded transient-message queue
│   ├── UINotificationCarouselPresenter.js ← Selection timing and fades
│   ├── UINotificationCarouselView.js ← Approved one-card renderer/controls
│   └── UINotificationSystem.js     ← Shared transient carousel API
│
├── animations/                     ← Animation creation & frame definitions
│   ├── PlayerAnims.js              ← Player animation setup
│   ├── NpcAnims.js                 ← NPC animation setup
│   └── RobotAnims.js               ← Robot character animation setup
│
├── audio/                          ← Audio files (managed by SoundSystem)
│   ├── sfx/                        ← Sound effects
│   ├── music/                      ← Background music
│   └── voice-lines/                ← NPC voice lines
│
├── shaders/                        ← GLSL shader code
│   ├── index.js                    ← Re-exports all shaders
│   ├── shaderUniforms.js           ← Common shader uniforms
│   ├── darknessLightShader.js      ← Darkness/light shader
│   ├── lightningFlashShader.js     ← Lightning flash shader
│   └── weatherAtmosphereShader.js  ← Weather atmosphere shader
│
├── sprites/                        ← Static image assets (.webp, .png)
│   ├── tiles/                      ← Tile sprites (dynamic-soil, hp-stages, overlays)
│   ├── player/                     ← Character spritesheets
│   ├── npcs/                       ← NPC spritesheets
│   ├── backgrounds/                ← World backgrounds, sky, underground
│   ├── ui/                         ← UI element textures
│   ├── fx/                         ← Particle and effect textures
│   ├── branding/                   ← Logo
│   └── constellations/             ← Star sign sprites
│
├── exports/                        ← Tiled workspace files + piskel exports
│   └── tiled/                      ← Tiled project files (.tmj, .tsj, .tsx)
│
├── pipelines/                      ← Asset pipeline scripts (from tools/ + utilities/)
│   ├── blender/                    ← Blender pipeline scripts
│   ├── piskel/                     ← Piskel pipeline scripts
│   └── audio/                      ← Audio conversion pipeline
│
├── tools/                          ← Development tools & utilities
│   ├── piskel-mcp/                 ← Piskel MCP server
│   ├── piskel-workspace/           ← Piskel workspace app
│   ├── ffmpeg/                     ← FFmpeg binary
│   ├── build scripts               ← Asset building scripts
│   ├── deploy scripts              ← Deployment scripts
│   └── test scripts                ← Testing utilities
│
├── testing/                        ← Test infrastructure
│   └── JkdE2EHarness.js            ← E2E test harness
│
├── debugging/                      ← Active debugging workspace
├── feedback/                       ← Player feedback & plans
├── markdown/                       ← Knowledge center (all .md files)
├── archive/                        ← Deprecated content, date-stamped
├── css/                            ← CSS styles (minimal)
│   └── style.css                   ← Game page styling
│
├── _ssh-git/                       ← SSH/git credentials (gitignored)
└── libs/
    └── phaser.js                   ← Phaser 3 framework
```

---

## Naming Policy

See [naming-policy.md](naming-policy.md) for full details.

**Quick reference:**
- Directories: `kebab-case` (e.g., `systems/mining/`)
- Classes/Constructors: `PascalCase` (e.g., `TileCollisionSystem`)
- Functions/variables: `camelCase` (e.g., `getRenderIndex()`)
- Constants/config: `UPPER_SNAKE_CASE` or `Object.freeze()` with PascalCase key
- Markdown files: `YYYY-MM-DD-topic.md`
- AI tools/scripts: date-stamped filename, placed in `/ai-tools/`

---

## Import Rules

```
values/  ←  systems/  ←  world/  ←  ui/scenes/
   ↑                       ↑
   └── NEVER import from    └── PlayScene orchestrates all
       systems or world
```

1. `/values/` imports NOTHING from the project — pure data
2. `/systems/` imports from `/values/` only
3. `/world/` imports from `/values/` and `/systems/`
4. `/ui/scenes/` imports from all layers
5. NO circular dependencies — if A needs B and B needs A, inject at setup time

---

## Value System

Every numeric or string game constant lives in `/values/`. This is the single source of truth.

**Never hardcode magic numbers anywhere else.** Examples of what belongs in values:
- Tile sizes, viewport dimensions
- Physics constants (gravity, max speed)
- Spawn rates, resource prices
- Upgrade costs and multipliers
- UI colors, layouts, fonts
- Player stats (walk speed, climb/fly speed)

---

## Scene Lifecycle

```
BootScene → MenuAudioScene (launched alongside menus)
  ↓
MainMenuScene → PLAY
  ↓
StartMenuScene → select save slot → SPACE
  ↓
WorldLoadScene → loading bar
  ↓
PlayScene (game runs here, MenuAudioScene stopped)
```

---

## Archive Policy

See `markdown/archive-policy.md` for full details.

**Quick rules:**
- Move unused tools/scripts to `/archive/` with date prefix
- Keep a manifest of archived items in `archive/INDEX.md`
- Archive if: no longer used, replaced by new version, experimental/failed
- Delete from archive if: older than 180 days AND no references exist
- Never delete active game code — only tools, scripts, experimental content

---

## Related Documents

| Document | Purpose |
|---|---|
| `.clinerules` | AI entry point & mandatory rules |
| `readme.md` (root) | Points to this file |
| `naming-policy.md` | Full naming convention reference |
| `values-system.md` | How to use the /values/ system |
| `archive-policy.md` | What to archive & when to delete |
| `design-documents/readme.md` | Canonical design authority and runtime-alignment register |
| `2026-09-04-downward-dig-animation-runtime.md` | Three-stage DOWN/DOWN-SIDE chain, promoted assets, authored contacts, deferred loading, live-game evidence, and rollback |
| `2026-09-03-contact-local-dig-impact-polish.md` | Current-sheet contact tips, local impact particles, timing corrections, save-disabled review and rollback |
| `2026-07-30-fire-light-v3-runtime.md` | Fire-specific carried torch with five 4x4 ImageGen atlases, hand socket, first-solid local rays, eye adaptation, shader integration, validation, and complete/narrow rollbacks |
| `2026-07-30-star-colour-identity-library.md` | Fifty authored Star colours, per-identity light/flavour, deterministic within-rarity selection, the I-key Star Atlas, health checks, and rollback |
| `2026-07-30-star-colour-identity-library-v2.md` | 250 authored Star lights, preserved V1 indices, 62.5 MiB capped atlases, twelve-card paging, authored controls, health checks, and rollback |
| `2026-07-30-star-identity-dedicated-light-library.md` | Separate 35.16 MiB ImageGen light-only package for all 250 Stars, core/light layering, transparent-edge QA, health checks, and rollback |
| `archive/2026-08-03-loading-mining-minigame/markdown/2026-07-31-loading-screen-imagegen-redesign.md` | Historical authored-loader design, retired when the regular pre-minigame screen was restored |
| `archive/2026-08-03-loading-mining-minigame/markdown/2026-07-30-loading-mining-minigame-runtime.md` | Historical session-only loading-board runtime, archived with its complete rollback package |
| `2026-07-29-runtime-asset-loading-optimization.md` | Full-quality prioritized runtime loading, off-main-thread image decode, frame-budgeted GPU activation, telemetry, contracts, and rollback |
| `2026-07-30-runtime-feature-residency-and-save-scheduling.md` | Measured 89-file Boot deferral, atomic full-quality feature residency, decoded-memory watermarks, selected Campfire loading, coalesced idle saves, lifecycle forcing, telemetry, rollback, and contracts |
| `2026-07-28-star-block-crystal-popout-v2.md` | Approved Choice 1 Star Block art, exact one-to-one tile pop-out, delayed growth, calmer levitation, heavy echo trail, validation, and rollback |
| `2026-08-31-loot-pickup-continuity-v2.md` | Exact world-to-flight-to-inventory pickup continuity for resources, special tiles, and 250 Stars, with deterministic dynamic routing and rarity moments |
| `2026-09-01-audio-library-gap-expansion-v1.md` | Review-only 85-source audio library, gap matrix, paged decision UX, 24 public CC0 leads, and explicit production promotion gate |
| `2026-08-26-star-block-openrouter-idle-v1.md` | Three budget-capped OpenRouter Star idle loops, motion-only extraction, 72-frame runtime atlas, exact 250-core preservation, WebGL QA, and rollback |
| `2026-08-27-ground-damage-universal-v2-restoration.md` | Restores universal V2 as the production default after rejecting all V3-V6 resource-specific persistent damage responses |
| `2026-08-26-expanded-ground-damage-library-v4.md` | Rejected comparison history for the 64-motif, 33-profile resource-specific V4 direction |
| `2026-07-28-overground-resource-special-tile-texture-audit.md` | Approved six-variant ground-embedded ImageGen resource overlays, retained special/GP tiles, runtime routes, rollback boundary, and regression contract |
| `2026-07-28-complete-surface-landscape-mockup-library.md` | Review-only fourteen-panel final-look library for all Level 1 and Level 2 surface tiles, including unique ground identities, protected landmarks, modular extraction gates, and rollback boundary |
| `2026-07-26-underground-biome-background-runtime-wiring.md` | Sixty-card ten-biome background, ground-depth, streaming, motion, and rollback contract |
| `2026-07-26-underground-biome-motion-runtime-v1.md` | Rejected Graphics-overlay motion history and V2 supersession pointer |
| `2026-07-26-underground-biome-baked-motion-runtime-v2.md` | Ten actual moving-image backgrounds, painted keyframes, VP9 pipeline, ground separation, streaming, performance, and rollback contract |
| `2026-07-28-underground-visual-expansion-v3.md` | Fifty additive full backgrounds plus fifty terrain-masked ImageGen ground structures, production wiring, alpha pipeline, streaming, validation, and independent rollback |
| `2026-07-28-underground-terrain-blend-v4.md` | Fifty bolder feathered terrain plates, 200 painted dug-top cuts, seamless backdrop and structure joins, retained V3 assets, layer authority, rollback, and validation |
| `2026-07-29-underground-detail-library-v6.md` | 400 additive ImageGen foreground textures/props, complementary V6 seam routing across all retained terrain/structures, deterministic masked streaming, rollback, and contracts |
| `2026-08-29-level-one-biome-source-families-v1.md` | Quadruples Level One from five shared parent pools to twenty disjoint visual source families, adds twenty seed-anchored ImageGen signatures, preserves all retained assets, and keeps map/gameplay authority unchanged |
| `2026-08-29-level-one-biome-generated-roles-v2.md` | Expands all twenty Level One families to independent background, signature, ground, and foreground roles with sixty new ImageGen sources, organic X/depth placement, demand streaming, and visual-only authority |
| `2026-08-29-level-one-biome-50-family-expansion-v3.md` | Expands Level One to fifty named X/depth families and 200 generated role assets, adding 120 independent ImageGen sources across 0-2000 m with M-map parity, streaming, and visual-only authority |
| `2026-08-29-level-one-biome-ground-material-diversity-v1.md` | Adds sixty independent full-coverage terrain plates for the thirty new families, raising true Level One ground concepts from 36 to 96 and the generated family visual library to 260 while preserving terrain and save authority |
| `2026-08-30-level-one-biome-depth-diversity-v1.md` | Adds 156 independent ground, scenic, identity, boundary, and landmark assets; fifteen blunt palette hard swaps; 1109 effective selections; and no new placement, gameplay, or save authority across Level One 0-2000 m |
| `2026-07-29-underground-backdrop-enhancers-v7.md` | 100 high-resolution transparent biome backdrop enhancers, motif-compatible optional placement, stable no-overlay variation, edge-feathered streaming, rollback, and contracts |
| `2026-07-28-sky-underground-cohesion-runtime.md` | Gap-free native-density overlap field using all twenty sky assets plus ten terrain-masked biome foregrounds, all additive over retained libraries with independent rollback |
| `2026-07-29-background-rendering-regression-restoration.md` | Restored world-anchored sky and opaque underground backdrops, corrected Phaser crop-origin masks, live QA, and regression coverage |
| `2026-07-29-expanded-cave-level-visual-overhaul.md` | Historical 60x20 cave expansion; its hidden painted-floor collision and ImageGen panorama runtime were superseded on 2026-07-30 |
| `2026-07-30-meshy-cave-terrain-correction.md` | Historical Meshy interior attempt; its zero-`CAVE_WALL` terrain remains, but its visual routing was superseded |
| `2026-07-31-cave-interior-visual-correction.md` | Removes repeated Meshy cards and giant arches, preserves the approved left entrance, restores one continuous authored interior, and clusters mineable ground |
| `2026-07-26-modular-surface-props-runtime-v1.md` | Approved modular Level 1/Level 2 surface props, physical scale, terrain contact, coverage, streaming, testing, and rollback contract |
| `2026-07-28-natural-surface-composition-and-drop-through.md` | Natural Level 2 prop clusters, prop-free enlarged Level 1 Titan Walk, continuous two-level surface edge, conditional S drop-through, tests, and rollback |
| `2026-07-28-additive-surface-landscape-runtime-v2.md` | Seven additive ImageGen Level 2 chapter anchors, retained original props, protected footprints, subtle approved-atlas atmosphere, untouched backgrounds, validation, and rollback |
| `2026-07-29-surface-sky-props-v3-runtime.md` | 200-asset palette with a sparse 38-surface/13-sky authored composition, static transforms, layered scale/opacity distance, protected landmarks, validation, and rollback |
| `2026-07-30-surface-hero-landmarks-v4-runtime.md` | Seven physically scaled Level 2 hero landmarks, twenty-four deliberate prop suppressions, static depth/fade profiles, protected portals/Titans, actual live before/after evidence, validation, and exact rollback |
| `2026-07-28-earthquake-polish-seismic-suppression.md` | Compact seismic UI, authored tile-hit feedback, permanent Level 11 earthquake suppression, persistence, validation, and rollback |
| `2026-07-28-earthquake-dodge-audit-and-layering.md` | Production FallZone behavior, measured dodge window, exact tile/ground feedback, world layer stack, and regression coverage |
| `2026-08-30-earthquake-event-cohesion-v2.md` | Earlier first discovery, cohesive aftershock lifecycle, urgent edge ranking, authored hit reaction, validation, and rollback |
| `2026-07-28-starlight-talent-tree-runtime.md` | Shared ESC/Star Pillar talent tree, first-star reveals, three-Heart Engine mastery, safety caps, health checks, and rollback |
| `2026-07-29-starlight-talent-tree-v3-polish.md` | Native ultra-wide ImageGen presentation, three-card carousels, proportional scaling, God Mode review, validation, and V2 rollback |
| `2026-07-28-ui-notification-carousel.md` | Centered transient-card queue, seven-second per-selection timing, consumptive arrows, full-queue X, modal input isolation, and reduced floating-text default |
| `2026-07-28-authored-mining-target-and-mouse-dig.md` | Image-backed corner targeting, adjacent primary-click digging, keyboard parity, final-hit removal, safety checks, and rollback |
| `2026-07-30-depth-resource-economy-rebalance.md` | Historical rollout; current runtime retains continuous depth income, deeper material composition, Milestone bonuses, Deep Market progression, caps, health checks, and measurements while ordinary block rarity is retired |
| `2026-08-26-understar-cinematic-video-pack.md` | Generated opening and first-Mossback runtime cinematics, cinematic companion trailer, two captioned vertical Steam-wishlist shorts, bounded cost/provenance, runtime wiring, verification, and rollback |
| `2026-08-26-talent-and-depth-progression-rebalance.md` | Complete 33-node power/runtime and ten-Sign ability rebalance, including the five-star Wayward swarm, five-core Hollow Sun cluster, Stellar Lance piercing projectile replacement, GP activation economy, bounded Thunder/Quick Slash scaling, Star/depth economy, measurements, and rollback |
| `2026-09-03-celestial-talent-and-skill-audit.md` | Current 33-node copy/rank audit, readable connector states, bounded power envelopes, and player-steered alternating Hollow Sun pulses |
| `2026-09-03-celestial-talent-and-skill-audit.md` | Current 33-node copy/rank audit, readable connector states, bounded power envelopes, and player-steered alternating Hollow Sun pulses |
| `2026-08-31-upgrade-rank-compression.md` | Fifteen repeatable merchant tracks compressed by 70-80%, with bundled prices, meaningful effects, explicit caps, and non-lossy version-2 save migration |
| `2026-08-03-safe-asset-resolution-polish.md` | Full raster inventory, safe Ultra backing-density promotion, authored main-menu bitmap polish, live evidence, validation, and exact rollbacks |
| `2026-08-15-survival-hero-quality-v4-benchmark.md` | Review-only six-family V4 material reconstruction, correct packed ORM routing, punch-first current/123/155 px action proofs, drift gates, and runtime/source isolation |
| `2026-08-20-complex-dig-animation-runtime.md` | Approved ten-stage SIDE and Uppercut-only UP wiring, two native dual-contact clips, phase-locked moving/Jog composites, zero-drift Piskel polish, validation, and instant legacy rollback |
| `2026-08-25-player-collider-contact-polish-v2.md` | Unified Survival pose-aware collider pass: wall/ceiling/floor clipping repair, safe crouch retention, flight envelope, vehicle round-trip, proof and rollback |
| `2026-08-25-player-animation-transition-cohesion-v3.md` | Traversal-resident unified sheets, velocity-owned Jog release, same-frame geometry/origin handoff, memory bound, validation, and rollback |
| `2026-08-25-player-animation-presentation-continuity-v4.md` | Authored-scale lock, single recovery ownership, shared cave/main crouch handoffs, restart guards, validation, and rollback |
| `2026-08-30-piskel-animation-scale-continuity.md` | Pixel-exact Piskel source authority for six unified Survival sheets, removal of Jog/idle grow-shrink pops, full-sheet measurement, validation, and rollback |
| `2026-08-20-injured-locomotion-earthquake-plan.md` | Plan-only low-GP strained locomotion and event-driven earthquake reaction family, including Mixamo discovery leads, priority, retarget gates, and unchanged gameplay authority |
| `2026-07-26-titan-chambers-production-v2.md` | 25 unique high-resolution Titan chambers, v3 seamless-edge/depth-grade amendment, colossal discovery zones, streamed runtime/archive wiring, health, and rollback |
| `2026-07-26-titan-discovery-player-path-correction.md` | Historical 700 m guidance correction; its partial-entry admission is superseded |
| `2026-07-28-titan-clues-and-creature-footprint-unlock.md` | Catalog clues, exact directions, 25 sharp underground/surface stances, compact dais, colored cover-tile glow, 50% auto-clear authority, plinth inspection, ESC lore, and trophy/save wiring |
| `2026-08-02-titan-underground-grounding-runtime.md` | All-25 bottom anchoring, shared contact/resonance art, ten-biome V7 envelope reuse, short weighted unlock motion, streaming health, and rollback |
| `2026-06-25-phase3-roadmap.md` | Current phase roadmap |
| `2026-06-25-next-steps.md` | Immediate next steps |
</content-file>
</write_to_file>
| `2026-07-30-starlight-talent-tree-v4-mockup-fidelity.md` | Approved mockup-ratio single-frame Starlight UI, full-shell ESC and Star Pillar integration, large choice/dossier art, responsive Phaser evidence, validation, and rollback |

Cave visual composition and player grounding:
[2026-09-05 Cave composition](2026-09-05-cave-composition.md).
Includes depth grading, physical contact shadows, rollback and real-game review.


## Destruction and pickup timing - 2026-09-05

The current timing cleanup and native Phaser proof are in `testing/audio-destruction-pickup-2026-09-05/`; see `markdown/2026-09-05-destruction-pickup-audio-timing.md`. Five approved recordings now use short playback windows from `values/coreSfxWindows.js`. Only resource arrival owns pickup audio; XP cannot replay it later. Original files and review IDs are preserved. Prior audio comparisons remain historical snapshots.

Encounter outcomes and UI text alignment:
[2026-09-06 review and evidence](2026-09-06-event-outcomes-and-ui-alignment.md).

- `2026-09-06-level-one-live-backgrounds-v6.md`: approved default Level 1 backgrounds, rare ambient birds/details, final ridge joins and real-game verification.

`2026-09-07-quiet-menu-atmosphere.md` documents the six restrained menu/loading loops, local Tailwind/Radash integration, resource cleanup, generation costs and focused runtime verification.

Town bed rest and checkpoint rules: [2026-09-07 Town bed rest](2026-09-07-town-bed-rest.md). Includes the baked prop/UI, accelerated clock/weather, free waking blessing, Ember refill and focused runtime evidence.

`2026-09-07-session-awakening.md` records three varied session-entry awakenings, approved breathing/heartbeat audio, generated eyelid art, camera compatibility, and gameplay recordings.

- [7 September: relevant Hints and public wiki release](2026-09-07-hints-and-wiki.md) — Esc field guide, useful search, current screenshots, public browser proof and guarded rollback.

[Signal and Mia rescue](2026-09-07-signal-event.md) documents sparse calls, sound-off captions, tile-free minicamps, survivor choices, Mia's shop unlock and surface placement, explosive Signal risk, substantial-gift rewards, practice controls, verification and an optional permanent reward proposal.

[2026-09-08 Initial boot and logo motion](2026-09-08-initial-boot-logo-motion.md)
records the small launch graph, improved loading contrast, compact approved
light loop, failure recovery and production candidate evidence.

- [2026-09-12 memory residency pass](2026-09-12-memory-residency-pass.md): deferred talent-screen art and optional idle animation, measured texture reductions and lifecycle evidence.
