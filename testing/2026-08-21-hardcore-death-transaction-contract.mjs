import assert from "node:assert/strict";
import { HardcoreModeSystem } from
  "../systems/hardcore/HardcoreModeSystem.js";
import { createHardcoreModeData } from "../values/hardcoreMode.js";
import { createDugTilesSavePayload } from
  "../world/model/DugTilesSaveCodec.js";
import { DugTilesSaveStore } from "../world/model/DugTilesSaveStore.js";
import { createPlaySceneSaveCoordinator } from
  "../world/playScene/PlaySceneSaveRuntime.js";
import {
  persistHardcoreDeathTransaction,
  verifyHardcoreDeathCommit,
} from "../world/playScene/HardcoreDeathSaveTransaction.js";

class MemoryStorage {
  constructor() { this.data = new Map(); }
  getItem(key) { return this.data.get(String(key)) ?? null; }
  setItem(key, value) { this.data.set(String(key), String(value)); }
  removeItem(key) { this.data.delete(String(key)); }
}

const storage = new MemoryStorage();
globalThis.window = { localStorage: storage };
globalThis.localStorage = storage;

const worldIdentity = Object.freeze({
  seed: 20260821,
  width: 320,
  depth: 2400,
  topAirRows: 65,
  layoutId: "hardcore-death-transaction-contract",
  layoutRevision: 1,
});
const initialMode = {
  ...createHardcoreModeData("hardcore", 1000),
  armed: true,
  armedAt: 2000,
  freeReviveAvailable: false,
};
const system = new HardcoreModeSystem(initialMode);
const store = new DugTilesSaveStore({ slotId: 1 });
const initialPayload = createDugTilesSavePayload({
  worldIdentity,
  dugTileKeys: [],
  rubbleTiles: [],
  resources: {},
  hardcoreModeData: system.getSaveData(),
  revisionMetadata: {
    revision: 1,
    parentRevision: 0,
    transactionId: "contract:initial",
    reason: "contract-initial",
  },
});
assert.equal(await store.commitPayload(initialPayload), true);

const transactionId = "hardcore-death:1:1:20260821:contract";
const result = system.recordDeath("fallingRock");
assert.equal(result.outcome, "life-lost");
assert.equal(result.livesRemaining, 1);

const scene = {
  _saveWritesBlocked: false,
  _hardcoreDeathInProgress: true,
  _hardcoreDeathTransactionId: transactionId,
  _cachedSaveData: initialPayload,
  _hardcoreRuntime: { system },
  dugTileSaveStore: store,
  worldModel: {
    getWorldIdentity: () => worldIdentity,
    getDugTileKeys: () => [],
    getRubbleTiles: () => [],
  },
  digSystem: { getResourceTotals: () => ({}) },
  upgradeSystem: { toJSON: () => ({ money: 0 }) },
};
let remoteAttempts = 0;
const previousFetch = globalThis.fetch;
globalThis.fetch = async () => {
  remoteAttempts += 1;
  return { ok: remoteAttempts > 1, status: 503 };
};
store.endpoint = "/hardcore-death-contract";

scene.gameSaveCoordinator = createPlaySceneSaveCoordinator(scene);

assert.equal(
  scene.gameSaveCoordinator.requestSnapshot("ordinary-write"),
  false,
  "Ordinary saves must remain blocked during the death surface",
);
assert.equal(
  await scene.gameSaveCoordinator.transaction({
    id: "wrong-transaction",
    mutate: () => true,
  }),
  false,
  "Only the active death transaction may cross the save lock",
);

const originalWarn = console.warn;
console.warn = () => {};
try {
  await assert.rejects(
    persistHardcoreDeathTransaction(scene, {
      transactionId,
      expectedData: system.getSaveData(),
      timeoutMs: 1000,
      returnDelayMs: 0,
    }),
    /Save transaction failed/,
  );
} finally {
  console.warn = originalWarn;
}
assert.equal(remoteAttempts, 1);
assert.equal(store.loadForDisplay().hardcoreModeData.livesRemaining, 1);
assert.equal(store.loadForDisplay().hardcoreModeData.deaths, 1);
assert.equal(
  store.loadForDisplay().revisionMetadata.transactionId,
  transactionId,
  "The exact death transaction must be durable locally before UI unlock",
);

const verification = await persistHardcoreDeathTransaction(scene, {
  transactionId,
  expectedData: system.getSaveData(),
  timeoutMs: 1000,
  returnDelayMs: 0,
});
assert.equal(remoteAttempts, 2, "Retry must resend the exact committed payload");
assert.equal(verification.ok, true);
assert.equal(verification.skipped, false);
assert.equal(scene.gameSaveCoordinator.getSnapshot().committedRevision, 2);

const durable = verifyHardcoreDeathCommit(
  scene,
  transactionId,
  system.getSaveData(),
);
assert.equal(durable.ok, true);
assert.equal(system.getSaveData().livesRemaining, 1);
assert.equal(system.getSaveData().deaths, 1);

globalThis.fetch = previousFetch;
scene.gameSaveCoordinator.destroy();
console.log("HARDCORE_DEATH_TRANSACTION_CONTRACT_OK");
