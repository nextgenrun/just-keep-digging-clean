import assert from "node:assert/strict";
import {
  ARC_CORE_CONFIG,
  ARC_CORE_PURCHASE_COST,
  ARC_CORE_UPGRADE_ID,
  LEVEL_TWO_MERCHANT_ID,
  OMEGA_ARC_CORE_PURCHASE_COST,
  OMEGA_ARC_CORE_UPGRADE_ID,
} from "../values/arcCoreConfig.js";
import { GAME_CONFIG } from "../values/gameConfig.js";
import { MONEY_MONSTER_RESOURCE_KEYS, SECOND_WORLD_RESOURCE_KEYS } from "../values/resourceTypes.js";
import { RESOURCE_PRICES_CONFIG } from "../values/resourcePrices.js";
import { SECOND_WORLD_CONFIG } from "../values/secondWorldConfig.js";
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
assert.deepEqual(Object.keys(UPGRADES[ARC_CORE_UPGRADE_ID].resources).sort(), ["gold", "silver"]);
assert.equal(UPGRADES[ARC_CORE_UPGRADE_ID].requires, "worldTwoTunnelAccess");
assert.equal(UPGRADES[OMEGA_ARC_CORE_UPGRADE_ID].merchant, LEVEL_TWO_MERCHANT_ID);
assert.deepEqual(Object.keys(UPGRADES[OMEGA_ARC_CORE_UPGRADE_ID].resources).sort(), ["gold", "silver"]);
assert.equal(UPGRADES[OMEGA_ARC_CORE_UPGRADE_ID].requires, ARC_CORE_UPGRADE_ID);
assert.deepEqual(UPGRADES[ARC_CORE_UPGRADE_ID].resources, ARC_CORE_PURCHASE_COST);
assert.deepEqual(UPGRADES[OMEGA_ARC_CORE_UPGRADE_ID].resources, OMEGA_ARC_CORE_PURCHASE_COST);

const baseMaterialValue = ARC_CORE_PURCHASE_COST.silver * RESOURCE_PRICES_CONFIG.basePrices.silver
  + ARC_CORE_PURCHASE_COST.gold * RESOURCE_PRICES_CONFIG.basePrices.gold;
const omegaMaterialValue = OMEGA_ARC_CORE_PURCHASE_COST.silver * RESOURCE_PRICES_CONFIG.basePrices.silver
  + OMEGA_ARC_CORE_PURCHASE_COST.gold * RESOURCE_PRICES_CONFIG.basePrices.gold;
assert.equal(baseMaterialValue, 60000);
assert.equal(omegaMaterialValue, 300000);
assert.equal(omegaMaterialValue, baseMaterialValue * 5);

for (const resource of SECOND_WORLD_RESOURCE_KEYS) {
  assert.equal(MONEY_MONSTER_RESOURCE_KEYS.includes(resource), false, `${resource} leaked into Level One seller`);
  assert.ok(RESOURCE_PRICES_CONFIG.basePrices[resource] >= 120, `${resource} should be high value`);
}

console.log("level-two-arc-core-contract: ok");
