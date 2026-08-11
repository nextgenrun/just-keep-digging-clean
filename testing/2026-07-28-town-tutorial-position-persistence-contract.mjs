import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PlayerController } from "../player/PlayerController.js";
import { RetentionProgressSystem } from "../systems/progression/RetentionProgressSystem.js";
import {
  TOWN_TUTORIAL_CHOICES,
  TOWN_TUTORIAL_STAGES,
} from "../values/retentionConfig.js";
import { sanitizePlayerPersistenceData } from "../values/playerPersistence.js";
import { DugTilesSaveStore } from "../world/model/DugTilesSaveStore.js";

const exactUndergroundState = {
  version: 1,
  bodyX: 1847.375,
  bodyY: 28492.625,
  gemPower: 63.5,
  facingRight: false,
};
assert.deepEqual(
  sanitizePlayerPersistenceData(exactUndergroundState),
  exactUndergroundState,
);

const saveStore = new DugTilesSaveStore();
const payload = saveStore.createPayload(
  { seed: 133742, width: 280, depth: 5065, topAirRows: 65 },
  [],
  undefined,
  null,
  null,
  null,
  null,
  null,
  [],
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  exactUndergroundState,
);
assert.equal(payload.version, 14);
assert.deepEqual(payload.playerStateData, exactUndergroundState);
assert.deepEqual(
  saveStore.normalizePayload(payload).playerStateData,
  exactUndergroundState,
);

const body = {
  x: 10,
  y: 20,
  w: 32,
  h: 48,
  setPosition(x, y) {
    this.x = x;
    this.y = y;
  },
  resetVelocity() {
    this.vx = 0;
    this.vy = 0;
  },
};
const restored = {
  physicsBody: body,
  worldModel: { widthPx: 280 * 94, depthTiles: 5065 },
  config: { tileSize: 94 },
  surfaceDrop: { reset() {} },
  movingSideDigStandOff: { end() {} },
  collisionSystem: { resolveBodyOverlap: () => true },
  setFacingRight(value) {
    this.facingRight = value;
  },
  setGemPowerExact(value) {
    this.gemPower = value;
  },
  _syncSpriteWithPhysics() {
    this.synced = true;
  },
};
assert.equal(
  PlayerController.prototype.restorePersistenceData.call(
    restored,
    exactUndergroundState,
  ),
  true,
);
assert.equal(body.x, exactUndergroundState.bodyX);
assert.equal(body.y, exactUndergroundState.bodyY);
assert.equal(restored.facingRight, false);
assert.equal(restored.gemPower, exactUndergroundState.gemPower);
assert.equal(restored.synced, true);

const tutorial = new RetentionProgressSystem();
assert.equal(tutorial.configureTutorialChoice(TOWN_TUTORIAL_CHOICES.YES), true);
assert.equal(tutorial.getTutorialState().stage, TOWN_TUTORIAL_STAGES.MOVE);
assert.equal(tutorial.recordTutorialMovement(2), true);
assert.equal(tutorial.getTutorialState().stage, TOWN_TUTORIAL_STAGES.DIG);
tutorial.recordMiningResult({ success: true, destroyed: true, resourceAmount: 1 });
assert.equal(tutorial.getTutorialState().stage, TOWN_TUTORIAL_STAGES.FLIGHT);
assert.equal(tutorial.claimTutorialFlightTraining().freeFlightMs, 30000);
assert.equal(tutorial.recordTutorialFlight(), true);
tutorial.recordPortalActivated("Starter Return Gate");
assert.equal(tutorial.getTutorialState().stage, TOWN_TUTORIAL_STAGES.SELL);
tutorial.recordSale(1, 1);
assert.equal(tutorial.getTutorialState().stage, TOWN_TUTORIAL_STAGES.UPGRADE);
tutorial.recordUpgrade("Agility Training", { upgradeId: "agility" });
assert.equal(tutorial.getTutorialState().stage, TOWN_TUTORIAL_STAGES.RESUME);
assert.equal(tutorial.recordTutorialPortalResume(), true);
assert.equal(tutorial.getTutorialState().stage, TOWN_TUTORIAL_STAGES.COMPLETE);

const resumedTutorial = new RetentionProgressSystem();
resumedTutorial.loadSaveData(tutorial.getSaveData());
assert.equal(
  resumedTutorial.getTutorialState().stage,
  TOWN_TUTORIAL_STAGES.COMPLETE,
);
assert.equal(resumedTutorial.configureTutorialChoice(TOWN_TUTORIAL_CHOICES.YES), false);
assert.equal(resumedTutorial.isTutorialActive(), false);
assert.equal(resumedTutorial.claimTutorialFlightTraining(), null);
assert.equal(resumedTutorial.getTutorialState().freeFlightRemainingMs, 30000);

const skipped = new RetentionProgressSystem();
skipped.configureTutorialChoice(TOWN_TUTORIAL_CHOICES.NO);
assert.equal(skipped.getTutorialState().stage, TOWN_TUTORIAL_STAGES.SKIPPED);
assert.equal(skipped.isTutorialActive(), false);
assert.equal(skipped.claimTutorialFlightTraining().freeFlightMs, 0);
assert.equal(skipped.claimTutorialFlightTraining(), null);

const [
  startMenuSource,
  loadSource,
  setupSource,
  uiSource,
  updateSource,
  openingConfigSource,
] = await Promise.all([
  readFile(new URL("../ui/scenes/StartMenuScene.js", import.meta.url), "utf8"),
  readFile(new URL("../ui/scenes/WorldLoadScene.js", import.meta.url), "utf8"),
  readFile(new URL("../world/playScene/PlaySceneSetup.js", import.meta.url), "utf8"),
  readFile(new URL("../world/playScene/PlaySceneUI.js", import.meta.url), "utf8"),
  readFile(new URL("../world/playScene/PlaySceneUpdate.js", import.meta.url), "utf8"),
  readFile(new URL("../values/openingFlightArtifact.js", import.meta.url), "utf8"),
]);
assert.match(startMenuSource, /new NewRunSetupOverlay/);
assert.match(startMenuSource, /tutorialChoice/);
assert.match(loadSource, /tutorialChoice/);
assert.match(setupSource, /new TownSquareTutorialSystem/);
assert.doesNotMatch(setupSource, /shouldUseOpeningFlightGoldenSpawn/);
assert.match(updateSource, /townSquareTutorialSystem\?\.update/);
assert.match(uiSource, /getPersistenceData/);
assert.match(uiSource, /restorePersistenceData/);
assert.match(uiSource, /_restoredPlayerPosition/);
assert.match(
  uiSource,
  /returnToMainMenu = function\(\)[\s\S]*?if \(this\._returnToMainMenuPromise\) return this\._returnToMainMenuPromise/,
);
assert.match(
  uiSource,
  /await this\.flushDugTilesSave\(\{ scheduled: false, force: true \}\)/,
);
assert.match(openingConfigSource, /OPENING_FLIGHT_ARTIFACT_CONFIG[\s\S]*enabled: false/);

console.log("town tutorial and exact player-position persistence contract passed");
