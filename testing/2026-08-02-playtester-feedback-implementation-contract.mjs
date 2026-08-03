import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ComboSystem } from "../systems/combo/ComboSystem.js";
import { FirstSessionPortalSystem } from
  "../systems/onboarding/FirstSessionPortalSystem.js";
import { PlayerLevelSystem } from
  "../systems/progression/PlayerLevelSystem.js";
import { RetentionProgressSystem } from
  "../systems/progression/RetentionProgressSystem.js";
import { sanitizeRetentionProgressData } from
  "../systems/progression/retentionProgressState.js";
import { UINotificationSystem } from "../ui/UINotificationSystem.js";
import { DEPTH_GATE_CONFIG } from "../values/depthGateConfig.js";
import {
  RETENTION_CONFIG,
  TOWN_TUTORIAL_CHOICES,
  TOWN_TUTORIAL_STAGES,
} from "../values/retentionConfig.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { TUTORIAL_NARRATION_CONFIG } from "../values/tutorialNarration.js";
import { UI_NOTIFICATION_CAROUSEL_CONFIG } from
  "../values/uiNotificationCarousel.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = relativePath => readFileSync(path.join(root, relativePath), "utf8");

assert.deepEqual(RETENTION_CONFIG.tutorial.activeStages, [
  TOWN_TUTORIAL_STAGES.MOVE,
  TOWN_TUTORIAL_STAGES.DIG,
  TOWN_TUTORIAL_STAGES.FLIGHT,
  TOWN_TUTORIAL_STAGES.PORTAL,
  TOWN_TUTORIAL_STAGES.SELL,
  TOWN_TUTORIAL_STAGES.RESUME,
]);
assert.equal("UPGRADE" in TOWN_TUTORIAL_STAGES, false);
assert.equal("upgradeFunding" in RETENTION_CONFIG.tutorial, false);

const retention = new RetentionProgressSystem();
assert.equal(retention.configureTutorialChoice(TOWN_TUTORIAL_CHOICES.YES), true);
assert.equal(retention.getTutorialState().stage, TOWN_TUTORIAL_STAGES.MOVE);
assert.equal(retention.recordTutorialMovement(2), true);
assert.equal(retention.getTutorialState().stage, TOWN_TUTORIAL_STAGES.DIG);
retention.recordMiningResult({
  success: true,
  destroyed: true,
  resourceType: "dirt",
  resourceAmount: 1,
});
assert.equal(retention.getTutorialState().stage, TOWN_TUTORIAL_STAGES.FLIGHT);
assert.deepEqual(retention.claimTutorialFlightTraining(), {
  flightUpgradeId: "gemPowerUnlock",
  freeFlightMs: 30000,
});
assert.equal(retention.claimTutorialFlightTraining(), null);
assert.equal(retention.recordTutorialFlight(), true);
assert.equal(retention.getTutorialState().stage, TOWN_TUTORIAL_STAGES.PORTAL);
retention.recordPortalActivated("Starter Return Gate");
assert.equal(retention.getTutorialState().stage, TOWN_TUTORIAL_STAGES.SELL);
retention.recordSale(1, 1);
assert.equal(retention.getTutorialState().stage, TOWN_TUTORIAL_STAGES.RESUME);
assert.equal(retention.recordTutorialPortalResume(), true);
assert.equal(retention.getTutorialState().stage, TOWN_TUTORIAL_STAGES.COMPLETE);

const resumed = new RetentionProgressSystem();
resumed.loadSaveData(retention.getSaveData());
assert.equal(resumed.getTutorialState().stage, TOWN_TUTORIAL_STAGES.COMPLETE);
assert.equal(resumed.getTutorialState().flightTrainingGranted, true);
assert.equal("upgradeFundingGranted" in resumed.getTutorialState(), false);

assert.equal(
  sanitizeRetentionProgressData({
    version: 4,
    tutorialChoice: "yes",
    tutorialStage: "upgrade",
  }).tutorialStage,
  TOWN_TUTORIAL_STAGES.FLIGHT,
);
assert.equal(
  sanitizeRetentionProgressData({
    version: 2,
    tutorialChoice: "yes",
    tutorialStage: "upgrade",
  }).tutorialStage,
  TOWN_TUTORIAL_STAGES.PORTAL,
);
assert.equal(
  sanitizeRetentionProgressData({
    version: 3,
    tutorialChoice: "yes",
    tutorialStage: "sell",
  }).tutorialStage,
  TOWN_TUTORIAL_STAGES.RESUME,
);

