import assert from "node:assert/strict";

import { GameSaveCoordinator } from "../systems/save-system/GameSaveCoordinator.js";
import { DigSystem } from "../systems/mining/DigSystem.js";
import { PlayerLevelSystem } from "../systems/progression/PlayerLevelSystem.js";
import { UpgradeSystem } from "../systems/progression/UpgradeSystem.js";
import { DugTilesSaveStore } from "../world/model/DugTilesSaveStore.js";
import { RESOURCE_ZERO_TOTALS } from "../values/resourceTypes.js";
import { SAVE_PAYLOAD_V15_VERSION } from "../values/savePayloadV15.js";
import { validateSaveSnapshotIntegrity } from "../values/progressionInvariants.js";
import { STAR_RARITY_PROGRESSION_CONFIG } from "../values/starRarityProgression.js";

const storageValues = new Map();
const storage = {
  getItem: key => storageValues.get(key) ?? null,
  setItem: (key, value) => storageValues.set(key, String(value)),
  removeItem: key => storageValues.delete(key),
};
globalThis.localStorage = storage;
globalThis.window = { localStorage: storage };

const world = { seed: 12, width: 120, depth: 2400, topAirRows: 65 };
const store = new DugTilesSaveStore({ slotId: 3 });
const payload = store.createPayload(
  world, ["1,1"], RESOURCE_ZERO_TOTALS, { money: 12 }, { level: 2, currentXP: 0, totalXP: 0 },
  null, null, null, [], null, null, null, null, null, null, null, null, null,
  { bodyX: 1, bodyY: 2, gemPower: 3 }, { level: 4 }, null, null,
  { reachedDepths: [100, 100, 9999] },
  { constellationCounts: { dirt: 2 }, signXp: { dirt: 3 }, rarityCounts: [1], unlockedConstellations: ["dirt"] },
);
assert.equal(payload.version, 15);
assert.equal(payload.version, SAVE_PAYLOAD_V15_VERSION);
assert.equal(payload.revisionMetadata.revision, 1);
assert.deepEqual(payload.milestoneData.reachedDepths, [100]);
assert.equal(payload.starCollectionData.constellationCounts.dirt, 2);
const futurePayload = store.normalizePayload({
  ...payload,
  version: SAVE_PAYLOAD_V15_VERSION + 1,
});
assert.deepEqual(futurePayload.milestoneData, payload.milestoneData);
assert.deepEqual(futurePayload.starCollectionData, payload.starCollectionData);

storage.setItem("dig-game-save-slot-3", JSON.stringify({
  ...payload,
  version: 14,
  revisionMetadata: undefined,
  campfireData: undefined,
  milestoneData: undefined,
  starCollectionData: undefined,
}));
storage.setItem("jkd-campfire-level-slot-3", "7");
storage.setItem("dig-game-milestones-slot-3", JSON.stringify([100, 300]));
storage.setItem("dig-game-star-counts-slot-3", JSON.stringify({ dirt: 9 }));
storage.setItem("dig-game-sign-xp-v2-slot-3", JSON.stringify({ version: 2, xp: { dirt: 20 } }));
storage.setItem("dig-game-star-rarity-counts-slot-3", JSON.stringify([4, 2]));
storage.setItem("dig-game-constellations-slot-3", JSON.stringify(["dirt"]));
const migrated = store.loadForDisplay();
assert.equal(migrated.version, 15);
assert.equal(migrated.revisionMetadata.revision, 1);
assert.equal(migrated.campfireData.level, 7);
assert.deepEqual(migrated.milestoneData.reachedDepths, [100, 300]);
assert.equal(migrated.starCollectionData.constellationCounts.dirt, 9);
assert.equal(
  migrated.starCollectionData.signXp.dirt,
  STAR_RARITY_PROGRESSION_CONFIG.signProgression.xpTotals.dirt,
);
assert.equal(JSON.parse(storage.getItem("dig-game-save-slot-3")).version, 15);
assert.equal(storage.getItem("jkd-campfire-level-slot-3"), "7", "rollback sidecars stay retained");

