# Separation Policy — Dig Game Dev Environment

**Last updated:** 2026-06-25

This file defines the ONE RESPONSIBILITY PER FILE rule and how to split code when it grows too large.

---

## 1. The Rule

Every file in the project must answer the question **"what does this do?"** in ONE sentence.

If a file does more than one thing, it must be split. A file that has grown beyond ~300 lines must be split.

## 2. How to Split

### By Responsibility

| Original File | Split Into |
|---|---|
| `PlayerController.js` (600 lines) | `PlayerController.js` (orchestrator), `PlayerInput.js`, `PlayerMovement.js`, `PlayerState.js` |
| `WorldGen.js` (400 lines) | `TerrainGenerator.js`, `CaveGenerator.js`, `GeodeGenerator.js`, `WorldGenerator.js` (orchestrator) |
| `PlaySceneSetup.js` (500 lines) | `PlaySceneSetup.js` (main), `createWorld.js`, `createPlayer.js`, `createUI.js` |

### By Lifecycle

| Phase | File |
|---|---|
| Setup / creation | `*Setup.js` or `create*.js` |
| Update loop | `*Update.js` |
| Render / display | `*Renderer.js` or `*UI.js` |
| Cleanup / destroy | Part of `*Setup.js` or `*Manager.js` |

### By System Category

Game systems that are distinct should live in separate files within their category:
- `systems/mining/DigSystem.js`
- `systems/mining/TileCollisionSystem.js`
- `systems/mining/SpecialTileSystem.js`

## 3. When to Split

Signs that a file needs splitting:
- You can't describe it in one sentence
- It imports from 10+ different modules
- It has multiple `class` definitions
- It has both game logic AND rendering code
- It contains both setup AND cleanup
- It exceeds 300 lines

## 4. What NOT to Split

- Small utility files (<50 lines) that do one thing can stay small
- Config files are exempt (they're data, not code)
- Scene files that are purely orchestration may be larger but split sub-modules

## 5. Split Pattern

```
Original file:  PlayerController.js (600 lines)
├── PlayerController.js         ← Orchestrator (imports sub-modules)
├── PlayerInput.js              ← Input handling
├── PlayerMovement.js           ← Movement state machine  
├── PlayerState.js              ← State definitions
└── readme.md                   ← Explains the split
```

Each sub-file gets its own responsibility and can be tested independently.

---

**See also:**
- [organisation-policy.md](organisation-policy.md) — directory relationships
- [naming-policy.md](naming-policy.md) — naming conventions
</content-file>
</write_to_file>