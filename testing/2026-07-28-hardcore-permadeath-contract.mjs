import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { HardcoreModeSystem } from "../systems/hardcore/HardcoreModeSystem.js";
import {
  HARDCORE_MODE_CONFIG,
  consumeHardcoreDeath,
  createHardcoreModeData,
  isHardcoreModeArmed,
  isHardcoreModeExhausted,
  isHardcoreRunActive,
  resolveHardcoreTeleportCost,
  sanitizeHardcoreModeData,
} from "../values/hardcoreMode.js";
import { APPROVED_HUD_SKIN } from "../values/approvedHudSkin.js";
import { sanitizePlayerPersistenceData } from "../values/playerPersistence.js";
import { PORTABLE_SAVE_FILE } from "../values/saveTransfer.js";
import { UI_NOTIFICATION_CAROUSEL_CONFIG } from "../values/uiNotificationCarousel.js";
import { SceneModeController } from "../systems/runtime/SceneModeController.js";
import { SCENE_BASE_PHASES } from "../values/sceneRuntime.js";
import { DugTilesSaveStore } from "../world/model/DugTilesSaveStore.js";
import { beginHardcorePermanentDeath } from
  "../world/playScene/HardcoreDeathBridge.js";

class MemoryStorage {
  constructor() {
    this.data = new Map();
  }
  get length() {
    return this.data.size;
  }
  key(index) {
    return [...this.data.keys()][index] ?? null;
  }
  getItem(key) {
    return this.data.has(String(key)) ? this.data.get(String(key)) : null;
  }
  setItem(key, value) {
    this.data.set(String(key), String(value));
  }
  removeItem(key) {
    this.data.delete(String(key));
  }
  clear() {
    this.data.clear();
  }
}

const storage = new MemoryStorage();
globalThis.localStorage = storage;
globalThis.window = { localStorage: storage };

const selectedHardcore = createHardcoreModeData("hardcore", 1000);
assert.equal(selectedHardcore.mode, "hardcore");
assert.equal(selectedHardcore.armed, false, "Hardcore must remain pending before Flight");
assert.equal(selectedHardcore.livesRemaining, 1);
assert.equal(selectedHardcore.freeReviveAvailable, false);
assert.equal(isHardcoreModeArmed(selectedHardcore), false);

const migratedHardcore = sanitizeHardcoreModeData({
  mode: "hardcore",
  armed: true,
  livesRemaining: 3,
  freeReviveAvailable: true,
});
assert.equal(migratedHardcore.livesRemaining, 1);
assert.equal(migratedHardcore.freeReviveAvailable, false);

const armedLivesSystem = new HardcoreModeSystem(selectedHardcore);
assert.equal(armedLivesSystem.arm("flight", 2000), true);
const exhaustion = armedLivesSystem.recordDeath("contract-only-life");
assert.equal(exhaustion.outcome, "exhausted");
assert.equal(exhaustion.livesRemaining, 0);
assert.equal(isHardcoreModeExhausted(exhaustion.data), true);
assert.equal(isHardcoreRunActive(exhaustion.data), false);
assert.equal(consumeHardcoreDeath(createHardcoreModeData("casual")).outcome, "casual");
const oneLife = consumeHardcoreDeath({
  ...createHardcoreModeData("one-life-hardcore"),
  armed: true,
});
assert.equal(oneLife.outcome, "exhausted");
assert.equal(oneLife.livesRemaining, 0);

const statusHud = HARDCORE_MODE_CONFIG.ui.statusHud;
const statusHudLeft = statusHud.x - statusHud.width / 2;
const statusHudTop = statusHud.y - statusHud.height / 2;
const approvedHud = APPROVED_HUD_SKIN.layout;
assert.equal(
  statusHudLeft,
  approvedHud.playerCore.x,
  "Hardcore status must align with the upper-left GP HUD frame",
);
assert.ok(
  statusHudTop > approvedHud.gemPower.y + approvedHud.gemPower.height,
  "Hardcore status must render below the GP bar",
);
assert.ok(
  statusHudTop > approvedHud.buffs.y + approvedHud.buffs.height,
  "Hardcore status must not cover the upper-left buff row",
);
assert.ok(
  statusHud.depth > UI_NOTIFICATION_CAROUSEL_CONFIG.depth,
  "Hardcore status must remain visible above transient HUD cards",
);
assert.ok(
  statusHud.depth < HARDCORE_MODE_CONFIG.ui.depth,
  "Hardcore confirmation and death modals must remain above the status HUD",
);

