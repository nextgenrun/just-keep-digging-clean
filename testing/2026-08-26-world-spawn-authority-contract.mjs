import assert from "node:assert/strict";

import { GAME_CONFIG } from "../values/gameConfig.js";
import { RESOURCE_TILE_TYPE_VALUES } from "../values/resourceTypes.js";
import { STAR_RARITY_PROGRESSION_CONFIG } from "../values/starRarityProgression.js";
import { TILED_WORLD_OVERRIDE } from "../values/tiledWorldOverrideData.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { WORLD_GEN_CONFIG } from "../values/worldGen.js";
import { WorldModel } from "../world/model/WorldModel.js";

const RESOURCE_TYPES = new Set(RESOURCE_TILE_TYPE_VALUES);
for (const retiredRatio of ["dirtRatio", "stoneRatio", "copperRatio"]) {
  assert.equal(retiredRatio in GAME_CONFIG, false);
  assert.equal(retiredRatio in WORLD_GEN_CONFIG, false);
}

function buildWorld({
  starProbability = 0,
  resourceEconomyEnabled = true,
} = {}) {
  return new WorldModel(Object.freeze({
    ...GAME_CONFIG,
    skyTileProbability: starProbability,
    resourceEconomyEnabled,
  }));
}

function countStars(world, maxTileY = world.depthTiles) {
  let count = 0;
  for (let ty = 0; ty < Math.min(maxTileY, world.depthTiles); ty += 1) {
    for (let tx = 0; tx < world.widthTiles; tx += 1) {
      if (world.getTileType(tx, ty) === TILE_TYPES.SKY_TILE) count += 1;
    }
  }
  return count;
}

function sampleLevelOneBand(world, minDepth, maxDepth) {
  const counts = {
    total: 0,
    dirt: 0,
    bronze: 0,
    silver: 0,
    gold: 0,
  };
  for (let depth = minDepth; depth <= maxDepth; depth += 1) {
    const ty = world.topAirRows + depth;
    for (let tx = 0; tx < world.widthTiles; tx += 1) {
      const type = world.getTileType(tx, ty);
      if (!RESOURCE_TYPES.has(type)) continue;
      counts.total += 1;
      if (type === TILE_TYPES.DIRT) counts.dirt += 1;
      if (type === TILE_TYPES.BRONZE) counts.bronze += 1;
      if (type === TILE_TYPES.SILVER) counts.silver += 1;
      if (type === TILE_TYPES.GOLD) counts.gold += 1;
    }
  }
  return counts;
}

const originalLog = console.log;
const originalInfo = console.info;
let noStars;
let currentRate;
let previousRate;
let legacyResources;
try {
  console.log = () => {};
  console.info = () => {};
  noStars = buildWorld();
  currentRate = buildWorld({
    starProbability: STAR_RARITY_PROGRESSION_CONFIG.spawn.probability,
  });
  previousRate = buildWorld({
    starProbability: STAR_RARITY_PROGRESSION_CONFIG.spawn.previousProbability,
  });
  legacyResources = buildWorld({ resourceEconomyEnabled: false });
} finally {
  console.log = originalLog;
  console.info = originalInfo;
}

// Authored SKY_TILE paint is now a spawn candidate, never a guaranteed Star.
assert.equal(countStars(noStars), 0);

const currentStars = countStars(currentRate);
const previousStars = countStars(previousRate);
const realizedRateRatio = currentStars / previousStars;
assert.ok(currentStars > 0);
assert.ok(currentStars < previousStars);
assert.ok(realizedRateRatio > 0.32 && realizedRateRatio < 0.38);

const fixedAuthoredStars = TILED_WORLD_OVERRIDE.stats[`tileType:${TILE_TYPES.SKY_TILE}`];
const upperWorldStars = countStars(currentRate, TILED_WORLD_OVERRIDE.height);
assert.equal(fixedAuthoredStars, 3525);
assert.ok(upperWorldStars < fixedAuthoredStars * 0.25);

for (let ty = 0; ty < currentRate.depthTiles; ty += 1) {
  for (let tx = 0; tx < currentRate.widthTiles; tx += 1) {
    if (currentRate.getTileType(tx, ty) !== TILE_TYPES.SKY_TILE) continue;
    assert.ok(RESOURCE_TYPES.has(currentRate.getSkyTileOriginalType(tx, ty)));
  }
}

// The same authored solids now reflect the modern depth curve, while geometry
// stays intact when the legacy resource mode is selected.
const modernDeep = sampleLevelOneBand(noStars, 1500, 1850);
const legacyDeep = sampleLevelOneBand(legacyResources, 1500, 1850);
assert.equal(modernDeep.total, legacyDeep.total);
assert.ok(modernDeep.gold > legacyDeep.gold * 1.25);
assert.ok(modernDeep.silver > legacyDeep.silver * 1.25);
assert.ok(modernDeep.bronze > legacyDeep.bronze * 1.2);
assert.ok(modernDeep.gold / modernDeep.total > 0.006);
assert.ok(modernDeep.silver / modernDeep.total > 0.012);
assert.ok(modernDeep.bronze / modernDeep.total > 0.045);

console.log(JSON.stringify({
  stars: {
    disabled: 0,
    upperWorld: upperWorldStars,
    completeWorld: currentStars,
    previousRate: previousStars,
    realizedRateRatio,
  },
  deepAuthoredResources: {
    modern: modernDeep,
    legacy: legacyDeep,
  },
}, null, 2));
console.log("World spawn authority contract passed.");
