import assert from "node:assert/strict";

import { setupUIMethods } from "../world/playScene/PlaySceneUI.js";

const prototype = {};
setupUIMethods(prototype);

function deferred() {
  let resolve;
  const promise = new Promise(next => { resolve = next; });
  return { promise, resolve };
}

const save = deferred();
const calls = {
  hide: 0,
  queue: 0,
  flush: 0,
  starts: [],
  flushOptions: null,
};
const scene = Object.assign(Object.create(prototype), {
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
});

const firstExit = scene.returnToMainMenu();
const duplicateExit = scene.returnToMainMenu();
assert.equal(firstExit, duplicateExit, "double activation must share one in-flight exit");
assert.equal(scene.gameState, "transitioning");
assert.equal(calls.hide, 1);
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
  const saveFailureScene = Object.assign(Object.create(prototype), {
    hidePauseMenu() {},
    queueDugTilesSave() {},
    async flushDugTilesSave() { throw new TypeError("simulated save teardown"); },
    scene: {
      start(key) { saveFailureStarts.push(key); },
    },
  });
  assert.equal(await saveFailureScene.returnToMainMenu(), true);
  assert.deepEqual(saveFailureStarts, ["MainMenuScene"]);
  assert.equal(warnings.length >= 2, true, "save failure must be reported without aborting exit");
} finally {
  console.warn = originalWarn;
}

console.log("Main-menu return contract passed: one save, one transition, no uncaught teardown error.");
