import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  RANDOM_EVENT_TYPE_ORDER,
  RANDOM_EVENT_TYPES,
  RANDOM_WORLD_EVENT_CONFIG,
  resolveRandomEventFlags,
} from "../values/randomWorldEvents.js";
import {
  RandomEventDirector,
  sanitizeRandomEventData,
} from "../systems/events/RandomEventDirector.js";
import {
  buildSleepingJackpotQuote,
  createSealedJackpotRecord,
  isSleepingJackpotCandidate,
  resolveJackpotResources,
} from "../systems/events/SleepingJackpotRules.js";
import { RESOURCE_KEYS, createZeroResourceTotals } from "../values/resourceTypes.js";
import { getCargoSellValue } from "../values/resourcePrices.js";
import { JackpotSaveTransaction } from "../systems/events/JackpotSaveTransaction.js";
import { RandomEventBridge } from "../world/playScene/RandomEventBridge.js";
import { hasEscapeClosableUi } from "../world/playScene/hasEscapeClosableUi.js";

const seed = 7331;
const tile = (() => {
  for (let tx = 0; tx < 100; tx += 1) {
    for (let ty = 0; ty < 100; ty += 1) {
      if (isSleepingJackpotCandidate({ tx, ty }, seed)) return { tx, ty, key: `${tx},${ty}`, depth: ty };
    }
  }
  throw new Error("No deterministic rare chest candidate found");
})();

assert.equal(isSleepingJackpotCandidate(tile, seed), true, "rare chest predicate is deterministic");
assert.equal(
  isSleepingJackpotCandidate(tile, seed),
  isSleepingJackpotCandidate(tile, seed),
  "candidate cannot reroll",
);

const resources = Object.fromEntries(RESOURCE_KEYS.map((key, index) => [key, index + 1]));
const quote = buildSleepingJackpotQuote({
  tile,
  wallet: 1000,
  resources,
  targetDepth: 300,
  seed,
});
assert.equal(quote.immediate.enabled, true);
assert.equal(quote.immediate.wager, 200, "wallet wager uses authoritative fraction");
assert.equal(quote.immediate.possibleGain, 600, "displayed net gain is authoritative");
assert.equal(quote.maturity.enabled, true);
assert.equal(Object.keys(quote.maturity.escrow).length, RESOURCE_KEYS.length, "all 14 ordinary stacks are quoted");

const unsafeWalletQuote = buildSleepingJackpotQuote({
  tile,
  wallet: Number.MAX_SAFE_INTEGER,
  resources,
  targetDepth: 300,
  seed,
});
assert.equal(unsafeWalletQuote.immediate.enabled, false,
  "GAMBLE is disabled when wallet plus possible gain is unsafe");

const record = createSealedJackpotRecord(tile, quote.maturity, 1234);
const restoredQuote = buildSleepingJackpotQuote({
  tile,
  wallet: 1000,
  resources,
  targetDepth: 300,
  seed,
});
assert.equal(restoredQuote.maturity.outcomeSeed, record.outcomeSeed, "maturity seed is stable");
assert.equal(restoredQuote.maturity.outcome, record.outcome, "maturity outcome cannot reroll");

const current = Object.fromEntries(RESOURCE_KEYS.map(key => [key, 2]));
const win = resolveJackpotResources(current, { ...record, outcome: "win" });
assert.equal(win.success, true);
for (const [index, key] of RESOURCE_KEYS.entries()) {
  assert.equal(win.next[key], 2 + (index + 1) * 9, `${key} receives its own exact ×9 stack`);
}
const loss = resolveJackpotResources(current, { ...record, outcome: "loss" });
assert.equal(loss.success, true);
assert.deepEqual(loss.next, current, "resources mined while sleeping survive a loss");
for (const [index, key] of RESOURCE_KEYS.entries()) {
  assert.equal(loss.deltas[key], -(index + 1), `${key} reports its exact lost escrow`);
}

