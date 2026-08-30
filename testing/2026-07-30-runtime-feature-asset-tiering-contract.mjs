import assert from "node:assert/strict";
import { existsSync } from "node:fs";

import { CAMPFIRE_CONFIG } from "../values/campfireConfig.js";
import { LIGHT_CONFIG } from "../values/lightConfig.js";
import { getStarIdentityRarityAssets } from "../values/starIdentityRuntimeAssets.js";
import {
  RUNTIME_ASSET_LOADING,
  RUNTIME_FEATURE_ASSET_GROUP_IDS,
  getCampfireFeatureAssetGroupId,
  getStarRarityFeatureAssetGroupId,
  getStarReleaseFeatureAssetGroupId,
  resolveRuntimeFeatureAssetDeferralEnabled,
} from "../values/runtimeAssetLoading.js";
import { TITAN_DISCOVERY_CONFIG } from "../values/titanDiscoveries.js";
import {
  GAMEPLAY_PROFILE_IDS,
  createGameplayCapabilities,
} from "../values/gameplayCapabilities.js";
import { getCapabilityTitanGameplayPreloadAssets } from
  "../values/titanRuntimeCapabilities.js";
import { SkyBeaconPulseRenderer } from "../systems/lighting/SkyBeaconPulseRenderer.js";
import { SkySteadyLightRenderer } from "../systems/lighting/SkySteadyLightRenderer.js";
import { queueWorldLoadFeatureAssets } from "../ui/scenes/WorldLoadAssetPreloader.js";
import { RuntimeFeatureAssetManager } from "../world/rendering/RuntimeFeatureAssetManager.js";
import { getRuntimeFeatureAssetGroup } from "../world/rendering/runtimeFeatureAssetGroups.js";
import { installStarIdentityTextureFrames } from
  "../systems/visual/installStarIdentityTextureFrames.js";

assert.equal(resolveRuntimeFeatureAssetDeferralEnabled(RUNTIME_ASSET_LOADING, ""), true);
assert.equal(
  resolveRuntimeFeatureAssetDeferralEnabled(RUNTIME_ASSET_LOADING, "?runtimeFeatureAssets=0"),
  false,
);
assert.equal(
  resolveRuntimeFeatureAssetDeferralEnabled(RUNTIME_ASSET_LOADING, "?runtimeAssetQueue=0"),
  false,
);

