import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  CELESTIAL_STAR_RARITY_ORDER,
  CELESTIAL_TALENT_NODES_BY_ID,
  CELESTIAL_TALENT_PROGRESSION_CONFIG,
  getCelestialStarPointYield,
  sanitizeCelestialTalentProgressionData,
} from "../values/celestialTalentProgression.js";
import {
  CelestialTalentProgressionSystem,
} from "../systems/progression/CelestialTalentProgressionSystem.js";

const config = CELESTIAL_TALENT_PROGRESSION_CONFIG;
const branchIds = config.branches.map(branch => branch.id);
assert.deepEqual(branchIds, ["wayward-star", "hollow-sun", "comet-engine"]);
assert.equal(config.access.requiredPlayerLevel, 20);
assert.equal(config.access.initialFreeRootSelections, 1);
assert.equal(config.branches.length, 3);

for (const branch of config.branches) {
  assert.equal(branch.nodes.length, 5);
  assert.equal(branch.nodes[0].id, branch.rootNodeId);
  assert.equal(branch.nodes[0].kind, "ability");
  assert.equal(branch.nodes[0].tier, 0);
  assert.equal(branch.nodes[0].starsCost, 0);
  assert.equal(branch.nodes[0].requiredLevel, 20);
  branch.nodes.forEach((node, index) => {
    assert.equal(node.branchId, branch.id);
    assert.equal(node.tier, index);
    assert.equal(CELESTIAL_TALENT_NODES_BY_ID[node.id], node);
    if (index > 0) {
      assert.deepEqual(node.prerequisiteIds, [branch.nodes[index - 1].id]);
      assert.ok(node.starsCost > branch.nodes[index - 1].starsCost);
      assert.ok(node.requiredLevel > branch.nodes[index - 1].requiredLevel);
    }
  });
  assert.equal(branch.nodes.at(-1).kind, "capstone");
}

assert.deepEqual(
  CELESTIAL_STAR_RARITY_ORDER.map(getCelestialStarPointYield),
  [1, 2, 4, 8, 15, 30],
);
assert.equal(getCelestialStarPointYield(0), 1);
assert.equal(getCelestialStarPointYield(5), 30);
assert.equal(getCelestialStarPointYield("unknown"), 0);

let playerLevel = 19;
const persistedEvents = [];
const observedEvents = [];
const progression = new CelestialTalentProgressionSystem({
  getPlayerLevel: () => playerLevel,
  onChanged: (_snapshot, event, detail) => persistedEvents.push({ event, detail }),
});
const unsubscribe = progression.subscribe((_snapshot, event) => observedEvents.push(event));
assert.deepEqual(observedEvents, ["subscribed"]);

assert.equal(progression.getSnapshot().accessUnlocked, false);
assert.equal(progression.purchaseNode("missing-node").reason, "unknown-node");
assert.equal(progression.purchaseNode("wayward-star-root").reason, "talents-locked");

playerLevel = 20;
assert.equal(progression.getSnapshot().availableRootSelections, 1);
assert.equal(progression.purchaseNode("wayward-star-root").ok, true);
assert.equal(progression.getSnapshot().stars, 0);
assert.deepEqual(progression.getSnapshot().unlockedAbilityIds, ["wayward-star"]);
assert.equal(progression.purchaseNode("wayward-star-root").reason, "already-purchased");
assert.equal(progression.purchaseNode("hollow-sun-root").reason, "root-choice-locked");
assert.equal(progression.purchaseNode("wayward-ricochet-matrix").reason, "level-locked");

playerLevel = 36;
assert.equal(progression.purchaseNode("wayward-vector-command").reason, "prerequisite-locked");
assert.equal(progression.purchaseNode("wayward-ricochet-matrix").reason, "insufficient-stars");
assert.equal(progression.grantStarsFromRarity("astral", 13), 390);
assert.equal(progression.getSnapshot().stars, 390);

const wayward = config.branches[0];
for (const node of wayward.nodes.slice(1)) {
  const result = progression.purchaseNode(node.id);
  assert.equal(result.ok, true, node.id);
}
let snapshot = progression.getSnapshot();
assert.equal(snapshot.stars, 15);
assert.deepEqual(snapshot.completedBranchIds, ["wayward-star"]);
assert.equal(snapshot.availableRootSelections, 1);
assert.equal(snapshot.rootSelectionCapacity, 2);
assert.equal(progression.purchaseNode("hollow-sun-root").ok, true);
assert.equal(progression.purchaseNode("comet-engine-root").reason, "root-choice-locked");

