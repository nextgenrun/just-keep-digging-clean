import assert from "node:assert/strict";

import {
  acquireUiInputPriority,
  hasUiInputPriority,
} from "../systems/UiInputPriorityRegistry.js";
import { createModalShell } from "../ui/UiModalShell.js";
import { MouseDigInputController } from "../world/playScene/MouseDigInputController.js";

function displayObject() {
  return {
    visible: true,
    alpha: 1,
    setAlpha(value) { this.alpha = value; return this; },
    setDepth() { return this; },
    setDisplaySize() { return this; },
    setInteractive() { return this; },
    setOrigin() { return this; },
    setPosition() { return this; },
    setScale() { return this; },
    setScrollFactor() { return this; },
    setSize() { return this; },
    setText() { return this; },
    setVisible(value) { this.visible = value; return this; },
    destroy() { this.destroyed = true; },
    on() { return this; },
  };
}

function createModalScene() {
  const pendingCompletions = [];
  return {
    scale: { width: 1280, height: 720 },
    config: { viewportWidth: 1280, viewportHeight: 720 },
    textures: { exists: () => false },
    add: {
      rectangle: () => displayObject(),
      graphics: () => ({
        ...displayObject(),
        clear() { return this; },
        fillRoundedRect() { return this; },
        fillStyle() { return this; },
        lineBetween() { return this; },
        lineStyle() { return this; },
        strokeRoundedRect() { return this; },
      }),
      text: () => displayObject(),
      container: () => ({
        ...displayObject(),
        add() { return this; },
      }),
    },
    tweens: {
      killTweensOf() {},
      add(config) {
        if (config.onComplete) pendingCompletions.push(config.onComplete);
        return config;
      },
    },
    finishExit() {
      pendingCompletions.shift()?.();
    },
  };
}

const modalScene = createModalScene();
const firstShell = createModalShell(modalScene, { showClose: false });
const secondShell = createModalShell(modalScene, { showClose: false });
assert.equal(hasUiInputPriority(modalScene), false);
firstShell.show();
secondShell.show();
assert.equal(hasUiInputPriority(modalScene), true);
firstShell.hide();
assert.equal(
  hasUiInputPriority(modalScene),
  true,
  "modal priority must survive the same click that starts its exit tween",
);
modalScene.finishExit();
assert.equal(hasUiInputPriority(modalScene), true, "nested UI keeps priority");
secondShell.destroy();
assert.equal(hasUiInputPriority(modalScene), false);

const TILE_SIZE = 94;
const pointer = {
  x: TILE_SIZE * 2.5,
  y: TILE_SIZE * 1.5,
  worldX: TILE_SIZE * 2.5,
  worldY: TILE_SIZE * 1.5,
  withinGame: true,
  button: 0,
  id: 7,
};
const listeners = new Map();
const inputScene = {
  gameState: "playing",
  config: { tileSize: TILE_SIZE },
  time: { now: 100 },
  playerController: {
    physicsBody: {
      x: TILE_SIZE + 30,
      y: TILE_SIZE * 2 - 75,
      w: 31,
      h: 75,
    },
    input: { controlsEnabled: true },
  },
  worldModel: {
    inBounds: () => true,
    isSolid: (tx, ty) => tx === 2 && ty === 1,
  },
  cameras: { main: { getWorldPoint: (x, y) => ({ x, y }) } },
  input: {
    activePointer: pointer,
    hitTestPointer: () => [],
    on(event, handler) { listeners.set(event, handler); },
    off(event) { listeners.delete(event); },
  },
};
const keyboardTarget = { tx: 0, ty: 1 };
const keys = {
  aimLeft: { isDown: false },
  aimRight: { isDown: false },
  aimUp: { isDown: false },
  aimDown: { isDown: false },
};
const controller = new MouseDigInputController(inputScene);
const releasePriority = acquireUiInputPriority(inputScene);
listeners.get("pointerdown")(pointer, []);
assert.equal(controller.snapshot().committedTarget, null);
releasePriority();

listeners.get("pointerdown")(pointer, []);
assert.equal(controller.snapshot().pointerHeld, true);
const releaseWhileHeld = acquireUiInputPriority(inputScene);
const blockedState = controller.resolveState(keyboardTarget, "LEFT", keys);
assert.equal(blockedState.source, "keyboard");
assert.equal(controller.snapshot().pointerHeld, false, "opening UI cancels held digging");
releaseWhileHeld();

listeners.get("pointerdown")(pointer, [{ destroyed: true }]);
assert.equal(controller.snapshot().committedTarget, null);
inputScene.gameState = "paused";
listeners.get("pointerdown")(pointer, []);
assert.equal(controller.snapshot().committedTarget, null);
controller.destroy();

const release = acquireUiInputPriority(inputScene);
release();
release();
assert.equal(hasUiInputPriority(inputScene), false, "release must be idempotent");

console.log("UI mouse priority contract: PASS");
