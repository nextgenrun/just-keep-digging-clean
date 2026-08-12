import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { GameSaveCoordinator } from "../systems/save-system/GameSaveCoordinator.js";
import { SAVE_SCHEDULING_CONFIG } from "../values/saveScheduling.js";

let nowMs = 0;
let nextTimerId = 0;
const timers = new Map();
let idleCallback = null;
let idleTimeout = null;
const writes = [];
const documentListeners = new Map();
const windowListeners = new Map();
const documentRef = {
  visibilityState: "visible",
  addEventListener(event, listener) { documentListeners.set(event, listener); },
  removeEventListener(event, listener) {
    if (documentListeners.get(event) === listener) documentListeners.delete(event);
  },
};
const windowRef = {
  addEventListener(event, listener) { windowListeners.set(event, listener); },
  removeEventListener(event, listener) {
    if (windowListeners.get(event) === listener) windowListeners.delete(event);
  },
};
const coordinator = new GameSaveCoordinator({
  initialRevision: 4,
  capture: metadata => ({ metadata }),
  validate: () => ({ ok: true }),
  async write(snapshot) { writes.push(snapshot); return true; },
}, SAVE_SCHEDULING_CONFIG, {
  now: () => nowMs,
  setTimer(callback, delay) {
    const id = nextTimerId += 1;
    timers.set(id, { callback, delay });
    return id;
  },
  clearTimer(id) { timers.delete(id); },
  requestIdle(callback, options) {
    idleCallback = callback;
    idleTimeout = options.timeout;
    return 91;
  },
  cancelIdle() { idleCallback = null; },
  documentRef,
  windowRef,
});

assert.equal(documentListeners.has(SAVE_SCHEDULING_CONFIG.events.visibilityChange), true);
assert.equal(windowListeners.has(SAVE_SCHEDULING_CONFIG.events.pageHide), true);
assert.equal(coordinator.requestSnapshot("mine"), true);
nowMs = 100;
assert.equal(coordinator.requestSnapshot("mine"), true);
assert.equal(timers.size, 1, "repeated mutations must keep one debounce timer");
assert.equal([...timers.values()][0].delay, SAVE_SCHEDULING_CONFIG.debounceMs);
const firstTimer = [...timers.values()][0];
timers.clear();
firstTimer.callback();
assert.equal(typeof idleCallback, "function");
assert.ok(idleTimeout <= SAVE_SCHEDULING_CONFIG.idleTimeoutMs);
const runIdle = idleCallback;
idleCallback = null;
runIdle({ didTimeout: false, timeRemaining: () => 8 });
await Promise.resolve();
await Promise.resolve();
assert.equal(writes.length, 1);
assert.equal(writes[0].metadata.revision, 5);
assert.equal(writes[0].metadata.parentRevision, 4);
assert.equal(coordinator.getSnapshot().coalescedRequests, 1);

nowMs = 1000;
coordinator.requestSnapshot("world-change");
nowMs = 2700;
coordinator.requestSnapshot("world-change");
assert.equal([...timers.values()][0].delay, 100, "max delay must cap debounce extension");
coordinator.cancelPending();
assert.equal(coordinator.getSnapshot().pending, true, "cancel only removes timing handles, not dirty state");
await coordinator.flush({ force: true, reason: "manual" });
assert.equal(writes.at(-1).metadata.revision, 6);

const mutationOrder = [];
const transaction = await coordinator.transaction({
  id: "reward:one",
  mutate() { mutationOrder.push("mutate"); return 7; },
  rollback() { mutationOrder.push("rollback"); },
});
assert.equal(transaction.success, true);
assert.equal(writes.at(-1).metadata.revision, 7);
assert.equal(writes.at(-1).metadata.transactionId, "reward:one");
const duplicate = await coordinator.transaction({
  id: "reward:one",
  mutate() { mutationOrder.push("duplicate-mutate"); },
});
assert.equal(duplicate.duplicate, true);
assert.deepEqual(mutationOrder, ["mutate"]);

documentRef.visibilityState = SAVE_SCHEDULING_CONFIG.events.hiddenState;
coordinator.requestSnapshot("hidden-test");
documentListeners.get(SAVE_SCHEDULING_CONFIG.events.visibilityChange)();
await coordinator.flush();
assert.equal(coordinator.getSnapshot().forcedFlushes, 2);

coordinator.destroy();
assert.equal(documentListeners.size, 0);
assert.equal(windowListeners.size, 0);

const uiSource = readFileSync("world/playScene/PlaySceneUI.js", "utf8");
assert.match(uiSource, /gameSaveCoordinator\?\.requestSnapshot/);
assert.match(uiSource, /gameSaveCoordinator\?\.flush/);
assert.doesNotMatch(uiSource, /savingDugTiles|_dugTileSavePromise/);
const lifecycleSource = readFileSync("world/playScene/PlaySceneLifecycle.js", "utf8");
assert.match(lifecycleSource, /SAVE_SCHEDULING_CONFIG\.autosaveIntervalMs/);
assert.match(lifecycleSource, /reason: "scene-shutdown"/);

console.log("game save coordinator contract: ordered revisions, coalescing, transactions, lifecycle flush");
