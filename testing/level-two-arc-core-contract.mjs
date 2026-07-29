import assert from "node:assert/strict";
import {
  ARC_CORE_CONFIG,
  ARC_CORE_UPGRADE_ID,
  LEVEL_TWO_MERCHANT_ID,
  OMEGA_ARC_CORE_UPGRADE_ID,
} from "../values/arcCoreConfig.js";
import { GAME_CONFIG } from "../values/gameConfig.js";
import {
  HEAVENBLOCKS_RESOURCE_KEYS,
  MONEY_MONSTER_RESOURCE_KEYS,
  SECOND_WORLD_RESOURCE_KEYS,
} from "../values/resourceTypes.js";
import { RESOURCE_PRICES_CONFIG } from "../values/resourcePrices.js";
import { SECOND_WORLD_CONFIG } from "../values/secondWorldConfig.js";
import { HEAVENBLOCKS_PROGRESSION_CONFIG } from "../values/heavenblocksProgressionConfig.js";
import { UPGRADES } from "../values/upgradeDefinitions.js";
import { WORLD_DEPTH_CONFIG } from "../values/worldDepthConfig.js";
import { resolveArcCoreDigFootprint } from "../systems/vehicles/arcCoreDigFootprint.js";

assert.equal(WORLD_DEPTH_CONFIG.levelTwoDepthMeters, 5000);
assert.equal(GAME_CONFIG.worldDepthTiles, WORLD_DEPTH_CONFIG.topAirRows + 5000);
assert.equal(SECOND_WORLD_CONFIG.runtimeArea.depthMeters, 5000);

for (const direction of ["LEFT", "RIGHT", "UP", "DOWN"]) {
  const footprint = resolveArcCoreDigFootprint({ tx: 20, ty: 30 }, direction);
  assert.equal(footprint.length, 4, `${direction} must resolve exactly four cells`);
  assert.equal(new Set(footprint.map(tile => `${tile.tx},${tile.ty}`)).size, 4);
  assert.deepEqual([...new Set(footprint.map(tile => tile.depthIndex))], [0, 1]);
  assert.deepEqual([...new Set(footprint.map(tile => tile.widthIndex))], [0, 1]);

  const omegaFootprint = resolveArcCoreDigFootprint(
    { tx: 20, ty: 30 },
    direction,
    ARC_CORE_CONFIG.omega.dig,
  );
  assert.equal(omegaFootprint.length, 64, `${direction} Omega dig must resolve exactly 64 cells`);
  assert.equal(new Set(omegaFootprint.map(tile => `${tile.tx},${tile.ty}`)).size, 64);
  assert.deepEqual([...new Set(omegaFootprint.map(tile => tile.depthIndex))], [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual([...new Set(omegaFootprint.map(tile => tile.widthIndex))], [0, 1, 2, 3, 4, 5, 6, 7]);
}

assert.equal(ARC_CORE_CONFIG.dig.depthTiles, 2);
assert.equal(ARC_CORE_CONFIG.dig.widthTiles, 2);
assert.equal(ARC_CORE_CONFIG.omega.dig.depthTiles, 8);
assert.equal(ARC_CORE_CONFIG.omega.dig.widthTiles, 8);
assert.equal(ARC_CORE_CONFIG.omega.displaySizeTiles, ARC_CORE_CONFIG.displaySizeTiles * 4);
assert.equal(UPGRADES[ARC_CORE_UPGRADE_ID].merchant, LEVEL_TWO_MERCHANT_ID);
assert.equal(UPGRADES[ARC_CORE_UPGRADE_ID].hiddenFromShop, true);
assert.equal(UPGRADES[ARC_CORE_UPGRADE_ID].craftOnly, true);
assert.equal(UPGRADES[ARC_CORE_UPGRADE_ID].resources, undefined);
assert.equal(UPGRADES[ARC_CORE_UPGRADE_ID].baseCost, 0);
assert.equal(UPGRADES[ARC_CORE_UPGRADE_ID].goldCost, 0);
assert.equal(UPGRADES[OMEGA_ARC_CORE_UPGRADE_ID].merchant, LEVEL_TWO_MERCHANT_ID);
assert.equal(UPGRADES[OMEGA_ARC_CORE_UPGRADE_ID].hiddenFromShop, true);
assert.equal(UPGRADES[OMEGA_ARC_CORE_UPGRADE_ID].craftOnly, true);
assert.equal(UPGRADES[OMEGA_ARC_CORE_UPGRADE_ID].resources, undefined);
assert.equal(UPGRADES[OMEGA_ARC_CORE_UPGRADE_ID].requires, ARC_CORE_UPGRADE_ID);

const smallRecipe = HEAVENBLOCKS_PROGRESSION_CONFIG.recipes.smallArcCore;
const omegaRecipe = HEAVENBLOCKS_PROGRESSION_CONFIG.recipes.omegaArcCore;
assert.equal(smallRecipe.upgradeId, ARC_CORE_UPGRADE_ID);
assert.deepEqual(smallRecipe.requiredHearts, ["cloud-reef", "halo-bastion"]);
assert.deepEqual(smallRecipe.componentRegionIds, ["cloud-reef", "halo-bastion"]);
assert.ok(Object.keys(smallRecipe.resources).includes("stormglass"));
assert.ok(Object.keys(smallRecipe.resources).includes("lumenite"));
assert.equal(omegaRecipe.upgradeId, OMEGA_ARC_CORE_UPGRADE_ID);
assert.equal(omegaRecipe.requiresRecipeId, "smallArcCore");
assert.deepEqual(omegaRecipe.requiredHearts, [
  "cloud-reef",
  "halo-bastion",
  "eclipse-scar",
]);
assert.ok(Object.keys(omegaRecipe.resources).includes("hellglass"));

for (const resource of SECOND_WORLD_RESOURCE_KEYS) {
  assert.equal(MONEY_MONSTER_RESOURCE_KEYS.includes(resource), false, `${resource} leaked into Level One seller`);
  assert.ok(RESOURCE_PRICES_CONFIG.basePrices[resource] >= 120, `${resource} should be high value`);
}
for (const resource of HEAVENBLOCKS_RESOURCE_KEYS) {
  assert.equal(MONEY_MONSTER_RESOURCE_KEYS.includes(resource), false);
  assert.ok(RESOURCE_PRICES_CONFIG.basePrices[resource] > 0);
}

console.log("level-two-arc-core-contract: craft-only Heavenblocks progression ok");