const groupIds = [
  RUNTIME_FEATURE_ASSET_GROUP_IDS.starBlockFx,
  getStarRarityFeatureAssetGroupId(0),
  getStarRarityFeatureAssetGroupId(5),
  getStarReleaseFeatureAssetGroupId(0),
  getStarReleaseFeatureAssetGroupId(5),
  RUNTIME_FEATURE_ASSET_GROUP_IDS.starAtlas,
  RUNTIME_FEATURE_ASSET_GROUP_IDS.starlight,
  RUNTIME_FEATURE_ASSET_GROUP_IDS.titanArchive,
  RUNTIME_FEATURE_ASSET_GROUP_IDS.worldMap,
  getCampfireFeatureAssetGroupId(4),
];
for (const groupId of groupIds) {
  const group = getRuntimeFeatureAssetGroup(groupId);
  assert.ok(group?.assets.length > 0, `${groupId} must have demand-load assets`);
  assert.equal(new Set(group.assets.map(asset => asset.key)).size, group.assets.length);
  for (const asset of group.assets) {
    const localPath = asset.path.replace(/[?#].*$/, "");
    assert.ok(existsSync(localPath), `${groupId} asset must exist: ${localPath}`);
  }
}
assert.equal(
  getRuntimeFeatureAssetGroup(RUNTIME_FEATURE_ASSET_GROUP_IDS.titanArchive).assets.length,
  TITAN_DISCOVERY_CONFIG.definitions.length,
);
assert.equal(getRuntimeFeatureAssetGroup(RUNTIME_FEATURE_ASSET_GROUP_IDS.worldMap).assets.length, 2);
assert.equal(getRuntimeFeatureAssetGroup(getCampfireFeatureAssetGroupId(4)).assets.length, 1);
for (let rarity = 0; rarity < 6; rarity += 1) {
  const rarityGroup = getRuntimeFeatureAssetGroup(
    getStarRarityFeatureAssetGroupId(rarity),
  );
  assert.deepEqual(
    rarityGroup.assets.map(asset => asset.key),
    getStarIdentityRarityAssets(rarity).map(asset => asset.key),
  );
  const releaseGroup = getRuntimeFeatureAssetGroup(
    getStarReleaseFeatureAssetGroupId(rarity),
  );
  assert.equal(releaseGroup.assets.length, 3);
  assert.equal(
    releaseGroup.bypassPressureGate,
    true,
    "player-triggered Star releases must not time out behind memory pressure",
  );
}
const installedFrames = new Set();
const partialFrameScene = {
  textures: {
    exists: key => getStarIdentityRarityAssets(0).some(asset => asset.key === key),
    get: () => ({
      has: frame => installedFrames.has(frame),
      add: frame => installedFrames.add(frame),
    }),
  },
};
assert.equal(installStarIdentityTextureFrames(partialFrameScene), true);
assert.ok(installedFrames.size > 0, "resident rarity atlases must install independently");

const demoTitanAssets = getCapabilityTitanGameplayPreloadAssets(
  TITAN_DISCOVERY_CONFIG,
  "",
  createGameplayCapabilities(GAMEPLAY_PROFILE_IDS.DEMO),
);
const fullTitanAssets = getCapabilityTitanGameplayPreloadAssets(
  TITAN_DISCOVERY_CONFIG,
  "",
  createGameplayCapabilities(GAMEPLAY_PROFILE_IDS.FULL_REVIEW),
);
assert.ok(demoTitanAssets.length < fullTitanAssets.length);
assert.ok(demoTitanAssets.every(asset => existsSync(asset.path)));

const queuedWorldAssets = [];
const featureLoad = queueWorldLoadFeatureAssets({
  textures: { exists: () => false },
  load: { image: (key, assetPath) => queuedWorldAssets.push({ key, path: assetPath }) },
}, {
  saveSlot: 3,
  campfireData: { level: 4 },
  search: "",
});
assert.equal(featureLoad.campfireLevel, 4);
assert.deepEqual(
  queuedWorldAssets.map(asset => asset.key),
  [
    CAMPFIRE_CONFIG.spriteKeys[3],
    CAMPFIRE_CONFIG.spriteKeys[4],
    "ui-hardcore-oath-panel-v1",
  ],
);
assert.equal(queueWorldLoadFeatureAssets({ load: { image() {} } }, {
  search: "?runtimeFeatureAssets=0",
}).queued, false);

class FakeTextures {
  constructor(keys = []) {
    this.keys = new Set(keys);
    this.removed = [];
  }
  exists(key) { return this.keys.has(key); }
  remove(key) {
    this.removed.push(key);
    return this.keys.delete(key);
  }
}

function createManagerHarness(initialKeys = []) {
  const textures = new FakeTextures(initialKeys);
  const requests = [];
  const timers = [];
  let cancelled = 0;
  const coordinator = {
    enabled: true,
    textureMemory: {
      touch() {},
      sample: () => ({ overBudget: false, estimatedBytes: 0, lowWatermarkBytes: 0 }),
    },
    request(asset, options) {
      const request = { asset, options, cancelled: false };
      requests.push(request);
      return {
        cancel() {
          request.cancelled = true;
          cancelled += 1;
          return true;
        },
      };
    },
    releaseDecodedSource() { return true; },
    _registerTexture() { return true; },
  };
  const scene = { textures, runtimeAssetLoadCoordinator: coordinator };
  const manager = new RuntimeFeatureAssetManager(scene, RUNTIME_ASSET_LOADING, "", {
    now: () => 10,
    setTimer(callback) { timers.push(callback); return timers.length; },
    clearTimer() {},
  });
  return { manager, textures, requests, timers, get cancelled() { return cancelled; } };
}

const managedHarness = createManagerHarness();
const worldMapAssets = getRuntimeFeatureAssetGroup(
  RUNTIME_FEATURE_ASSET_GROUP_IDS.worldMap,
).assets;
const worldMapPromise = managedHarness.manager.ensureGroup(
  RUNTIME_FEATURE_ASSET_GROUP_IDS.worldMap,
  { consumer: "test-map" },
);
assert.equal(managedHarness.requests.length, worldMapAssets.length);
for (const request of managedHarness.requests) {
  managedHarness.textures.keys.add(request.asset.key);
  request.options.onReady();
}
assert.equal((await worldMapPromise).ready, true);
managedHarness.manager.releaseGroup(RUNTIME_FEATURE_ASSET_GROUP_IDS.worldMap, "test-map");
managedHarness.timers.shift()();
assert.deepEqual(
  managedHarness.textures.removed,
  managedHarness.requests.map(request => request.asset.key),
);
managedHarness.manager.destroy();
assert.equal(
  managedHarness.manager.isReady(RUNTIME_FEATURE_ASSET_GROUP_IDS.worldMap),
  false,
  "destroyed managers must remain safe for late health-canary reads",
);

const externalHarness = createManagerHarness(worldMapAssets.map(asset => asset.key));
assert.equal((await externalHarness.manager.ensureGroup(
  RUNTIME_FEATURE_ASSET_GROUP_IDS.worldMap,
  { consumer: "external-map" },
)).ready, true);
externalHarness.manager.releaseGroup(RUNTIME_FEATURE_ASSET_GROUP_IDS.worldMap, "external-map");
externalHarness.timers.shift()();
assert.deepEqual(externalHarness.textures.removed, [], "unadopted Boot textures must never be evicted");
externalHarness.manager.destroy();

const campfireGroupId = getCampfireFeatureAssetGroupId(4);
const campfireKey = getRuntimeFeatureAssetGroup(campfireGroupId).assets[0].key;
const adoptedHarness = createManagerHarness([campfireKey]);
await adoptedHarness.manager.ensureGroup(campfireGroupId, {
  consumer: "campfire-test",
  adoptExisting: true,
});
adoptedHarness.manager.releaseGroup(campfireGroupId, "campfire-test");
adoptedHarness.timers.shift()();
assert.deepEqual(adoptedHarness.textures.removed, [campfireKey]);
adoptedHarness.manager.destroy();

const cancelledHarness = createManagerHarness();
const cancelledPromise = cancelledHarness.manager.ensureGroup(
  RUNTIME_FEATURE_ASSET_GROUP_IDS.titanArchive,
  { consumer: "cancel-test" },
);
cancelledHarness.manager.releaseGroup(
  RUNTIME_FEATURE_ASSET_GROUP_IDS.titanArchive,
  "cancel-test",
);
assert.equal((await cancelledPromise).cancelled, true);
assert.equal(cancelledHarness.cancelled, cancelledHarness.requests.length);
cancelledHarness.manager.destroy();

const previousPhaser = globalThis.Phaser;
globalThis.Phaser = { BlendModes: { ADD: 1 } };
const makeImage = () => ({
  setOrigin() { return this; },
  setDepth() { return this; },
  setBlendMode() { return this; },
  setAlpha() { return this; },
  setVisible() { return this; },
  setTexture() { return this; },
  setPosition() { return this; },
  setDisplaySize() { return this; },
  destroy() {},
});
const rendererKeys = new Set();
let createdImages = 0;
const rendererScene = {
  textures: { exists: key => rendererKeys.has(key) },
  add: { image: () => { createdImages += 1; return makeImage(); } },
};
const steadyVisuals = LIGHT_CONFIG.skyTileLights.steadyAura;
const steady = new SkySteadyLightRenderer(rendererScene, steadyVisuals);
steady.beginFrame();
assert.equal(createdImages, 0);
steadyVisuals.rarityAssets.forEach(asset => rendererKeys.add(asset.key));
steady.beginFrame();
assert.equal(createdImages, steadyVisuals.maxImages);
assert.equal(steady.draw({
  worldX: 10,
  worldY: 10,
  tileSize: 32,
  verticalScale: 1,
  radiusTiles: 2,
  rarity: 0,
  intensity: 1,
}), true);
steady.destroy();

const pulseVisuals = LIGHT_CONFIG.skyTileLights.beaconPulse.visuals;
const pulse = new SkyBeaconPulseRenderer(rendererScene, pulseVisuals);
pulse.beginFrame();
assert.equal(createdImages, steadyVisuals.maxImages);
pulseVisuals.rarityAssets.forEach(asset => rendererKeys.add(asset.key));
pulse.beginFrame();
assert.equal(createdImages, steadyVisuals.maxImages + 1);
assert.equal(pulse.draw({
  worldX: 10,
  worldY: 10,
  tileSize: 32,
  verticalScale: 1,
  pulseRadiusTiles: 4,
  pulse: { waveStrength: 1 },
  rarity: 0,
}), true);
pulse.destroy();
globalThis.Phaser = previousPhaser;

console.log("runtime feature asset tiering contract: ok");
