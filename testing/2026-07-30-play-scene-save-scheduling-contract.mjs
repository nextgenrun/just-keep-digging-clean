import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { SAVE_SCHEDULING_CONFIG } from "../values/saveScheduling.js";
import { PlaySceneSaveScheduler } from "../world/playScene/PlaySceneSaveScheduler.js";

let nowMs = 0;
let nextTimerId = 0;
const timers = new Map();
let idleCallback = null;
let idleTimeout = null;
let cancelledIdle = 0;
const flushes = [];
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
const scene = {
  async flushDugTilesSave(options) {
    flushes.push(options);
    return true;
  },
};
const scheduler = new PlaySceneSaveScheduler(scene, SAVE_SCHEDULING_CONFIG, {
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
  cancelIdle() {
    idleCallback = null;
    cancelledIdle += 1;
  },
  documentRef,
  windowRef,
});

assert.equal(documentListeners.has(SAVE_SCHEDULING_CONFIG.events.visibilityChange), true);
assert.equal(windowListeners.has(SAVE_SCHEDULING_CONFIG.events.pageHide), true);
assert.equal(scheduler.schedule(), true);
nowMs = 100;
assert.equal(scheduler.schedule(), true);
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
assert.equal(flushes.length, 1);
assert.deepEqual(flushes[0], { scheduled: true });
assert.equal(scheduler.getSnapshot().coalescedRequests, 1);

nowMs = 1000;
scheduler.schedule();
nowMs = 2700;
scheduler.schedule();
assert.equal([...timers.values()][0].delay, 100, "max delay must cap debounce extension");
scheduler.cancelPending();
assert.equal(scheduler.getSnapshot().pending, false);

scheduler.recordTiming({ captureMs: 12, writeMs: 25, totalMs: 40 });
scheduler.recordTiming({ captureMs: 18, writeMs: 35, totalMs: 55 });
const timingSnapshot = scheduler.getSnapshot();
assert.equal(timingSnapshot.capture.p95Ms, 18);
assert.equal(timingSnapshot.write.p95Ms, 35);
assert.equal(timingSnapshot.total.p95Ms, 55);

documentRef.visibilityState = SAVE_SCHEDULING_CONFIG.events.hiddenState;
documentListeners.get(SAVE_SCHEDULING_CONFIG.events.visibilityChange)();
await Promise.resolve();
assert.deepEqual(flushes.at(-1), { scheduled: false, force: true });
windowListeners.get(SAVE_SCHEDULING_CONFIG.events.pageHide)();
await Promise.resolve();
assert.equal(scheduler.getSnapshot().forcedFlushes, 2);

scheduler.destroy();
assert.equal(documentListeners.size, 0);
assert.equal(windowListeners.size, 0);
assert.ok(cancelledIdle >= 0);

const uiSource = readFileSync("world/playScene/PlaySceneUI.js", "utf8");
const queueSource = uiSource.match(/prototype\.queueDugTilesSave[\s\S]*?\n  };/)?.[0] || "";
assert.match(queueSource, /_saveScheduler\?\.schedule/);
assert.doesNotMatch(queueSource, /this\.flushDugTilesSave\(\);/);
assert.match(uiSource, /flushDugTilesSave = async function\(\{ scheduled = false, force = false \}/);
assert.match(uiSource, /recordTiming/);
const setupSource = readFileSync("world/playScene/PlaySceneSetup.js", "utf8");
const lifecycleSource = readFileSync("world/playScene/PlaySceneLifecycle.js", "utf8");
assert.match(lifecycleSource, /SAVE_SCHEDULING_CONFIG\.autosaveIntervalMs/);
assert.match(lifecycleSource, /flushDugTilesSave\?\.\(\{ scheduled: false, force: true \}\)/);
assert.match(setupSource, /installPlaySceneLifecycle\(this\)/);

console.log("play scene save scheduling contract: ok");
