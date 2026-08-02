import assert from "node:assert/strict";
import {
  SYSTEM_INTRODUCTION_CONFIG,
  resolveSystemIntroductionEnabled,
} from "../values/systemIntroduction.js";
import { UI_NOTIFICATION_CAROUSEL_CONFIG } from "../values/uiNotificationCarousel.js";
import { SystemIntroductionSystem } from "../systems/onboarding/SystemIntroductionSystem.js";
import { UINotificationSystem } from "../ui/UINotificationSystem.js";
import {
  TOWN_TUTORIAL_CHOICES,
  TOWN_TUTORIAL_STAGES,
} from "../values/retentionConfig.js";

const stats = {
  bestDepth: 0,
  totalTilesBroken: 0,
  totalResources: 0,
  resourcesSold: 0,
  upgradesPurchased: 0,
  portalsActivated: 0,
  chestsOpened: 0,
  starsCollected: 0,
  earthquakesSurvived: 0,
  expeditionsCompleted: 0,
};
const journal = {
  stats,
  discoveries: { titans: [] },
  lastExpedition: null,
};
let tutorial = {
  choice: null,
  stage: TOWN_TUTORIAL_STAGES.UNSELECTED,
  completionRewardGranted: false,
};

const scene = {
  upgradeSystem: {
    isGemPowerUnlocked: () => tutorial.completionRewardGranted === true,
    getUpgradeLevel: () => 0,
  },
};
const retention = {
  getJournalSnapshot: () => journal,
  getTutorialState: () => tutorial,
};
const pacing = new SystemIntroductionSystem(scene, retention);

let snapshot = pacing.refresh({ announce: false });
assert.equal(snapshot.tutorialComplete, false);
assert.equal(pacing.isFeatureAvailable("gemPower"), false);
assert.equal(pacing.isFeatureAvailable("caves"), false);
assert.equal(
  pacing.isFeatureAvailable("weather"),
  true,
  "weather HUD and simulation should be available from PlayScene start",
);
assert.deepEqual(
  pacing.getAvailableMerchantIds(),
  ["boboMerchant", "playerUpgrades", "gemPowerMerchant", "gearMerchant", "moneyMonster"],
  "fresh saves should keep all Level-1 shops visible while the Level-2 forge stays gated",
);
assert.equal(pacing.isMerchantAvailable("boboMerchant"), true);
assert.equal(pacing.isMerchantUnlocked("boboMerchant"), false);
assert.equal(pacing.isMerchantAvailable("magmaMoneyMonster"), false);
assert.equal(pacing.isMerchantUnlocked("magmaMoneyMonster"), false);
assert.equal(pacing.isMerchantAvailable("missingMerchant"), false);
assert.equal(pacing.getNextPromiseOverride(), null, "tutorial owns the opening promise");

tutorial = {
  choice: TOWN_TUTORIAL_CHOICES.YES,
  stage: TOWN_TUTORIAL_STAGES.COMPLETE,
  completionRewardGranted: true,
};
stats.totalTilesBroken = 8;
stats.totalResources = 3;
snapshot = pacing.refresh({ announce: false });
assert.equal(snapshot.flightReady, true);
assert.equal(snapshot.firstReturn, false);
assert.equal(pacing.isMerchantAvailable("gemPowerMerchant"), true);
assert.equal(pacing.isMerchantUnlocked("gemPowerMerchant"), false);
assert.equal(
  pacing.getNextPromiseOverride().promise,
  "CORE LOOP  •  RETURN AND SELL",
);

stats.resourcesSold = 1;
snapshot = pacing.refresh({ announce: false });
assert.equal(
  pacing.getNextPromiseOverride().promise,
  "CORE LOOP  •  BUY ONE UPGRADE",
);
stats.upgradesPurchased = 1;
snapshot = pacing.refresh({ announce: false });
assert.equal(
  pacing.getNextPromiseOverride().promise,
  "NEXT: RETURN WITH CARGO",
);

