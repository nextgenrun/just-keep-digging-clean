# Single Source of Truth Policy — Dig Game Dev Environment

**Last updated:** 2026-06-25

This file defines the VALUES SYSTEM — the rule that ALL numeric and string game config lives in `/values/` and nowhere else.

---

## 1. The Rule

Every numeric value, string constant, spawn rate, price, multiplier, color, size, speed, timer, or any other tuneable game parameter MUST be defined in `/values/` and imported by systems.

**Magic numbers are FORBIDDEN** anywhere else in the codebase.

## 2. What Goes in /values/

| Category | Files | Examples |
|---|---|---|
| Game constants | `gameConfig.js` | viewport size, tile size, world dimensions |
| Player stats | `playerStats.js` | walk speed, jump height, max HP, dig power |
| Player abilities | `playerAbilities.js` | gem power capacity, dash speed, ability costs |
| Player characters | `playerCharacters.js` | character definitions, base stats per character |
| UI config | `uiConfig.js` | HUD layout, font sizes, colors, panel sizes |
| UI colors | `uiColors.js` | color palette for all UI elements |
| Mining config | `miningConfig.js` | damage per hit, tile HP, resource yields |
| Upgrade config | `upgradeDefinitions.js` | upgrade costs, effects, unlock depths |
| Resource prices | `resourcePrices.js` | sell prices for each resource |
| Resource rarity | `resourceRarity.js` | spawn rarity per depth band |
| World gen | `worldGen.js` | terrain noise params, biome distribution |
| Tile health | `tileHealth.js` | HP per tile type per depth band |
| Gamefeel | `gamefeel.js` | screen shake intensity, hitstop duration, particle counts |
| Asset keys | `assetKeys.js` | ALL texture/audio/animation keys |
| Audio config | `audioConfig.js` | volume levels, categories, playlist |
| Keybinds | `keybindActions.js` | default key mappings |
| Weather | `weatherConfig.js` | weather types, frequency, intensity |
| Lighting | `lightConfig.js` | light radius, intensity, emissive depth |
| Combo | `comboConfig.js` | combo milestones, multipliers, rewards |
| Merchants | `merchants/` | NPC shop configs, prices, inventory |
| Time | `timeConfig.js` | day/night cycle duration, transition speed |
| Leveling | `levelConfig.js` | XP per level, stat gain per level |
| Shaders | `shaderConfig.js` | shader uniforms, default values |
| Shadow miner | `shadowMinerConfig.js` | NPC behavior configs |

## 3. How to Add a New Value

1. Open the relevant file in `/values/`
2. Add the value as a named export
3. Re-export through `index.js` if the file has many exports
4. Import it in the system that needs it
5. **Never** inline the value in system code

```js
// values/gameConfig.js (CORRECT)
export const TILE_SIZE = 64;
export const VIEWPORT_WIDTH = 1280;

// systems/rendering/WorldRenderer.js (CORRECT)
import { TILE_SIZE } from "../../values/gameConfig.js";
```

```js
// systems/rendering/WorldRenderer.js (WRONG — magic number!)
const TILE_SIZE = 64;
```

## 4. What NOT to Put in /values/

- Game logic, algorithms, state machines
- Class definitions
- Functions (except simple getters)
- Temporary or debug values
- Values that change every frame (those are state, not config)

## 5. Enforcement

When reviewing code:
1. Scan for magic numbers — any number that isn't imported from `/values/` is a violation
2. Scan for duplicate definitions — the same value defined in two places means one should be removed
3. Verify import paths — values should be imported from `/values/`, not copied locally

---

**See also:**
- [organisation-policy.md](organisation-policy.md) — layered architecture
- [naming-policy.md](naming-policy.md) — naming conventions
</content-file>
</write_to_file>