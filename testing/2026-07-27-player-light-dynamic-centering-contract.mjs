import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { LightFrameSync } from "../systems/lighting/LightFrameSync.js";
import { resolvePlayerLightAnchor } from "../systems/lighting/playerLightProfile.js";
import { LIGHT_CONFIG } from "../values/lightConfig.js";
import { SURVIVAL_UAL_PLAYER_ASSET_PROFILE } from "../values/survivalUalPlayerAssetProfile.js";

const root = resolve(import.meta.dirname, "..");
const flightSheet = SURVIVAL_UAL_PLAYER_ASSET_PROFILE.flySheet;
const visibleCenter = SURVIVAL_UAL_PLAYER_ASSET_PROFILE
  .lightVisibleCenterBySheet[flightSheet];
const player = {
  x: 200,
  y: 300,
  displayWidth: 109,
  displayHeight: 109,
  originX: 0.5,
  originY: 247 / 256,
  rotation: 0,
  flipX: false,
  flipY: false,
  texture: { key: flightSheet },
};
const controller = {
  physicsBody: { x: 184, y: 225, w: 32, h: 75 },
};
const anchor = resolvePlayerLightAnchor(
  player,
  controller,
  LIGHT_CONFIG.playerLightV2,
  94,
  "v2",
  SURVIVAL_UAL_PLAYER_ASSET_PROFILE
);
const expectedX = player.x + (visibleCenter.x - player.originX) * player.displayWidth;
const expectedY = player.y + (visibleCenter.y - player.originY) * player.displayHeight;
assert.equal(anchor.source, "profile-visible-center");
assert.ok(Math.abs(anchor.x - expectedX) < 1e-9);
assert.ok(Math.abs(anchor.y - expectedY) < 1e-9);
assert.ok(anchor.x > controller.physicsBody.x + controller.physicsBody.w * 0.5);
assert.ok(anchor.y < controller.physicsBody.y + controller.physicsBody.h * 0.5);

const flippedAnchor = resolvePlayerLightAnchor(
  { ...player, flipX: true },
  controller,
  LIGHT_CONFIG.playerLightV2,
  94,
  "v2",
  SURVIVAL_UAL_PLAYER_ASSET_PROFILE
);
assert.ok(Math.abs(flippedAnchor.x - (player.x - (expectedX - player.x))) < 1e-9);
assert.equal(flippedAnchor.y, anchor.y);

const listeners = new Map();
const camera = {
  _follow: player,
  panEffect: { isRunning: false },
  scrollX: 10,
  on(event, handler) {
    listeners.set(event, handler);
  },
  off(event, handler) {
    if (listeners.get(event) === handler) listeners.delete(event);
  },
};
const calls = [];
const scene = {
  cameras: { main: camera },
  lightSystem: {
    prepareFrame(time, delta, depth, gameplayActive) {
      calls.push(["prepare", time, delta, depth, gameplayActive]);
    },
    renderPreparedFrame(time) {
      calls.push(["render", time, camera.scrollX]);
    },
  },
  shaderSystem: {
    update(time, delta) {
      calls.push(["shader", time, delta, camera.scrollX]);
    },
  },
};
const sync = new LightFrameSync(scene);
sync.queue(1000, 16, 700, true);
assert.deepEqual(calls, [["prepare", 1000, 16, 700, true]]);

camera.scrollX = 25;
listeners.get("followupdate")();
assert.deepEqual(calls, [
  ["prepare", 1000, 16, 700, true],
  ["render", 1000, 25],
  ["shader", 1000, 16, 25],
]);
assert.equal(sync.pending, null);
sync.destroy();
assert.equal(listeners.has("followupdate"), false);

const updateSource = readFileSync(
  resolve(root, "world/playScene/PlaySceneUpdate.js"),
  "utf8"
);
const phaseSource = readFileSync(
  resolve(root, "world/playScene/PlaySceneFramePhases.js"),
  "utf8"
);
const sceneSource = readFileSync(resolve(root, "ui/scenes/PlayScene.js"), "utf8");
const systemsCall = updateSource.indexOf(
  "_updateSystems.call(this, time, delta, keys, samplePerformancePhases)"
);
const cameraCall = phaseSource.indexOf("updateCameraSystems(scene, time, delta)");
const lightingCall = phaseSource.indexOf("updateLightingSystems(scene, time, delta, scene._framePlayerTile)");
assert.ok(systemsCall >= 0);
assert.ok(cameraCall >= 0 && cameraCall < lightingCall);
assert.ok(sceneSource.indexOf('id: "play-frame-authority"') < sceneSource.indexOf('id: "play-frame-camera"'));
assert.ok(updateSource.includes("const activePlayerTile = this._framePlayerTile"));
assert.ok(updateSource.includes("{ playerTile: activePlayerTile }"));
assert.ok(updateSource.includes("scene.lightFrameSync.queue(time, delta, lightDepth, gameplayActive)"));

const lightSource = readFileSync(
  resolve(root, "systems/lighting/LightSystem.js"),
  "utf8"
);
assert.ok(lightSource.includes("prepareFrame(time, delta, depth, gameplayActive)"));
assert.ok(lightSource.includes("renderPreparedFrame(time = this._preparedFrame?.time)"));
assert.ok(lightSource.includes("this.scene.playerAssetProfile"));

console.log("dynamic player light stays centered after movement, animation, camera follow, and shake");