const unsafe = resolveJackpotResources(
  { ...createZeroResourceTotals(), gold: Number.MAX_SAFE_INTEGER },
  { ...record, outcome: "win" },
);
assert.equal(unsafe.success, false, "unsafe maturity addition is rejected, never clamped");

assert.deepEqual(
  RANDOM_EVENT_TYPE_ORDER,
  [
    RANDOM_EVENT_TYPES.CRYSTAL_CHOIR,
    RANDOM_EVENT_TYPES.BLACKOUT_BLOOM,
    RANDOM_EVENT_TYPES.MONEY_MONSTER_RUSH,
  ],
  "only the three retained ambient random events are schedulable",
);
const flagsOff = resolveRandomEventFlags("?randomEvents=0&blackoutBloom=1");
assert.equal(flagsOff.master, false);
assert.equal(flagsOff.blackoutBloom, false, "parent rollback wins over child flag");
const flagsSelective = resolveRandomEventFlags("?crystalChoir=0&moneyMonsterRush=0");
assert.equal("lumenBloom" in flagsSelective, false, "retired event flag is absent");
assert.equal(flagsSelective.crystalChoir, false);
assert.equal(flagsSelective.moneyMonsterRush, false);
const retiredForce = resolveRandomEventFlags("?randomEventDebug=1&randomEvent=lumenBloom");
assert.equal(retiredForce.forcedType, null, "retired event cannot be forced through the query string");

const director = new RandomEventDirector(seed, flagsSelective);
director.recordRecentResource("gold");
assert.equal(director.selectRushTarget({ gold: 4, dirt: 20 }), "gold", "recent carried material wins target selection");
assert.equal(director.selectRushTarget(createZeroResourceTotals()), "gold",
  "recently mined remains eligible after it is sold or spent");
const carriedOnlyDirector = new RandomEventDirector(seed, {});
assert.equal(
  carriedOnlyDirector.selectRushTarget({ ...createZeroResourceTotals(), dirt: 3 }),
  "dirt",
  "a carried Level One resource is eligible without recent history",
);
const rush = director.start(RANDOM_EVENT_TYPES.MONEY_MONSTER_RUSH, {
  targetResource: "gold",
  startedDepth: 80,
});
assert.equal(rush.remainingMs, RANDOM_WORLD_EVENT_CONFIG.moneyMonsterRush.durationMs);
director.tick(15000, { pauseTimer: true });
assert.equal(rush.remainingMs, 90000, "blocking/shop pause cannot consume Rush time");
director.tick(15000);
assert.equal(rush.remainingMs, 75000, "active-play delta decrements Rush exactly");
director.addRushBonus(321);
assert.equal(director.getSnapshot().active.bonusMoney, 321);

const savedMidRush = director.getSaveData();
const restoredDirector = new RandomEventDirector(seed, flagsSelective);
restoredDirector.loadSaveData(savedMidRush);
assert.deepEqual(restoredDirector.getSaveData(), savedMidRush, "mid-event state roundtrips exactly");

const choirId = "cave-a";
const choirAnchors = [10, 12, 14, 16, 18].map(tx => ({ tx, ty: 20 }));
const choirDirector = new RandomEventDirector(seed, {});
choirDirector.start(RANDOM_EVENT_TYPES.CRYSTAL_CHOIR, {
  choirId,
  anchors: choirAnchors,
  sequence: [0, 2, 4],
});
choirDirector.finish();
assert.equal(choirDirector.hasCompletedChoir(choirId), true,
  "a completed chamber is permanently marked");
const restoredChoirDirector = new RandomEventDirector(seed, {});
restoredChoirDirector.loadSaveData(choirDirector.getSaveData());
assert.equal(restoredChoirDirector.hasCompletedChoir(choirId), true,
  "completed Choir identity survives save/load");
