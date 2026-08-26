import assert from "node:assert/strict";

import { resolveCelestialTalentEngineDefinition } from
  "../values/celestialTalentEffects.js";
import {
  CELESTIAL_STAR_RARITY_ORDER,
  CELESTIAL_TALENT_PROGRESSION_CONFIG,
  getCelestialStarPointYield,
} from "../values/celestialTalentProgression.js";
import { CONSTELLATION_BUFFS, getDefaultAbilityStats } from
  "../values/constellationBuffs.js";
import { DEPTH_MILESTONES, computeMilestoneBonuses } from
  "../values/depthMilestones.js";
import {
  getResourceRarityChanceMultiplier,
} from "../values/dynamicSoil.js";
import { LEVEL_CONFIG } from "../values/levelConfig.js";
import {
  getDepthEconomyYieldMultiplier,
} from "../values/resourceEconomy.js";
import { RETENTION_CONFIG } from "../values/retentionConfig.js";
import { STAR_RARITY_PROGRESSION_CONFIG } from
  "../values/starRarityProgression.js";
import { getStarRarityDistribution } from
  "../values/starRarityProgressionMath.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { UPGRADES } from "../values/upgradeDefinitions.js";
import { DigSystem } from "../systems/mining/DigSystem.js";
import { resolveDepthMilestoneEconomyBonuses } from
  "../systems/mining/depthEconomyBonuses.js";
import { resolveDepthAdjustedResourceYield } from
  "../systems/mining/resourceDepthYield.js";

const talentConfig = CELESTIAL_TALENT_PROGRESSION_CONFIG;
const allTalentNodes = talentConfig.branches.flatMap(branch => branch.nodes);
assert.equal(talentConfig.branches.length, 3);
assert.equal(allTalentNodes.length, 33);
assert.equal(new Set(allTalentNodes.map(node => node.id)).size, 33);

function cheapestPathCost(branch, nodeId) {
  const nodes = Object.fromEntries(branch.nodes.map(node => [node.id, node]));
  const visit = (id, trail = new Set()) => {
    assert.equal(trail.has(id), false, `${branch.id} talent graph must be acyclic`);
    const node = nodes[id];
    assert.ok(node, `${branch.id} references missing talent ${id}`);
    if (node.prerequisiteIds.length === 0) return node.starsCost;
    const nextTrail = new Set(trail).add(id);
    const prerequisiteCosts = node.prerequisiteIds.map(
      prerequisiteId => visit(prerequisiteId, nextTrail),
    );
    return node.starsCost + (
      node.prerequisiteMode === "any"
        ? Math.min(...prerequisiteCosts)
        : prerequisiteCosts.reduce((sum, cost) => sum + cost, 0)
    );
  };
  return visit(nodeId);
}

for (const branch of talentConfig.branches) {
  assert.equal(branch.nodes.length, 11);
  assert.equal(branch.nodes.reduce((sum, node) => sum + node.starsCost, 0), 1125);
  assert.deepEqual(
    branch.completionNodeIds.map(nodeId => cheapestPathCost(branch, nodeId)),
    [375, 375, 375],
    `${branch.id} capstones must offer equal-cost build choices`,
  );
  const base = resolveCelestialTalentEngineDefinition(branch.id, []);
  for (const node of branch.nodes.filter(node => node.kind !== "ability")) {
    assert.notDeepEqual(
      resolveCelestialTalentEngineDefinition(branch.id, [node.effectId]),
      base,
      `${node.id} must alter its live Engine`,
    );
  }
}
assert.equal(allTalentNodes.reduce((sum, node) => sum + node.starsCost, 0), 3375);

const constellationIds = Object.keys(CONSTELLATION_BUFFS);
assert.equal(constellationIds.length, 10);
for (const id of constellationIds) {
  const defaults = getDefaultAbilityStats();
  const changed = { ...defaults };
  CONSTELLATION_BUFFS[id].apply(changed);
  assert.equal(
    Object.keys(changed).filter(key => changed[key] !== defaults[key]).length,
    1,
    `${id} constellation must own one explicit live modifier`,
  );
}

assert.equal(Object.keys(UPGRADES).length, 37);
assert.match(UPGRADES.luckyCollector.description, /double resources/i);
assert.equal(RETENTION_CONFIG.miningFeedback.luckyText, "LUCKY ×2");
assert.equal(LEVEL_CONFIG.HARDCAP, 99);

