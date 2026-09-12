import assert from "node:assert/strict";
import { getTileHealth, TILE_HEALTH_CONFIG } from "../values/tileHealth.js";
import { TILE_TYPES } from "../values/tileTypes.js";

const scaling = TILE_HEALTH_CONFIG.earlyDepthScaling;
const materials = [
  TILE_TYPES.DIRT,
  TILE_TYPES.STONE,
  TILE_TYPES.COPPER,
  TILE_TYPES.STEEL,
  TILE_TYPES.IRON,
  TILE_TYPES.BRONZE,
  TILE_TYPES.SILVER,
  TILE_TYPES.GOLD,
  TILE_TYPES.LAVA_DIRT,
  TILE_TYPES.OBSIDIAN,
  TILE_TYPES.EMBER_ORE,
  TILE_TYPES.MAGMA_CRYSTAL,
];

assert.equal(scaling.thresholdMeters, 300);
assert.equal(scaling.exponent, 2);
assert.ok(scaling.maximumMultiplier > 1);

for (const type of materials) {
  const surface = getTileHealth(type, 0);
  const at100 = getTileHealth(type, 100);
  const at200 = getTileHealth(type, 200);
  const at300 = getTileHealth(type, 300);
  const at301 = getTileHealth(type, 301);
  assert.ok(at100 > surface, `type ${type}: 100m must be tougher than surface`);
  assert.ok(at200 > at100, `type ${type}: 200m must be tougher than 100m`);
  assert.ok(at300 > at200, `type ${type}: 300m must be tougher than 200m`);
  assert.ok(at301 >= at300, `type ${type}: no durability cliff after 300m`);
  assert.ok(at300 >= Math.floor(surface * scaling.maximumMultiplier * 0.85),
    `type ${type}: 300m must receive the early-depth buff`);
}

console.log("EARLY_DEPTH_HEALTH_OK", {
  dirt: [
    getTileHealth(TILE_TYPES.DIRT, 0),
    getTileHealth(TILE_TYPES.DIRT, 100),
    getTileHealth(TILE_TYPES.DIRT, 200),
    getTileHealth(TILE_TYPES.DIRT, 300),
  ],
});