const pendingSystem = new HardcoreModeSystem(selectedHardcore);
pendingSystem.update(100, {
  gameplayActive: true,
  depth: 1000,
  darknessAlpha: 1,
  torchActive: false,
  descentTilesPerSecond: 20,
});
assert.equal(pendingSystem.state.stress, 0, "Pending Hardcore cannot gain lethal stress");
assert.equal(pendingSystem.arm("flight", 2000), true);
assert.equal(pendingSystem.arm("flight-again", 3000), false, "Arming is idempotent");

let stressSnapshot = null;
for (let elapsed = 0; elapsed < 20000; elapsed += 100) {
  stressSnapshot = pendingSystem.update(100, {
    gameplayActive: true,
    nowMs: elapsed,
    depth: 800,
    darknessAlpha: 1,
    torchActive: false,
    descentTilesPerSecond: 12,
  });
}
assert.ok(stressSnapshot.stress >= HARDCORE_MODE_CONFIG.stress.gpDrainStartThreshold);
assert.ok(stressSnapshot.requestedStressGpDrain > 0);
assert.ok(stressSnapshot.stressSources.includes("darkness"));
assert.ok(stressSnapshot.stressSources.includes("rapid-descent"));
assert.ok(stressSnapshot.stressSources.includes("deep-pressure"));
assert.ok(stressSnapshot.activePlayMs > 0, "Armed play time must accumulate");
assert.ok(
  stressSnapshot.peakStress >= stressSnapshot.stress,
  "Peak stress must retain the run high-water mark",
);

const casualSystem = new HardcoreModeSystem(createHardcoreModeData("casual", 1000));
assert.equal(casualSystem.convertFromCasual("bobo", 5000), true);
assert.equal(casualSystem.getSnapshot().armed, true);
assert.equal(casualSystem.convertFromCasual("bobo", 6000), false);

const shallowCost = resolveHardcoreTeleportCost(0, "groundToSky");
const deepCost = resolveHardcoreTeleportCost(1000, "quickResume");
assert.equal(HARDCORE_MODE_CONFIG.teleport.free, true);
assert.equal(shallowCost, 0);
assert.equal(deepCost, 0);
assert.equal(casualSystem.recordTeleport(deepCost), false);
assert.equal(casualSystem.getSaveData().paidTeleports, 0);
assert.equal(casualSystem.getSaveData().teleportMoneySpent, 0);

assert.equal(casualSystem.canUseUnstuck(10000), true);
casualSystem.recordUnstuck(10000);
assert.equal(casualSystem.canUseUnstuck(10001), false);
assert.equal(
  casualSystem.getUnstuckCooldownRemaining(10000),
  HARDCORE_MODE_CONFIG.unstuck.cooldownMs,
);