const interruptedChoirDirector = new RandomEventDirector(seed, {});
interruptedChoirDirector.start(RANDOM_EVENT_TYPES.CRYSTAL_CHOIR, {
  choirId: "interrupted-cave",
  anchors: choirAnchors,
  sequence: [0, 1, 2],
});
interruptedChoirDirector.finish({ interrupted: true });
assert.equal(interruptedChoirDirector.hasCompletedChoir("interrupted-cave"), false,
  "an interrupted chamber remains eligible later");

const corrupt = sanitizeRandomEventData({
  cooldownMs: -1,
  recentResources: ["magmaCrystal", "gold", "gold"],
  active: {
    type: RANDOM_EVENT_TYPES.MONEY_MONSTER_RUSH,
    remainingMs: Infinity,
    targetResource: "magmaCrystal",
  },
}, seed);
assert.deepEqual(corrupt.recentResources, ["gold"], "Level Two Rush targets are removed");
assert.equal(corrupt.active, null, "an invalid or Level Two Rush is discarded");
assert.equal(corrupt.cooldownMs, RANDOM_WORLD_EVENT_CONFIG.scheduler.retryCooldownMs);

const retiredType = "lumenBloom";
const legacyState = {
  version: 1,
  seed: 4421,
  serial: 17,
  cooldownMs: 0,
  active: {
    id: "retired-event-save",
    type: retiredType,
    remainingMs: 12000,
    phase: "withered",
    route: [{ tx: 4, ty: 8 }],
    progress: 1,
  },
  recentTypes: [RANDOM_EVENT_TYPES.CRYSTAL_CHOIR, retiredType, RANDOM_EVENT_TYPES.BLACKOUT_BLOOM],
  recentResources: ["gold"],
  sleepingJackpot: record,
  completedChoirs: [choirId],
  stats: { started: 8, completed: 3, interrupted: 1 },
};
const migrated = sanitizeRandomEventData(legacyState, seed);
assert.equal(migrated.version, 2);
assert.equal(migrated.active, null, "retired active event is discarded without payout");
assert.equal(migrated.cooldownMs, RANDOM_WORLD_EVENT_CONFIG.scheduler.retryCooldownMs);
assert.deepEqual(migrated.recentTypes, [
  RANDOM_EVENT_TYPES.CRYSTAL_CHOIR,
  RANDOM_EVENT_TYPES.BLACKOUT_BLOOM,
]);
assert.deepEqual(migrated.recentResources, legacyState.recentResources);
assert.deepEqual(migrated.completedChoirs, legacyState.completedChoirs);
assert.equal(migrated.sleepingJackpot.outcomeSeed, record.outcomeSeed);
assert.deepEqual(migrated.stats, legacyState.stats);
assert.deepEqual(
  sanitizeRandomEventData(migrated, seed),
  migrated,
  "retired-event migration is idempotent",
);

const retiredDirector = new RandomEventDirector(seed, {});
const retiredBefore = retiredDirector.getSaveData();
assert.equal(retiredDirector.start(retiredType), null, "retired event cannot start directly");
assert.deepEqual(retiredDirector.getSaveData(), retiredBefore, "rejected start cannot mutate scheduler state");

let migrationSaves = 0;
const migrationBridge = Object.assign(Object.create(RandomEventBridge.prototype), {
  director: new RandomEventDirector(seed, {}),
  flags: { master: true },
  scene: {
    queueDugTilesSave: () => { migrationSaves += 1; },
    digSystem: { getResourceTotals: () => ({}) },
  },
  jackpot: { reconcileAfterLoad() {} },
});
const migratedThroughBridge = migrationBridge.loadSaveData(legacyState);
assert.equal(migratedThroughBridge.active, null);
assert.equal(migrationSaves, 1, "loading a retired active event queues one cleaned save");

const cargoBridge = Object.create(RandomEventBridge.prototype);
cargoBridge.flags = { master: true, moneyMonsterRush: true };
cargoBridge.director = { state: { active: null } };
const mixedCargo = {
  ...createZeroResourceTotals(),
  dirt: 1,
  darkDirtNormal: 2,
  magmaCrystal: 3,
};
assert.equal(
  cargoBridge.quoteCargoValue(mixedCargo, {}),
  getCargoSellValue(mixedCargo, {}),
  "inactive Rush preserves the complete baseline cargo value",
);

