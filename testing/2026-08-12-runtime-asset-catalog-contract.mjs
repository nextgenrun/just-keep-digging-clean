import assert from "node:assert/strict";

import { CampfireSystem } from "../systems/environment/CampfireSystem.js";
import { executeCampfireUpgrade } from
  "../systems/environment/CampfireUpgradeTransaction.js";
import { queueWorldLoadFeatureAssets } from
  "../ui/scenes/WorldLoadAssetPreloader.js";
import {
  createGameplayCapabilities,
  GAMEPLAY_PROFILE_IDS,
} from "../values/gameplayCapabilities.js";
import {
  RUNTIME_ASSET_LOADING,
  RUNTIME_ASSET_RESIDENCY_CLASSES,
  RUNTIME_FEATURE_ASSET_GROUP_IDS,
} from "../values/runtimeAssetLoading.js";
import { getStarIdentityPreloadAssets } from
  "../values/starIdentityLibrary.js";
import { RuntimeAssetCatalog } from
  "../world/rendering/RuntimeAssetCatalog.js";
import { RuntimeFeatureAssetManager } from
  "../world/rendering/RuntimeFeatureAssetManager.js";
import { RuntimeFeaturePrefetchSystem } from
  "../world/rendering/RuntimeFeaturePrefetchSystem.js";
import { RuntimeTextureMemoryTracker } from
  "../world/rendering/RuntimeTextureMemoryTracker.js";
import { getRuntimeFeatureAssetGroup } from
  "../world/rendering/runtimeFeatureAssetGroups.js";

class FakeTextures {
  constructor() {
    this.entries = new Map();
  }

  add(key, width = 32, height = 32) {
    const image = { width, height };
    this.entries.set(key, { source: [{ image, width, height }] });
    return image;
  }

  exists(key) {
    return this.entries.has(key);
  }

  get(key) {
    return this.entries.get(key);
  }

  getTextureKeys() {
    return [...this.entries.keys()];
  }

  remove(key) {
    return this.entries.delete(key);
  }
}

const demoCapabilities = createGameplayCapabilities(GAMEPLAY_PROFILE_IDS.DEMO);
const reviewCapabilities = createGameplayCapabilities(GAMEPLAY_PROFILE_IDS.FULL_REVIEW);
const demoCatalog = new RuntimeAssetCatalog(demoCapabilities);
const gatedAssets = [
  ["level-2-town", "level-two"],
  ["arc-core-hero", "arc-core"],
  ["heavenblock-altar", "heavenblocks"],
  ["screen-record-frame", "screen-capture"],
];
for (const [key] of gatedAssets) {
  assert.equal(
    demoCatalog.registerQueuedAsset({ key, path: `full-quality/${key}.png` }),
    null,
    `${key} must not enter the demo queue`,
  );
}
const demoSnapshot = demoCatalog.getSnapshot();
assert.equal(demoSnapshot.profileId, GAMEPLAY_PROFILE_IDS.DEMO);
assert.equal(demoSnapshot.blockedQueueAttempts, gatedAssets.length);
assert.deepEqual(demoSnapshot.blockedOwners, gatedAssets.map(([, owner]) => owner).sort());

const reviewCatalog = new RuntimeAssetCatalog(reviewCapabilities);
for (const [key] of gatedAssets) {
  assert.ok(
    reviewCatalog.registerQueuedAsset({ key, path: `full-quality/${key}.png` }),
    `${key} must remain available in full-review`,
  );
}

