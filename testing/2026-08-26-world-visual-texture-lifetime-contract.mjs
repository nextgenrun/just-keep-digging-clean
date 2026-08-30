import assert from "node:assert/strict";

import { WorldVisualAssetCache } from
  "../world/rendering/scenic-world/WorldVisualAssetCache.js";

function createEmitter() {
  const listeners = new Map();
  return {
    once(event, callback) {
      const callbacks = listeners.get(event) || new Set();
      callbacks.add(callback);
      listeners.set(event, callbacks);
    },
    off(event, callback) {
      const callbacks = listeners.get(event);
      callbacks?.delete(callback);
      if (callbacks?.size === 0) listeners.delete(event);
    },
    emit(event) {
      const callbacks = [...(listeners.get(event) || [])];
      listeners.delete(event);
      callbacks.forEach(callback => callback());
    },
  };
}

function createScene() {
  const imageKeys = new Set(["live-image", "nested-image"]);
  const videoKeys = new Set(["live-video"]);
  const removedImages = [];
  const removedVideos = [];
  const emitter = createEmitter();
  const liveImage = {
    active: true,
    texture: { key: "live-image" },
  };
  const nestedImage = {
    active: true,
    frame: { texture: { key: "nested-image" } },
  };
  const liveVideo = {
    active: true,
    cacheKey: "live-video",
  };
  return {
    imageKeys,
    videoKeys,
    removedImages,
    removedVideos,
    emitter,
    liveImage,
    nestedImage,
    liveVideo,
    scene: {
      children: {
        list: [liveImage, { active: true, list: [nestedImage, liveVideo] }],
      },
      game: { events: emitter },
      load: {
        on() {},
        off() {},
      },
      textures: {
        exists: key => imageKeys.has(key),
        remove(key) {
          removedImages.push(key);
          imageKeys.delete(key);
        },
      },
      cache: {
        video: {
          exists: key => videoKeys.has(key),
          remove(key) {
            removedVideos.push(key);
            videoKeys.delete(key);
          },
        },
      },
    },
  };
}

const harness = createScene();
const cache = new WorldVisualAssetCache(harness.scene, {
  deferTextureRelease: true,
});
const imageAsset = { key: "live-image", type: "image" };
const nestedAsset = { key: "nested-image", type: "image" };
const videoAsset = { key: "live-video", type: "video" };
for (const asset of [imageAsset, nestedAsset, videoAsset]) {
  cache.loadedByCache.add(asset.key);
  cache.assetsByKey.set(asset.key, asset);
  assert.equal(cache.release(asset.key, asset), true);
}

harness.emitter.emit("postrender");
assert.deepEqual(harness.removedImages, []);
assert.deepEqual(harness.removedVideos, []);
assert.equal(cache.loadedByCache.size, 3);

harness.liveImage.active = false;
harness.nestedImage.destroyed = true;
harness.liveVideo.active = false;
for (const asset of [imageAsset, nestedAsset, videoAsset]) {
  assert.equal(cache.release(asset.key, asset), true);
}
harness.emitter.emit("postrender");

assert.deepEqual(harness.removedImages, ["live-image", "nested-image"]);
assert.deepEqual(harness.removedVideos, ["live-video"]);
assert.equal(cache.loadedByCache.size, 0);

cache.destroy();
console.log("world visual texture lifetime contract: ok");
