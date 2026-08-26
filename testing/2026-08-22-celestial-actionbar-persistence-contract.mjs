import assert from "node:assert/strict";
import { CelestialTalentProgressionSystem } from
  "../systems/progression/CelestialTalentProgressionSystem.js";
import { getCelestialActionBarAbilityState } from
  "../world/playScene/CelestialActionBarRuntime.js";
import { CELESTIAL_TALENT_PROGRESSION_CONFIG } from
  "../values/celestialTalentProgression.js";

const firstBranch = CELESTIAL_TALENT_PROGRESSION_CONFIG.branches[0];
const rootNode = firstBranch.nodes.find(node => node.id === firstBranch.rootNodeId);
assert.ok(rootNode?.abilityId, "the first talent root must own an action-bar ability");

const purchased = new CelestialTalentProgressionSystem({
  getPlayerLevel: () => 99,
});
purchased.grantStars(1000);
const purchase = purchased.purchaseNode(rootNode.id, 99);
assert.equal(purchase.ok, true, "the first root talent must purchase normally");
assert.ok(
  purchased.getSnapshot().unlockedAbilityIds.includes(rootNode.abilityId),
  "the purchased talent must immediately expose its ability",
);

const saveData = purchased.getSaveData();
const reloaded = new CelestialTalentProgressionSystem({
  getPlayerLevel: () => 99,
});
reloaded.loadSaveData(JSON.parse(JSON.stringify(saveData)));
const reloadedSnapshot = reloaded.getSnapshot();
assert.ok(
  reloadedSnapshot.unlockedAbilityIds.includes(rootNode.abilityId),
  "the talent ability must remain unlocked after save/reload",
);

const scene = {
  celestialTalentProgressionSystem: reloaded,
  celestialEngineController: {
    isEngineActive: () => false,
    isActivationAvailable: () => true,
  },
  upgradeSystem: { godModeActive: false },
  starHeartProgressionSystem: { getSnapshot: () => ({ godMode: false }) },
};
const actionBarState = getCelestialActionBarAbilityState(scene, rootNode.abilityId);
assert.equal(actionBarState.unlocked, true);
assert.equal(actionBarState.available, true);

console.log(
  "Celestial actionbar persistence contract passed: first talent unlock survives save/reload and stays usable.",
);
