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
import {
  HEAVENBLOCKS_RESOURCE_KEYS,
  MONEY_MONSTER_RESOURCE_KEYS,
  SECOND_WORLD_RESOURCE_KEYS,
} from "../values/resourceTypes.js";
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
assert.deepEqual(
  Object.keys(UPGRADES[ARC_CORE_UPGRADE_ID].resources).sort(),
  [
    "cinderstone", "cloudstone", "gold", "halostone",
    "hellglass", "lumenite", "silver", "stormglass",
  ],
);
assert.equal(UPGRADES[ARC_CORE_UPGRADE_ID].requires, "worldTwoTunnelAccess");
assert.equal(UPGRADES[OMEGA_ARC_CORE_UPGRADE_ID].merchant, LEVEL_TWO_MERCHANT_ID);
assert.deepEqual(
  Object.keys(UPGRADES[OMEGA_ARC_CORE_UPGRADE_ID].resources).sort(),
  [
    "cinderstone", "cloudstone", "emberOre", "gold", "halostone",
    "hellglass", "lumenite", "magmaCrystal", "obsidian", "silver", "stormglass",
  ],
);
assert.equal(UPGRADES[OMEGA_ARC_CORE_UPGRADE_ID].requires, ARC_CORE_UPGRADE_ID);
assert.deepEqual(UPGRADES[ARC_CORE_UPGRADE_ID].resources, ARC_CORE_PURCHASE_COST);
assert.deepEqual(UPGRADES[OMEGA_ARC_CORE_UPGRADE_ID].resources, OMEGA_ARC_CORE_PURCHASE_COST);

const getMaterialValue = cost => Object.entries(cost).reduce(
  (total, [resourceType, amount]) => (
    total + amount * RESOURCE_PRICES_CONFIG.basePrices[resourceType]
  ),
  0,
);
const baseMaterialValue = getMaterialValue(ARC_CORE_PURCHASE_COST);
const omegaMaterialValue = getMaterialValue(OMEGA_ARC_CORE_PURCHASE_COST);
assert.equal(baseMaterialValue, 417800);
assert.equal(omegaMaterialValue, 1344000);
assert.ok(omegaMaterialValue > baseMaterialValue * 3);

for (const resource of [...SECOND_WORLD_RESOURCE_KEYS, ...HEAVENBLOCKS_RESOURCE_KEYS]) {
  assert.equal(MONEY_MONSTER_RESOURCE_KEYS.includes(resource), false, `${resource} leaked into Level One seller`);
  assert.ok(RESOURCE_PRICES_CONFIG.basePrices[resource] >= 120, `${resource} should be high value`);
}

console.log("level-two-arc-core-contract: ok");
