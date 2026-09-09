import assert from "node:assert/strict";

import { UpgradeSystem } from "../systems/progression/UpgradeSystem.js";
import { resolveUpgradeSaveState } from "../systems/progression/upgradeSaveState.js";
import { UPGRADES, UPGRADE_PROGRESSION_VERSION } from "../values/upgradeDefinitions.js";
import { getUpgradeCost, getUpgradeEffect } from "../values/upgradeFormulas.js";
import { UPGRADE_RANK_COSTS } from "../values/upgradeRankBalance.js";

assert.equal(UPGRADE_PROGRESSION_VERSION, 3);
assert.equal(Object.values(UPGRADE_RANK_COSTS).reduce((sum, costs) => sum + costs.length, 0), 121);
for (const [id, costs] of Object.entries(UPGRADE_RANK_COSTS)) {
  assert.equal(UPGRADES[id].maxLevel, costs.length, id);
  assert.equal(getUpgradeCost(id, 0), costs[0], id);
  assert.equal(getUpgradeCost(id, costs.length), Infinity, id);
  for (let level = 1; level <= costs.length; level++) {
    assert.ok(getUpgradeEffect(id, level) > getUpgradeEffect(id, level - 1), id);
  }
}
const legacySave = new UpgradeSystem();
legacySave.fromJSON({
  upgradeLevels: {
    agility: 99,
    heavyPunch: 10,
    quickReflexes: 20,
    gemPowerRegeneration: 30,
  },
});
assert.equal(legacySave.getUpgradeLevel("agility"), 20);
assert.equal(legacySave.getUpgradeLevel("heavyPunch"), 5);
assert.equal(legacySave.getUpgradeLevel("quickReflexes"), 6);
assert.equal(legacySave.getUpgradeLevel("gemPowerRegeneration"), 8);
assert.equal(legacySave.getUpgradeLevel("gemPowerUnlock"), 1);

const v2 = resolveUpgradeSaveState({
  upgradeProgressionVersion: 2,
  upgradeLevels: { gemPowerTank: 4, strength: 5, torchRange: 2 },
});
assert.equal(v2.upgradeLevels.gemPowerTank, 8);
assert.equal(v2.upgradeLevels.strength, 10);
assert.equal(v2.upgradeLevels.torchRange, 4);

const currentSave = new UpgradeSystem();
currentSave.setUpgradeLevels({ heavyPunch: 2, quickReflexes: 4 });
const serialized = currentSave.toJSON();
assert.equal(serialized.upgradeProgressionVersion, UPGRADE_PROGRESSION_VERSION);
const restored = new UpgradeSystem();
restored.fromJSON(serialized);
assert.equal(restored.getUpgradeLevel("heavyPunch"), 2);
assert.equal(restored.getUpgradeLevel("quickReflexes"), 4);

console.log("UPGRADE_RANK_EXPANSION_OK", {
  progressionVersion: UPGRADE_PROGRESSION_VERSION,
  currentGameRanks: 121,
  firstAgilityCost: getUpgradeCost("agility", 0),
});
