import assert from "node:assert/strict";

import { ComboSystem } from "../systems/combo/ComboSystem.js";
import { DigSystem } from "../systems/mining/DigSystem.js";
import { GAME_CONFIG } from "../values/gameConfig.js";
import { MINING_CONFIG } from "../values/miningConfig.js";
import { TILE_HEALTH_CONFIG } from "../values/tileHealth.js";
import { TILE_TYPES } from "../values/tileTypes.js";

assert.equal(MINING_CONFIG.baseDamage, 16);
assert.equal(MINING_CONFIG.baseDamageHard, 8);

const comboWindowMs = new ComboSystem().comboDurationMs;
const earlyRouteMaterials = [
  { name: "dirt", type: TILE_TYPES.DIRT, damage: MINING_CONFIG.baseDamage },
  { name: "stone", type: TILE_TYPES.STONE, damage: MINING_CONFIG.baseDamageHard },
  { name: "copper", type: TILE_TYPES.COPPER, damage: MINING_CONFIG.baseDamageHard },
  {
    name: "dark dirt",
    type: TILE_TYPES.DARK_DIRT_NORMAL,
    damage: MINING_CONFIG.baseDamage,
  },
];

for (const material of earlyRouteMaterials) {
  const hp = TILE_HEALTH_CONFIG.tileHealth[material.type]?.min;
  assert.ok(Number.isFinite(hp) && hp > 0, `${material.name} must have valid HP`);
  const breakTimeMs = Math.ceil(hp / material.damage) * GAME_CONFIG.mineCooldownMs;
  assert.ok(
    breakTimeMs < comboWindowMs,
    `${material.name} needs ${breakTimeMs}ms, beyond the ${comboWindowMs}ms combo window`,
  );
}

const directRewardCombo = new ComboSystem();
const directRewardDig = new DigSystem(
  null,
  null,
  { ...GAME_CONFIG, resourceEconomyEnabled: false },
  null,
  null,
  null,
  directRewardCombo,
);
const directRewardTimeMs = 1234;
directRewardDig.processDestroyedTile(
  0,
  0,
  TILE_TYPES.DIRT,
  directRewardTimeMs,
  true,
);

assert.equal(directRewardCombo.getComboCount(), 1);
assert.equal(directRewardCombo.lastComboTime, directRewardTimeMs);
assert.ok(Number.isFinite(directRewardCombo.getTimerFraction(directRewardTimeMs)));

console.log("2026-08-27 combo continuity contract passed");
