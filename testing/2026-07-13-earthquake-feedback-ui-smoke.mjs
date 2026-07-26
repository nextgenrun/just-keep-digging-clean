import assert from "node:assert/strict";
import { EarthquakeFeedbackUI } from "../systems/visual/EarthquakeFeedbackUI.js";
import { EarthquakeHazardOverlay } from "../systems/visual/EarthquakeHazardOverlay.js";
import { EarthquakeSystem } from "../systems/environment/EarthquakeSystem.js";
import { EARTHQUAKE_CONFIG } from "../values/earthquakes.js";

function displayObject() {
  return {
    active: true,
    visible: true,
    alpha: 1,
    scaleX: 1,
    scaleY: 1,
    x: 0,
    y: 0,
    text: "",
    setScrollFactor() { return this; },
    setDepth() { return this; },
    setVisible(value) { this.visible = value; return this; },
    setAlpha(value) { this.alpha = value; return this; },
    setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; },
    setDisplaySize(width, height) {
      this.displayWidth = width;
      this.displayHeight = height;
      return this;
    },
    setOrigin() { return this; },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setText(value) { this.text = value; return this; },
    setColor() { return this; },
    setFontSize() { return this; },
    add() { return this; },
    destroy() { this.active = false; },
  };
}

function graphics() {
  const object = displayObject();
  object.calls = [];
  for (const method of [
    "clear", "fillStyle", "fillRoundedRect", "lineStyle", "strokeRoundedRect",
    "fillRect", "strokeRect", "fillCircle", "strokeCircle", "beginPath", "arc",
    "strokePath", "fillTriangle", "lineBetween",
  ]) {
    object[method] = function(...args) { this.calls.push([method, ...args]); return this; };
  }
  return object;
}

function makeScene() {
  const notificationY = [];
  const scene = {
    config: { tileSize: 32, viewportWidth: 1280, viewportHeight: 720 },
    scale: {
      width: 1280,
      height: 720,
      on() {},
      off() {},
    },
    time: { now: 1000 },
    cameras: { main: { worldView: { x: 0, y: 0, right: 1280, bottom: 720, width: 1280, height: 720 } } },
    playerController: { getPlayerTile: () => ({ tx: 8, ty: 8 }) },
    uiNotifications: {
      baseY: 58,
      setBaseY(value) { this.baseY = value; notificationY.push(value); },
    },
    add: {
      container: () => displayObject(),
      graphics,
      image: () => displayObject(),
      text: () => displayObject(),
    },
  };
  return { scene, notificationY };
}

{
  const { scene, notificationY } = makeScene();
  const source = {
    state: "warning",
    intensity: "major",
    stateRemaining: 3200,
    stateTotalMs: 5000,
  };
  const ui = new EarthquakeFeedbackUI(scene, source);
  ui.update();

  assert.equal(ui.root.visible, true, "warning card should be visible");
  assert.equal(ui.title.text, "TREMOR NEARBY");
  assert.match(ui.detail.text, /MAJOR.*3\.2s/);
  assert.equal(scene.uiNotifications.baseY, 188, "toasts should move below the compact hazard card");

  ui.activateEscapeObjective();
  assert.equal(ui.title.text, "ROUTE BLOCKED");
  assert.equal(ui.detail.text, "DIG THROUGH FRESH RUBBLE");

  source.state = "idle";
  ui.clearEscapeObjective();
  assert.equal(ui.root.visible, false, "idle feedback should hide after escape recovery");
  assert.deepEqual(notificationY, [188, 58]);
  ui.destroy();
}

{
  const { scene } = makeScene();
  const source = {
    state: "warning",
    intensity: "minor",
    stateRemaining: 3000,
    stateTotalMs: 3000,
    isPlayerAware: () => false,
  };
  const ui = new EarthquakeFeedbackUI(scene, source);
  ui.update();
  assert.equal(ui.root.visible, false, "a remote world quake should not take over the player HUD");
  ui.activateEscapeObjective();
  assert.equal(ui.root.visible, true, "an existing escape objective must remain visible during remote quakes");
  scene.time.now += 6501;
  source.state = "idle";
  ui.update();
  assert.equal(ui.root.visible, false, "escape guidance must auto-dismiss instead of sticking forever");
  ui.destroy();
}

{
  const { scene } = makeScene();
  const source = {
    state: "idle",
    intensity: null,
    stateRemaining: 0,
    stateTotalMs: 0,
    isPlayerAware: () => false,
  };
  const ui = new EarthquakeFeedbackUI(scene, source);
  ui.completeEvent({ intensity: "major", passagesOpened: 2, playerAware: true });
  assert.equal(ui.root.visible, true, "event completion should show one short recap");
  assert.equal(ui.title.text, "TREMOR PASSED");
  assert.match(ui.detail.text, /2 PASSAGES OPENED/);
  scene.time.now += 3201;
  ui.update();
  assert.equal(ui.root.visible, false, "completion recap must remove itself");
  ui.destroy();
}

{
  const { scene } = makeScene();
  const source = {
    state: "earthquake",
    config: { caveInWarningMs: 3000 },
    caveIns: [
      { tx: 10, ty: 6, remaining: 1400, chain: false },
      { tx: 60, ty: 40, remaining: 2200, chain: true },
    ],
    fallingRocks: [{ x: 500, y: 100, endY: 600 }],
  };
  const overlay = new EarthquakeHazardOverlay(scene, source);
  overlay.markRestoredRubble(9, 8);
  overlay.update();

  assert.equal(overlay.markerPool[0].root.visible, true);
  assert.match(overlay.markerPool[0].text.text, /CAVE-IN 1\.4s/);
  assert.equal(overlay.edgeRoot.visible, true, "offscreen aftershock should get an edge warning");
  assert.equal(overlay.recentRubble.has("9,8"), true);
  assert.equal(
    overlay.worldGraphics.calls.some(([method]) => method === "lineBetween"),
    true,
    "falling rock lane should use restrained guide lines"
  );
  overlay.destroy();
}

{
  const feedbackCalls = [];
  const system = Object.create(EarthquakeSystem.prototype);
  system._trapGuidanceShown = false;
  system.config = EARTHQUAKE_CONFIG;
  system.scene = {
    earthquakeFeedbackUI: { activateEscapeObjective: () => feedbackCalls.push("escape") },
  };
  system._showTrapGuidance();
  system._showTrapGuidance();
  assert.equal(feedbackCalls.length, 1, "escape objective should activate once per earthquake");
}

{
  const shakes = [];
  const system = Object.create(EarthquakeSystem.prototype);
  system.intensity = "medium";
  system.epicenter = { tx: 6, ty: 8, depth: 1 };
  system.config = {
    intensities: { medium: {} },
    playerFeedback: { shakeRadiusTiles: 24 },
  };
  system.scene = {
    shakeSystem: { _active: false, shake: (...args) => shakes.push(args) },
    playerController: { getPlayerTile: () => ({ tx: 0, ty: 0 }) },
  };
  system._quakeFx(0);
  assert.equal(shakes[0][0], "earthquake.moderate");
  assert.ok(shakes[0][1] > 0 && shakes[0][1] < 1, "quake shake should attenuate with distance");
}

console.log("earthquake feedback UI smoke test passed");
