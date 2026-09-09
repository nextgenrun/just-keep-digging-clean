import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";

import {
  MINING_TARGET_FEEDBACK_CONFIG,
  getMiningTargetFeedbackPreloadAssets,
  resolveMiningTargetVisualsEnabled,
  resolveMouseDigEnabled,
} from "../values/miningTargetFeedback.js";
import {
  isPrimaryMousePointer,
  resolveMouseMiningTarget,
} from "../player/mouseMiningTarget.js";
import { MiningTargetVisualSystem } from "../systems/visual/MiningTargetVisualSystem.js";
import { MouseDigInputController } from "../world/playScene/MouseDigInputController.js";

const TILE_SIZE = 94;
const BODY_WIDTH = 31;
const BODY_HEIGHT = 75;
const body = {
  x: 10 * TILE_SIZE + (TILE_SIZE - BODY_WIDTH) * 0.5,
  y: 11 * TILE_SIZE - BODY_HEIGHT,
  w: BODY_WIDTH,
  h: BODY_HEIGHT,
};
const solidTiles = new Set(["11,10", "9,10", "11,9"]);
const worldModel = {
  inBounds: (tx, ty) => tx >= 0 && tx < 20 && ty >= 0 && ty < 20,
  isSolid: (tx, ty) => solidTiles.has(`${tx},${ty}`),
};
const centerOf = (tx, ty) => ({
  x: (tx + 0.5) * TILE_SIZE,
  y: (ty + 0.5) * TILE_SIZE,
});

assert.deepEqual(
  resolveMouseMiningTarget({
    body,
    tileSize: TILE_SIZE,
    worldPoint: centerOf(11, 10),
    worldModel,
  }),
  {
    tx: 11,
    ty: 10,
    aimLabel: "RIGHT",
    variant: "SIDE",
    x: 1,
    y: 0,
  },
);
assert.equal(
  resolveMouseMiningTarget({
    body,
    tileSize: TILE_SIZE,
    worldPoint: centerOf(10, 10),
    worldModel,
  }),
  null,
  "pointer targeting must never select a tile occupied by the player body",
);
assert.equal(
  resolveMouseMiningTarget({
    body,
    tileSize: TILE_SIZE,
    worldPoint: centerOf(12, 10),
    worldModel,
  }),
  null,
  "pointer targeting must not dig at range",
);
assert.equal(
  resolveMouseMiningTarget({
    body,
    tileSize: TILE_SIZE,
    worldPoint: centerOf(10, 11),
    worldModel,
  }),
  null,
  "pointer targeting must ignore adjacent air",
);
assert.deepEqual(
  resolveMouseMiningTarget({
    body,
    tileSize: TILE_SIZE,
    worldPoint: centerOf(15, 10),
    worldModel,
    allowRangedDirection: true,
  }),
  {
    tx: 11,
    ty: 10,
    aimLabel: "RIGHT",
    variant: "SIDE",
    x: 1,
    y: 0,
  },
  "Stellar Lance must turn a distant pointer into a cardinal ray from the body edge",
);
assert.equal(isPrimaryMousePointer({ button: 0 }, 0), true);
assert.equal(isPrimaryMousePointer({ button: 2 }, 0), false);

assert.equal(resolveMiningTargetVisualsEnabled("?miningTargetVisuals=0"), false);
assert.equal(resolveMiningTargetVisualsEnabled("?miningTargetVisuals=1"), true);
assert.equal(resolveMouseDigEnabled("?mouseDig=off"), false);
assert.equal(resolveMouseDigEnabled("?mouseDig=1"), true);
assert.deepEqual(getMiningTargetFeedbackPreloadAssets(), [
  MINING_TARGET_FEEDBACK_CONFIG.asset,
]);