assert.equal(DEPTH_MILESTONES.length, 27);
assert.equal(DEPTH_MILESTONES.at(-1).depth, 4800);
const milestoneTotals = computeMilestoneBonuses(
  DEPTH_MILESTONES.map(milestone => milestone.depth),
);
assert.deepEqual(milestoneTotals, {
  gpMaxBonus: 166,
  miningSpeedPct: 32,
  critChancePct: 12,
  resourceYieldPct: 50,
});
const resolvedMilestones = resolveDepthMilestoneEconomyBonuses(milestoneTotals);
assert.equal(resolvedMilestones.resourceYieldMultiplier, 1.5);

assert.equal(getDepthEconomyYieldMultiplier(0, false), 1);
assert.equal(getDepthEconomyYieldMultiplier(1500, false), 8);
assert.equal(getDepthEconomyYieldMultiplier(0, true), 5);
assert.equal(getDepthEconomyYieldMultiplier(5000, true), 60);
assert.equal(getResourceRarityChanceMultiplier(0), 1);
assert.equal(getResourceRarityChanceMultiplier(2000), 3.5);
assert.equal(getResourceRarityChanceMultiplier(5000), 5);
assert.equal(resolveDepthAdjustedResourceYield({
  nativeYield: 1,
  depthTiles: 5000,
  secondWorld: true,
  milestoneYieldMultiplier: 1.5,
}), 90);

const starConfig = STAR_RARITY_PROGRESSION_CONFIG;
assert.equal(starConfig.spawn.currentRateReductionRatio, 0.65);
assert.equal(starConfig.spawn.reductionRatio, 0.93);
assert.ok(Math.abs(starConfig.spawn.probability - 0.00126) < 1e-12);
assert.deepEqual(
  CELESTIAL_STAR_RARITY_ORDER.map(getCelestialStarPointYield),
  [20, 50, 100, 250, 750, 2000],
);

function averageStarPointsAtDepth(depth) {
  return getStarRarityDistribution(depth).reduce(
    (sum, entry) => (
      sum + entry.probability * getCelestialStarPointYield(entry.tier.id)
    ),
    0,
  );
}

const surfaceAverageStarPoints = averageStarPointsAtDepth(0);
const deepAverageStarPoints = averageStarPointsAtDepth(2000);
assert.ok(deepAverageStarPoints > surfaceAverageStarPoints * 5);
let expectedTwoTileShaftPoints = 0;
for (let depth = 0; depth < 2000; depth += 1) {
  expectedTwoTileShaftPoints += averageStarPointsAtDepth(depth)
    * starConfig.spawn.probability
    * 2;
}
assert.ok(expectedTwoTileShaftPoints >= 375);
assert.ok(expectedTwoTileShaftPoints <= 450);

function luckyReward(lucky) {
  const world = { config: {} };
  const config = {
    topAirRows: 0,
    seed: 133742,
    levelTwoLeftTile: 132,
    resourceEconomyEnabled: true,
  };
  const dig = new DigSystem(world, null, config);
  dig.setDepthMilestoneBonusProvider(() => ({}));
  dig._rollLuckyDrop = () => lucky;
  return dig.processDestroyedTile(4, 0, TILE_TYPES.DIRT, 0).resourceAmount;
}

assert.equal(luckyReward(true), luckyReward(false) * 2);

console.log(JSON.stringify({
  talents: { branches: 3, nodes: 33, fullCost: 3375, cheapestCapstonePath: 375 },
  constellations: 10,
  upgrades: 37,
  milestones: { count: 27, maxDepth: 4800, materialYieldPct: 50 },
  stars: {
    currentRateReductionPct: 65,
    totalLegacyReductionPct: 93,
    probability: starConfig.spawn.probability,
    surfaceAveragePoints: Number(surfaceAverageStarPoints.toFixed(2)),
    deepAveragePoints: Number(deepAverageStarPoints.toFixed(2)),
    expectedTwoTileShaftPoints: Number(expectedTwoTileShaftPoints.toFixed(2)),
  },
  luckyCollector: "2x",
}, null, 2));
console.log("Talent and depth progression audit contract passed.");
