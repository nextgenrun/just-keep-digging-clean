import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  getPlayerDeferredAssetPack,
  queuePlayerProfileSheets,
} from "../player/PlayerAssetLoader.js";
import { getUniquePlayerSheetEntries } from "../player/PlayerAssetSheetCatalog.js";
import { PlayerDeferredAnimationAssetController } from
  "../player/PlayerDeferredAnimationAssetController.js";
import { UalNativeLocomotionTransitionSelector } from
  "../systems/visual/UalNativeLocomotionTransitionSelector.js";
import { PLAYER_COLLISION_POLISH_V2 } from "../values/playerCollision.js";
import { SURVIVAL_UAL_PLAYER_ASSET_PROFILE } from
  "../values/survivalUalPlayerAssetProfile.js";
import {
  SURVIVAL_UNIFIED_ANIMATION_RUNTIME_V1,
  resolveSurvivalTransitionCohesionEnabled,
} from "../values/survivalUnifiedAnimationRuntimeV1.js";

const profile = SURVIVAL_UAL_PLAYER_ASSET_PROFILE;
const pinnedIds = profile.preloadDeferredAnimationPackIds;
assert.deepEqual(pinnedIds, ["crouch", "flight", "locomotion-polish"]);
assert.equal(resolveSurvivalTransitionCohesionEnabled(""), true);
assert.equal(resolveSurvivalTransitionCohesionEnabled("?transitionCohesion=0"), false);
assert.equal(resolveSurvivalTransitionCohesionEnabled("?transitionCohesion=off"), false);
assert.equal(
  SURVIVAL_UNIFIED_ANIMATION_RUNTIME_V1.transitionCohesion.rollbackQuery,
  "transitionCohesion",
);

const pinnedAssets = pinnedIds.flatMap(id => getPlayerDeferredAssetPack(profile, id));
assert.equal(new Set(pinnedAssets.map(asset => asset.key)).size, 8);
const queued = [];
const loaderScene = {
  textures: {
    exists: () => false,
    get: () => null,
    getFrame: () => null,
    remove: () => {},
  },
  registry: { get: () => null },
  load: {
    spritesheet: (key, path, config) => queued.push({ key, path, config }),
    json: () => {},
  },
};
assert.equal(queuePlayerProfileSheets(loaderScene, profile), true);
const queuedKeys = new Set(queued.map(entry => entry.key));
for (const asset of pinnedAssets) {
  assert.equal(queuedKeys.has(asset.key), true, `${asset.key} is traversal-resident`);
}
const deathAssets = getPlayerDeferredAssetPack(profile, "death");
assert.ok(deathAssets.length > 0);
for (const asset of deathAssets) assert.equal(queuedKeys.has(asset.key), false);

let animationReady = false;
const synchronousController = Object.create(
  PlayerDeferredAnimationAssetController.prototype,
);
synchronousController.scene = {
  anims: { exists: () => animationReady },
};
synchronousController.ensureForAnimation = () => {
  animationReady = true;
  return Promise.resolve({ ready: true });
};
assert.equal(synchronousController.isReadyOrRequest("flight-loop"), true);

let evictionCount = 0;
const residencyController = Object.create(
  PlayerDeferredAnimationAssetController.prototype,
);
Object.assign(residencyController, {
  destroyed: false,
  scene: { time: { now: 100 }, player: { anims: { isPlaying: false } } },
  states: new Map([["flight", { status: "ready", lastUsedAtMs: 0 }]]),
  keysByPack: new Map([["flight", ["flight-loop"]]]),
  pinnedPackIds: new Set(["flight"]),
  config: { featureResidency: { releaseDelayMs: 0 } },
  _evict: () => { evictionCount += 1; },
});
residencyController.update();
assert.equal(evictionCount, 0);
residencyController.pinnedPackIds.clear();
residencyController.update();
assert.equal(evictionCount, 1);

const locomotion = new UalNativeLocomotionTransitionSelector(profile);
const snapshot = {
  grounded: true,
  flying: false,
  verticalVelocity: 0,
  currentAnimationKey: profile.walkRunAnim,
  currentFrameIndex: 4,
  currentTextureFrame: 4,
  isPlaying: true,
  facingFlipX: false,
};
locomotion.resolve({ ...snapshot, horizontalVelocity: 30 });
assert.equal(locomotion._groundMoving, true);
locomotion.resolve({ ...snapshot, horizontalVelocity: 15 });
assert.equal(locomotion._groundMoving, true);
locomotion.resolve({ ...snapshot, horizontalVelocity: 9 });
assert.equal(locomotion._groundMoving, false);
assert.equal(PLAYER_COLLISION_POLISH_V2.locomotionMinHorizontalSpeedPxPerSec, 10);

const mainRuntime = readFileSync(
  new URL("../world/playScene/PlaySceneGameplay.js", import.meta.url),
  "utf8",
);
const caveRuntime = readFileSync(
  new URL("../world/playScene/CaveLocomotionAnimationRuntime.js", import.meta.url),
  "utf8",
);
assert.doesNotMatch(mainRuntime, /groundMovementActive\s*:/);
assert.doesNotMatch(caveRuntime, /groundMovementActive\s*:/);
assert.match(mainRuntime, /playerController\._syncSpriteWithPhysics\?\.\(\);/);
assert.match(caveRuntime, /_applyPlayerDisplaySize\(key\)[\s\S]*?player\.play\(key/);

const entries = getUniquePlayerSheetEntries(profile);
const pinnedSet = new Set(pinnedIds);
const residentEntries = entries.filter(entry => (
  entry.deferredIds.length === 0
  || entry.deferredIds.some(id => pinnedSet.has(id))
));
const decodedBytes = residentEntries.reduce((total, entry) => (
  total
  + (entry.frameConfig.endFrame + 1)
    * entry.frameConfig.frameWidth
    * entry.frameConfig.frameHeight
    * 4
), 0);

console.log("PLAYER_ANIMATION_TRANSITION_COHESION_V3_CONTRACT_OK", {
  residentTraversalSheets: pinnedAssets.length,
  residentSheets: residentEntries.length,
  decodedEstimateMiB: Math.round(decodedBytes / 1024 / 1024),
  releaseThresholdPxPerSec:
    PLAYER_COLLISION_POLISH_V2.locomotionMinHorizontalSpeedPxPerSec,
  rollback: "?transitionCohesion=0",
});