assert.equal(progression.grantStars(735, { source: "contract" }), 735);
const hollow = config.branches[1];
for (const node of hollow.nodes.slice(1)) {
  assert.equal(progression.purchaseNode(node.id).ok, true, node.id);
}
snapshot = progression.getSnapshot();
assert.deepEqual(snapshot.completedBranchIds, ["wayward-star", "hollow-sun"]);
assert.equal(snapshot.availableRootSelections, 1);
assert.equal(progression.purchaseNode("comet-engine-root").ok, true);
assert.deepEqual(
  progression.getSnapshot().unlockedAbilityIds,
  ["wayward-star", "hollow-sun", "comet-engine"],
);

const comet = config.branches[2];
for (const node of comet.nodes.slice(1)) {
  assert.equal(progression.purchaseNode(node.id).ok, true, node.id);
}
snapshot = progression.getSnapshot();
assert.equal(snapshot.allBranchesCompleted, true);
assert.equal(snapshot.availableRootSelections, 0);
assert.equal(snapshot.unlockedEffectIds.length, 15);
assert.equal(snapshot.spentStars, 1125);
assert.equal(snapshot.lifetimeStarsEarned, 1125);
assert.equal(snapshot.stars, 0);
assert.equal("gp" in snapshot, false);
assert.equal("gemPower" in snapshot, false);
assert.equal("miningDamage" in snapshot, false);

const saveData = progression.getSaveData();
assert.equal(saveData.version, config.saveVersion);
assert.equal(saveData.purchasedNodeIds.length, 15);
const roundTrip = new CelestialTalentProgressionSystem({ getPlayerLevel: () => 36 });
roundTrip.loadSaveData(saveData);
assert.deepEqual(roundTrip.getSaveData(), saveData);
assert.deepEqual(roundTrip.getSnapshot().unlockedAbilityIds, snapshot.unlockedAbilityIds);

const migrated = sanitizeCelestialTalentProgressionData({
  version: 0,
  starPoints: 82.9,
  totalStarsEarned: 100,
  unlockedEngines: ["hollow-sun", "invalid-engine", "wayward-star"],
  unlockedNodes: [
    "hollow-gravity-well",
    "wayward-supernova-core",
    "missing-node",
  ],
});
assert.equal(migrated.stars, 82);
assert.deepEqual(
  migrated.purchasedNodeIds,
  ["wayward-star-root", "hollow-sun-root", "hollow-gravity-well"],
);
assert.equal(migrated.spentStars, 50);
assert.equal(migrated.lifetimeStarsEarned, 132);

const sanitized = sanitizeCelestialTalentProgressionData({
  celestialTalents: {
    stars: -100,
    lifetimeStarsEarned: -20,
    purchasedNodeIds: [
      "comet-impact-wake",
      "comet-engine-root",
      "comet-bore-drive",
      "comet-bore-drive",
      "unknown-node",
    ],
  },
});
assert.equal(sanitized.stars, 0);
assert.deepEqual(
  sanitized.purchasedNodeIds,
  ["comet-engine-root", "comet-bore-drive"],
);
assert.equal(sanitized.spentStars, 50);
assert.equal(sanitized.lifetimeStarsEarned, 50);

unsubscribe();
const observedBefore = observedEvents.length;
progression.grantStars(1);
assert.equal(observedEvents.length, observedBefore);
assert.ok(persistedEvents.some(entry => entry.event === "stars-granted"));
assert.ok(persistedEvents.some(
  entry => entry.event === "node-purchased" && entry.detail.branchCompleted,
));

const systemSource = await readFile(
  new URL("../systems/progression/CelestialTalentProgressionSystem.js", import.meta.url),
  "utf8",
);
assert.doesNotMatch(systemSource, /UpgradeSystem|PlayerAbilities|CelestialEngineController/);
assert.doesNotMatch(systemSource, /setGemPower|setMiningDamage|applyCelestialDamage/);

progression.destroy();
roundTrip.destroy();
console.log("Celestial talent progression contract passed.");