storage.setItem("jkd-campfire-level-slot-3", "10");
const primaryWins = store.loadForDisplay();
assert.equal(primaryWins.campfireData.level, 7, "v15 primary state must ignore later sidecar changes");
assert.equal(store.normalizePayload({ version: 15, world: { ...world, seed: Number.NaN } }), null);

const newest = {
  ...primaryWins,
  revisionMetadata: {
    revision: 3,
    parentRevision: 1,
    transactionId: "test:newest",
    reason: "out-of-order-test",
    capturedAt: new Date().toISOString(),
  },
};
const stale = {
  ...primaryWins,
  revisionMetadata: {
    revision: 2,
    parentRevision: 1,
    transactionId: "test:stale",
    reason: "out-of-order-test",
    capturedAt: new Date().toISOString(),
  },
};
assert.equal(await store.commitPayload(newest), true);
assert.equal(await store.commitPayload(stale), false, "an older completion cannot replace revision 3");
assert.equal(store.loadForDisplay().revisionMetadata.revision, 3);

const upgrades = new UpgradeSystem();
upgrades.setMoney(100);
assert.equal(upgrades.setMoney(12.345), 12.35, "wallet authority applies canonical rounding");
upgrades.setMoney(100);
assert.equal(upgrades.setMoney(Number.NaN), 100);
assert.equal(upgrades.addMoney(Number.POSITIVE_INFINITY), 100);
assert.equal(upgrades.spendMoney(-1), false);
assert.equal(upgrades.getMoney(), 100);

const dig = new DigSystem(null, null, { mineCooldownMs: 750 });
dig.setResourceTotals({ dirt: 5 });
assert.equal(dig.setResourceTotals({ dirt: Number.NaN }), false);
assert.equal(dig.getResourceTotals().dirt, 5);
assert.equal(dig.setResourceTotals({ dirt: -1 }), false);
assert.equal(dig.getResourceTotals().dirt, 5);

const levels = new PlayerLevelSystem();
assert.equal(levels.fromJSON({ level: Number.POSITIVE_INFINITY }), false);
assert.equal(levels.level, 1);
assert.equal(levels.gainLevel(-4).success, false);
assert.equal(levels.level, 1);
assert.equal(levels._applyAutomaticMilestoneRewards([5, 5]).count, 2);

assert.equal(validateSaveSnapshotIntegrity({
  worldIdentity: world,
  resources: { dirt: Number.NaN },
  upgrades: { money: 1 },
}).ok, false);

const committed = [];
const coordinator = new GameSaveCoordinator({
  capture: metadata => ({ metadata }),
  write: async snapshot => { committed.push(snapshot.metadata.revision); return true; },
  validate: () => ({ ok: true }),
}, undefined, {
  setTimer: () => 1,
  clearTimer() {},
  documentRef: null,
  windowRef: null,
});
coordinator.requestSnapshot("first");
const first = coordinator.flush({ force: true });
await Promise.resolve();
coordinator.requestSnapshot("second");
const second = coordinator.flush({ force: true });
await Promise.all([second, first]);
assert.deepEqual(committed, [1, 2], "out-of-order callers must still commit monotonically");

const interruptedWrites = [];
const interrupted = new GameSaveCoordinator({
  capture: metadata => ({ metadata }),
  write: async snapshot => {
    interruptedWrites.push(snapshot.metadata.revision);
    return snapshot.metadata.revision !== 1;
  },
  validate: () => ({ ok: true }),
}, undefined, { setTimer: () => 1, clearTimer() {}, documentRef: null, windowRef: null });
interrupted.requestSnapshot("interrupted");
assert.equal(await interrupted.flush({ force: true }), false);
assert.equal(interrupted.getSnapshot().committedRevision, 0);
assert.deepEqual(interruptedWrites, [1]);

for (let index = 0; index < 200; index += 1) {
  const invalid = index % 2 ? Number.NaN : Number.MAX_VALUE;
  const before = upgrades.getMoney();
  upgrades.addMoney(invalid);
  assert.equal(upgrades.getMoney(), before);
}

console.log("save v15 integrity contract: migration, monotonic writes, corruption and numeric rejection passed");