const makeDisplayObject = (textureKey = null) => ({
  texture: textureKey ? { key: textureKey } : null,
  visible: true,
  alpha: 1,
  displayWidth: 0,
  displayHeight: 0,
  setOrigin() { return this; },
  setScrollFactor() { return this; },
  setScale(scale) { this.scale = scale; return this; },
  setText(text) { this.text = text; this.width = text.length * 7; return this; },
  setDisplaySize(width, height) { this.displayWidth = width; this.displayHeight = height; return this; },
  setAlpha(alpha) { this.alpha = alpha; return this; },
  setStrokeStyle() { return this; },
  setFillStyle() { return this; },
  destroy() { this.destroyed = true; },
});
const visualScene = {
  config: { tileSize: TILE_SIZE },
  time: { now: 100 },
  scale: { width: 1280, height: 720, on() {}, off() {} },
  events: { on() {}, off() {} },
  worldModel: {
    tileToWorld: (tx, ty) => ({ x: tx * TILE_SIZE, y: ty * TILE_SIZE }),
  },
  add: {
    text: () => makeDisplayObject(),
    image: (x, y, key) => makeDisplayObject(key),
    rectangle: () => makeDisplayObject(),
    container: () => ({
      ...makeDisplayObject(),
      children: [],
      add(children) { this.children.push(...children); return this; },
      setDepth(depth) { this.depth = depth; return this; },
      setVisible(visible) { this.visible = visible; return this; },
      setPosition(x, y) { this.x = x; this.y = y; return this; },
      setScale(scale) { this.scale = scale; return this; },
      destroy(destroyChildren) { if (destroyChildren) this.children.forEach(child => child.destroy()); },
    }),
  },
};
const targetVisual = new MiningTargetVisualSystem(visualScene);
targetVisual.update({ tx: 11, ty: 10 }, true, { source: "mouse" }, 100);
assert.equal(targetVisual.root.children.length, 2);
assert.equal(targetVisual.snapshot().interactionMode, "hover");
const hoverGlowAlpha = targetVisual.glowImage.alpha;
targetVisual.update({ tx: 11, ty: 10 }, true, {
  source: "mouse", mouseHeld: true, mouseRequested: true,
}, 200);
assert.equal(targetVisual.snapshot().interactionMode, "held");
assert.ok(targetVisual.glowImage.alpha > hoverGlowAlpha);
assert.equal(
  targetVisual.image.displayWidth,
  TILE_SIZE * MINING_TARGET_FEEDBACK_CONFIG.visual.displayTiles,
);
targetVisual.destroy();
assert.equal(targetVisual.root, null);

const listeners = new Map();
const activePointer = {
  x: centerOf(11, 10).x,
  y: centerOf(11, 10).y,
  worldX: centerOf(11, 10).x,
  worldY: centerOf(11, 10).y,
  withinGame: true,
  button: 0,
  id: 0,
  isDown: false,
};
const scene = {
  config: { tileSize: TILE_SIZE },
  time: { now: 100 },
  worldModel,
  playerController: {
    physicsBody: body,
    input: { controlsEnabled: true },
  },
  celestialEngineController: {
    getEmpowerSnapshot: () => ({ projectileEnabled: false }),
  },
  cameras: {
    main: {
      getWorldPoint: (x, y) => ({ x, y }),
    },
  },
  input: {
    activePointer,
    hitTestPointer: () => [],
    on(event, handler) {
      listeners.set(event, handler);
      return this;
    },
    off(event) {
      listeners.delete(event);
      return this;
    },
  },
};
const noKeysHeld = {
  aimLeft: { isDown: false },
  aimRight: { isDown: false },
  aimUp: { isDown: false },
  aimDown: { isDown: false },
};
const keyboardTarget = Object.freeze({ tx: 9, ty: 10 });
const controller = new MouseDigInputController(scene);

listeners.get("pointermove")(activePointer, []);
let state = controller.resolveState(keyboardTarget, "LEFT", noKeysHeld);
assert.equal(state.source, "mouse");
assert.deepEqual(state.targetTile, { tx: 11, ty: 10 });
assert.equal(state.mouseRequested, false);

activePointer.isDown = true;
listeners.get("pointerdown")(activePointer, []);
state = controller.resolveState(keyboardTarget, "LEFT", noKeysHeld);
assert.equal(state.source, "mouse");
assert.equal(state.mouseRequested, true);
assert.equal(state.mouseHeld, true);
controller.acknowledgeMineRequest();
assert.equal(controller.resolveState(keyboardTarget, "LEFT", noKeysHeld).mouseRequested, true);

scene.time.now = 116;
state = controller.resolveState(keyboardTarget, "LEFT", noKeysHeld);
assert.equal(state.mouseRequested, true, "held mouse must emit another F-equivalent request");
assert.deepEqual(state.targetTile, { tx: 11, ty: 10 });
controller.acknowledgeMineRequest();

