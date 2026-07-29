# Dig Game — Dev Environment

**Root entry point. Read this first.**

---

## Reading Order (must follow)

| # | File | What it covers |
|---|------|----------------|
| 1 | `.clinerules` | AI rules, core rules, naming quick ref, scene lifecycle, workflow |
| 2 | **this file** → `/readme.md` | Reading order, architecture overview, directory structure, how to run |
| 3 | `/markdown/readme.md` | Full directory structure, naming policy, import rules, value system, scene lifecycle, system categories, archive policy |
| 4 | `/markdown/naming-policy.md` | Full naming conventions (directories, files, code, imports, dates) |
| 5 | `/markdown/organisation-policy.md` | Layered architecture, directory responsibilities, import direction rules |
| 6 | `/markdown/seperation-policy.md` | One responsibility per file, how to split, when to split |
| 7 | `/markdown/single-source-of-truth-policy.md` | Values system — all config goes in /values/, no magic numbers |
| 8 | `/markdown/duplication-prevention-policy.md` | Detecting & eliminating duplicate code and config values |
| 9 | `/markdown/version-control/version-control.md` | 3-tier version control: local dev, backups, git |
| 10 | `/markdown/tools/readme.md` | Available AI tools, what they fix, when to use them |
| 11 | `/markdown/archive-policy.md` | What to archive, naming format, deletion rules |
| 12 | `/markdown/pathing/readme.md` | How to resolve import path issues |

---

## Architecture Principles

```
values/       ← Layer 0: Pure data, no imports from project
    ↓
systems/      ← Layer 1: Reads from values/ only
    ↓
world/        ← Layer 2: Reads from values/ and systems/
player/       ← Layer 2: Reads from values/ and systems/
    ↓
ui/           ← Layer 3: Reads from all layers above
```

**Key rules:**
- `/values/` is the SINGLE SOURCE OF TRUTH — every numeric/string/config value lives here
- No circular dependencies — if A needs B and B needs A, inject at setup time
- Max ~300 lines per file — split by concern using PlayScene pattern (setup/update/gameplay modules)

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

## Game Systems Map

| Category | Directory | Systems |
|----------|-----------|---------|
| Mining | `/systems/mining/` | DigSystem, TileCollisionSystem, SpecialTileSystem, SpecialBlockEffectsManager |
| Progression | `/systems/progression/` | PlayerLevelSystem, UpgradeSystem, DepthGateSystem |
| Visual | `/systems/visual/` | HUDSystem, FloatingTextSystem, EarthquakeFeedbackUI, EarthquakeHazardOverlay, GraveborerWurmVisualSystem, GraveborerWurmHudSystem, HardcoreMemorialWorldSystem, ScreenFlashSystem, CameraShakeSystem, PickaxeTrailSystem, ClimbTrailSystem, StarPillarSystem, MilestoneBoardSystem |
| Audio | `/systems/audio/` | SoundSystem, SoundLibraryManager, VoiceLineManager |
| Environment | `/systems/environment/` | DayNightCycle, WeatherSystem, AtmosphereSystem, EarthquakeSystem, GraveborerWurmSystem, AboveGroundDecorationSystem, CampfireSystem, SurfaceTunnelDoorSystem, BiomeSystem |
| Hardcore | `/systems/hardcore/` | HardcoreModeSystem, HardcoreMemorialStore, hardcoreMemorialRecord |
| Lighting | `/systems/lighting/` | LightSystem, ShaderSystem |
| Combo | `/systems/combo/` | ComboSystem, HitstopSystem |
| Health | `/systems/health/` | RuntimeCanarySystem, RuntimeCanaryReporter, deterministic runtime checks |

`DayNightCycle` owns the sun/moon world-space orbit. `LightSystem`, weather,
atmosphere, and shaders consume camera-projected positions from that same source;
celestial sprites must not be converted back to fixed-screen objects.

---

## Directory Structure

```
dig-game-dev-env-cleaned/
├── .clinerules              ← AI entry rules (thin)
├── readme.md                ← this file (thick orchestrator)
├── main.js                  ← Root Phaser entry (6 scenes)
├── index.html               ← Game page
├── serve.py                 ← Dev server
│
├── values/                  ← 46+ config files — SINGLE SOURCE OF TRUTH
├── world/                   ← Game world model, generation, rendering, PlayScene
├── player/                  ← Player controller, physics, input, abilities
├── systems/                 ← Game systems (mining, audio, visual, etc.)
├── ui/                      ← Scenes, HUD, overlays, UI components
├── animations/              ← Animation frame definitions
├── shaders/                 ← GLSL shader code
│
├── sprites/                 ← Static image assets (.webp, .png)
├── sound/                   ← Audio files (.ogg, .wav)
├── libs/phaser.js           ← Phaser 3 framework
│
├── css/style.css            ← Page styling
├── js/                      ← Legacy build output
│
├── ai-tools/                ← AI-created scripts (date-stamped)
├── markdown/                ← All documentation
├── debugging/               ← Active debugging
├── feedback/                ← Player feedback & plans
├── exports/                 ← Tiled, piskel exports
├── pipelines/               ← Asset pipeline scripts
├── testing/                 ← E2E test harness
├── archive/                 ← Deprecated content
├── _ssh-git/                ← SSH/git credentials (gitignored)
```

