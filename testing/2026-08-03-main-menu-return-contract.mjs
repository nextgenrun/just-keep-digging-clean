import assert from "node:assert/strict";

import { setupUIMethods } from "../world/playScene/PlaySceneUI.js";
import { SceneModeController } from "../systems/runtime/SceneModeController.js";
import { SCENE_BASE_PHASES } from "../values/sceneRuntime.js";

const prototype = {};
setupUIMethods(prototype, {});

function attachSceneMode(scene) {
  const controller = new SceneModeController({ basePhase: SCENE_BASE_PHASES.ACTIVE });
  scene.sceneModeController = controller;
  scene.setSceneBasePhase = (phase, context) => controller.setBasePhase(phase, context);
  Object.defineProperty(scene, "gameState", { get: () => controller.legacyGameState });
  return scene;
}

function deferred() {
  let resolve;
  const promise = new Promise(next => { resolve = next; });
  return { promise, resolve };
}

const save = deferred();
const calls = {
  hide: 0,
  release: 0,
  queue: 0,
  flush: 0,
  starts: [],
  flushOptions: null,
};
const scene = attachSceneMode(Object.assign(Object.create(prototype), {
  _pauseSuspension: { release() { calls.release += 1; return true; } },
  hidePauseMenu() { calls.hide += 1; },
  queueDugTilesSave() { calls.queue += 1; },
  flushDugTilesSave(options) {
    calls.flush += 1;
    calls.flushOptions = options;
    return save.promise;
  },
  scene: {
    start(key) { calls.starts.push(key); },
  },
}));

const firstExit = scene.returnToMainMenu();
const duplicateExit = scene.returnToMainMenu();
assert.equal(firstExit, duplicateExit, "double activation must share one in-flight exit");
assert.equal(scene.gameState, "transitioning");
assert.equal(calls.hide, 1);
assert.equal(calls.release, 1, "hidden pause ownership must be released before saving");
assert.equal(calls.queue, 1);
assert.equal(calls.flush, 1);
assert.deepEqual(calls.flushOptions, { scheduled: false, force: true });
save.resolve(true);
assert.equal(await firstExit, true);
assert.deepEqual(calls.starts, ["MainMenuScene"]);

const originalWarn = console.warn;
const warnings = [];
console.warn = (...args) => warnings.push(args);
try {
  const saveFailureStarts = [];
  const saveFailureScene = attachSceneMode(Object.assign(Object.create(prototype), {
    hidePauseMenu() {},
    queueDugTilesSave() {},
    async flushDugTilesSave() { throw new TypeError("simulated save teardown"); },
    scene: {
      start(key) { saveFailureStarts.push(key); },
    },
  }));
  assert.equal(await saveFailureScene.returnToMainMenu(), true);
  assert.deepEqual(saveFailureStarts, ["MainMenuScene"]);
  assert.equal(warnings.length >= 2, true, "save failure must be reported without aborting exit");

  const cleanupFailureStarts = [];
  const cleanupFailureScene = attachSceneMode(Object.assign(Object.create(prototype), {
    _pauseSuspension: { release() { throw new Error("simulated pause release failure"); } },
    hidePauseMenu() { throw new Error("simulated pause cleanup failure"); },
    queueDugTilesSave() {},
    async flushDugTilesSave() { return true; },
    scene: { start(key) { cleanupFailureStarts.push(key); } },
  }));
  assert.equal(await cleanupFailureScene.returnToMainMenu(), true);
  assert.deepEqual(
    cleanupFailureStarts,
    ["MainMenuScene"],
    "pause cleanup failures must not trap the player in PlayScene",
  );

  const timeoutStarts = [];
  const timeoutScene = attachSceneMode(Object.assign(Object.create(prototype), {
    _mainMenuSaveTimeoutMs: 5,
    hidePauseMenu() {},
    queueDugTilesSave() {},
    flushDugTilesSave() { return new Promise(() => {}); },
    scene: {
      start(key) { timeoutStarts.push(key); },
    },
  }));
  assert.equal(await timeoutScene.returnToMainMenu(), true);
  assert.deepEqual(timeoutStarts, ["MainMenuScene"], "a hung save must not trap Escape exit");
  assert.equal(
    warnings.some(entry => entry.join(" ").includes("Save timed out")),
    true,
    "bounded save timeout must be reported",
  );
} finally {
  console.warn = originalWarn;
}

console.log("Main-menu return contract passed: one bounded save, one transition, no stuck pause state.");