const texturePath = "sprites/authored/full-quality-4096x2048.png";
const trackedTextures = new FakeTextures();
trackedTextures.add("authored-core", 4096, 2048);
reviewCatalog.register(
  { key: "authored-core", path: texturePath },
  {
    owner: RUNTIME_ASSET_LOADING.owners.playerCore,
    priority: RUNTIME_ASSET_LOADING.priorities.playerCore,
    residencyClass: RUNTIME_ASSET_RESIDENCY_CLASSES.core,
    packId: "player-core:contract",
    consumers: ["selected-player"],
  },
);
const tracker = new RuntimeTextureMemoryTracker({ textures: trackedTextures });
assert.equal(reviewCatalog.adoptIntoTracker(tracker, trackedTextures), 1);
const authoredDescriptor = reviewCatalog.get("authored-core");
assert.equal(authoredDescriptor.path, texturePath, "catalog adoption must not replace source art");
assert.deepEqual(authoredDescriptor.dimensions, { width: 4096, height: 2048 });
assert.equal(authoredDescriptor.owner, RUNTIME_ASSET_LOADING.owners.playerCore);
assert.equal(authoredDescriptor.residencyClass, RUNTIME_ASSET_RESIDENCY_CLASSES.core);
assert.deepEqual(authoredDescriptor.consumers, ["selected-player"]);
const memorySnapshot = tracker.sample(true);
assert.equal(memorySnapshot.estimatedBytes, 4096 * 2048 * 4);
assert.equal(memorySnapshot.untrackedSourceCount, 0);
assert.equal(
  memorySnapshot.bytesByOwner[RUNTIME_ASSET_LOADING.owners.playerCore],
  4096 * 2048 * 4,
);

const starGroup = getRuntimeFeatureAssetGroup(
  RUNTIME_FEATURE_ASSET_GROUP_IDS.starBlockFx,
);
const starKeys = new Set(starGroup.assets.map(asset => asset.key));
assert.ok(getStarIdentityPreloadAssets().every(asset => starKeys.has(asset.key)));
assert.equal(starGroup.residencyClass, RUNTIME_ASSET_RESIDENCY_CLASSES.threshold);
assert.equal(RUNTIME_ASSET_LOADING.textureMemory.highWatermarkBytes, 704 * 1048576);
assert.equal(RUNTIME_ASSET_LOADING.textureMemory.lowWatermarkBytes, 640 * 1048576);

function makeWorldLoadScene(capabilities) {
  const textures = new FakeTextures();
  const catalog = new RuntimeAssetCatalog(capabilities);
  const queued = [];
  return {
    queued,
    textures,
    registry: { get: key => key === "runtimeAssetCatalog" ? catalog : null },
    load: { image: (key, path) => queued.push({ key, path }) },
  };
}

const casualScene = makeWorldLoadScene(demoCapabilities);
const casualLoad = queueWorldLoadFeatureAssets(casualScene, {
  campfireData: { level: 2 },
  hardcoreModeData: { mode: "casual" },
});
assert.equal(casualLoad.modeQueuedCount, 0);
assert.equal(casualLoad.campfireQueuedCount, 2);
const hardcoreScene = makeWorldLoadScene(demoCapabilities);
const hardcoreLoad = queueWorldLoadFeatureAssets(hardcoreScene, {
  campfireData: { level: 2 },
  hardcoreModeData: { mode: "hardcore" },
});
assert.ok(hardcoreLoad.modeQueuedCount > 0);
assert.equal(hardcoreLoad.campfireQueuedCount, casualLoad.campfireQueuedCount);

let overBudget = true;
let now = 0;
let timerCallback = null;
let requests = 0;
const pressureTextures = new FakeTextures();
const pressureCoordinator = {
  enabled: true,
  textureMemory: {
    sample: () => ({
      overBudget,
      estimatedBytes: overBudget ? 705 * 1048576 : 600 * 1048576,
      lowWatermarkBytes: 640 * 1048576,
    }),
    touch() {},
  },
  request(asset, { onReady }) {
    requests += 1;
    queueMicrotask(() => {
      pressureTextures.add(asset.key);
      onReady(asset);
    });
    return { cancel: () => true };
  },
  releaseDecodedSource() {},
};
const pressureConfig = {
  ...RUNTIME_ASSET_LOADING,
  featureResidency: {
    ...RUNTIME_ASSET_LOADING.featureResidency,
    pressureRetryMs: 1,
    optionalLoadTimeoutMs: 5,
  },
};
const pressureManager = new RuntimeFeatureAssetManager(
  { textures: pressureTextures, runtimeAssetLoadCoordinator: pressureCoordinator },
  pressureConfig,
  "",
  {
    now: () => now,
    setTimer: callback => { timerCallback = callback; return 1; },
    clearTimer: () => { timerCallback = null; },
  },
);
const timedOutLoad = pressureManager.ensureGroup(
  RUNTIME_FEATURE_ASSET_GROUP_IDS.worldMap,
  { consumer: "pressure-timeout" },
);
assert.equal(requests, 0, "optional loads must wait above 704 MiB");
now = 6;
timerCallback();
const timedOutResult = await timedOutLoad;
assert.equal(timedOutResult.ready, false);
assert.equal(timedOutResult.timedOut, true);
assert.equal(requests, 0);

