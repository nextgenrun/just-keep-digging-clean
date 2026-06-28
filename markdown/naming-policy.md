# Naming Policy — Dig Game Dev Environment

**Last updated:** 2026-06-25

This file defines ALL naming conventions. Deviations cause merge conflicts, confusion, and drift.

---

## 1. Directory Naming

| Convention | Example | Why |
|---|---|---|
| `kebab-case` | `systems/mining/` | URL-safe, case-insensitive on Windows |
| `dynamic-systems/` not `dynamicSystems/` | `dynamic-systems/generation/` | Matches kebab-case rule |
| No spaces | `sprites/` not `sprites and stuff/` | Breaks CLI tools |
| Single purpose per directory | `player/` = player logic ONLY | Easy to find things |

## 2. File Naming

| What | Convention | Example |
|---|---|---|
| Classes | `PascalCase.js` | `TileCollisionSystem.js` |
| Utilities / helpers | `camelCase.js` | `seededRandom.js` |
| Configuration / values | `camelCase.js` | `gameConfig.js` |
| Markdown documents | `YYYY-MM-DD-topic.md` | `2026-06-25-naming-policy.md` |
| AI tools / scripts | `YYYY-MM-DD-description.py` | `2026-06-25-build-standalone.py` |
| CSS files | `kebab-case.css` | `ui-framework.css` |

## 3. Code Naming

| What | Convention | Example |
|---|---|---|
| Classes / constructors | `PascalCase` | `class WorldModel` |
| Functions / methods | `camelCase` | `function getTileAt(x,y)` |
| Variables | `camelCase` | `const currentHp = 3` |
| Constants (module-level) | `UPPER_SNAKE_CASE` | `const TILE_SIZE = 64` |
| Config objects | `Object.freeze()` with PascalCase keys | `export const GAME_CONFIG = Object.freeze({...})` |
| Asset keys | `Object.freeze()` nested | `ASSET_KEYS.player.idleAnim` |
| Export default | Only for single-class files | `export default class TileGrid` |

## 4. Import Naming

```
import { Thing } from "../../path/Thing.js"   // named export
import Thing from "../../path/Thing.js"       // default export
import * as Things from "../../path/things.js" // namespace
```

- Always include the `.js` extension (ES module requirement)
- Use relative paths only (no absolute/alias imports)
- Import at the TOP of the file, sorted by path depth (deepest first)

## 5. Markdown Dates

All `.md` files in `/markdown/` **MUST** use date prefix in filename:
```
YYYY-MM-DD-topic.md
Example: 2026-06-25-naming-policy.md
```

If multiple files share the same topic, append a version:
```
2026-06-25-naming-policy-v2.md
```

## 6. AI Tool Dates

All scripts in `/ai-tools/` **MUST** have date-stamped filenames:
```
YYYY-MM-DD-description.ext
Example: 2026-06-25-build-standalone.py
```

When a tool is superseded, archive the old one to `/archive/` and update the reference.

---

**See also:**
- [organisation-policy.md](organisation-policy.md) — how directories relate
- [seperation-policy.md](seperation-policy.md) — one responsibility per file
- [single-source-of-truth-policy.md](single-source-of-truth-policy.md) — values rule everything
</content-file>
</write_to_file>