stats.expeditionsCompleted = 1;
stats.bestDepth = 12;
snapshot = pacing.refresh({ announce: false });
assert.equal(snapshot.firstReturn, true);
assert.equal(pacing.isMerchantAvailable("gemPowerMerchant"), true);
assert.equal(pacing.isMerchantUnlocked("gemPowerMerchant"), true);
assert.equal(pacing.isMerchantAvailable("gearMerchant"), true);
assert.equal(pacing.isMerchantUnlocked("gearMerchant"), false);
assert.equal(pacing.isFeatureAvailable("comboHud"), true);
assert.equal(
  pacing.getNextPromiseOverride().promise,
  "NEXT RUN: REACH 40m",
);

for (const [depth, feature, expected] of [
  [39, "gearMerchant", false],
  [40, "gearMerchant", true],
  [79, "specialTiles", false],
  [80, "specialTiles", true],
  [99, "constellations", false],
  [100, "constellations", true],
  [139, "caves", false],
  [140, "caves", true],
  [219, "hazards", false],
  [220, "hazards", true],
  [249, "relics", false],
  [250, "relics", true],
  [349, "titans", false],
  [350, "titans", true],
  [499, "abilities", false],
  [500, "abilities", true],
]) {
  stats.bestDepth = depth;
  snapshot = pacing.refresh({ announce: false });
  assert.equal(
    pacing.isFeatureAvailable(feature, snapshot),
    expected,
    `${feature} threshold should be ${depth}m`,
  );
}

assert.equal(pacing.isMerchantUnlocked("boboMerchant"), true);
assert.equal(pacing.isMerchantAvailable("magmaMoneyMonster"), false);

assert.equal(
  pacing.isUpgradeAvailable("steelPickaxe"),
  true,
  "late pickaxe IDs should resolve through the staged map",
);
stats.bestDepth = 40;
snapshot = pacing.refresh({ announce: false });
assert.equal(pacing.isUpgradeAvailable("steelPickaxe"), false);

assert.equal(resolveSystemIntroductionEnabled(SYSTEM_INTRODUCTION_CONFIG, "?systemPacing=0"), false);
assert.equal(resolveSystemIntroductionEnabled(SYSTEM_INTRODUCTION_CONFIG, "?systemPacing=legacy"), false);
assert.equal(resolveSystemIntroductionEnabled(SYSTEM_INTRODUCTION_CONFIG, "?systemPacing=1"), true);
const rollback = new SystemIntroductionSystem(scene, retention, { search: "?systemPacing=0" });
assert.equal(rollback.enabled, false);
assert.equal(rollback.isFeatureAvailable("caves"), true);
assert.equal(rollback.isMerchantAvailable("boboMerchant"), true);

const legacyRetention = {
  getJournalSnapshot: () => ({ stats: { bestDepth: 12 }, discoveries: { titans: [] } }),
  getTutorialState: () => ({
    choice: TOWN_TUTORIAL_CHOICES.LEGACY,
    stage: TOWN_TUTORIAL_STAGES.COMPLETE,
  }),
};
const legacy = new SystemIntroductionSystem(scene, legacyRetention);
assert.equal(legacy.isFeatureAvailable("caves"), true);
assert.equal(legacy.isMerchantAvailable("boboMerchant"), true);

const admission = Object.create(UINotificationSystem.prototype);
admission._routineHistory = [];
assert.equal(admission._admitRoutine({ priority: 0 }, 0), true);
assert.equal(admission._admitRoutine({ priority: 0 }, 500), false);
assert.equal(admission._admitRoutine({ priority: 0 }, 1400), true);
assert.equal(admission._admitRoutine({ priority: 0 }, 2800), true);
assert.equal(admission._admitRoutine({ priority: 0 }, 4200), false);
assert.equal(admission._admitRoutine({ priority: 3 }, 4200), true);
assert.equal(admission._admitRoutine({ bypassPacing: true, priority: 0 }, 4200), true);

assert.equal(UI_NOTIFICATION_CAROUSEL_CONFIG.routineGapMs >= 1000, true);
assert.equal(UI_NOTIFICATION_CAROUSEL_CONFIG.maxRoutineInWindow <= 3, true);
assert.equal(UI_NOTIFICATION_CAROUSEL_CONFIG.routineWindowMs >= 5000, true);

console.log("System introduction pacing contract passed.");
