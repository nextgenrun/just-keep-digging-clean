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
import { CaveActionAnimationRuntime } from
  "../world/playScene/CaveActionAnimationRuntime.js";
import { updateCaveLocomotionVisual } from
  "../world/playScene/CaveLocomotionAnimationRuntime.js";
import { PLAYER_COLLISION_POLISH_V2 } from "../values/playerCollision.js";
import {
  PLAYER_DEFERRED_ASSET_PACK_IDS,
  resolvePlayerDeferredAssetPackReleaseDelayMs,
} from
  "../values/playerDeferredAssetPacks.js";
import { SURVIVAL_UAL_PLAYER_ASSET_PROFILE } from
  "../values/survivalUalPlayerAssetProfile.js";
import {
  SURVIVAL_UNIFIED_ANIMATION_RUNTIME_V1,
  resolveSurvivalTransitionCohesionEnabled,
} from "../values/survivalUnifiedAnimationRuntimeV1.js";

const profile = SURVIVAL_UAL_PLAYER_ASSET_PROFILE;
const activePolishAnimationKeys = profile.animationPolishAnimations
  .map(animation => animation.key);
assert.equal(
  new Set(activePolishAnimationKeys).size,
  activePolishAnimationKeys.length,
  "the active animation tree must not retain competing legacy definitions",
);
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
assert.equal(new Set(pinnedAssets.map(asset => asset.key)).size, 13);
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

const optionalPackExpectations = new Map([
  [PLAYER_DEFERRED_ASSET_PACK_IDS.ledgeClimb, 1],
  [PLAYER_DEFERRED_ASSET_PACK_IDS.movingComplexMining, 1],
  [PLAYER_DEFERRED_ASSET_PACK_IDS.complexSideMining, 9],
  [PLAYER_DEFERRED_ASSET_PACK_IDS.complexUpMining, 1],
]);
for (const [packId, expectedCount] of optionalPackExpectations) {
  const assets = getPlayerDeferredAssetPack(profile, packId);
  assert.equal(assets.length, expectedCount, `${packId} pack size`);
  for (const asset of assets) {
    assert.equal(queuedKeys.has(asset.key), false, `${asset.key} must be on demand`);
  }
}
assert.equal(
  queuedKeys.has(profile.complexDigJabSheet),
  true,
  "the modern SIDE fallback must be resident before the first attack",
);
assert.equal(
  getPlayerDeferredAssetPack(profile, PLAYER_DEFERRED_ASSET_PACK_IDS.complexSideMining)
    .some(asset => asset.key === profile.complexDigJabSheet),
  false,
);

const mappingController = new PlayerDeferredAnimationAssetController(
  { runtimeAssetLoadCoordinator: null },
  profile,
);
assert.ok(mappingController.keysByPack
  .get(PLAYER_DEFERRED_ASSET_PACK_IDS.movingComplexMining)
  .includes(profile.digAnimationVariants.find(
    spec => spec.sheet === profile.movingComplexDigSheet,
  ).key));

const caveFallbackRequests = [];
const cavePrewarmRequests = [];
const caveFallbackAnimationKey = profile.complexDigSideFallbackAnimationKey;
const cavePlaybackOrder = [];
const cavePlayer = {
  anims: {
    currentAnim: { key: profile.idleAnim },
    currentFrame: { index: 0, textureFrame: 0 },
    isPlaying: false,
    timeScale: 1,
  },
  setAngle: () => {},
  setFlipX: () => {},
  play(key) {
    cavePlaybackOrder.push(`play:${key}`);
    this.lastPlayedKey = key;
    this.anims.currentAnim = { key };
    this.anims.isPlaying = true;
  },
};
const caveController = {
  scene: {
    playerAssetProfile: profile,
    player: cavePlayer,
    anims: {
      exists: key => key === caveFallbackAnimationKey,
      get: key => key === caveFallbackAnimationKey
        ? { frames: [{}], frameRate: 30 }
        : null,
    },
    playerRigContact: { beginAction: () => {}, endAction: () => {} },
    time: { now: 100 },
  },
  originScene: {
    playerDeferredAnimationAssetController: {
      ensureForAnimation(requested) {
        cavePrewarmRequests.push(requested);
        return Promise.resolve({ ready: false });
      },
      resolveOrRequest(requested, fallback) {
        caveFallbackRequests.push({ requested, fallback });
        return fallback;
      },
    },
  },
  playerController: {
    physicsBody: { vx: 0, vy: 0 },
    getMotionState: () => "idle",
    isFacingRight: () => true,
    isGrounded: () => true,
    _syncSpriteWithPhysics: () => {},
  },
  digSystem: { getEffectiveCooldownMs: () => 200 },
  _actionUntilMs: 0,
  _applyPlayerDisplaySize: key => cavePlaybackOrder.push(`size:${key}`),
};
const caveActionRuntime = new CaveActionAnimationRuntime(caveController);
caveActionRuntime.timeline = { isActive: false, begin: () => 1 };
assert.equal(
  caveActionRuntime.playMiningAnimation(
    "normal",
    "RIGHT",
    100,
    null,
    () => {},
    { tx: 1, ty: 1 },
  ),
  true,
);
assert.deepEqual(cavePrewarmRequests, [profile.complexDigSidePrewarmAnimationKey]);
assert.equal(caveFallbackRequests.length, 0);
assert.equal(cavePlayer.lastPlayedKey, caveFallbackAnimationKey);
assert.deepEqual(cavePlaybackOrder.slice(-2), [
  `play:${caveFallbackAnimationKey}`,
  `size:${caveFallbackAnimationKey}`,
], "cave actions must size the newly selected atlas frame");

