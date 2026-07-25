import assert from "node:assert/strict";

import { WORLD_BACKGROUND_AMBIENT_MOTION } from "../values/worldBackgroundAmbientMotion.js";
import { WorldBackgroundAmbientMotionSystem } from "../world/rendering/WorldBackgroundAmbientMotionSystem.js";

globalThis.Phaser = { Scenes: { Events: { SHUTDOWN: "shutdown" } } };
globalThis.location = { search: "" };

const calls = [];
const graphics = {
  visible: false,
  setDepth(value) { this.depth = value; return this; },
  setVisible(value) { this.visible = value; return this; },
  clear() { calls.push("clear"); return this; },
  fillStyle() { calls.push("fillStyle"); return this; },
  fillCircle() { calls.push("fillCircle"); return this; },
  fillEllipse() { calls.push("fillEllipse"); return this; },
  lineStyle() { calls.push("lineStyle"); return this; },
  lineBetween() { calls.push("lineBetween"); return this; },
  destroy() { this.destroyed = true; },
};

const scene = {
  add: { graphics: () => graphics },
  cameras: {
    main: {
      worldView: { x: 0, y: 54 * 94, width: 280 * 94, height: 21 * 94 },
      scrollX: 0,
      scrollY: 54 * 94,
      width: 1280,
      height: 720,
      zoom: 1,
    },
  },
  config: { tileSize: 94 },
  dayNightCycle: { getNightAmount: () => 0.7 },
  events: { once() {}, off() {} },
  game: { loop: { actualFps: 60 } },
  time: { now: 1000 },
  weatherSystem: { kind: "rain", intensity: 0.65, wind: 42 },
  worldBackgroundMasterSystem: { enabled: true },
};

const config = {
  ...WORLD_BACKGROUND_AMBIENT_MOTION,
  performance: {
    ...WORLD_BACKGROUND_AMBIENT_MOTION.performance,
    maxVisibleAnchors: 100,
  },
};
const system = new WorldBackgroundAmbientMotionSystem(scene, config);
assert.equal(system.anchors.length, 63);
assert.ok(system.anchors.every(anchor => (
  anchor.yTile >= config.rows.top && anchor.yTile <= config.rows.bottom
)));
assert.deepEqual(new Set(system.anchors.map(anchor => anchor.kind)), new Set([
  "townLight", "townSmoke", "crystal", "drip", "ember", "steam",
]));

assert.equal(system.create(), true);
assert.equal(graphics.depth, config.render.depth);
system.update(1000);
assert.equal(graphics.visible, true);
for (const method of ["fillCircle", "fillEllipse", "lineBetween"]) {
  assert.ok(calls.includes(method), `${method} should be exercised`);
}

scene.cameras.main.worldView.y = 100 * 94;
system.update(1100);
assert.equal(graphics.visible, false);

scene.cameras.main.worldView.y = 54 * 94;
scene.game.loop.actualFps = 30;
system.update(1200);
assert.equal(graphics.visible, false);

scene.game.loop.actualFps = 60;
scene.worldBackgroundMasterSystem.enabled = false;
system.update(1300);
assert.equal(graphics.visible, false);
system.destroy();
assert.equal(graphics.destroyed, true);

globalThis.location.search = "?worldMotion=0";
const disabled = new WorldBackgroundAmbientMotionSystem(scene, config);
assert.equal(disabled.create(), false);
assert.equal(disabled.graphics, null);

console.log("world ambient motion smoke: anchors, effects, culling, FPS guard, and rollback passed");
