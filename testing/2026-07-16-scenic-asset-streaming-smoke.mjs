import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { WorldVisualAssetCache } from "../world/rendering/scenic-world/WorldVisualAssetCache.js";

class FakeLoader extends EventEmitter {
  constructor() {
    super();
    this.loading = false;
    this.queued = [];
    this.startCount = 0;
  }

  isLoading() {
    return this.loading;
  }

  image(key, path) {
    this.queued.push({ key, path });
  }

  start() {
    this.loading = true;
    this.startCount += 1;
  }
}

const loader = new FakeLoader();
const textureKeys = new Set(["surface-material"]);
const scene = {
  load: loader,
  textures: {
    exists: key => textureKeys.has(key),
    remove: key => textureKeys.delete(key),
  },
};
const cache = new WorldVisualAssetCache(scene, { retainKeys: ["surface-material"] });
const deepAsset = { key: "deep-material", path: "deep-material.webp" };
let readyCount = 0;

assert.equal(cache.ensure(deepAsset, { onReady: () => readyCount += 1 }), false);
assert.deepEqual(loader.queued, [deepAsset]);
assert.equal(loader.startCount, 1);
assert.equal(cache.pending.size, 1);

textureKeys.add(deepAsset.key);
loader.emit(`filecomplete-image-${deepAsset.key}`);
assert.equal(readyCount, 1);
assert.equal(cache.pending.size, 0);
assert.equal(cache.release(deepAsset.key), true);
assert.equal(textureKeys.has(deepAsset.key), false);
assert.equal(cache.release("surface-material"), false);
assert.equal(textureKeys.has("surface-material"), true);

loader.loading = false;
let errorCount = 0;
const failedAsset = { key: "failed-material", path: "missing.webp" };
cache.ensure(failedAsset, { onError: () => errorCount += 1 });
loader.emit("loaderror", { key: failedAsset.key });
assert.equal(errorCount, 1);
assert.equal(cache.pending.size, 0);

cache.destroy();
assert.equal(loader.listenerCount("loaderror"), 0);

console.log("Scenic asset streaming smoke passed");
