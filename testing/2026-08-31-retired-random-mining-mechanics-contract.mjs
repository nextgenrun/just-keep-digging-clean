import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { CAMPFIRE_BLESSINGS, CAMPFIRE_TIERS } from "../values/campfireConfig.js";
import { ASSET_KEYS } from "../values/assetKeys.js";
import { GAME_CONFIG } from "../values/gameConfig.js";
import { INVENTORY_SPECIAL_BLOCKS } from "../values/inventorySpecialBlocks.js";
import { LEVEL_CONFIG } from "../values/levelConfig.js";
import { LOADING_MESSAGES } from "../values/loadingMessages.js";
import { SPECIAL_BLOCKS_CONFIG } from "../values/specialBlocks.js";
import { STAR_RARITY_PROGRESSION_CONFIG } from "../values/starRarityProgression.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { UI_ICON_FRAMES } from "../values/uiIcons.js";
import { UPGRADES } from "../values/upgradeDefinitions.js";
import * as dynamicSoil from "../values/dynamicSoil.js";
import { computeMilestoneBonuses } from "../values/depthMilestones.js";
import { resolveDepthMilestoneEconomyBonuses } from "../systems/mining/depthEconomyBonuses.js";
import { PlayerLevelSystem } from "../systems/progression/PlayerLevelSystem.js";
import { UpgradeSystem } from "../systems/progression/UpgradeSystem.js";
import { WorldModel } from "../world/model/WorldModel.js";

const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

for (const retiredUpgrade of ["critChance", "luckyCollector", "luckySales"]) {
  assert.equal(has(UPGRADES, retiredUpgrade), false, `${retiredUpgrade} must be absent from the shop catalog`);
}

const upgradeSystem = new UpgradeSystem(null, null, {
  firstFiveEnabled: true,
  depthEconomyEnabled: true,
});
upgradeSystem.upgradeLevels.critChance = 99;
upgradeSystem.upgradeLevels.luckyCollector = 99;
upgradeSystem.upgradeLevels.luckySales = 99;
const effects = upgradeSystem.getUpgradeEffects();
assert.equal(has(effects, "critChance"), false);
assert.equal(has(effects, "luckyCollector"), false);
assert.equal(has(effects, "luckySales"), false);

assert.equal(has(LEVEL_CONFIG.BONUSES, "criticalChancePerLegacyLevel"), false);
assert.equal(has(LEVEL_CONFIG.BONUSES, "criticalDamagePerLegacyLevel"), false);
assert.equal(has(LEVEL_CONFIG.BONUSES, "resourceLuckPerLegacyLevel"), false);
assert.equal(has(LEVEL_CONFIG.CHOICE_REWARDS, "resourceLuck"), false);

const levels = new PlayerLevelSystem();
assert.equal(levels.fromJSON({
  progressionVersion: LEVEL_CONFIG.PROGRESSION_VERSION,
  level: 2,
  currentXP: 0,
  totalXP: 0,
  automaticMilestoneRewards: 0,
  choiceSelections: { miningPower: 1, resourceLuck: 999 },
}), true);
assert.deepEqual(levels.choiceSelections, { miningPower: 1 });
const levelSummary = levels.getBonusesSummary();
assert.equal(has(levelSummary, "criticalHitChance"), false);
assert.equal(has(levelSummary, "criticalHitDamage"), false);
assert.equal(has(levelSummary, "resourceLuck"), false);

assert.equal(CAMPFIRE_BLESSINGS.some(entry => entry.type === "focus"), false);
assert.equal(CAMPFIRE_TIERS.some(entry => has(entry, "critBonus")), false);
assert.equal(has(SPECIAL_BLOCKS_CONFIG.spawnRates, "critBlock"), false);
assert.equal(has(SPECIAL_BLOCKS_CONFIG.effects, "critBlock"), false);
assert.equal(TILE_TYPES.CRIT_BLOCK, undefined);
assert.equal(TILE_TYPES.RETIRED_RANDOM_BONUS_BLOCK, 20);
assert.equal(has(ASSET_KEYS.tiles, "critBlock"), false);
assert.equal(has(ASSET_KEYS.tiles.dynamicSoil, "rarity"), false);
assert.equal(has(UI_ICON_FRAMES, "critical"), false);
assert.equal(has(UI_ICON_FRAMES, "luck"), false);
assert.equal(
  INVENTORY_SPECIAL_BLOCKS.entries.some(entry => entry.renderKey === "CRIT_BLOCK"),
  false,
);
assert.doesNotMatch(
  JSON.stringify(LOADING_MESSAGES),
  /critical hit|crit block|resource luck|lucky/i,
);

assert.equal(dynamicSoil.SOIL_RARITY_COUNT, 1);
for (const retiredExport of [
  "RESOURCE_RARITIES",
  "RESOURCE_RARITY_DEPTH_CURVE",
  "getResourceRarityIndex",
  "getResourceRarityDescriptor",
  "getResourceHpMultiplier",
  "getResourceYieldMultiplier",
]) {
  assert.equal(has(dynamicSoil, retiredExport), false, `${retiredExport} must be retired`);
}
for (let ty = 1; ty <= 1800; ty += 137) {
  const descriptor = dynamicSoil.getSoilVisualDescriptor(
    TILE_TYPES.DIRT,
    17,
    ty,
    ty,
    133742,
    true,
  );
  if (descriptor) assert.equal(descriptor.rarity, 0);
}

const milestoneBonuses = computeMilestoneBonuses([300, 700, 1100, 1400, 1700]);
assert.equal(has(milestoneBonuses, "critChancePct"), false);
assert.equal(milestoneBonuses.gpMaxBonus, 12);
const boundedMilestones = resolveDepthMilestoneEconomyBonuses(milestoneBonuses);
assert.equal(has(boundedMilestones, "critChance"), false);

const digSource = await readFile(new URL("../systems/mining/DigSystem.js", import.meta.url), "utf8");
assert.doesNotMatch(digSource, /critical|lucky|rarityMultiplier|rarityId/i);

const world = new WorldModel(Object.freeze({
  ...GAME_CONFIG,
  skyTileProbability: 0,
}));
let caveWallCount = 0;
let retiredBlockCount = 0;
for (const tileType of world.tileType) {
  if (tileType === TILE_TYPES.CAVE_WALL) caveWallCount += 1;
  if (tileType === TILE_TYPES.RETIRED_RANDOM_BONUS_BLOCK) retiredBlockCount += 1;
}
assert.equal(caveWallCount, 0, "normal-world generation must contain no unbreakable cave-wall leftovers");
assert.equal(retiredBlockCount, 0, "authored critical-block ids must normalize to ordinary terrain");
assert.equal(
  STAR_RARITY_PROGRESSION_CONFIG.rarityTiers.every(tier => tier.multiplier > 1),
  true,
  "multipliers remain exclusively on Stars",
);

console.log("retired random mining mechanics contract passed");