const starAtlasLoad = pressureManager.ensureGroup(
  RUNTIME_FEATURE_ASSET_GROUP_IDS.starAtlas,
  { consumer: "player-opened-star-atlas" },
);
const starAtlasResult = await starAtlasLoad;
assert.equal(
  starAtlasResult.ready,
  true,
  "player-opened Star Atlas art must bypass pressure deferral and remain closable",
);
assert.equal(requests, 1);

overBudget = false;
const readyResult = await pressureManager.ensureGroup(
  RUNTIME_FEATURE_ASSET_GROUP_IDS.worldMap,
  { consumer: "pressure-recovered" },
);
assert.equal(readyResult.ready, true);
assert.equal(requests, 2);
pressureManager.destroy();

function makeCampfireSystem(manager) {
  let money = 100;
  let spends = 0;
  const saves = [];
  const system = {
    _campfireLevel: 1,
    _destroyed: false,
    _campfireUpgradePromise: null,
    scene: {
      runtimeFeatureAssetManager: manager,
      upgradeSystem: {
        getMoney: () => money,
        spendMoney: amount => { money -= amount; spends += 1; return true; },
      },
      hudSystem: { flashStatus() {} },
      queueDugTilesSave: reason => saves.push(reason),
    },
    _ensureCampfireTierTexture: async () => true,
    _syncMoneyUi() {},
  };
  return { system, getMoney: () => money, getSpends: () => spends, saves };
}

const rejectedUpgrade = makeCampfireSystem({
  enabled: true,
  ensureGroup: async () => ({ ready: false, timedOut: true }),
  releaseGroup() {},
});
const rejectedResult = await executeCampfireUpgrade(rejectedUpgrade.system);
assert.equal(rejectedResult.success, false);
assert.equal(rejectedResult.reason, "asset-unavailable");
assert.equal(rejectedUpgrade.getMoney(), 100, "timed-out art must spend no gold");
assert.equal(rejectedUpgrade.system._campfireLevel, 1);
assert.equal(rejectedUpgrade.saves.length, 0);

let releaseAssetLoad;
const acceptedUpgrade = makeCampfireSystem({
  enabled: true,
  ensureGroup: () => new Promise(resolve => { releaseAssetLoad = resolve; }),
  releaseGroup() {},
});
const firstUpgrade = CampfireSystem.prototype.upgradeCampfire.call(acceptedUpgrade.system);
const duplicateUpgrade = CampfireSystem.prototype.upgradeCampfire.call(acceptedUpgrade.system);
assert.equal(firstUpgrade, duplicateUpgrade, "duplicate clicks must share one transaction");
releaseAssetLoad({ ready: true });
const acceptedResult = await firstUpgrade;
assert.equal(acceptedResult.success, true);
assert.equal(acceptedUpgrade.getSpends(), 1);
assert.equal(acceptedUpgrade.system._campfireLevel, 2);
assert.deepEqual(acceptedUpgrade.saves, ["campfire-upgrade"]);

let timerInstalled = false;
const prefetch = new RuntimeFeaturePrefetchSystem({
  gameState: "loading",
  time: { addEvent: () => { timerInstalled = true; return { remove() {} }; } },
  config: { tileSize: 32, playerSpawnTileX: 0, playerSpawnTileY: 0 },
  worldModel: {
    width: 1, depth: 1,
    getTileType: () => "air",
  },
}, { enabled: true });
const prefetchStart = prefetch.start();
assert.equal(timerInstalled, true, "prefetch polling starts without blocking scene setup");
assert.equal(await prefetchStart, false);
prefetch.destroy();

console.log("runtime asset catalog contract: PASS");