const retryModeSystem = new HardcoreModeSystem({
  ...createHardcoreModeData("hardcore", 1000),
  armed: true,
});
let retryFlushes = 0;
let retryRestart = null;
let retryStart = null;
const retryModal = {
  deathOptions: null,
  error: null,
  ready: null,
  savingCount: 0,
  showDeath(options) { this.deathOptions = options; },
  setDeathSaving() { this.savingCount += 1; },
  setDeathReady(detail, presentation) {
    this.ready = { detail, presentation };
    this.error = null;
  },
  setError(message) { this.error = message; },
};
const retryModeController = new SceneModeController({ basePhase: SCENE_BASE_PHASES.ACTIVE });
const retryScene = {
  _hardcoreRuntime: {
    system: retryModeSystem,
    modal: retryModal,
    config: HARDCORE_MODE_CONFIG,
    updateDiagnostics() {},
  },
  _hardcoreDeathInProgress: false,
  config: { topAirRows: 65, tileSize: 94 },
  saveSlot: 1,
  worldIdentity: "contract-retry-world",
  playerCharacterId: "default",
  sceneModeController: retryModeController,
  setSceneBasePhase: (phase, context) => retryModeController.setBasePhase(phase, context),
  pendingDugTileSave: false,
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
  queueDugTilesSave() {},
  async flushDugTilesSave() {
    retryFlushes += 1;
    return retryFlushes > 1;
  },
  time: {
    delayedCall(_delay, callback) {
      callback();
      return { remove() {} };
    },
  },
  scene: {
    restart(payload) { retryRestart = payload; },
    start(key) { retryStart = key; },
  },
};
Object.defineProperty(retryScene, "gameState", { get: () => retryModeController.legacyGameState });
const originalConsoleError = console.error;
console.error = () => {};
try {
  assert.equal(
    await beginHardcorePermanentDeath(retryScene, { source: "stress" }),
    false,
    "A failed life-state flush must keep the death surface locked",
  );
} finally {
  console.error = originalConsoleError;
}
assert.match(retryModal.error, /RETRY SAVE/);
assert.equal(retryModal.ready, null);
assert.equal(retryRestart, null);
assert.equal(await retryModal.deathOptions.onRetry(), true);
assert.match(retryModal.ready.detail, /YOUR SAVE IS SAFE/);
assert.equal(retryRestart, null, "Hardcore death must never restart the run");
assert.equal(retryStart, "StartMenuScene");
assert.equal(retryModeSystem.getSaveData().livesRemaining, 0);
assert.equal(retryModeSystem.getSaveData().freeReviveAvailable, false);

assert.deepEqual(
  sanitizePlayerPersistenceData({
    bodyX: 123.25,
    bodyY: 456.75,
    gemPower: 0.75,
    facingRight: false,
  }),
  {
    version: 1,
    bodyX: 123.25,
    bodyY: 456.75,
    gemPower: 0.75,
    facingRight: false,
  },
  "Fractional GP and exact body position must survive save normalization",
);

