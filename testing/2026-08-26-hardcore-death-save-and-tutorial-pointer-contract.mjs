import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { HardcoreModeSystem } from "../systems/hardcore/HardcoreModeSystem.js";
import { SceneModeController } from "../systems/runtime/SceneModeController.js";
import { CINEMATIC_VIDEO_CONFIG } from "../values/cinematicVideoConfig.js";
import {
  HARDCORE_MODE_CONFIG,
  createHardcoreModeData,
} from "../values/hardcoreMode.js";
import { RETENTION_CONFIG } from "../values/retentionConfig.js";
import { SCENE_BASE_PHASES } from "../values/sceneRuntime.js";
import { beginHardcorePermanentDeath } from
  "../world/playScene/HardcoreDeathBridge.js";
import {
  isPlaySceneSaveBlocked,
} from "../world/playScene/PlaySceneSaveRuntime.js";
import { GameSaveCoordinator } from
  "../world/playScene/PlaySceneSaveScheduler.js";

assert.equal(
  isPlaySceneSaveBlocked({ _hardcoreDeathInProgress: true }),
  true,
  "Ordinary saves must remain blocked while Hardcore death is active",
);
assert.equal(
  isPlaySceneSaveBlocked({
    _hardcoreDeathInProgress: true,
    _hardcoreLifeStateSaveInProgress: true,
  }),
  false,
  "The explicit Hardcore life-state snapshot must be allowed",
);
assert.equal(
  isPlaySceneSaveBlocked({
    _saveWritesBlocked: true,
    _hardcoreDeathInProgress: true,
    _hardcoreLifeStateSaveInProgress: true,
  }),
  true,
  "An authority failure must still block every save",
);
const saveRuntimeSource = readFileSync(
  new URL("../world/playScene/PlaySceneSaveRuntime.js", import.meta.url),
  "utf8",
);
assert.match(
  saveRuntimeSource,
  /isBlocked:\s*\(\)\s*=>\s*isPlaySceneSaveBlocked\(scene\)/,
  "The production save coordinator must use the Hardcore-aware gate",
);

const modeSystem = new HardcoreModeSystem({
  ...createHardcoreModeData("hardcore", 1000),
  armed: true,
});
const modal = {
  deathOptions: null,
  ready: null,
  error: null,
  showDeath(options) { this.deathOptions = options; },
  setDeathSaving() {},
  setDeathReady(detail, presentation) {
    this.ready = { detail, presentation };
    this.error = null;
  },
  setError(message) { this.error = message; },
};
const modeController = new SceneModeController({
  basePhase: SCENE_BASE_PHASES.ACTIVE,
});
const writes = [];
const scene = {
  _hardcoreRuntime: {
    system: modeSystem,
    modal,
    config: HARDCORE_MODE_CONFIG,
    updateDiagnostics() {},
  },
  _hardcoreDeathInProgress: false,
  _hardcoreLifeStateSaveInProgress: false,
  _saveWritesBlocked: false,
  config: { topAirRows: 65, tileSize: 94 },
  saveSlot: 1,
  worldIdentity: "hardcore-death-save-contract",
  playerCharacterId: "default",
  sceneModeController: modeController,
  setSceneBasePhase: (phase, context) => modeController.setBasePhase(phase, context),
  hidePauseMenu() {},
  lightSystem: { forceTorchOff() {} },
  playerController: {
    physicsBody: { x: 940, y: 7520, w: 60, h: 80 },
    abilities: { fillGemPower() {} },
    getPlayerTile() { return { tx: 10, ty: 80 }; },
    getGemPowerMax() { return 110; },
    setControlsEnabled() {},
  },
  player: { anims: { stop() {} } },
  aimBox: { setVisible() {} },
  digSystem: { getResourceTotals() { return {}; } },
  upgradeSystem: { getMoney() { return 0; } },
  _resetPlayerToSpawn() {},
  queueDugTilesSave() {
    throw new Error("Hardcore death must bypass the ordinary UI save gate");
  },
  flushDugTilesSave() {
    throw new Error("Hardcore death must bypass the ordinary UI save gate");
  },
  time: {
    delayedCall(_delay, callback) {
      callback();
      return { remove() {} };
    },
  },
  scene: { restart() {}, start() {} },
};

scene.gameSaveCoordinator = new GameSaveCoordinator({
  isBlocked: () => isPlaySceneSaveBlocked(scene),
  capture: revisionMetadata => ({
    revisionMetadata,
    hardcoreModeData: modeSystem.getSaveData(),
  }),
  validate: () => ({ ok: true }),
  write: snapshot => {
    writes.push(snapshot);
    return true;
  },
}, undefined, {
  now: () => 0,
  setTimer: () => 1,
  clearTimer() {},
  documentRef: null,
  windowRef: null,
});

assert.equal(
  await beginHardcorePermanentDeath(scene, { source: "stress" }),
  true,
  "Hardcore death must persist its consumed revive/life state",
);
assert.equal(writes.length, 1, "Hardcore death must commit exactly one snapshot");
assert.equal(
  writes[0].revisionMetadata.reason,
  "hardcore-death-life-state",
);
assert.equal(writes[0].hardcoreModeData.freeReviveAvailable, false);
assert.equal(scene._hardcoreLifeStateSaveInProgress, false);
assert.match(modal.ready?.detail || "", /SAVE INTACT/);
assert.equal(modal.error, null);
assert.equal(
  scene.gameSaveCoordinator.requestSnapshot("ordinary-save-after-death"),
  false,
  "The authorization must close immediately after the death snapshot",
);
scene.gameSaveCoordinator.destroy();

const tutorialUi = RETENTION_CONFIG.tutorial.ui;
const cinematicTopDepth = CINEMATIC_VIDEO_CONFIG.presentation.depth
  + CINEMATIC_VIDEO_CONFIG.presentation.promptDepthOffset;
assert.ok(
  tutorialUi.markerDepth > cinematicTopDepth,
  "The world-space tutorial pointer must render above the highest cinematic UI layer",
);
assert.ok(
  tutorialUi.offscreenMarkerDepth > cinematicTopDepth,
  "The fixed tutorial pointer must render above the highest cinematic UI layer",
);
const tutorialViewSource = readFileSync(
  new URL("../systems/onboarding/TownSquareTutorialView.js", import.meta.url),
  "utf8",
);
assert.match(tutorialViewSource, /setDepth\(this\.config\.offscreenMarkerDepth\)/);
assert.match(tutorialViewSource, /setScrollFactor\(0\)/);

console.log("Hardcore death save and tutorial pointer contract passed.");
