import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { RetentionProgressSystem } from
  "../systems/progression/RetentionProgressSystem.js";
import { UpgradeSystem } from "../systems/progression/UpgradeSystem.js";
import {
  LEGACY_FIRST_FIVE_STARTER_UPGRADE_ID,
  UPGRADES,
} from "../values/upgradeDefinitions.js";
import {
  RETENTION_CONFIG,
  TOWN_TUTORIAL_CHOICES,
  TOWN_TUTORIAL_STAGES,
} from "../values/retentionConfig.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = relativePath => readFileSync(path.join(root, relativePath), "utf8");

assert.equal("UPGRADE" in TOWN_TUTORIAL_STAGES, true);
assert.equal("upgradeFunding" in RETENTION_CONFIG.tutorial, false);
assert.deepEqual(RETENTION_CONFIG.tutorial.activeStages, [
  TOWN_TUTORIAL_STAGES.MOVE,
  TOWN_TUTORIAL_STAGES.DIG,
  TOWN_TUTORIAL_STAGES.FLIGHT,
  TOWN_TUTORIAL_STAGES.PORTAL,
  TOWN_TUTORIAL_STAGES.SELL,
  TOWN_TUTORIAL_STAGES.UPGRADE,
  TOWN_TUTORIAL_STAGES.RESUME,
]);

const legacyDefinition = UPGRADES[LEGACY_FIRST_FIVE_STARTER_UPGRADE_ID];
assert.equal(legacyDefinition.hiddenFromShop, true);
assert.equal(legacyDefinition.firstFiveOnly, true);
const legacySave = new UpgradeSystem(null, null, { firstFiveEnabled: true });
legacySave.setUpgradeLevels({ [LEGACY_FIRST_FIVE_STARTER_UPGRADE_ID]: 1 });
assert.equal(
  legacySave.getUpgradeEffects().digDamageAdditive,
  legacyDefinition.baseEffect,
  "old Miner's Grip saves retain their earned effect without returning to the shop",
);

const optionalUpgrade = new UpgradeSystem(null, null, { firstFiveEnabled: true });
optionalUpgrade.addMoney(UPGRADES.agility.baseCost);
assert.equal(optionalUpgrade.purchaseUpgrade("agility").success, true);
assert.equal(optionalUpgrade.getUpgradeLevel("agility"), 1);

const retention = new RetentionProgressSystem();
retention.configureTutorialChoice(TOWN_TUTORIAL_CHOICES.YES);
retention.recordTutorialMovement(2);
retention.recordMiningResult({ success: true, destroyed: true, resourceAmount: 1 });
assert.equal(retention.getTutorialState().stage, TOWN_TUTORIAL_STAGES.FLIGHT);
retention.recordUpgrade("Agility Training", { upgradeId: "agility" });
assert.equal(
  retention.getTutorialState().stage,
  TOWN_TUTORIAL_STAGES.FLIGHT,
  "buying before the Upgrade beat must not skip the authored route",
);
retention.claimTutorialFlightTraining();
retention.recordTutorialFlight();
retention.recordPortalActivated("Starter Return Gate");
retention.recordSale(1, 1);
assert.equal(retention.getTutorialState().stage, TOWN_TUTORIAL_STAGES.UPGRADE);
retention.recordUpgrade("Agility Training", { upgradeId: "agility" });
assert.equal(retention.getTutorialState().stage, TOWN_TUTORIAL_STAGES.RESUME);

const tutorialSource = read("systems/onboarding/TownSquareTutorialSystem.js");
const bridgeSource = read("systems/onboarding/FirstFiveMinutesTutorialBridge.js");
assert.doesNotMatch(tutorialSource, /Agility Training|addMoney|setResources/);
assert.doesNotMatch(bridgeSource, /FIRST_FIVE_STARTER_UPGRADE_ID|claimTutorialUpgradeFunding/);
assert.match(tutorialSource, /claimTutorialFlightTraining/);

console.log("first upgrade handoff contract passed: real purchase beat, no forced funding, legacy effect preserved");
