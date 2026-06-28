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
| Visual | `/systems/visual/` | HUDSystem, FloatingTextSystem, ScreenFlashSystem, CameraShakeSystem, PickaxeTrailSystem, ClimbTrailSystem, StarPillarSystem, MilestoneBoardSystem |
| Audio | `/systems/audio/` | SoundSystem, SoundLibraryManager, VoiceLineManager |
| Environment | `/systems/environment/` | DayNightCycle, WeatherSystem, AtmosphereSystem, EarthquakeSystem, AboveGroundDecorationSystem, CampfireSystem, SurfaceTunnelDoorSystem, BiomeSystem |
| Lighting | `/systems/lighting/` | LightSystem, ShaderSystem |
| Combo | `/systems/combo/` | ComboSystem, HitstopSystem |

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