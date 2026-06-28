# Dig Game Dev Environment — README

**Last updated:** 2026-06-25

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
│   ├── resources.js                ← Resource prices, rarity, spawn rates
│   ├── world.js                    ← World gen params, soil bands, tile health
│   ├── gamefeel.js                 ← Camera shake, hitstop, screen flash
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
│   │   ├── ScreenFlashSystem.js    ← Screen flash effects
│   │   ├── CameraShakeSystem.js    ← Camera shake on dig/hit
│   │   ├── PickaxeTrailSystem.js   ← Pickaxe swing trail particles
│   │   ├── ClimbTrailSystem.js     ← Climbing dust particles
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
│   │   ├── EarthquakeSystem.js     ← Screen shake events
│   │   ├── AboveGroundDecorationSystem.js ← Trees, grass, clouds
│   │   ├── CampfireSystem.js       ← Campfire visuals & mechanics
│   │   ├── SurfaceTunnelDoorSystem.js ← Town exit tunnel door
│   │   └── BiomeSystem.js          ← Biome state & transitions
│   ├── lighting/
│   │   ├── LightSystem.js          ← Runtime point light management
│   │   └── ShaderSystem.js         ← Pipeline shader management
│   └── combo/
│       ├── ComboSystem.js          ← Dig combo multiplier
│       └── HitstopSystem.js        ← Hit pause on tile break
│
├── ui/                             ← UI components & scenes
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
│   │   ├── LevelUpPopup.js         ← Level-up notification
│   │   └── SettingsPanelContent.js ← Settings panel content
│   ├── PhaserUiKit.js              ← Button/UI component library
│   ├── GeneratedHudTextures.js     ← Runtime HUD texture generation
│   └── UINotificationSystem.js     ← Toast notification system
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
- Player stats (walk speed, jump height)

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
| `2026-06-25-phase3-roadmap.md` | Current phase roadmap |
| `2026-06-25-next-steps.md` | Immediate next steps |
</content-file>
</write_to_file>