let observedTickOptions = null;
const pausedBridge = Object.create(RandomEventBridge.prototype);
pausedBridge.flags = { master: true };
pausedBridge.jackpot = { update() {} };
pausedBridge.director = {
  state: {
    active: {
      id: "pause-test",
      type: RANDOM_EVENT_TYPES.MONEY_MONSTER_RUSH,
      targetResource: "gold",
      remainingMs: 90000,
      suspended: false,
    },
  },
  setSuspended() {},
  tick(_delta, options) {
    observedTickOptions = options;
    return { ready: false, expired: false };
  },
};
pausedBridge._trackResourceGains = () => {};
pausedBridge._isMajorHazardSafe = () => true;
pausedBridge._updateActive = () => {};
pausedBridge._syncPresentation = () => {};
pausedBridge.update(1000, 250, { tx: 0, ty: 0 }, { pauseTimer: true });
assert.equal(
  observedTickOptions?.pauseTimer,
  true,
  "blocking-UI pause reaches the authoritative event timer",
);
assert.equal(
  hasEscapeClosableUi({ _randomEventModalVisible: true }),
  true,
  "Jackpot modals use the shared blocking-UI timer pause",
);

let rollbackMoney = 500;
let rollbackResources = { ...resources };
let rollbackRetention = { chests: 0 };
let rollbackJourney = { events: [] };
let restoredChests = 0;
let queuedSaves = 0;
let flushes = 0;
const rollbackDirector = new RandomEventDirector(seed, {});
const rollbackScene = {
  upgradeSystem: {
    getMoney: () => rollbackMoney,
    setMoney: value => { rollbackMoney = value; },
  },
  digSystem: {
    getResourceTotals: () => ({ ...rollbackResources }),
    setResourceTotals: value => { rollbackResources = { ...value }; },
  },
  retentionProgressSystem: {
    getSaveData: () => ({ ...rollbackRetention }),
    loadSaveData: value => { rollbackRetention = { ...value }; },
    expedition: { chests: 0 },
  },
  journeySystem: {
    getSaveData: () => JSON.parse(JSON.stringify(rollbackJourney)),
    loadSaveData: value => { rollbackJourney = JSON.parse(JSON.stringify(value)); },
  },
  specialTileSystem: { restoreChestForEvent: () => { restoredChests += 1; } },
  uiResourceBar: { setResources() {}, setMoney() {} },
  queueDugTilesSave: () => { queuedSaves += 1; },
  async flushDugTilesSave() {
    flushes += 1;
    return false;
  },
};
const transaction = new JackpotSaveTransaction(rollbackScene, rollbackDirector);
const transactionSnapshot = transaction.capture({
  chest: { key: tile.key, tx: tile.tx, ty: tile.ty },
});
rollbackMoney = 999;
rollbackResources = createZeroResourceTotals();
rollbackRetention = { chests: 1 };
rollbackScene.retentionProgressSystem.expedition = { chests: 1 };
rollbackJourney = { events: [{ id: "unsaved" }] };
rollbackDirector.state.serial = 99;
await assert.rejects(
  () => transaction.commit(transactionSnapshot),
  /SAVE FAILED/,
);
assert.equal(rollbackMoney, transactionSnapshot.money, "failed save restores wallet");
assert.deepEqual(rollbackResources, transactionSnapshot.resources, "failed save restores inventory");
assert.deepEqual(rollbackDirector.getSaveData(), transactionSnapshot.eventData, "failed save restores event state");
assert.deepEqual(rollbackRetention, transactionSnapshot.retentionData, "failed save restores retention state");
assert.deepEqual(rollbackScene.retentionProgressSystem.expedition,
  transactionSnapshot.retentionExpedition, "failed save restores expedition state");
