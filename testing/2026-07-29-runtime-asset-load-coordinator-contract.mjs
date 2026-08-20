import assert from "node:assert/strict";

import {
  RUNTIME_ASSET_LOADING,
  resolveRuntimeAssetBitmapDecodeEnabled,
  resolveRuntimeAssetQueueEnabled,
} from "../values/runtimeAssetLoading.js";
import { HIGH_IMPACT_FX_CONFIG } from "../values/highImpactFx.js";
import { PERFORMANCE_TELEMETRY_CONFIG } from
  "../values/performanceTelemetryConfig.js";
import { PerformanceTelemetrySystem } from
  "../systems/health/PerformanceTelemetrySystem.js";
import { V11SkyIslandVisualSystem } from
  "../systems/environment/V11SkyIslandVisualSystem.js";
import { TitanChamberStream } from
  "../systems/visual/TitanChamberStream.js";
import { RuntimeAssetLoadCoordinator } from
  "../world/rendering/RuntimeAssetLoadCoordinator.js";
import { WorldScenicFacadeSystem } from
  "../world/rendering/WorldScenicFacadeSystem.js";
import { WorldVisualAssetCache } from
  "../world/rendering/scenic-world/WorldVisualAssetCache.js";
import { WorldVisualPerformanceTracker } from
  "../world/rendering/scenic-world/WorldVisualPerformanceTracker.js";

class Emitter {
  constructor() {
    this.listeners = new Map();
  }

  on(event, listener) {
    const listeners = this.listeners.get(event) || new Set();
    listeners.add(listener);
    this.listeners.set(event, listeners);
  }

  off(event, listener) {
    this.listeners.get(event)?.delete(listener);
  }

  once(event, listener) {
    const wrapped = (...args) => {
      this.off(event, wrapped);
      listener(...args);
    };
    this.on(event, wrapped);
  }

  emit(event, ...args) {
    for (const listener of [...(this.listeners.get(event) || [])]) {
      listener(...args);
    }
  }
}

class FakeLoader extends Emitter {
  constructor() {
    super();
    this.loading = false;
    this.queued = [];
    this.startCount = 0;
  }

  isLoading() {
    return this.loading;
  }

  image(key, assetPath) {
    this.queued.push({ key, path: assetPath, type: "image" });
  }

  spritesheet(key, assetPath, frameConfig) {
    this.queued.push({ key, path: assetPath, type: "spritesheet", frameConfig });
  }

  video(key, assetPath) {
    this.queued.push({ key, path: assetPath, type: "video" });
  }

  start() {
    this.loading = true;
    this.startCount += 1;
  }
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0));
const SERIAL_RUNTIME_ASSET_LOADING = Object.freeze({
  ...RUNTIME_ASSET_LOADING,
  scheduling: Object.freeze({
    ...RUNTIME_ASSET_LOADING.scheduling,
    maxConcurrentLoads: 1,
  }),
});

assert.equal(resolveRuntimeAssetQueueEnabled(RUNTIME_ASSET_LOADING, ""), true);
assert.equal(
  resolveRuntimeAssetQueueEnabled(
    RUNTIME_ASSET_LOADING,
    `?${RUNTIME_ASSET_LOADING.queryParam}=0`,
  ),
  false,
);
assert.equal(resolveRuntimeAssetBitmapDecodeEnabled(RUNTIME_ASSET_LOADING, ""), true);
assert.equal(RUNTIME_ASSET_LOADING.scheduling.maxConcurrentLoads, 3);
for (const priorityId of [
  "depthBackdrop",
  "terrainVariation",
  "groundStructure",
  "undergroundDetail",
  "backdropEnhancer",
]) {
  assert.ok(
    RUNTIME_ASSET_LOADING.priorities[priorityId] > HIGH_IMPACT_FX_CONFIG.priority,
    `${priorityId} must settle before optional high-impact FX`,
  );
}

