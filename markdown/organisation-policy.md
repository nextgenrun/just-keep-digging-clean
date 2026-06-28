# Organisation Policy — Dig Game Dev Environment

**Last updated:** 2026-06-25

This file defines how directories relate to each other, the dependency chain, and the rules for where code lives.

---

## 1. Layered Architecture

```
values/       ← Layer 0: Pure data, no imports
    ↓
systems/      ← Layer 1: Reads from values/ only
    ↓
world/        ← Layer 2: Reads from values/ and systems/
    ↓
player/       ← Layer 2: Reads from values/ and systems/
    ↓
ui/           ← Layer 3: Reads from all layers above
```

**Rule:** A layer can NEVER import from a layer above it. `values/` imports nothing.

## 2. Directory Responsibilities

| Directory | Responsibility | Cannot contain |
|---|---|---|
| `values/` | ALL numeric/string config, asset keys | Game logic, imports from project |
| `world/` | Game world state, tile grid, generation, rendering, PlayScene | UI code, player input |
| `player/` | Player character: controller, physics, input, abilities, state | World generation, UI |
| `systems/` | Static game systems (mining, audio, lighting, etc.) | Player-specific logic, UI rendering |
| `dynamic-systems/` | Procedural generation, runtime-computed systems | Hardcoded values |
| `ui/` | All user interface: scenes, overlays, HUD, menus | Game world logic |
| `animations/` | Animation frame definitions and creation | Spritesheet files (those go in sprites/) |
| `shaders/` | GLSL shader code and uniforms | Game logic |
| `sprites/` | Static image files (.webp, .png) | Animation definitions |
| `sound/` | Audio files (.ogg, .wav, .mp3) | Game logic |
| `libs/` | Third-party libraries (phaser.js) | Project code |
| `pipelines/` | Asset pipeline scripts (blender, piskel) | Game runtime code |
| `ai-tools/` | AI-created scripts, date-stamped | Game runtime code |
| `markdown/` | All documentation | Executable code |
| `debugging/` | Active debugging workspace | Permanent code |
| `feedback/` | Player feedback, plans, community input | Game code |
| `archive/` | Deprecated content, date-stamped | Active code |
| `exports/` | Tiled, piskel, blender exports | Game runtime assets |

## 3. Import Direction Rules

1. **`values/`** — zero imports from project files. May import from `libs/` only if needed (unlikely).
2. **`systems/`** — imports from `values/` only. NEVER from `world/`, `player/`, or `ui/`.
3. **`world/`** — imports from `values/` and `systems/`. NEVER from `player/` or `ui/`.
4. **`player/`** — imports from `values/` and `systems/`. NEVER from `world/` or `ui/`.
5. **`ui/`** — imports from all. Can import from `world/`, `player/`, `systems/`, `values/`.

## 4. File Size Rule

Each file should do ONE thing and be UNDER 300 lines. If a file exceeds this:
- Split utility functions into `utils/` subdirectory
- Split class methods into smaller classes
- Split scene files into setup/update/render modules

## 5. Directory Enforcement

Every directory should have a `readme.md` explaining what goes there. If files end up in the wrong directory, move them.

---

**See also:**
- [naming-policy.md](naming-policy.md) — naming conventions
- [seperation-policy.md](seperation-policy.md) — one responsibility per file
- [single-source-of-truth-policy.md](single-source-of-truth-policy.md) — values rule everything
</content-file>
</write_to_file>