const store = new DugTilesSaveStore({ slotId: 2 });
const world = {
  seed: 101,
  width: 320,
  depth: 2400,
  topAirRows: 65,
  layoutId: "contract-layout",
  layoutRevision: 1,
};
const casualNeighborStore = new DugTilesSaveStore({ slotId: 1 });
assert.equal(
  await casualNeighborStore.save(world, ["3,70"], { dirt: 77 }),
  true,
);
assert.equal(
  casualNeighborStore.loadForDisplay()?.hardcoreModeData.mode,
  "casual",
);
const casualNeighborPayload = storage.getItem(
  casualNeighborStore.localStorageKey,
);
const casualNeighborBackups = casualNeighborStore.getBackups().length;
const hardcoreSave = sanitizeHardcoreModeData({
  mode: "hardcore",
  armed: true,
  selectedAt: 1000,
  armedAt: 2000,
  stress: 72,
});
const playerState = {
  bodyX: 1200.5,
  bodyY: 6400.25,
  gemPower: 1,
  facingRight: false,
};
const saveSucceeded = await store.save(
  world,
  ["4,70"],
  { dirt: 9, stone: 3 },
  null,
  null,
  null,
  null,
  null,
  [],
  "default",
  null,
  null,
  null,
  null,
  null,
  null,
  hardcoreSave,
  null,
  playerState,
);
assert.equal(saveSucceeded, true);
assert.equal(store.loadForDisplay()?.version, 15);
assert.equal(store.loadForDisplay()?.playerStateData.gemPower, 1);
assert.equal(store.getBackups().length, 1);
const hardcoreTransferPayload = store.loadFromLocalStorage();
const checkpointPlayerState = {
  bodyX: 2222.25,
  bodyY: 7777.5,
  gemPower: 0.75,
  facingRight: true,
};
assert.equal(
  store.saveHardcoreCheckpoint(
    world,
    { ...hardcoreSave, stress: 88 },
    checkpointPlayerState,
  ),
  true,
);
assert.notEqual(storage.getItem(store.hardcoreCheckpointKey), null);
assert.equal(
  store.getBackups().length,
  1,
  "Live Hardcore checkpoints must not create rewind backups",
);
const checkpointMergedSave = store.loadCached(world);
assert.equal(checkpointMergedSave?.hardcoreModeData.stress, 88);
assert.deepEqual(
  checkpointMergedSave?.playerStateData,
  sanitizePlayerPersistenceData(checkpointPlayerState),
  "Armed Hardcore reloads must use the latest exact live position and GP checkpoint",
);
let exportedHardcoreBlob = null;
let exportedHardcoreFilename = null;
const originalDocument = globalThis.document;
const originalUrl = globalThis.URL;
globalThis.URL = {
  createObjectURL(blob) {
    exportedHardcoreBlob = blob;
    return "blob:hardcore-portable-save-contract";
  },
  revokeObjectURL() {},
};
globalThis.document = {
  body: {
    appendChild() {},
    removeChild() {},
  },
  createElement(tagName) {
    assert.equal(tagName, "a");
    return {
      href: "",
      download: "",
      click() {
        exportedHardcoreFilename = this.download;
      },
    };
  },
};
assert.equal(store.exportSave("hardcore-slot-2.json"), true);
assert.equal(exportedHardcoreFilename, "hardcore-slot-2.json");
assert.ok(exportedHardcoreBlob instanceof Blob);
const exportedHardcoreEnvelope = JSON.parse(await exportedHardcoreBlob.text());
assert.equal(exportedHardcoreEnvelope.format, PORTABLE_SAVE_FILE.format);
assert.equal(exportedHardcoreEnvelope.formatVersion, PORTABLE_SAVE_FILE.formatVersion);
assert.equal(exportedHardcoreEnvelope.payloadVersion, 15);
assert.equal(exportedHardcoreEnvelope.checksumAlgorithm, PORTABLE_SAVE_FILE.checksumAlgorithm);
assert.equal(
  store.backupManager.verifyChecksum(
    exportedHardcoreEnvelope.saveData,
    exportedHardcoreEnvelope.payloadChecksum,
  ),
  true,
);
assert.equal(isHardcoreRunActive(exportedHardcoreEnvelope.saveData.hardcoreModeData), true);
if (originalDocument === undefined) delete globalThis.document;
else globalThis.document = originalDocument;
globalThis.URL = originalUrl;
const liveHardcoreRestore = store.restoreFromBackup(0);
assert.equal(liveHardcoreRestore.success, false);
assert.match(liveHardcoreRestore.error, /oath-locked/i);
assert.equal(store.getLatestBackup(), null);
const hardcoreImportTarget = new DugTilesSaveStore({ slotId: 4 });
assert.equal(
  hardcoreImportTarget.backupManager.createBackup(4, hardcoreTransferPayload).success,
  true,
);
assert.equal(
  hardcoreImportTarget.restoreFromBackup(0).success,
  false,
  "A Hardcore backup cannot be restored into another slot",
);
const tamperedHardcoreEnvelope = JSON.parse(JSON.stringify(exportedHardcoreEnvelope));
tamperedHardcoreEnvelope.saveData.resources.dirt += 1;
const tamperedImport = await hardcoreImportTarget.importSave({
  text: async () => JSON.stringify(tamperedHardcoreEnvelope),
});
assert.equal(tamperedImport.success, false);
assert.match(tamperedImport.error, /integrity check/i);
assert.equal(hardcoreImportTarget.loadForDisplay(), null);
const hardcoreImport = await hardcoreImportTarget.importSave(exportedHardcoreBlob);
assert.equal(hardcoreImport.success, true);
assert.equal(isHardcoreRunActive(hardcoreImport.saveData.hardcoreModeData), true);
assert.equal(
  isHardcoreRunActive(hardcoreImportTarget.loadForDisplay().hardcoreModeData),
  true,
  "A portable Hardcore save must survive the complete export/import path",
);

const unauthorizedDeath = store.preparePermanentDeath({
  mode: "casual",
  armed: false,
  source: "fallingRock",
  depth: 735,
});
assert.equal(unauthorizedDeath.refused, true);
assert.notEqual(
  store.loadForDisplay(),
  null,
  "Permanent deletion must refuse any non-armed-Hardcore authorization",
);
assert.equal(store.getBackups().length, 1);
const forgedCasualDeath = casualNeighborStore.preparePermanentDeath({
  mode: "hardcore",
  armed: true,
  source: "unknown",
  depth: 1,
});
assert.equal(
  forgedCasualDeath.refused,
  true,
  "Even forged armed metadata cannot authorize deletion of stored Casual data",
);
assert.equal(
  storage.getItem(casualNeighborStore.localStorageKey),
  casualNeighborPayload,
);

