import assert from "node:assert/strict";

import { PlayerDeferredAnimationAssetController } from
  "../player/PlayerDeferredAnimationAssetController.js";

const profile = Object.freeze({
  characterId: "contract-miner",
  basePath: "sprites/contract",
  version: "1",
  frameWidth: 64,
  frameHeight: 64,
  requiredSheets: Object.freeze(["contract-teleport-sheet"]),
  sheetFiles: Object.freeze([
    Object.freeze(["teleportInSheet", "teleport.png", "teleportInFrames"]),
  ]),
  animationPolishAnimations: Object.freeze([]),
  digAnimationVariants: Object.freeze([]),
  idleFidgets: Object.freeze([]),
  teleportInAnim: "contract-teleport",
  teleportInSheet: "contract-teleport-sheet",
  teleportInFrames: Object.freeze([0, 1]),
  teleportInAnimationFps: 12,
});

const textureKeys = new Set();
const removedTextures = [];
const animations = new Map();
const requests = [];
const releasedSources = [];
const scene = {
  time: { now: 0 },
  player: {
    active: true,
    anims: { isPlaying: false, currentAnim: null },
    texture: { key: "contract-base-sheet" },
    frame: { texture: { key: "contract-base-sheet" } },
  },
  textures: {
    exists: key => textureKeys.has(key),
    remove(key) {
      removedTextures.push(key);
      textureKeys.delete(key);
    },
  },
  anims: {
    exists: key => animations.has(key),
    create: spec => animations.set(spec.key, spec),
    remove: key => animations.delete(key),
  },
  runtimeAssetLoadCoordinator: {
    enabled: true,
    textureMemory: { isManaged: () => true },
    request(asset, options) {
      requests.push({ asset, options });
      return { cancel: () => true };
    },
    releaseDecodedSource(key) {
      releasedSources.push(key);
      return true;
    },
  },
};
scene.children = { list: [scene.player] };

const controller = new PlayerDeferredAnimationAssetController(scene, profile);
const firstLoad = controller.ensureForAnimation(profile.teleportInAnim);
assert.equal(requests.length, 1);
assert.equal(requests[0].options.packId, "player-action:teleport:contract-miner");
textureKeys.add(profile.teleportInSheet);
requests[0].options.onReady();
assert.equal((await firstLoad).ready, true);
assert.equal(animations.has(profile.teleportInAnim), true);

scene.player.anims.isPlaying = true;
scene.player.anims.currentAnim = { key: profile.teleportInAnim };
scene.time.now = 10000;
controller.update();
assert.equal(textureKeys.has(profile.teleportInSheet), true);

scene.player.anims.isPlaying = false;
scene.player.texture.key = profile.teleportInSheet;
scene.player.frame.texture.key = profile.teleportInSheet;
scene.time.now = 14999;
controller.update();
assert.equal(textureKeys.has(profile.teleportInSheet), true);
scene.time.now = 15000;
controller.update();
assert.equal(textureKeys.has(profile.teleportInSheet), true,
  "a stopped animation's displayed frame must keep its texture resident");
assert.equal(animations.has(profile.teleportInAnim), true);
scene.player.texture.key = "contract-base-sheet";
scene.player.frame.texture.key = "contract-base-sheet";
scene.time.now = 15001;
controller.update();
assert.equal(textureKeys.has(profile.teleportInSheet), true,
  "a refused eviction should back off instead of rescanning the scene every frame");
scene.time.now = 20000;
controller.update();
assert.equal(textureKeys.has(profile.teleportInSheet), false);
assert.deepEqual(removedTextures, [profile.teleportInSheet]);
assert.deepEqual(releasedSources, [profile.teleportInSheet]);
assert.equal(animations.has(profile.teleportInAnim), false);
assert.equal(controller.getSnapshot().evictions, 1);

const secondLoad = controller.ensureForAnimation(profile.teleportInAnim);
assert.equal(requests.length, 2, "evicted action packs must reload on next use");
textureKeys.add(profile.teleportInSheet);
requests[1].options.onReady();
assert.equal((await secondLoad).ready, true);
controller.destroy();

console.log("player deferred animation asset contract: PASS");
