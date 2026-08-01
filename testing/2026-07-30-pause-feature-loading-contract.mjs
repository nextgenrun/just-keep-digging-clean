import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import {
  getLoadingMiningMinigamePreloadAssets,
  getPauseFeatureLoadingPreloadAssets,
} from "../values/loadingMiningMinigame.js";
import { getPauseFeatureLoadingDecorationAssets } from
  "../values/pauseFeatureLoading.js";
import { PAUSE_FEATURE_LOADING_CONFIG } from
  "../values/pauseFeatureLoading.js";
import {
  RUNTIME_ASSET_LOADING,
  RUNTIME_FEATURE_ASSET_GROUP_IDS,
} from "../values/runtimeAssetLoading.js";
import { RuntimeFeatureAssetManager } from
  "../world/rendering/RuntimeFeatureAssetManager.js";
import { getRuntimeFeatureAssetGroup } from
  "../world/rendering/runtimeFeatureAssetGroups.js";

const source = path => readFileSync(path, "utf8");
const foundationAssets = getPauseFeatureLoadingPreloadAssets();
const decorationAssets = getPauseFeatureLoadingDecorationAssets();
const sharedAssets = [...foundationAssets, ...decorationAssets];

assert.equal(sharedAssets.length, 4);
assert.equal(foundationAssets.length, 3);
assert.equal(decorationAssets.length, 1);
assert.equal(new Set(sharedAssets.map(asset => asset.key)).size, 4);
sharedAssets.forEach(asset => {
  assert.ok(existsSync(asset.path), `shared loader art must exist: ${asset.path}`);
});
assert.equal(
  getLoadingMiningMinigamePreloadAssets(undefined, "?loadingMine=0").length,
  0,
);
assert.equal(
  getPauseFeatureLoadingPreloadAssets(undefined, "?loadingMine=0").length,
  3,
  "the ESC loader foundation must survive the full mining-loader rollback",
);
assert.equal(decorationAssets[0].key, "ui-starlight-modal-crest-v2");

const config = PAUSE_FEATURE_LOADING_CONFIG;
assert.equal(config.themes.starlight.stages.length, 3);
assert.equal(config.themes.titanArchive.stages.length, 3);
assert.ok(config.themes.starlight.phases.length >= 4);
assert.equal(config.themes.starlight.phases[0].at, 0);
assert.ok(
  config.themes.starlight.phases.every(
    (phase, index, phases) => index === 0 || phase.at > phases[index - 1].at,
  ),
);
assert.ok(config.motion.pollIntervalMs > 0);
assert.ok(config.motion.completeHoldMs > 0);

class FakeTextures {
  constructor() {
    this.keys = new Set();
  }
  exists(key) {
    return this.keys.has(key);
  }
  remove(key) {
    return this.keys.delete(key);
  }
}

function createManagerHarness() {
  const textures = new FakeTextures();
  const requests = [];
  const coordinator = {
    enabled: true,
    textureMemory: {
      touch() {},
      sample: () => ({
        overBudget: false,
        estimatedBytes: 0,
        lowWatermarkBytes: 0,
      }),
    },
    request(asset, options) {
      const request = { asset, options, cancelled: false };
      requests.push(request);
      return {
        cancel() {
          request.cancelled = true;
          return true;
        },
      };
    },
    releaseDecodedSource() {},
  };
  const scene = { textures, runtimeAssetLoadCoordinator: coordinator };
  const manager = new RuntimeFeatureAssetManager(
    scene,
    RUNTIME_ASSET_LOADING,
    "",
    { now: () => 1, setTimer: callback => callback, clearTimer() {} },
  );
  return { manager, textures, requests };
}

const harness = createManagerHarness();
const groupId = RUNTIME_FEATURE_ASSET_GROUP_IDS.starlight;
const group = getRuntimeFeatureAssetGroup(groupId);
const idle = harness.manager.getGroupProgress(groupId);
assert.equal(idle.status, "idle");
assert.equal(idle.totalAssets, group.assets.length);
assert.equal(idle.loadedAssets, 0);
assert.equal(idle.progress, 0);

const groupPromise = harness.manager.ensureGroup(
  groupId,
  { consumer: "pause-loader-contract" },
);
assert.equal(harness.requests.length, group.assets.length);
assert.equal(harness.manager.getGroupProgress(groupId).status, "loading");

for (const request of harness.requests.slice(0, 3)) {
  harness.textures.keys.add(request.asset.key);
  request.options.onReady();
}
const partial = harness.manager.getGroupProgress(groupId);
assert.equal(partial.loadedAssets, 3);
assert.equal(partial.pendingAssets, group.assets.length - 3);
assert.equal(partial.progress, 3 / group.assets.length);
const telemetryGroup = harness.manager.getSnapshot().groups
  .find(candidate => candidate.id === groupId);
assert.equal(telemetryGroup.loadedAssets, 3);
assert.equal(telemetryGroup.totalAssets, group.assets.length);
assert.equal(telemetryGroup.progress, partial.progress);

harness.manager.releaseGroup(groupId, "pause-loader-contract");
assert.equal((await groupPromise).cancelled, true);
const cancelled = harness.manager.getGroupProgress(groupId);
assert.equal(cancelled.status, "idle");
assert.equal(cancelled.loadedAssets, 0);
assert.equal(cancelled.pendingAssets, group.assets.length);
harness.manager.destroy();

const bootSource = source("ui/scenes/BootScene.js");
assert.match(bootSource, /getPauseFeatureLoadingPreloadAssets/);
assert.match(bootSource, /getPauseFeatureLoadingDecorationAssets/);
assert.match(
  bootSource,
  /for \(const asset of getPauseFeatureLoadingPreloadAssets\(\)\)/,
);

const pauseSource = source("world/playScene/PlaySceneUI.js");
assert.match(pauseSource, /createPauseFeatureLoadingView/);
assert.match(pauseSource, /manager\.getGroupProgress\(groupId\)/);
assert.match(pauseSource, /state\.featureLoadingView\.complete/);
assert.match(pauseSource, /state\.featureLoadingView\?\.destroy/);
assert.doesNotMatch(pauseSource, /LOADING FULL-QUALITY ART/);

const productionFiles = [
  "ui/components/pauseFeatureLoadingArt.js",
  "ui/components/PauseFeatureLoadingChrome.js",
  "ui/components/PauseFeatureLoadingProgress.js",
  "ui/components/PauseFeatureLoadingView.js",
];
for (const path of productionFiles) {
  const fileSource = source(path);
  assert.ok(
    fileSource.split(/\r?\n/).length <= 300,
    `${path} must remain within the module-size policy`,
  );
  assert.doesNotMatch(fileSource, /\.add\.graphics\(/);
  assert.doesNotMatch(fileSource, /\.add\.rectangle\(/);
  assert.doesNotMatch(fileSource, /document\.createElement/);
}
assert.match(
  source("ui/components/PauseFeatureLoadingChrome.js"),
  /assets\.boardFrame\.key/,
);
assert.match(
  source("ui/components/PauseFeatureLoadingProgress.js"),
  /screen\.progressFrameCrop/,
);
assert.match(
  source("ui/components/PauseFeatureLoadingProgress.js"),
  /snapshot\.loadedAssets/,
);

console.log(
  `pause feature loading contract: ${group.assets.length} real Starlight assets, `
  + "rollback-safe authored chrome, exact progress, and cancel-safe teardown passed",
);