const tileWrites = [];
const rendererUpdates = [];
const dugTileSource = new Map([["12,80", { tx: 12, ty: 80 }]]);
let portalType = TILE_TYPES.DIRT;
const portalScene = {
  config: { topAirRows: 65 },
  worldModel: {
    dugTileSource,
    inBounds: (tx, ty) => tx === 12 && ty === 80,
    getTileType: () => portalType,
    getTileMaxHp: () => 1,
    setTile(tx, ty, type, hp) {
      tileWrites.push({ tx, ty, type, hp });
      portalType = type;
    },
  },
  worldRenderer: {
    applyTileUpdate: (tx, ty) => rendererUpdates.push({ tx, ty }),
  },
};
const firstPortal = new FirstSessionPortalSystem(portalScene);
assert.deepEqual(firstPortal.ensure().tile, { tx: 12, ty: 80, depth: 15 });
assert.equal(portalType, TILE_TYPES.TELEPORT_TILE);
assert.equal(dugTileSource.has("12,80"), false);
assert.equal(tileWrites.length, 1);
assert.deepEqual(rendererUpdates, [{ tx: 12, ty: 80 }]);
assert.equal(firstPortal.ensure().changed, false);
portalType = TILE_TYPES.DIRT;
dugTileSource.set("12,80", { tx: 12, ty: 80 });
const repairedPortal = firstPortal.ensure();
assert.equal(repairedPortal.changed, true);
assert.equal(portalType, TILE_TYPES.TELEPORT_TILE);
assert.equal(dugTileSource.has("12,80"), false);
assert.equal(tileWrites.length, 2);
assert.deepEqual(rendererUpdates, [{ tx: 12, ty: 80 }, { tx: 12, ty: 80 }]);
assert.equal(
  read("systems/onboarding/TownSquareTutorialSystem.js")
    .match(/firstSessionPortalSystem\?\.ensure\?\.\(\)/g)?.length,
  2,
);

const levels = new PlayerLevelSystem();
const levelResult = levels.gainLevel(9);
assert.equal(levelResult.newLevel, 10);
assert.equal(levelResult.hasChoice, false);
assert.deepEqual(levelResult.rewards, []);
assert.equal(levelResult.automaticReward.count, 2);
const restoredLevels = new PlayerLevelSystem();
restoredLevels.fromJSON(levels.toJSON());
assert.equal(restoredLevels.automaticMilestoneRewards, 2);
assert.equal(
  restoredLevels.getMiningDamageMultiplier(),
  levels.getMiningDamageMultiplier(),
);

assert.equal(UI_NOTIFICATION_CAROUSEL_CONFIG.enabled, false);
const notifications = new UINotificationSystem({});
assert.equal(notifications.enabled, false);
assert.equal(notifications.view, null);
assert.equal(notifications.show("must stay hidden"), null);
assert.equal(notifications.getSnapshot().total, 0);
notifications.destroy();
assert.doesNotMatch(
  read("values/uiNotificationCarousel.js"),
  /ESSENTIAL_UI_NOTIFICATION_CONFIG/,
);

for (const stage of [
  "move",
  "dig",
  "flight",
  "portal",
  "portalNear",
  "sell",
  "resume",
  "complete",
]) {
  const cue = TUTORIAL_NARRATION_CONFIG.cues[stage];
  assert.ok(cue?.script);
  assert.ok(cue?.caption?.promise);
  assert.ok(cue?.caption?.detail);
}
assert.equal(TUTORIAL_NARRATION_CONFIG.recordingsReady, false);
assert.ok(Object.values(TUTORIAL_NARRATION_CONFIG.cues).every(cue => cue.path === null));
for (const copySource of [
  read("values/retentionConfig.js"),
  read("values/tutorialNarration.js"),
]) {
  assert.doesNotMatch(copySource, /\b40m\b/i);
  assert.match(copySource, /\b15m\b/i);
}

assert.deepEqual(
  DEPTH_GATE_CONFIG.gates.map(gate => gate.threshold),
  [100, 300, 1000],
);
assert.equal(new ComboSystem().comboDurationMs, 6000);
assert.equal(
  read("world/playScene/PlaySceneUpdate.js").includes("levelUpPopup"),
  false,
);
assert.equal(
  read("world/playScene/PlaySceneUI.js").includes("LevelUpPopup"),
  false,
);
assert.doesNotMatch(
  read("systems/onboarding/TownSquareTutorialView.js"),
  /uiNotifications|showFlightReminder/,
);
assert.doesNotMatch(
  read("systems/onboarding/FirstFiveMinutesTutorialBridge.js"),
  /claimTutorialUpgradeFunding|TutorialFlightReminderSystem/,
);
assert.doesNotMatch(
  read("systems/onboarding/TownSquareTutorialSystem.js"),
  /firstFive\.onFlightUnlocked/,
);

for (const retiredPath of [
  "ui/overlays/LevelUpPopup.js",
  "systems/visual/StarDiscoveryPopupView.js",
  "systems/visual/starDiscoveryPopupPolicy.js",
  "systems/onboarding/TutorialFlightReminderSystem.js",
]) {
  assert.equal(existsSync(path.join(root, retiredPath)), false, retiredPath);
}

console.log("2026-08-02 playtester feedback implementation contract passed");
