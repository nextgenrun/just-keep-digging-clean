import assert from "node:assert/strict";
import { UPGRADES, UPGRADE_PROGRESSION_VERSION } from "../values/upgradeDefinitions.js";
import { UPGRADE_RANK_COSTS, COMPRESSED_V2_UPGRADE_EFFECTS } from "../values/upgradeRankBalance.js";
import { SHOP_UPGRADE_PROGRESSION } from "../values/upgradeUnlockProgression.js";
import { getUpgradeCost, getUpgradeEffect, getLegacyUpgradeEffect, getCompressedV2UpgradeEffect } from "../values/upgradeFormulas.js";
import { resolveUpgradeSaveState } from "../systems/progression/upgradeSaveState.js";
import { UpgradeSystem } from "../systems/progression/UpgradeSystem.js";
import { AncientRelicSystem } from "../systems/progression/AncientRelicSystem.js";
import { SystemIntroductionSystem } from "../systems/onboarding/SystemIntroductionSystem.js";
import { DEPTH_GATE_CONFIG } from "../values/depthGateConfig.js";
import { TOWN_TUTORIAL_CHOICES, TOWN_TUTORIAL_STAGES } from "../values/retentionConfig.js";

assert.equal(UPGRADE_PROGRESSION_VERSION, 3);
assert.equal(Object.values(UPGRADE_RANK_COSTS).reduce((sum, costs) => sum + costs.length, 0), 121);
assert.equal(getUpgradeCost("agility", 0), 18, "opening tutorial purchase stays affordable");
for (const [id, costs] of Object.entries(UPGRADE_RANK_COSTS)) {
  const upgrade = UPGRADES[id];
  assert.equal(upgrade.maxLevel, costs.length, id);
  assert.equal(upgrade.requiresLevel, undefined, id);
  for (let rank = 0; rank < upgrade.maxLevel; rank++) {
    assert.equal(getUpgradeCost(id, rank), costs[rank], id);
    assert.ok(Number.isFinite(costs[rank]) && costs[rank] > 0, id);
    if (rank) assert.ok(costs[rank] > costs[rank - 1], id);
    assert.ok(getUpgradeEffect(id, rank + 1) > getUpgradeEffect(id, rank), `${id} rank ${rank + 1} must matter`);
  }
  assert.equal(getUpgradeCost(id, upgrade.maxLevel), Infinity, id);
  assert.equal(getUpgradeEffect(id, upgrade.maxLevel), upgrade.maxEffect || upgrade.maxValue, id);
  for (let rank = 1; rank <= upgrade.legacyMaxLevel; rank++) {
    const migrated = resolveUpgradeSaveState({ upgradeLevels: { [id]: rank } }).upgradeLevels[id];
    assert.ok(getUpgradeEffect(id, migrated) + 1e-9 >= getLegacyUpgradeEffect(id, rank), `legacy ${id} ${rank}`);
  }
  const oldMax = COMPRESSED_V2_UPGRADE_EFFECTS[id]?.maxLevel || upgrade.maxLevel;
  for (let rank = 1; rank <= oldMax; rank++) {
    const loaded = resolveUpgradeSaveState({ upgradeProgressionVersion: 2, upgradeLevels: { [id]: rank } });
    assert.equal(loaded.legacy, false, "version 2 must not use the old 99-level migration");
    assert.ok(getUpgradeEffect(id, loaded.upgradeLevels[id]) + 1e-9 >= getCompressedV2UpgradeEffect(id, rank), `v2 ${id} ${rank}`);
    const roundTrip = resolveUpgradeSaveState({ upgradeProgressionVersion: 3, upgradeLevels: loaded.upgradeLevels });
    assert.deepEqual(roundTrip.upgradeLevels, loaded.upgradeLevels);
  }
}
assert.equal(getUpgradeEffect("gemPowerRegeneration", 11), 41.25);
assert.equal(getUpgradeEffect("gemPowerRegeneration", 12), 45);
assert.equal(UPGRADES.boboCaveEyes.hardcorePanicReductionPerLevel * 5, 0.30);
const migratedTanks = resolveUpgradeSaveState({
  upgradeProgressionVersion: 2,
  upgradeLevels: { gemPowerTank: 4, gemPowerEfficiency: 3, gemPowerRegeneration: 6, gemFlySpeed: 3 },
}).upgradeLevels;
assert.deepEqual([migratedTanks.gemPowerTank, migratedTanks.gemPowerEfficiency,
  migratedTanks.gemPowerRegeneration, migratedTanks.gemFlySpeed], [8, 6, 12, 6]);