const loader = new FakeLoader();
const frameEvents = new Emitter();
const textureKeys = new Set();
const scene = {
  load: loader,
  game: { events: frameEvents },
  textures: {
    exists: key => textureKeys.has(key),
    remove: key => textureKeys.delete(key),
  },
};
const coordinator = new RuntimeAssetLoadCoordinator(
  scene,
  SERIAL_RUNTIME_ASSET_LOADING,
  `?${RUNTIME_ASSET_LOADING.bitmapDecode.queryParam}=0`,
);
scene.runtimeAssetLoadCoordinator = coordinator;
const terrainCache = new WorldVisualAssetCache(scene, {
  owner: RUNTIME_ASSET_LOADING.owners.terrainVariation,
  priority: RUNTIME_ASSET_LOADING.priorities.terrainVariation,
});
const detailCache = new WorldVisualAssetCache(scene, {
  owner: RUNTIME_ASSET_LOADING.owners.undergroundDetail,
  priority: RUNTIME_ASSET_LOADING.priorities.undergroundDetail,
});
const skyCache = new WorldVisualAssetCache(scene, {
  owner: RUNTIME_ASSET_LOADING.owners.skyCohesion,
  priority: RUNTIME_ASSET_LOADING.priorities.skyCohesion,
});

terrainCache.ensure({ key: "terrain", path: "terrain.webp" });
detailCache.ensure({ key: "detail", path: "detail.webp" });
skyCache.ensure({ key: "sky", path: "sky.webp" });
await flush();
assert.deepEqual(loader.queued.map(item => item.key), ["terrain"]);
assert.equal(coordinator.getSnapshot().active, 1);
assert.equal(coordinator.getSnapshot().queued, 2);
assert.equal(detailCache.release("detail"), true);
assert.equal(coordinator.getSnapshot().queued, 1);

textureKeys.add("terrain");
loader.emit("filecomplete-image-terrain");
loader.loading = false;
loader.emit(RUNTIME_ASSET_LOADING.phaserLoader.completeEvent);
frameEvents.emit(RUNTIME_ASSET_LOADING.scheduling.postRenderEvent);
await flush();
assert.deepEqual(
  loader.queued.map(item => item.key),
  ["terrain", "sky"],
  "the highest-priority waiting cache must own the next loader cycle",
);
textureKeys.add("sky");
loader.emit("filecomplete-image-sky");
loader.loading = false;
loader.emit(RUNTIME_ASSET_LOADING.phaserLoader.completeEvent);
frameEvents.emit(RUNTIME_ASSET_LOADING.scheduling.postRenderEvent);
await flush();
assert.equal(coordinator.getSnapshot().active, 0);
assert.equal(coordinator.getSnapshot().queued, 0);
assert.equal(coordinator.getSnapshot().cancelled, 1);

terrainCache.destroy();
detailCache.destroy();
skyCache.destroy();
coordinator.destroy();

const cancelledLoader = new FakeLoader();
const cancelledKeys = new Set();
let cancelledReady = 0;
const cancelledCoordinator = new RuntimeAssetLoadCoordinator({
  load: cancelledLoader,
  game: { events: new Emitter() },
  textures: {
    exists: key => cancelledKeys.has(key),
    remove: key => cancelledKeys.delete(key),
  },
}, SERIAL_RUNTIME_ASSET_LOADING, "?runtimeAssetBitmap=0");
const cancelledHandle = cancelledCoordinator.request({
  key: "cancelled-active-texture",
  path: "cancelled-active-texture.webp",
}, { onReady: () => { cancelledReady += 1; } });
await flush();
assert.equal(cancelledHandle.cancel(), true);
cancelledKeys.add("cancelled-active-texture");
cancelledLoader.emit("filecomplete-image-cancelled-active-texture");
await flush();
assert.equal(cancelledReady, 0);
assert.equal(cancelledKeys.has("cancelled-active-texture"), false);
assert.equal(
  cancelledCoordinator.textureMemory.isManaged("cancelled-active-texture"),
  false,
);
cancelledCoordinator.destroy();

const sheetLoader = new FakeLoader();
const sheetKeys = new Set();
const sheetCoordinator = new RuntimeAssetLoadCoordinator({
  load: sheetLoader,
  game: { events: new Emitter() },
  textures: {
    exists: key => sheetKeys.has(key),
    get: () => ({ source: [{ image: { width: 341, height: 682 } }] }),
  },
}, SERIAL_RUNTIME_ASSET_LOADING, "?runtimeAssetBitmap=0");
const sheetReady = new Promise((resolve, reject) => sheetCoordinator.request({
  key: "ability-sheet",
  path: "full-quality-ability.webp",
  type: RUNTIME_ASSET_LOADING.types.spritesheet,
  frameConfig: { frameWidth: 341, frameHeight: 341, endFrame: 1 },
}, { onReady: resolve, onError: reject }));
await flush();
assert.deepEqual(sheetLoader.queued, [{
  key: "ability-sheet",
  path: "full-quality-ability.webp",
  type: "spritesheet",
  frameConfig: { frameWidth: 341, frameHeight: 341, endFrame: 1 },
}]);
sheetKeys.add("ability-sheet");
sheetLoader.emit("filecomplete-spritesheet-ability-sheet");
await sheetReady;
sheetCoordinator.destroy();