activePointer.x = centerOf(11, 9).x;
activePointer.y = centerOf(11, 9).y;
activePointer.worldX = activePointer.x;
activePointer.worldY = activePointer.y;
listeners.get("pointermove")(activePointer, []);
scene.time.now = 132;
state = controller.resolveState(keyboardTarget, "LEFT", noKeysHeld);
assert.equal(state.mouseRequested, true, "held mouse must keep requesting after retarget");
assert.deepEqual(state.targetTile, { tx: 11, ty: 9 });
controller.acknowledgeMineRequest();

activePointer.isDown = false;
listeners.get("pointerup")(activePointer, []);
state = controller.resolveState(keyboardTarget, "LEFT", {
  ...noKeysHeld,
  aimLeft: { isDown: true },
});
assert.equal(state.source, "keyboard", "held directional input must retake aim ownership");

activePointer.x = centerOf(15, 10).x;
activePointer.y = centerOf(15, 10).y;
activePointer.worldX = activePointer.x;
activePointer.worldY = activePointer.y;
scene.celestialEngineController.getEmpowerSnapshot = () => ({ projectileEnabled: true });
listeners.get("pointermove")(activePointer, []);
state = controller.resolveState(keyboardTarget, "LEFT", noKeysHeld);
assert.equal(state.source, "mouse");
assert.deepEqual(
  state.targetTile,
  { tx: 11, ty: 10 },
  "active Stellar Lance must support mouse-directed ranged digging through air",
);
scene.celestialEngineController.getEmpowerSnapshot = () => ({ projectileEnabled: false });
activePointer.x = centerOf(11, 9).x;
activePointer.y = centerOf(11, 9).y;
activePointer.worldX = activePointer.x;
activePointer.worldY = activePointer.y;
listeners.get("pointermove")(activePointer, []);

scene.time.now = 200;
activePointer.isDown = true;
listeners.get("pointerdown")(activePointer, []);
activePointer.isDown = false;
listeners.get("pointerup")(activePointer, []);
state = controller.resolveState(keyboardTarget, "LEFT", noKeysHeld);
assert.equal(state.mouseRequested, true, "a quick click must survive until the next game frame");
controller.acknowledgeMineRequest();

listeners.get("pointerdown")(activePointer, [{
  visible: false,
  active: false,
  input: null,
}]);
assert.equal(
  controller.snapshot().committedTarget,
  null,
  "the event-time UI hit must win even if its handler already hid the object",
);

activePointer.isDown = true;
listeners.get("pointerdown")(activePointer, []);
assert.equal(controller.snapshot().pointerHeld, true);
listeners.get("gameout")();
assert.equal(controller.snapshot().pointerHeld, false, "leaving the game must cancel held digging");
assert.equal(controller.snapshot().pendingPress, false);

controller.destroy();
assert.equal(listeners.size, 0);

const runtimeAsset = new URL(
  `../${MINING_TARGET_FEEDBACK_CONFIG.asset.path}`,
  import.meta.url,
);
assert.equal(existsSync(runtimeAsset), true);
assert.ok(statSync(runtimeAsset).size > 1000);
const webpHeader = readFileSync(runtimeAsset).subarray(0, 12);
assert.equal(webpHeader.subarray(0, 4).toString("ascii"), "RIFF");
assert.equal(webpHeader.subarray(8, 12).toString("ascii"), "WEBP");

const intentSource = readFileSync(
  new URL("../systems/visual/MiningIntentPreviewSystem.js", import.meta.url),
  "utf8",
);
const bootSource = readFileSync(
  new URL("../ui/scenes/BootScene.js", import.meta.url),
  "utf8",
);
const mainUpdateSource = readFileSync(
  new URL("../world/playScene/PlaySceneUpdate.js", import.meta.url),
  "utf8",
);
const caveSource = readFileSync(
  new URL("../world/playScene/CaveGameplayController.js", import.meta.url),
  "utf8",
);
const retentionConfigSource = readFileSync(
  new URL("../values/retentionConfig.js", import.meta.url),
  "utf8",
);
assert.doesNotMatch(intentSource, /FINAL HIT|_drawFinalHit|_getFinalHitPreview/);
assert.doesNotMatch(mainUpdateSource, /feedback\.overkill|OVERKILL/);
assert.doesNotMatch(retentionConfigSource, /overkillPrefix|overkillColor|overkillDurationMs|overkillFontSize|overkillMinHpRatio/);
assert.match(bootSource, /getMiningTargetFeedbackPreloadAssets/);
assert.match(mainUpdateSource, /miningInputState\.mouseRequested/);
assert.match(caveSource, /miningInputState\.mouseRequested/);

console.log("Mining target visuals and mouse digging contract: PASS");
