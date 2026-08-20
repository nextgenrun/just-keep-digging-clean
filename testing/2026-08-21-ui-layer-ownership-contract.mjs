import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { ComboSystem } from "../systems/combo/ComboSystem.js";
import {
  closeTopUiLayer,
  getTopUiLayer,
  getUiLayerOwnershipSnapshot,
  installUiLayerDiagnostics,
} from "../world/playScene/UiLayerOwnership.js";

const closed = [];
const scene = {
  time: { now: 4200 },
  gameState: "paused",
  _pausePanel: {},
  resumeGame() {
    closed.push("pause-menu");
    this._pausePanel = null;
    this.gameState = "playing";
  },
  uiInventoryPopup: {
    isOpen: true,
    close() { closed.push("inventory"); this.isOpen = false; },
  },
  starHeartOverlay: {
    visible: true,
    isOpen() { return this.visible; },
    close() { closed.push("star-heart"); this.visible = false; },
  },
  _hardcoreRuntime: {
    modal: {
      isVisible: true,
      close() { closed.push("hardcore-modal"); this.isVisible = false; },
    },
  },
};

assert.equal(getTopUiLayer(scene)?.id, "hardcore-modal");
assert.deepEqual(
  getUiLayerOwnershipSnapshot(scene).active,
  ["hardcore-modal", "star-heart", "inventory", "pause-menu"],
);
assert.equal(closeTopUiLayer(scene, "escape"), true);
assert.equal(getTopUiLayer(scene)?.id, "star-heart");
assert.equal(closeTopUiLayer(scene, "escape"), true);
assert.equal(closeTopUiLayer(scene, "escape"), true);
assert.equal(closeTopUiLayer(scene, "escape"), true);
assert.deepEqual(
  closed,
  ["hardcore-modal", "star-heart", "inventory", "pause-menu"],
  "Each Escape must close exactly one top layer",
);
assert.equal(getTopUiLayer(scene), null);
assert.equal(closeTopUiLayer(scene, "escape"), false);

let randomCloseCount = 0;
scene._randomEventModalVisible = true;
scene.randomEventBridge = {
  jackpot: {
    modal: {
      requestClose() {
        randomCloseCount += 1;
        scene._randomEventModalVisible = false;
        return true;
      },
    },
  },
};
assert.equal(getTopUiLayer(scene)?.id, "random-event");
assert.equal(closeTopUiLayer(scene), true);
assert.equal(randomCloseCount, 1);

const originalError = console.error;
console.error = () => {};
scene.understarEndingSystem = {
  overlay: { isVisible: true },
  closeOverlay() { throw new TypeError("simulated teardown"); },
};
try {
  assert.equal(closeTopUiLayer(scene), false);
  assert.match(getUiLayerOwnershipSnapshot(scene).lastError, /understar-ending:close/);
} finally {
  console.error = originalError;
}
scene.understarEndingSystem.overlay.isVisible = false;

globalThis.window = {};
const releaseDiagnostics = installUiLayerDiagnostics(scene, true);
assert.equal(window.__jkdUiLayers.snapshot().top, null);
releaseDiagnostics();
assert.equal(window.__jkdUiLayers, undefined);

const combo = new ComboSystem();
combo.comboCount = 12;
combo.lastComboTime = 1000;
assert.equal(combo.getTimeRemaining(2000), 5000);
assert.equal(combo.pause(2000), true);
assert.equal(combo.pause(9000), false, "Nested pause sampling must be idempotent");
assert.equal(combo.getTimeRemaining(12000), 5000);
assert.equal(combo.resume(12000), true);
assert.equal(combo.resume(12001), false, "Repeated close sampling must not double-resume");
assert.equal(combo.getTimeRemaining(12000), 5000);

const keybindSource = readFileSync(
  new URL("../values/keybindActions.js", import.meta.url),
  "utf8",
);
const inputSource = readFileSync(
  new URL("../world/playScene/GameInputHandler.js", import.meta.url),
  "utf8",
);
assert.match(keybindSource, /id: "fullscreen"[\s\S]*defaultKey: "F10"/);
assert.match(inputSource, /justDown\(keys\.fullscreen\)/);
assert.doesNotMatch(inputSource, /exitFullscreen/);

console.log("UI_LAYER_OWNERSHIP_CONTRACT_OK");