const stats = { bestDepth: 0, expeditionsCompleted: 1, relicsFound: 0 };
const relics = new AncientRelicSystem();
const upgrades = new UpgradeSystem(null, { level: 1 });
upgrades.setMoney(1e9);
const scene = { upgradeSystem: upgrades, ancientRelicSystem: relics, playerLevelSystem: { level: 1 } };
const pacing = new SystemIntroductionSystem(scene, {
  getJournalSnapshot: () => ({ stats }),
  getTutorialState: () => ({
    choice: TOWN_TUTORIAL_CHOICES.YES, stage: TOWN_TUTORIAL_STAGES.COMPLETE, flightTrainingGranted: true,
  }),
}, { demoShowcase: false });

for (const [id, entry] of Object.entries(SHOP_UPGRADE_PROGRESSION)) {
  const depth = entry.first.depth;
  if (!depth) continue;
  stats.bestDepth = depth - 1;
  assert.equal(pacing.getUpgradeAvailability(id).available, false, `${id} before ${depth}m`);
  stats.bestDepth = depth;
  assert.equal(pacing.getUpgradeAvailability(id).available, true, `${id} at ${depth}m`);
  assert.equal(UPGRADES[id].requiresLevel, undefined, id);
}
stats.bestDepth = 0;
for (let rank = 0; rank < 8; rank++) assert.equal(upgrades.purchaseUpgrade("agility").success, true);
const wallet = upgrades.getMoney();
assert.equal(upgrades.purchaseUpgrade("agility").reason, "progression_locked");
assert.equal(upgrades.getMoney(), wallet, "a depth lock never charges money");
assert.match(pacing.getUpgradeAvailability("agility").detail, /250m.*rank 9/);
stats.bestDepth = 249;
assert.equal(upgrades.canPurchaseUpgrade("agility").canPurchase, false);
stats.bestDepth = 250;
assert.equal(upgrades.canPurchaseUpgrade("agility").canPurchase, true);
scene.playerLevelSystem.level = 99;
assert.equal(upgrades.canPurchaseUpgrade("agility").canPurchase, true, "level is not another shop lock");
stats.bestDepth = 0;
assert.equal(upgrades.getUpgradeLevel("agility"), 8, "returning to town never removes earned ranks");

for (const [id, needed] of [["thunderStrikeAbility", 1], ["heavyPunch", 2], ["seismicSuppression", 4]]) {
  relics.loadSaveData({ count: needed - 1 });
  assert.equal(upgrades.canPurchaseUpgrade(id).canPurchase, false, id);
  assert.match(pacing.getUpgradeAvailability(id).detail, /You keep your relics/);
  relics.add(1);
  assert.equal(upgrades.purchaseUpgrade(id).success, true, id);
  assert.equal(relics.getCount(), needed, "relics unlock purchases but are never spent");
  assert.equal(UPGRADES[id].requiresLevel, undefined);
  assert.equal(UPGRADES[id].requiresDepthGateAccepted, undefined);
}
const gateDepths = new Set(Object.values(SHOP_UPGRADE_PROGRESSION)
  .flatMap(entry => entry.bands.map(band => band.depth)).filter(depth => depth > 0));
assert.ok(gateDepths.size >= 15, "later ranks are staggered, not one universal depth wall");
assert.deepEqual(DEPTH_GATE_CONFIG.gates.map(gate => gate.threshold), [100, 300, 1000]);
assert.deepEqual(DEPTH_GATE_CONFIG.gates.map(gate => gate.confirmationWord), ["100M", "300M", "RISK"]);
assert.equal(UPGRADES.deepResourcePrices.maxLevel, 3, "dormant Level Two tuning is untouched");
assert.equal(UPGRADES.deepResourcePrices.requires, "worldTwoTunnelAccess");
for (const id of ["arcCore", "omegaArcCore", "worldTwoTunnelAccess", "deepResourcePrices"]) {
  assert.equal(SHOP_UPGRADE_PROGRESSION[id], undefined, `${id} is outside this game's rebalance`);
}
pacing.destroy();
console.log("Shop rebalance passed: 121 current-game ranks, staggered depth batches, 1/2/4 relic unlocks, v1/v2/v3 saves.");