const locomotionFallbackRequests = [];
caveController._actionUntilMs = 0;
caveController.scene.lightSystem = { isTorchActive: () => true };
caveController.scene.anims.exists = key => key === profile.idleAnim;
caveController.scene.anims.get = () => ({ frames: [{}], frameRate: 12 });
caveController.scene.player.anims.currentAnim = { key: profile.idleAnim };
caveController.scene.player.anims.isPlaying = true;
caveController.scene.playerController = caveController.playerController;
caveController.playerController.abilities = { isFlying: () => false };
caveController.playerController.requiresCrouchVisual = () => false;
caveController.playerController.getLedgeVisualState = () => null;
caveController.originScene.playerDeferredAnimationAssetController = {
  resolveOrRequest(requested, fallback) {
    locomotionFallbackRequests.push({ requested, fallback });
    return fallback;
  },
};
updateCaveLocomotionVisual({
  controller: caveController,
  thunderStrikeRuntime: { isAnimating: false },
  timeline: null,
  actionRecovery: null,
  wallBrace: null,
  locomotion: null,
  flightTravel: false,
}, 100, 16.67);
assert.equal(locomotionFallbackRequests.length, 1);
assert.equal(locomotionFallbackRequests[0].fallback, profile.idleAnim);

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

const complexReleaseDelayMs = resolvePlayerDeferredAssetPackReleaseDelayMs(
  PLAYER_DEFERRED_ASSET_PACK_IDS.movingComplexMining,
  5000,
);
assert.equal(complexReleaseDelayMs, 60_000);
residencyController.scene.time.now = complexReleaseDelayMs - 1;
residencyController.states = new Map([[
  PLAYER_DEFERRED_ASSET_PACK_IDS.movingComplexMining,
  { status: "ready", lastUsedAtMs: 0 },
]]);
residencyController.keysByPack = new Map([[
  PLAYER_DEFERRED_ASSET_PACK_IDS.movingComplexMining,
  ["moving-complex-dig"],
]]);
residencyController.update();
assert.equal(evictionCount, 1, "complex mining remains warm during an active session");
residencyController.scene.time.now = complexReleaseDelayMs;
residencyController.update();
assert.equal(evictionCount, 2);

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
assert.match(caveRuntime, /player\.play\(key[\s\S]*?_applyPlayerDisplaySize\(key\)/);
assert.doesNotMatch(
  caveRuntime,
  /_applyPlayerDisplaySize\(key\)[\s\S]{0,120}?player\.play\(key/,
  "cave locomotion must not size the outgoing frame before changing atlases",
);
assert.match(
  mainRuntime,
  /player\.play\(targetAnim[\s\S]{0,500}?player\.setDisplaySize\(displaySize, displaySize\)/,
  "main locomotion must size the frame selected by play()",
);

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
assert.ok(decodedBytes <= 352 * 1024 * 1024, "idle player residency stays below 352 MiB");

console.log("PLAYER_ANIMATION_TRANSITION_COHESION_V3_CONTRACT_OK", {
  residentTraversalSheets: pinnedAssets.length,
  residentSheets: residentEntries.length,
  decodedEstimateMiB: Math.round(decodedBytes / 1024 / 1024),
  releaseThresholdPxPerSec:
    PLAYER_COLLISION_POLISH_V2.locomotionMinHorizontalSpeedPxPerSec,
  rollback: "?transitionCohesion=0",
});
