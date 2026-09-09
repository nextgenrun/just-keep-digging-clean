import assert from "node:assert/strict";
import {
  CELESTIAL_TALENT_PROGRESSION_CONFIG as config,
  getEarnedCelestialTalentPoints,
  sanitizeCelestialTalentProgressionData,
} from "../values/celestialTalentProgression.js";
import {
  CELESTIAL_TALENT_RANK_BONUSES,
  CELESTIAL_TALENT_RANK_CONFIG,
  getCelestialTalentRankCost,
} from "../values/celestialTalentRanks.js";
import { resolveCelestialTalentEngineDefinition as definition } from "../values/celestialTalentEffects.js";
import { CelestialTalentProgressionSystem } from "../systems/progression/CelestialTalentProgressionSystem.js";
import { createPlayerLevelRewardSummary } from "../systems/progression/playerLevelRewardMath.js";
import { CelestialActivationBudget } from "../systems/celestial/CelestialActivationBudget.js";

const nodes = config.branches.flatMap(branch => branch.nodes);
assert.equal(config.saveVersion, 3);
assert.equal(nodes.length, 33);
assert.equal(CELESTIAL_TALENT_RANK_CONFIG.maxRank, 3);
assert.deepEqual([0, 1, 2, 3, 4, 35, 99, 999].map(getEarnedCelestialTalentPoints),
  [0, 0, 0, 1, 2, 33, 97, 97]);
for (const node of nodes) {
  assert.equal(node.requiredLevel, 3);
  assert.ok(CELESTIAL_TALENT_RANK_BONUSES[node.id], node.id);
}

let level = 2;
const events = [];
const progression = new CelestialTalentProgressionSystem({
  getPlayerLevel: () => level,
  onChanged: (_snapshot, event) => events.push(event),
});
const root = "wayward-star-root";
const first = "wayward-stellar-bearings";
assert.equal(progression.getSnapshot().talentPoints, 0);
assert.equal(progression.purchaseNode(root).reason, "talents-locked");
assert.equal(progression.grantStars(Infinity), 0);
assert.equal(progression.grantStars(500), 500);
assert.equal(progression.upgradeNode(root).reason, "node-not-owned");
level = 3;
assert.equal(progression.getSnapshot().talentPoints, 1);
assert.equal(progression.purchaseNode(root).ok, true);
assert.equal(progression.getSnapshot().talentPoints, 0);
assert.equal(progression.getSnapshot().stars, 500);
assert.equal(progression.getSaveData().spentStars, 0);
assert.equal(progression.purchaseNode(root).reason, "already-purchased");
assert.equal(progression.purchaseNode(first).reason, "insufficient-talent-points");
assert.equal(progression.purchaseNode("hollow-sun-root").reason, "root-choice-locked");
assert.equal(progression.upgradeNode(root).ok, true);
assert.equal(progression.getSnapshot().stars, 400);
assert.equal(progression.getSnapshot().nodeRanks[root], 2);
assert.equal(progression.getSnapshot().talentPoints, 0);
assert.equal(progression.upgradeNode(root).ok, true);
assert.equal(progression.getSnapshot().stars, 200);
assert.equal(progression.upgradeNode(root).reason, "max-rank");
assert.equal(progression.getSnapshot().stars, 200);
level = 4;
assert.equal(progression.getSnapshot().talentPoints, 1);
assert.equal(progression.purchaseNode("wayward-fracture-bloom").reason, "prerequisite-locked");
assert.equal(progression.purchaseNode(first).ok, true);
assert.equal(progression.getSnapshot().talentPoints, 0);
assert.equal(progression.getSnapshot().stars, 200);
assert.equal(progression.upgradeNode(first).ok, true);
assert.equal(progression.upgradeNode(first).ok, true);
assert.equal(progression.getSnapshot().stars, 50);
assert.ok(events.includes("node-purchased"));
assert.ok(events.includes("node-upgraded"));

const save = progression.getSaveData();
const restored = new CelestialTalentProgressionSystem({ getPlayerLevel: () => level });
restored.loadSaveData(save);
assert.deepEqual(restored.getSaveData(), save);
assert.equal(restored.getSnapshot().talentPoints, 0);
save.nodeRanks[root] = 1;
assert.equal(progression.getSnapshot().nodeRanks[root], 3, "save copies cannot mutate live ranks");

const legacy = sanitizeCelestialTalentProgressionData({
  version: 2, stars: 37, spentStars: 50, lifetimeStarsEarned: 87,
  purchasedNodeIds: [root, first, "unknown-node"],
});
assert.deepEqual(legacy.purchasedNodeIds, [root, first]);
assert.deepEqual(legacy.nodeRanks, { [root]: 1, [first]: 2 });
assert.equal(legacy.stars, 37);
assert.equal(legacy.spentStars, 50);
assert.equal(legacy.spentTalentPoints, 0);
assert.deepEqual(sanitizeCelestialTalentProgressionData(legacy), legacy);
restored.loadSaveData(legacy);
assert.equal(restored.getSnapshot().talentPoints, 2, "legacy ownership is grandfathered");
const dirty = sanitizeCelestialTalentProgressionData({
  version: 3, stars: NaN, spentTalentPoints: Infinity,
  purchasedNodeIds: [root, first],
  nodeRanks: { [root]: 999, [first]: NaN, "hollow-sun-root": 3, unknown: 3 },
});
assert.deepEqual(dirty.nodeRanks, { [root]: 3, [first]: 1 });
assert.equal(dirty.stars, 0);
assert.equal(dirty.spentTalentPoints, 0);