const normalMapLoader = new FakeLoader();
const normalMapKeys = new Set();
const normalMapCoordinator = new RuntimeAssetLoadCoordinator({
  load: normalMapLoader,
  game: { events: new Emitter() },
  textures: {
    exists: key => normalMapKeys.has(key),
    get: () => ({ source: [
      { image: { width: 1672, height: 941 } },
      { image: { width: 1672, height: 941 } },
    ] }),
  },
}, SERIAL_RUNTIME_ASSET_LOADING, "");
const normalMapReady = new Promise((resolve, reject) => normalMapCoordinator.request({
  key: "shallow-depth-card",
  path: "shallow-depth-card.webp",
  normalMapPath: "shallow-depth-card-normal.webp",
}, { onReady: resolve, onError: reject }));
await flush();
assert.deepEqual(normalMapLoader.queued, [{
  key: "shallow-depth-card",
  path: ["shallow-depth-card.webp", "shallow-depth-card-normal.webp"],
  type: "image",
}], "normal-mapped images must load their diffuse and normal sources atomically");
assert.equal(normalMapCoordinator.getSnapshot().activeBackend, "phaser");
normalMapKeys.add("shallow-depth-card");
normalMapLoader.emit("filecomplete-image-shallow-depth-card");
await flush();
assert.equal(
  normalMapCoordinator.getSnapshot().active,
  1,
  "the diffuse file event must not expose a texture before its normal source settles",
);
normalMapLoader.loading = false;
normalMapLoader.emit(RUNTIME_ASSET_LOADING.phaserLoader.completeEvent);
await normalMapReady;
normalMapCoordinator.destroy();

const concurrentTextureKeys = new Set();
const concurrentFetches = new Map();
let concurrentActivationWaits = 0;
const concurrentScene = {
  textures: {
    exists: key => concurrentTextureKeys.has(key),
    addImage(key, source) {
      concurrentTextureKeys.add(key);
      return { key, source };
    },
    get: () => ({
      source: [{ image: { width: 32, height: 32 } }],
    }),
  },
};
const concurrentCoordinator = new RuntimeAssetLoadCoordinator(
  concurrentScene,
  RUNTIME_ASSET_LOADING,
  "",
  {
    fetchAsset: assetPath => new Promise(resolve => {
      concurrentFetches.set(assetPath, resolve);
    }),
    decodeBitmap: async () => ({
      width: 32,
      height: 32,
      close() {},
    }),
    waitForActivation: async () => {
      concurrentActivationWaits += 1;
    },
  },
);
const concurrentReady = Array.from({ length: 4 }, (_unused, index) => (
  new Promise((resolve, reject) => {
    const number = index + 1;
    concurrentCoordinator.request(
      {
        key: `concurrent-${number}`,
        path: `concurrent-${number}.webp`,
      },
      { onReady: resolve, onError: reject },
    );
  })
));
await flush();
assert.equal(concurrentCoordinator.getSnapshot().active, 3);
assert.equal(concurrentCoordinator.getSnapshot().queued, 1);
assert.deepEqual(
  concurrentCoordinator.getSnapshot().activeKeys.sort(),
  ["concurrent-1", "concurrent-2", "concurrent-3"],
);
concurrentFetches.get("concurrent-1.webp")({
  ok: true,
  blob: async () => ({}),
});
await flush();
await flush();
assert.equal(
  concurrentFetches.has("concurrent-4.webp"),
  true,
  "the fourth decode begins as soon as one bounded slot becomes available",
);
for (const number of [2, 3, 4]) {
  concurrentFetches.get(`concurrent-${number}.webp`)({
    ok: true,
    blob: async () => ({}),
  });
}
await Promise.all(concurrentReady);
const concurrentSnapshot = concurrentCoordinator.getSnapshot();
assert.equal(concurrentSnapshot.active, 0);
assert.equal(concurrentSnapshot.queued, 0);
assert.equal(concurrentSnapshot.completed, 4);
assert.equal(concurrentActivationWaits, 4);
concurrentCoordinator.destroy();

