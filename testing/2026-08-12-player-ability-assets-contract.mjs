import assert from "node:assert/strict";

import { PlayerAbilities } from "../player/PlayerAbilities.js";
import { PlayerAbilityAssetController } from
  "../player/PlayerAbilityAssetController.js";
import {
  PLAYER_ABILITY_ASSET_IDS,
  getPlayerAbilityAssetPack,
  queueRobotSheets,
} from "../player/PlayerAssetLoader.js";
import {
  PLAYER_ASSET_PROFILES,
  getPlayerAssetProfile,
} from "../values/playerAssetProfiles.js";
import { PLAYER_CHARACTER_IDS } from "../values/playerCharacters.js";
import { RUNTIME_ASSET_LOADING } from "../values/runtimeAssetLoading.js";

const survivor = getPlayerAssetProfile(PLAYER_CHARACTER_IDS.survivalUal);
const robot = PLAYER_ASSET_PROFILES.robot;
assert.equal(
  getPlayerAbilityAssetPack(survivor, PLAYER_ABILITY_ASSET_IDS.quickslash).length,
  1,
  "Survivor Hurricane Kick is a dedicated deferred Quickslash sheet",
);
assert.equal(
  getPlayerAbilityAssetPack(survivor, PLAYER_ABILITY_ASSET_IDS.thunderStrike).length,
  1,
  "Survivor Mixamo Thunder Strike is a dedicated deferred ability sheet",
);
assert.equal(
  getPlayerAbilityAssetPack(robot, PLAYER_ABILITY_ASSET_IDS.quickslash).length,
  1,
);
assert.equal(
  getPlayerAbilityAssetPack(robot, PLAYER_ABILITY_ASSET_IDS.thunderStrike).length,
  2,
);

function makeWorldLoadScene() {
  const queued = [];
  return {
    queued,
    registry: { get: () => null },
    textures: {
      exists: () => false,
      remove() {},
      getFrame: () => null,
    },
    cache: { json: { exists: () => true } },
    load: {
      spritesheet: (key, path, frameConfig) => queued.push({ key, path, frameConfig }),
      json() {},
    },
  };
}

const robotLockedScene = makeWorldLoadScene();
queueRobotSheets(robotLockedScene, { upgradeLevels: {} });
assert.ok(getPlayerAbilityAssetPack(robot, PLAYER_ABILITY_ASSET_IDS.quickslash)
  .every(asset => !robotLockedScene.queued.some(queued => queued.key === asset.key)));
const robotUnlockedScene = makeWorldLoadScene();
queueRobotSheets(robotUnlockedScene, {
  upgradeLevels: { quickslashAbility: 1, thunderStrikeAbility: 1 },
});
for (const abilityId of Object.values(PLAYER_ABILITY_ASSET_IDS)) {
  assert.ok(getPlayerAbilityAssetPack(robot, abilityId).every(asset => (
    robotUnlockedScene.queued.some(queued => queued.key === asset.key && queued.path === asset.path)
  )));
}

let overBudget = true;
const textures = new Set();
const requests = [];
const animations = [];
const scene = {
  time: { now: 0 },
  textures: { exists: key => textures.has(key) },
  anims: {
    exists: key => animations.some(animation => animation.key === key),
    create: animation => animations.push(animation),
  },
  upgradeSystem: {
    isQuickslashUnlocked: () => false,
    isThunderStrikeUnlocked: () => true,
  },
  runtimeAssetLoadCoordinator: {
    enabled: true,
    textureMemory: { sample: () => ({ overBudget }) },
    request(asset, options) {
      requests.push({ asset, options });
      return { cancel: () => true };
    },
  },
};
const controller = new PlayerAbilityAssetController(scene, robot, {
  ...RUNTIME_ASSET_LOADING,
  featureResidency: {
    ...RUNTIME_ASSET_LOADING.featureResidency,
    optionalLoadTimeoutMs: 5,
  },
});
const deferred = controller.ensure(PLAYER_ABILITY_ASSET_IDS.thunderStrike);
assert.equal(requests.length, 0, "ability art must wait above 704 MiB");
scene.time.now = 6;
controller.update();
assert.deepEqual(await deferred, {
  ready: false,
  abilityId: PLAYER_ABILITY_ASSET_IDS.thunderStrike,
  reason: "memory-timeout",
});

scene.time.now = 2000;
overBudget = false;
const ready = controller.ensure(PLAYER_ABILITY_ASSET_IDS.thunderStrike);
assert.equal(requests.length, 2);
for (const request of requests) {
  textures.add(request.asset.key);
  request.options.onReady();
}
assert.equal((await ready).ready, true);
assert.equal(controller.isReady(PLAYER_ABILITY_ASSET_IDS.thunderStrike), true);
assert.ok(animations.some(animation => animation.key === robot.thunderStrikeChargeAnim));
controller.destroy();

textures.clear();
requests.length = 0;
overBudget = true;
const interactiveController = new PlayerAbilityAssetController(scene, robot, {
  ...RUNTIME_ASSET_LOADING,
});
const passivelyDeferred = interactiveController.ensure(
  PLAYER_ABILITY_ASSET_IDS.thunderStrike,
);
assert.equal(requests.length, 0);
const interactivelyPromoted = interactiveController.ensure(
  PLAYER_ABILITY_ASSET_IDS.thunderStrike,
  { interactive: true },
);
assert.equal(interactivelyPromoted, passivelyDeferred);
assert.equal(requests.length, 2, "an explicit player action must promote deferred ability art");
for (const request of requests) {
  textures.add(request.asset.key);
  request.options.onReady();
}
assert.equal((await interactivelyPromoted).ready, true);
interactiveController.destroy();

let ensureCalls = 0;
const abilities = new PlayerAbilities(
  { scene: { time: { now: 0 } } },
  null,
  { tileSize: 94 },
  { isThunderStrikeUnlocked: () => true },
);
abilities.gemPower = 500;
abilities.setAbilityAssetReadiness({
  isReady: () => false,
  ensure: async () => { ensureCalls += 1; return { ready: false }; },
});
assert.equal(abilities.startThunderStrikeCharge(), false);
assert.equal(abilities.gemPower, 500);
abilities._thunderStrikeCharging = true;
assert.deepEqual(abilities.executeThunderStrike(0), {
  success: false,
  reason: "assets-loading",
});
assert.equal(abilities.gemPower, 500, "asset waits must not spend GP");
assert.ok(ensureCalls >= 2);

console.log("player ability asset contract: PASS");