const full = new CelestialTalentProgressionSystem({ getPlayerLevel: () => 35 });
for (const node of nodes) assert.equal(full.purchaseNode(node.id).ok, true, node.id);
assert.equal(full.getSnapshot().talentPoints, 0);
assert.equal(full.getSnapshot().spentTalentPoints, 33);
assert.equal(full.getSnapshot().spentStars, 0);
assert.equal(full.getSnapshot().allBranchesCompleted, true);
assert.equal(full.getSnapshot().pillarProgressUnits, 10);
assert.equal(full.upgradeNode(root).reason, "insufficient-stars");
const totalStarCost = nodes.reduce((sum, node) =>
  sum + getCelestialTalentRankCost(node, 1) + getCelestialTalentRankCost(node, 2), 0);
assert.equal(totalStarCost, 11025);
full.grantStars(totalStarCost);
for (const node of nodes) {
  assert.equal(full.upgradeNode(node.id).ok, true, node.id);
  assert.equal(full.upgradeNode(node.id).ok, true, node.id);
  assert.equal(full.upgradeNode(node.id).reason, "max-rank", node.id);
}
assert.equal(full.getSnapshot().stars, 0);
assert.equal(full.getSnapshot().spentStars, totalStarCost);
assert.equal(full.getSnapshot().spentTalentPoints, 33);
assert.deepEqual(sanitizeCelestialTalentProgressionData(full.getSaveData()), full.getSaveData());

// Every paid rank still changes gameplay with every OTHER node fully upgraded.
const maxDefinitions = {};
for (const branch of config.branches) {
  const effects = branch.nodes.map(node => node.effectId);
  const ranks = Object.fromEntries(branch.nodes.map(node => [node.id, 3]));
  for (const node of branch.nodes) {
    for (const fromRank of [1, 2]) {
      const before = definition(branch.id, effects, { ...ranks, [node.id]: fromRank });
      const after = definition(branch.id, effects, { ...ranks, [node.id]: fromRank + 1 });
      assert.notDeepEqual(after, before, `${node.id} rank ${fromRank + 1} must matter`);
    }
  }
  maxDefinitions[branch.id] = definition(branch.id, effects, ranks);
  assert.deepEqual(definition(branch.id, [], ranks), definition(branch.id), "unowned ranks are ignored");
  assert.deepEqual(definition(branch.id, effects, { ...ranks, [branch.rootNodeId]: Infinity }),
    definition(branch.id, effects, { ...ranks, [branch.rootNodeId]: 1 }));
}
const wayward = maxDefinitions["wayward-star"];
const hollow = maxDefinitions["hollow-sun"];
const lance = maxDefinitions["comet-engine"];
assert.equal(wayward.simultaneousStars, 5);
assert.equal(hollow.simultaneousHoles, 4);
assert.equal(lance.projectileSideLanes, 1);
assert.equal(wayward.maxImpacts, 39);
assert.equal(wayward.supernovaMaxImpacts, 32);
assert.equal(wayward.maxBounces, 16);
assert.equal(wayward.supernovaRadiusTiles, 7);
assert.equal(hollow.maxImpacts, hollow.pulseImpactCaps.reduce((sum, cap) => sum + cap, 0));
assert.equal(hollow.maxImpacts, 110);
assert.equal(hollow.implosionMaxImpacts, 40);
assert.deepEqual(hollow.pulseRadiiTiles, [6, 7, 8, 9, 10, 10]);
assert.equal(lance.projectileDamageMultiplier, 1.94);
assert.equal(lance.projectileRangeTiles, 10);
assert.equal(lance.lifetimeMs, 15000);
assert.deepEqual(lance.projectileStates.map(state => state.damageMultiplier), [1, 1.1, 1.2]);
for (const def of [wayward, hollow]) {
  const budget = new CelestialActivationBudget(def.id, "rank-test", 0, def);
  for (let index = 0; index < def.maxImpacts; index++) assert.ok(budget.tryImpact(index, 0));
  assert.equal(budget.tryImpact(def.maxImpacts, 0), null);
}
for (const [startLevel, endLevel, points] of [[1, 2, 0], [2, 3, 1], [1, 5, 3], [9, 10, 1]]) {
  const reward = createPlayerLevelRewardSummary({
    startLevel, endLevel, automaticReward: {}, getGemPowerMaxBonus: () => 0,
  });
  assert.equal(reward.talentPointsGain, points);
}

console.log("Talent Points + Star-funded ranks passed: 33 unlocks, 66 paid ranks, 11,025 Stars; legacy saves preserved.");
