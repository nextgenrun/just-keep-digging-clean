import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { RUNTIME_CANARY_CONFIG } from "../values/runtimeCanaryConfig.js";
import { RuntimeCanarySystem } from "../systems/health/RuntimeCanarySystem.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

class Emitter {
  constructor() {
    this.listeners = new Map();
  }

  on(event, listener) {
    const listeners = this.listeners.get(event) || new Set();
    listeners.add(listener);
    this.listeners.set(event, listeners);
  }

  off(event, listener) {
    this.listeners.get(event)?.delete(listener);
  }
}

function fakeStorage() {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  };
}

let nowMs = 1000;
let intervalCallback = null;
let intervalCleared = false;
let workerStarted = 0;
let workerHeartbeats = 0;
let workerDestroyed = 0;
const workerBridge = {
  start: () => { workerStarted += 1; return true; },
  heartbeat: () => { workerHeartbeats += 1; },
  destroy: () => { workerDestroyed += 1; },
};
const globalRef = {
  localStorage: fakeStorage(),
  location: { search: "" },
};
const playScene = {
  sys: { settings: { key: "PlayScene" }, isActive: () => true },
  scene: { isActive: () => true },
  events: new Emitter(),
  load: new Emitter(),
};
const game = {
  canvas: { isConnected: true },
  loop: {
    frame: 1,
    actualFps: 60,
    running: true,
    inFocus: true,
  },
  scene: {
    scenes: [playScene],
    getScenes: () => [playScene],
  },
};
const monitor = new RuntimeCanarySystem({
  globalRef,
  documentRef: { hidden: false },
  now: () => nowMs,
  setIntervalFn: callback => {
    intervalCallback = callback;
    return 1;
  },
  clearIntervalFn: () => {
    intervalCleared = true;
  },
  workerBridge,
}).install();

monitor.attachGame(game);
assert.equal(typeof intervalCallback, "function");
assert.equal(workerStarted, 1);

nowMs += RUNTIME_CANARY_CONFIG.scenes.PlayScene.settleMs + 1;
game.loop.frame += 1;
let snapshot = monitor.sample();
assert.equal(snapshot.status, RUNTIME_CANARY_CONFIG.status.critical);
assert.ok(snapshot.findings.some(item => item.code === RUNTIME_CANARY_CONFIG.events.sceneInvariant));

for (const requiredPath of RUNTIME_CANARY_CONFIG.scenes.PlayScene.requiredPaths) {
  playScene[requiredPath] = {};
}
nowMs += RUNTIME_CANARY_CONFIG.timing.sampleIntervalMs;
game.loop.frame += 1;
snapshot = monitor.sample();
assert.equal(snapshot.status, RUNTIME_CANARY_CONFIG.status.healthy);

monitor.captureError("error", new Error("release-safety-probe"));
snapshot = monitor.snapshot();
assert.equal(snapshot.status, RUNTIME_CANARY_CONFIG.status.critical);
assert.equal(globalRef[RUNTIME_CANARY_CONFIG.globals.legacyErrors].length, 1);
assert.ok(globalRef.localStorage.getItem(RUNTIME_CANARY_CONFIG.storage.lastCriticalKey));

monitor.destroy();
assert.equal(intervalCleared, true);
assert.ok(workerHeartbeats >= 1);
assert.equal(workerDestroyed, 1);
assert.equal(globalRef[RUNTIME_CANARY_CONFIG.globals.monitor], undefined);

const mainSource = readFileSync(path.join(ROOT, "main.js"), "utf8");
const playSetupSource = readFileSync(path.join(ROOT, "world/playScene/PlaySceneSetup.js"), "utf8");
const qualityWorkflow = readFileSync(path.join(ROOT, ".github/workflows/quality-gates.yml"), "utf8");
const rollbackWorkflow = readFileSync(path.join(ROOT, ".github/workflows/rollback-candidate.yml"), "utf8");
const workerSource = readFileSync(
  path.join(ROOT, "systems/health/RuntimeHealthWorkerSource.js"),
  "utf8",
);

for (const token of [
  "installRuntimeCanarySystem",
  "installAdminHealthPanel",
  "runtimeCanarySystem.attachGame",
]) {
  assert.ok(mainSource.includes(token), `main.js missing ${token}`);
}
assert.ok(playSetupSource.includes("reportPlaySceneSetupFailure(err)"));

for (const token of [
  "pull_request:",
  "merge_group:",
  "contents: read",
  "structural-health:",
  "deep-regression:",
  "production-canary:",
  "celestial-engine-contracts:",
  "incident-alert:",
  "safety-gate:",
  "2026-07-22-all-game-systems-health-check.mjs",
  "2026-07-22-deep-game-logic-health.py",
  "2026-07-25-production-http-canary.py",
  "2026-07-26-celestial-engines-contract.mjs",
]) {
  assert.ok(qualityWorkflow.includes(token), `quality workflow missing ${token}`);
}
assert.ok(rollbackWorkflow.includes("workflow_dispatch:"));
assert.ok(rollbackWorkflow.includes("2026-07-25-production-http-canary.py"));
assert.ok(rollbackWorkflow.includes("rollback-candidate-"));
assert.ok(workerSource.includes("runtime-health-finding"));
assert.ok(workerSource.includes("Health Worker detected a frozen main thread"));

console.log("release safety contract: ok");