const preparedDeath = store.preparePermanentDeath({
  mode: "hardcore",
  armed: true,
  source: "fallingRock",
  depth: 735,
});
assert.equal(preparedDeath.success, true);
assert.equal(preparedDeath.backupsDeleted, 1);
assert.equal(store.loadForDisplay(), null);
assert.equal(storage.getItem(store.localStorageKey), null);
assert.equal(storage.getItem(store.hardcoreCheckpointKey), null);
assert.notEqual(storage.getItem(store.deathTombstoneKey), null);

const purge = await store.purgePermanentDeath(world, {
  mode: "hardcore",
  armed: true,
  source: "fallingRock",
  depth: 735,
  backupsDeleted: preparedDeath.backupsDeleted,
});
assert.equal(purge.success, true);
assert.equal(purge.backupsDeleted, 1);
assert.equal(store.loadForDisplay(), null);
assert.equal(store.getBackups().length, 0);
assert.equal(store.restoreFromBackup(0).success, false);
assert.equal(
  storage.getItem(casualNeighborStore.localStorageKey),
  casualNeighborPayload,
  "Deleting a Hardcore run must not alter a Casual save in another slot",
);
assert.equal(
  casualNeighborStore.getBackups().length,
  casualNeighborBackups,
  "Deleting a Hardcore run must not alter another slot's Casual backups",
);
assert.equal(
  await store.save(world, [], { dirt: 1 }),
  false,
  "A late save must not resurrect a tombstoned slot",
);
assert.equal(storage.getItem(store.localStorageKey), null);
assert.notEqual(storage.getItem(store.deathTombstoneKey), null);

const originalSetItem = storage.setItem.bind(storage);
storage.setItem = (key, value) => {
  if (String(key) === store.localStorageKey) throw new Error("simulated import write failure");
  originalSetItem(key, value);
};
const failedRevivalImport = await store.importSave(exportedHardcoreBlob);
storage.setItem = originalSetItem;
assert.equal(failedRevivalImport.success, false);
assert.match(failedRevivalImport.error, /could not write/i);
assert.equal(
  store.isDeathTombstoned(),
  true,
  "A failed portable import must restore the permadeath marker",
);

const revivalImport = await store.importSave(exportedHardcoreBlob);
assert.equal(revivalImport.success, true);
assert.equal(store.isDeathTombstoned(), false);
assert.equal(
  isHardcoreRunActive(store.loadForDisplay().hardcoreModeData),
  true,
  "A valid portable file must import into a tombstoned slot without a mode lock",
);
store.preparePermanentDeath({
  mode: "hardcore",
  armed: true,
  source: "contract-second-death",
  depth: 735,
});
assert.equal(store.isDeathTombstoned(), true);

store.beginNewSave();
assert.equal(store.isDeathTombstoned(), false, "Choosing a genuinely new save clears the tombstone");
assert.equal(
  await store.save(
    world,
    [],
    { dirt: 0 },
    null,
    null,
    null,
    null,
    null,
    [],
    "default",
    null,
    null,
    null,
    null,
    null,
    null,
    createHardcoreModeData("casual"),
  ),
  true,
);

