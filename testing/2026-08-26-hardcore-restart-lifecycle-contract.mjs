import assert from "node:assert/strict";

import { createHardcoreRecapAction } from
  "../ui/overlays/hardcoreRecapAction.js";
import { destroyHardcoreModeRuntime } from
  "../world/playScene/HardcoreModeBridge.js";

const image = {
  scene: undefined,
  setDisplaySize() { return this; },
  setScrollFactor(value) { this.scrollFactorX = this.scrollFactorY = value; return this; },
  setInteractive() { return this; },
  on() { return this; },
  removeAllListeners() {},
  disableInteractive() {
    throw new Error("destroyed image has no scene sys");
  },
};
const root = {
  setVisible() { return this; },
  add() { return this; },
};
const actionScene = {
  textures: { exists: () => true },
  add: {
    container: () => root,
    image: () => image,
    text: () => ({ setOrigin() { return this; } }),
  },
  tweens: { add() {} },
};
const action = createHardcoreRecapAction({
  scene: actionScene,
  config: {
    recap: {
      actionWidth: 320,
      actionHeight: 72,
      actionHoverScale: 1.02,
      actionPressScale: 0.98,
      actionTweenMs: 80,
      font: { actionPx: 18 },
    },
  },
  x: 0,
  y: 0,
  label: "REVIVE",
  color: "#ffffff",
  activate() {},
});

assert.equal(image.scrollFactorX, 0, "Death buttons must hit-test in the same fixed space as their artwork");
assert.equal(image.scrollFactorY, 0);
assert.doesNotThrow(() => action.destroy());
assert.doesNotThrow(() => action.destroy());

const handler = () => {};
let clearedFloorProvider = "not-called";
const runtime = {
  bindings: { requestHardcoreAction: handler },
  hud: { destroy() {} },
  modal: {
    destroy() {
      throw new Error("simulated presentation cleanup failure");
    },
  },
  gpFloorProvider: () => 1,
  config: { diagnostics: { globalKey: "__testHardcoreRuntime" } },
};
const runtimeScene = {
  _hardcoreRuntime: runtime,
  requestHardcoreAction: handler,
  playerController: {
    setGemPowerFloorProvider(value) {
      clearedFloorProvider = value;
    },
  },
};
let cleanupError = null;
try {
  destroyHardcoreModeRuntime(runtimeScene);
} catch (error) {
  cleanupError = error;
}

assert.match(cleanupError?.message || "", /simulated presentation cleanup failure/);
assert.equal(runtimeScene._hardcoreRuntime, null);
assert.equal(runtimeScene.requestHardcoreAction, undefined);
assert.equal(clearedFloorProvider, null);
assert.equal(runtime.gpFloorProvider, null);

console.log("hardcore restart lifecycle contract: ok");