---

## How to Run

```bash
cd dig-game-dev-env-cleaned
python serve.py 8080
# then open http://localhost:8080
```

Or use PHP:
```bash
php -S localhost:8080
```

`serve.py` disables browser caching for HTML, JavaScript modules, CSS, and JSON.
This prevents a development reload from mixing old and new ES-module versions
after runtime renderer or scene changes. Image/audio assets remain cacheable.

---

## Version Control

This project uses a 3-tier version control system:
1. **`dig-game-dev-env-cleaned/`** — active development, only place code is added/changed
2. **`back-ups-dig-game/`** — local backup directory with date-stamped snapshots
3. **GitHub** — remote repo via `_ssh-git/` credentials (see `/markdown/version-control/version-control.md`)

---

## Related Documents

| Document | Purpose |
|----------|---------|
| `/markdown/readme.md` | Full structure & policies |
| `/markdown/naming-policy.md` | Naming conventions |
| `/markdown/organisation-policy.md` | Layered architecture |
| `/markdown/seperation-policy.md` | One responsibility per file |
| `/markdown/single-source-of-truth-policy.md` | Values system |
| `/markdown/duplication-prevention-policy.md` | Duplicate prevention |
| `/markdown/version-control/version-control.md` | 3-tier version control |
| `/markdown/tools/readme.md` | AI tools inventory |
| `/markdown/archive-policy.md` | Archive rules, naming format, deletion policy |
| `/markdown/pathing/readme.md` | Import path resolution |
| `/markdown/2026-06-25-next-steps.md` | Immediate next steps |
| `/markdown/2026-06-25-phase3-roadmap.md` | Phase 3 roadmap |
| `/markdown/2026-07-28-star-block-crystal-popout-v2.md` | Approved Choice 1 Star Block family with an exact one-to-one tile pop-out, delayed growth, calmer levitation, six-echo trail, validation, and rollback |
| `/markdown/2026-07-12-v11-polished-runtime-backgrounds.md` | V11 polished surface/depth streaming package and rollback |
| `/markdown/2026-07-28-underground-visual-expansion-v3.md` | 100 additive underground ImageGen assets: 50 full backgrounds plus 50 terrain-masked ground structures |
| `/markdown/2026-07-28-underground-terrain-blend-v4.md` | 250 effective ground visuals, 50 feathered structure derivatives, native overlap blending, retained older layouts, rollback, and regression evidence |
| `/markdown/2026-07-28-sky-underground-cohesion-runtime.md` | Gap-free native-density sky overlap field using all 20 assets plus 10 terrain-masked underground cohesion placements, incoming-edge blends, rollback, and validation |
| `/markdown/2026-07-29-background-rendering-regression-restoration.md` | World-space sky/depth restoration, mask-origin fix, seamless retained backdrops, live QA, and regression tests |
| `/markdown/2026-07-29-expanded-cave-level-visual-overhaul.md` | 60x20 camera-traversed entered caves, three ImageGen panorama families, safe painted-floor collision, persistence migration, and rollback |
| `/markdown/2026-07-13-v11-split-sky-islands-tmx.md` | V11 open-sky bedrock cleanup and two four-portal sky-island banks |
| `/markdown/2026-07-26-titan-chambers-production-v2.md` | 25 high-resolution Titan chambers, streaming, archive pinning, health, validation, and rollback |
| `/markdown/2026-07-26-titan-discovery-player-path-correction.md` | Historical 700 m guidance correction; its partial-entry admission is superseded |
| `/markdown/2026-07-28-titan-clues-and-creature-footprint-unlock.md` | Catalog clues, high-resolution underground stances, compact dais, exact colored cover-tile glow, 50% auto-clear unlock, surface inspection, ESC lore, trophy/save wiring, and validation |
| `/markdown/2026-07-28-earthquake-polish-seismic-suppression.md` | Compact seismic UI, authored tile-impact feedback, and permanent endgame earthquake removal |
| `/markdown/2026-07-28-earthquake-dodge-audit-and-layering.md` | Production FallZones, measured dodge fairness, exact tile/ground feedback, world layering, and regression coverage |
| `/markdown/2026-07-29-starlight-talent-tree-v3-polish.md` | Native ultra-wide ImageGen talent presentation, three-card carousel spacing, proportional scaling, and rollback |
| `/markdown/2026-07-28-ui-notification-carousel.md` | Centered transient-card queue with fresh seven-second selection timing, consumptive arrows, full-queue X, modal isolation, and reduced floating text |