const latePurgeStore = new DugTilesSaveStore({ slotId: 3 });
assert.equal(
  await latePurgeStore.save(
    world,
    ["8,90"],
    { dirt: 4 },
    null,
    null,
    null,
    null,
    null,
    [],
    "default",
    null,
    null,
    null,
    null,
    null,
    null,
    hardcoreSave,
  ),
  true,
);
const previousFetch = globalThis.fetch;
let releaseRemoteDelete = null;
globalThis.fetch = () => new Promise((resolveFetch) => {
  releaseRemoteDelete = () => resolveFetch({ ok: true });
});
latePurgeStore.endpoint = "/contract-save";
const latePurge = latePurgeStore.purgePermanentDeath(world, {
  mode: "hardcore",
  armed: true,
  source: "stress",
  depth: 900,
});
assert.equal(typeof releaseRemoteDelete, "function");
latePurgeStore.endpoint = null;
latePurgeStore.beginNewSave();
assert.equal(
  await latePurgeStore.save(
    world,
    [],
    { dirt: 0 },
    null,
    null,
    null,
    null,
    null,
    [],
    "default",
    null,
    null,
    null,
    null,
    null,
    null,
    createHardcoreModeData("casual"),
  ),
  true,
);
releaseRemoteDelete();
await latePurge;
assert.equal(
  latePurgeStore.loadForDisplay()?.hardcoreModeData.mode,
  "casual",
  "A late remote purge completion must not erase the explicitly new local save",
);
globalThis.fetch = previousFetch;

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceContracts = [
  ["ui/scenes/StartMenuScene.js", "new NewRunSetupOverlay(this)"],
  ["ui/scenes/StartMenuScene.js", "exportButton.setEnabled(Boolean(selectedSave?.hasData));"],
  ["ui/scenes/StartMenuScene.js", "isHardcoreModeExhausted"],
  ["ui/scenes/NewRunSetupInputController.js", "hiddenSequence"],
  ["ui/scenes/NewRunSetupInputController.js", "skipConfirmation"],
  ["ui/scenes/StartMenuScene.js", "hardcoreModeData: sanitizeHardcoreModeData(hardcoreModeData)"],
  ["ui/scenes/WorldLoadScene.js", "isNewSave: isNewSave === true"],
  ["world/playScene/PlaySceneSetup.js", "if (data.isNewSave !== true) this.restorePersistentState();"],
  ["world/playScene/PlaySceneUI.js", "const exported = this.dugTileSaveStore?.exportSave();"],
  ["world/playScene/PlaySceneSaveRuntime.js", "scene.playerController?.getPersistenceData?.()"],
  ["world/playScene/PlaySceneUI.js", "return this.requestHardcoreUnstuck?.()"],
  ["world/playScene/HardcoreDeathBridge.js", "recordDeath(source)"],
  ["world/playScene/HardcoreDeathBridge.js", "queueDugTilesSave"],
  ["world/playScene/HardcoreDeathBridge.js", "persistLifeState"],
  ["world/playScene/HardcoreDeathBridge.js", "setDeathSaving"],
  ["world/playScene/HardcoreDeathBridge.js", "YOUR SAVE IS SAFE"],
  ["world/playScene/HardcoreDeathBridge.js", "persistHardcoreLiveCheckpoint"],
  ["world/playScene/HardcoreDeathBridge.js", 'scene.scene.start("StartMenuScene")'],
  ["ui/overlays/HardcoreDeathRecapView.js", "this.config.copy.retryLabel"],
  ["ui/overlays/HardcoreDeathRecapView.js", "this.config.copy.menuLabel"],
  ["world/model/DugTilesSaveStore.js", "saveHardcoreCheckpoint"],
  ["ui/overlays/ShopOverlay.js", "requestHardcoreConversion"],
  ["systems/mining/SpecialTileSystem.js", "tryPayHardcoreTeleport"],
  ["systems/environment/EarthquakeSystem.js", 'source: "fallingRock"'],
  ["systems/environment/CaveHazardSystem.js", 'source: "caveHazard"'],
  ["systems/lighting/LightSystem.js", 'source: "torch"'],
  ["world/playScene/GraveborerWurmEventBridge.js", 'source: "graveborerWurm"'],
  ["ui/overlays/SaveTransferPanelContent.js", "Ready — current save remains local"],
];
for (const [relativePath, expected] of sourceContracts) {
  const source = readFileSync(resolve(root, relativePath), "utf8");
  assert.ok(source.includes(expected), `${relativePath} must contain ${expected}`);
}

const deathBridgeSource = readFileSync(
  resolve(root, "world/playScene/HardcoreDeathBridge.js"),
  "utf8",
);
assert.doesNotMatch(deathBridgeSource, /preparePermanentDeath|purgePermanentDeath|markDeathTombstone/);
assert.doesNotMatch(deathBridgeSource, /free-revive|FREE REVIVE|REVIVE IN TOWN|deathRevive|scene\.scene\.restart/);

for (const asset of Object.values(HARDCORE_MODE_CONFIG.assets)) {
  const assetPath = resolve(root, asset.path);
  assert.equal(existsSync(assetPath), true, `Missing approved Hardcore art: ${asset.path}`);
  assert.ok(statSync(assetPath).size > 20000, `Hardcore art is unexpectedly tiny: ${asset.path}`);
}

console.log("Hardcore one-life and durable exhaustion lifecycle contract passed.");