let clockMs = 0;
let closeCount = 0;
let decodeOptions = null;
let activationWaits = 0;
const bitmapLoader = new FakeLoader();
const bitmapTextureKeys = new Set();
const bitmapScene = {
  load: bitmapLoader,
  textures: {
    exists: key => bitmapTextureKeys.has(key),
    addImage(key, source) {
      clockMs += 5;
      bitmapTextureKeys.add(key);
      return { key, source };
    },
    remove: key => bitmapTextureKeys.delete(key),
  },
};
const bitmapCoordinator = new RuntimeAssetLoadCoordinator(
  bitmapScene,
  RUNTIME_ASSET_LOADING,
  "",
  {
    now: () => clockMs,
    fetchAsset: async assetPath => ({
      ok: true,
      blob: async () => ({ assetPath }),
    }),
    decodeBitmap: async (_blob, options) => {
      decodeOptions = options;
      clockMs += 7;
      return {
        width: 1672,
        height: 941,
        close: () => closeCount += 1,
      };
    },
    waitForActivation: async () => {
      activationWaits += 1;
    },
  },
);
bitmapScene.runtimeAssetLoadCoordinator = bitmapCoordinator;
const bitmapCache = new WorldVisualAssetCache(bitmapScene);
await new Promise((resolve, reject) => {
  bitmapCache.ensure(
    { key: "full-resolution-card", path: "full-resolution-card.png" },
    { onReady: resolve, onError: reject },
  );
});
const bitmapSnapshot = bitmapCoordinator.getSnapshot();
assert.equal(bitmapLoader.queued.length, 0, "bitmap decode must bypass Phaser XHR decode");
assert.equal(bitmapSnapshot.lastLoad.backend, "bitmap");
assert.equal(bitmapSnapshot.decodeMs.last, 7);
assert.equal(bitmapSnapshot.activationMs.last, 5);
assert.equal(activationWaits, 1);
assert.equal(bitmapSnapshot.textureMemory.estimatedBytes, 1672 * 941 * 4);
assert.equal(decodeOptions.premultiplyAlpha, "premultiply");
assert.equal(bitmapCache.release("full-resolution-card"), true);
assert.equal(closeCount, 1, "released textures must close their decoded bitmap source");
assert.equal(bitmapCoordinator.textureMemory.sample(true).estimatedBytes, 0);
bitmapCache.destroy();
bitmapCoordinator.destroy();
const facadeLoader = new FakeLoader();
const facadeTextureKeys = new Set();
const facadeRequests = [];
let facadeUpdates = 0;
let facadeDecodedReleases = 0;
const facadeScene = {
  load: facadeLoader,
  time: { now: 0 },
  textures: {
    exists: key => facadeTextureKeys.has(key),
    remove: key => facadeTextureKeys.delete(key),
  },
  runtimeAssetLoadCoordinator: {
    enabled: true,
    request(asset, options) {
      facadeRequests.push({ asset, options });
      return { cancel: () => true };
    },
    releaseDecodedSource() {
      facadeDecodedReleases += 1;
    },
  },
};
const facadeSystem = new WorldScenicFacadeSystem(facadeScene, {});
facadeSystem.config = { materials: { shallow: "shallow.webp" } };
facadeSystem.update = () => facadeUpdates += 1;
facadeSystem._queueMaterials([{ material: "shallow" }]);
assert.equal(facadeRequests.length, 1);
assert.equal(facadeLoader.queued.length, 0, "facade materials must use the shared queue");
assert.equal(
  facadeRequests[0].options.owner,
  RUNTIME_ASSET_LOADING.owners.worldFacade,
);
assert.equal(
  facadeRequests[0].options.priority,
  RUNTIME_ASSET_LOADING.priorities.worldFacade,
);
facadeRequests[0].options.onStart();
facadeTextureKeys.add("world-scenic-facade-shallow");
facadeRequests[0].options.onReady();
assert.equal(facadeUpdates, 1);
assert.equal(facadeSystem.pendingTextures.size, 0);
facadeSystem.materialAssets.destroy();
assert.equal(facadeTextureKeys.size, 0);
assert.equal(facadeDecodedReleases, 1);