assert.deepEqual(rollbackJourney, transactionSnapshot.journeyData, "failed save restores Journey history");
assert.equal(restoredChests, 1, "failed save restores chest ownership");
assert.equal(queuedSaves, 2, "failed commit queues a compensating snapshot");
assert.equal(flushes, 2, "failed commit attempts one compensating flush");
const files = {
  setup: readFileSync("world/playScene/PlaySceneSetup.js", "utf8"),
  update: readFileSync("world/playScene/PlaySceneUpdate.js", "utf8"),
  ui: readFileSync("world/playScene/PlaySceneUI.js", "utf8"),
  saveRuntime: readFileSync("world/playScene/PlaySceneSaveRuntime.js", "utf8"),
  shop: readFileSync("ui/overlays/ShopOverlay.js", "utf8"),
  special: readFileSync("systems/mining/SpecialTileSystem.js", "utf8"),
  promise: readFileSync("systems/visual/NextPromiseHudSystem.js", "utf8"),
  values: readFileSync("values/randomWorldEvents.js", "utf8"),
  director: readFileSync("systems/events/RandomEventDirector.js", "utf8"),
  planner: readFileSync("world/playScene/RandomEventPlanner.js", "utf8"),
  bridge: readFileSync("world/playScene/RandomEventBridge.js", "utf8"),
  activeRuntime: readFileSync("world/playScene/RandomEventActiveRuntime.js", "utf8"),
  eventView: readFileSync("systems/visual/RandomEventWorldView.js", "utf8"),
  jackpot: readFileSync("world/playScene/SleepingJackpotBridge.js", "utf8"),
  world: readFileSync("world/model/WorldModel.js", "utf8"),
  cinematic: readFileSync("systems/visual/DepthMilestoneCinematic.js", "utf8"),
  modal: readFileSync("ui/overlays/SleepingJackpotModalOverlay.js", "utf8"),
};
for (const name of ["values", "director", "planner", "bridge", "activeRuntime", "eventView"]) {
  assert.doesNotMatch(files[name], /lumen/i, `${name} must not contain retired event wiring`);
}
assert.match(files.setup, /new RandomEventBridge\(this\)/);
assert.match(files.setup, /setChestEventHandler/);
assert.match(files.update, /randomEventBridge\?\.update/);
assert.match(files.update, /shouldConsumeMineTarget/);
assert.match(files.update, /checkJackpotMaturity/);
assert.match(files.saveRuntime, /randomWorldEvents: scene\.randomEventBridge/);
assert.match(files.shop, /quoteSaleUnit/);
assert.match(files.shop, /recordRushSale/);
assert.match(files.special, /consumeChestForEvent/);
assert.match(files.promise, /getNextPromiseOverride/);
assert.match(files.setup, /setTileDamageGuard/);
assert.match(files.update, /pauseTimer:\s*hasEscapeClosableUi\(this\)/);
assert.match(files.update, /milestoneBoardSystem && !this\._randomEventModalVisible/);
assert.match(files.planner, /hasCompletedChoir/);
assert.match(files.jackpot,
  /const snapshot = this\.transaction\.capture\(\);[\s\S]{0,120}setResourceTotals\(createZeroResourceTotals\(\)\)/);
assert.match(files.world, /reason: "event-protected"/);
assert.match(files.special, /restoreChestForEvent/);
assert.match(files.cinematic, /s\._randomEventModalVisible/);
assert.match(files.modal, /uiNotifications\?\.setPaused\?\.\(false\)/);

function assertTransparentPng(path) {
  const png = readFileSync(path);
  assert.equal(png.subarray(1, 4).toString("ascii"), "PNG");
  assert.equal(png.readUInt32BE(16), 1672);
  assert.equal(png.readUInt32BE(20), 941);
  assert.equal(png[25], 6, `${path} must be RGBA`);
}
assertTransparentPng("sprites/UI/random-events-v1/sleeping-jackpot-panel-v1.png");
assertTransparentPng("sprites/environment/random-events-v1/random-event-sigils-v1.png");

console.log("random-world-events contract ok");
