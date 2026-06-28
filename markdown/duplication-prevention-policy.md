# Duplication Prevention Policy — Dig Game Dev Environment

**Last updated:** 2026-06-25

This file defines how to detect, eliminate, and prevent duplicate code and config values across the codebase.

---

## 1. Why Duplicates Happen

| Root Cause | Symptom | Example |
|------------|---------|---------|
| Copy-paste | Two files define the same constant | `TILE_SIZE = 64` in both values/constants.js and a system file |
| Unawareness | Developer doesn't know a value exists | A new `MINING_DAMAGE` defined instead of importing from miningConfig.js |
| Forgot to split | Similar logic copied into multiple places | Two dig functions with 80% overlap |
| Import path confusion | Same value imported from wrong location | Two different "sources of truth" for the same thing |

## 2. Detection Strategies

### Config Value Detection

Search for patterns that indicate a value should be in `/values/`:

```bash
# Find magic numbers (likely violations)
grep -rn "= [0-9][0-9][0-9]" --include="*.js" | grep -v "/values/" | grep -v "node_modules"

# Find duplicate constant definitions
grep -rn "const TILE_SIZE\|const GRAVITY\|const MAX_HP" --include="*.js"

# Find asset key strings that should be in assetKeys.js
grep -rn '"sprites/\|\.webp"\|\.ogg"' --include="*.js" | grep -v "/values/"
```

### Code Duplication Detection

Look for:
- Functions that share >60% of implementation
- Files with `copy`, `duplicate`, or `clone` in comments
- Systems that repeat the same calculation (e.g., depth-to-pixel conversion)
- Scene files with overlapping setup logic

## 3. How to Refactor When Found

### For Config Values

```
1. Identify the duplicate value in system/world/player code
2. Find the canonical source in /values/ (or create one if missing)
3. Replace the inline value with an import from /values/
4. Remove the old definition
5. Verify all consumers use the same import path
```

**Wrong** (duplicated):
```js
// systems/mining/DigSystem.js
const DIG_COOLDOWN = 200; // MAGIC NUMBER — violates SSOT

// player/PlayerController.js
const MINE_COOLDOWN = 200; // DUPLICATE — same value, different name
```

**Correct** (single source):
```js
// values/miningConfig.js
export const MINING_CONFIG = Object.freeze({
  mineCooldownMs: 200,
});

// systems/mining/DigSystem.js
import { MINING_CONFIG } from "../../values/miningConfig.js";
const cooldown = MINING_CONFIG.mineCooldownMs;

// player/PlayerController.js
import { MINING_CONFIG } from "../../values/miningConfig.js";
const cooldown = MINING_CONFIG.mineCooldownMs;
```

### For Duplicate Logic

```
1. Extract the shared logic into a utility function
2. Place it in the appropriate system or a new utility file
3. Both callers import and use the shared function
4. Delete the duplicated implementations
```

## 4. Prevention Patterns

### Before Writing New Code
- **Search first** — use `search_files` or `grep` to check if the value or function already exists
- **Check `/values/`** — browse relevant config file before hardcoding any number
- **Check `assetKeys.js`** — before writing a sprite/audio path string

### During Code Review
1. Scan for magic numbers — any number not imported from `/values/` is a violation
2. Scan for duplicate definitions — same value defined in two places
3. Verify import paths — all consumers use the same canonical path
4. Check for repeated logic — if two functions look similar, extract to shared utility

### Naming Convention Enforcement
- Use consistent names for the same concept across the codebase
- If it's a cooldown in milliseconds, always call it `*CooldownMs` or `*cooldownMs`
- If it's tile HP, always use `tileHp` or `*TileHp` — never mix `durability`, `strength`, `health`
- This prevents the "same value, different name" duplication pattern

## 5. Detection Tools

### In /ai-tools/
The following tools help detect and fix duplication issues:

| Tool | What it does |
|------|-------------|
| `2026-06-25-detect-and-rewire-imports.py` | Finds values imported from wrong paths |
| `2026-06-25-comprehensive-import-fixer.py` | Rewires all imports to canonical paths |
| `2026-06-25-rewrite-all-imports.py` | Bulk rewrite of import statements |

### Manual Checks

```bash
# Check if a value exists before creating it
grep -rn "VALUE_NAME" values/ --include="*.js"

# Find all files that define the same constant name
grep -rn "const TILE_SIZE" --include="*.js"

# Find inline asset paths (should be in assetKeys.js)
grep -rn "load.image\|load.audio\|load.spritesheet" --include="*.js" | grep -v "/values/" | grep -v "BootScene"
```

## 6. Enforcement Rules

1. **Zero tolerance for magic numbers** — every numeric value must come from `/values/`
2. **One canonical path per value** — if two files define the same constant, one must be removed
3. **No inline asset paths** — all sprite/audio paths go through `assetKeys.js`
4. **No duplicate logic** — if two functions share >60% of code, extract to shared utility
5. **Consistent naming** — same concept = same name across the entire codebase

---

**See also:**
- [single-source-of-truth-policy.md](single-source-of-truth-policy.md) — values rule everything
- [naming-policy.md](naming-policy.md) — naming conventions
- [organisation-policy.md](organisation-policy.md) — layered architecture
- `/ai-tools/` — import fixing and detection tools