const heavenblockKeys = new Set();
const heavenblockRequests = [];
const makeImage = () => ({
  setOrigin() { return this; },
  setDepth() { return this; },
  setAlpha() { return this; },
  setDisplaySize() { return this; },
});
const heavenblockSystem = Object.assign(
  Object.create(V11SkyIslandVisualSystem.prototype),
  {
    scene: {
      config: { tileSize: 32 },
      textures: { exists: key => heavenblockKeys.has(key) },
      add: { image: makeImage },
    },
    heavenblocksConfig: {
      regions: [{
        id: "test-region",
        leftTile: 0,
        topTile: 0,
        displayWidthPx: 1672,
        displayHeightPx: 941,
        layers: [
          { key: "heaven-a", path: "a.png", overscan: 1, depth: 1, alpha: 1 },
          { key: "heaven-b", path: "b.png", overscan: 1, depth: 2, alpha: 1 },
        ],
      }],
    },
    sprites: [],
    heavenblockSprites: new Map(),
    heavenblocksCreated: false,
    heavenblocksLoadHandles: [],
    heavenblocksPendingAssets: 0,
    destroyed: false,
  },
);
heavenblockSystem.loadHeavenblocksCoordinated({
  request(asset, options) {
    heavenblockRequests.push({ asset, options });
    return { cancel() {} };
  },
}, heavenblockSystem.heavenblocksConfig.regions[0].layers);
assert.equal(heavenblockRequests.length, 2);
assert.equal(heavenblockSystem.heavenblocksCreated, false);
assert.equal(
  heavenblockRequests[0].options.priority,
  RUNTIME_ASSET_LOADING.priorities.heavenblocks,
);
heavenblockKeys.add("heaven-a");
heavenblockRequests[0].options.onReady();
assert.equal(
  heavenblockSystem.heavenblocksCreated,
  false,
  "Heavenblocks must not present a partially loaded six-layer composition",
);
heavenblockKeys.add("heaven-b");
heavenblockRequests[1].options.onReady();
assert.equal(heavenblockSystem.heavenblocksCreated, true);
assert.equal(heavenblockSystem.sprites.length, 2);

let titanQueuedCancelCount = 0;
let titanQueueChangeCount = 0;
const titanPending = {
  coordinated: true,
  handle: { cancel: () => titanQueuedCancelCount += 1 },
};
const titanStream = Object.assign(
  Object.create(TitanChamberStream.prototype),
  {
    pending: new Map([["titan-card", titanPending]]),
    loadedByStream: new Set(),
    textureReleases: { cancel() {}, schedule() { return false; } },
    _detach: () => false,
    _notifyChanged: () => titanQueueChangeCount += 1,
  },
);
assert.equal(titanStream._releaseIfUnused({
  playerDesired: false,
  pinCount: 0,
  asset: { key: "titan-card" },
  card: null,
  glow: null,
}), true);
assert.equal(titanQueuedCancelCount, 1);
assert.equal(titanStream.pending.size, 0);
assert.equal(titanQueueChangeCount, 1);

const tracker = new WorldVisualPerformanceTracker();
const allCacheSnapshot = tracker.snapshot({
  materialAssets: { pendingAssets: 1, loadedAssets: 1 },
  backdropAssets: { pendingAssets: 1, loadedAssets: 1 },
  terrainAssets: { pendingAssets: 1, loadedAssets: 1 },
  groundStructureAssets: { pendingAssets: 1, loadedAssets: 1 },
  skyAssets: { pendingAssets: 1, loadedAssets: 1 },
  undergroundDetailAssets: { pendingAssets: 1, loadedAssets: 1 },
  backdropEnhancerAssets: { pendingAssets: 1, loadedAssets: 1 },
  assetQueue: { queued: 6, active: 1 },
});
assert.equal(allCacheSnapshot.assetsPending, 7);
assert.equal(allCacheSnapshot.assetsResident, 7);
assert.deepEqual(allCacheSnapshot.assetQueue, { queued: 6, active: 1 });

let observerCallback = null;
class FakePerformanceObserver {
  constructor(callback) {
    observerCallback = callback;
  }

  observe(options) {
    assert.equal(options.type, PERFORMANCE_TELEMETRY_CONFIG.longTasks.entryType);
  }

  disconnect() {}
}
const telemetry = new PerformanceTelemetrySystem({
  globalRef: { PerformanceObserver: FakePerformanceObserver },
}).install();
observerCallback({
  getEntries: () => [{ duration: 72 }, { duration: 54 }],
});
const telemetrySnapshot = telemetry.snapshot();
assert.equal(telemetrySnapshot.longTaskSupported, true);
assert.equal(telemetrySnapshot.longTasksInWindow, 2);
assert.equal(telemetrySnapshot.longTaskMs.max, 72);
telemetry.destroy();

console.log("runtime asset load coordinator contract: ok");
