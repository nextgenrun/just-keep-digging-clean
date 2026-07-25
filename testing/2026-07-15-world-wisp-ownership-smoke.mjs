import assert from "node:assert/strict";

import { SKYLINE_WEATHER_VFX } from "../values/skylineWeatherVfx.js";
import { WORLD_BACKGROUND_AMBIENT_MOTION } from "../values/worldBackgroundAmbientMotion.js";
import { SkylineWeatherVfxWorldWisps } from "../systems/environment/SkylineWeatherVfxWorldWisps.js";
import { WorldBackgroundAmbientMotionSystem } from "../world/rendering/WorldBackgroundAmbientMotionSystem.js";

globalThis.Phaser = { Scenes: { Events: { SHUTDOWN: "shutdown" } } };
globalThis.location = { search: "" };

function fakeSprite() {
  return {
    visible: false,
    setDepth() { return this; },
    setOrigin() { return this; },
    setAlpha() { return this; },
    setVisible(value) { this.visible = value; return this; },
    setPosition() { return this; },
    setDisplaySize() { return this; },
    setTint() { return this; },
    destroy() { this.destroyed = true; },
  };
}

function makeScene(master = { enabled: true, depthEnabled: true }) {
  const graphics = {
    visible: false,
    setDepth() { return this; },
    setVisible(value) { this.visible = value; return this; },
    clear() { return this; },
    fillStyle() { return this; },
    fillCircle() { return this; },
    fillEllipse() { return this; },
    lineStyle() { return this; },
    lineBetween() { return this; },
    destroy() { this.destroyed = true; },
  };
  const top = 54 * 94;
  const height = 22 * 94;
  return {
    add: {
      image: () => fakeSprite(),
      graphics: () => graphics,
    },
    cameras: {
      main: {
        worldView: {
          x: 0,
          y: top,
          width: 280 * 94,
          height,
          right: 280 * 94,
          bottom: top + height,
        },
        scrollX: 0,
        scrollY: top,
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
    worldBackgroundMasterSystem: master,
    graphics,
  };
}

const atlas = {
  textureKey: sheet => sheet,
  frame: (sheet, frame) => `${sheet}-${frame}`,
};

globalThis.location.search = "?worldMotion=0";
let scene = makeScene();
let wisps = new SkylineWeatherVfxWorldWisps(scene, SKYLINE_WEATHER_VFX, atlas);
assert.equal(wisps.create(), false, "worldMotion rollback must disable atlas world wisps");
assert.equal(wisps.actors.length, 0);

globalThis.location.search = "?worldMotion=1";
scene = makeScene({ enabled: false, depthEnabled: true });
wisps = new SkylineWeatherVfxWorldWisps(scene, SKYLINE_WEATHER_VFX, atlas);
assert.equal(wisps.create(), false, "world master rollback must disable atlas world wisps");
assert.equal(wisps.actors.length, 0);

scene = makeScene({ enabled: true, depthEnabled: false });
wisps = new SkylineWeatherVfxWorldWisps(scene, SKYLINE_WEATHER_VFX, atlas);
assert.equal(wisps.create(), true);
assert.equal(wisps.actors.length, WORLD_BACKGROUND_AMBIENT_MOTION.anchors.townSmoke.length);
assert.ok(wisps.actors.every(actor => actor.kind === "smoke"));
wisps.destroy();

scene = makeScene({ enabled: true, depthEnabled: true });
wisps = new SkylineWeatherVfxWorldWisps(scene, SKYLINE_WEATHER_VFX, atlas);
assert.equal(wisps.create(), true);
assert.equal(
  wisps.actors.length,
  WORLD_BACKGROUND_AMBIENT_MOTION.anchors.townSmoke.length
    + WORLD_BACKGROUND_AMBIENT_MOTION.anchors.level2Steam.length
);
wisps.update(1000, 0.4, 1, { wind: 24 }, 0xffffff, 0.7);
assert.ok(wisps.actors.some(actor => actor.sprite.visible));
scene.worldBackgroundMasterSystem.enabled = false;
wisps.update(1100, 0.4, 1, { wind: 24 }, 0xffffff, 0.7);
assert.ok(wisps.actors.every(actor => !actor.sprite.visible));
wisps.destroy();

scene = makeScene({ enabled: true, depthEnabled: true });
scene.atmosphereSystem = {
  skylineWeatherVfx: { enabled: true, worldWispsEnabled: true },
};
const config = {
  ...WORLD_BACKGROUND_AMBIENT_MOTION,
  performance: {
    ...WORLD_BACKGROUND_AMBIENT_MOTION.performance,
    maxVisibleAnchors: 100,
  },
};
const ambient = new WorldBackgroundAmbientMotionSystem(scene, config);
assert.equal(ambient.create(), true);
let drawnKinds = [];
ambient._drawAnchor = anchor => drawnKinds.push(anchor.kind);
ambient.update(1000);
assert.ok(drawnKinds.length > 0);
assert.ok(!drawnKinds.includes("townSmoke"));
assert.ok(!drawnKinds.includes("steam"));

scene.atmosphereSystem.skylineWeatherVfx.worldWispsEnabled = false;
drawnKinds = [];
ambient.update(1100);
assert.ok(drawnKinds.includes("townSmoke"));
assert.ok(drawnKinds.includes("steam"));
ambient.destroy();

console.log("world wisp ownership smoke: shared rollback, master/depth gates, and single owner passed");
