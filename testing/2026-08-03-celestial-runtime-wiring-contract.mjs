import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  activateCelestialActionBarEntry,
  getCelestialActionBarAbilityState,
  getCelestialActionBarMetrics,
} from "../world/playScene/CelestialActionBarRuntime.js";
import { captureCelestialOverhaulState, initializeCelestialOverhaulRuntime } from
  "../world/playScene/CelestialOverhaulRuntime.js";
import { CelestialEngineController } from
  "../world/playScene/CelestialEngineController.js";
import { resolveInteractionPriorities } from
  "../world/playScene/interactionPriority.js";
import { HollowSunEngine } from "../systems/celestial/HollowSunEngine.js";
import { StarHeartProgressionSystem } from
  "../systems/celestial/StarHeartProgressionSystem.js";
import { StarPillarSystem } from "../systems/visual/StarPillarSystem.js";
import { CELESTIAL_ENGINE_CONFIG } from "../values/celestialEngines.js";

const queued = [];
const quickScene = {
  playerController: {
    input: {
      queueQuickslashInput: () => (queued.push("quick"), true),
      queueThunderStrikeInput: () => (queued.push("thunder"), true),
    },
    abilities: {
      isQuickslashUnlocked: () => true,
      isQuickslashActive: () => false,
      getQuickslashCost: () => 10,
      getGemPowerExact: () => 4,
    },
  },
};
const quickState = getCelestialActionBarAbilityState(quickScene, "quickslash");
assert.equal(quickState.unlocked, true);
assert.equal(quickState.available, false);
assert.match(quickState.unavailableReason, /10 GP/);
const godModeQuickState = getCelestialActionBarAbilityState({
  ...quickScene,
  upgradeSystem: { godModeActive: true },
}, "quickslash");
assert.equal(godModeQuickState.available, true);
const godModeEngineState = getCelestialActionBarAbilityState({
  upgradeSystem: { godModeActive: true },
  celestialTalentProgressionSystem: {
    getSnapshot: () => ({ branches: [], unlockedAbilityIds: [] }),
  },
  celestialEngineController: {
    isEngineActive: () => false,
    isActivationAvailable: () => true,
  },
  starHeartProgressionSystem: { getSnapshot: () => ({ godMode: true }) },
}, "comet-engine");
assert.equal(godModeEngineState.unlocked, true);
assert.equal(godModeEngineState.available, true);
assert.match(godModeEngineState.description, /Costs 0 GP/);
let engineGp = 40;
const gpEngineScene = {
  upgradeSystem: { godModeActive: false },
  playerController: {
    abilities: {
      getGemPowerExact: () => engineGp,
      getSpendableGemPower: () => engineGp,
      canSpendGemPower: cost => engineGp >= cost,
    },
  },
  celestialTalentProgressionSystem: {
    getSnapshot: () => ({
      branches: [{ id: "wayward-star", nodes: [{ id: "wayward-star-root" }] }],
      unlockedAbilityIds: ["wayward-star"],
    }),
  },
  celestialEngineController: {
    isEngineActive: () => false,
    isActivationAvailable: () => true,
  },
  starHeartProgressionSystem: {
    getSnapshot: () => ({ godMode: false, charged: false, charge: 0 }),
  },
};
const lowGpEngineState = getCelestialActionBarAbilityState(gpEngineScene, "wayward-star");
assert.equal(CELESTIAL_ENGINE_CONFIG.activation.gpCost, 100);
assert.equal(lowGpEngineState.available, false);
assert.match(lowGpEngineState.unavailableReason, /100 GP/);
assert.match(lowGpEngineState.unavailableReason, /Spendable GP: 40/);
assert.doesNotMatch(lowGpEngineState.unavailableReason, /Celestial Charge/);
engineGp = 100;
assert.equal(
  getCelestialActionBarAbilityState(gpEngineScene, "wayward-star").available,
  true,
  "a zero-charge Celestial power must be available when its GP cost is affordable",
);
activateCelestialActionBarEntry(quickScene, "quickslash");
activateCelestialActionBarEntry(quickScene, "thunderStrike");
assert.deepEqual(queued, ["quick", "thunder"]);

const rejectedActivation = activateCelestialActionBarEntry({
  playerController: { input: { queueQuickslashInput: () => false } },
}, "quickslash");
assert.equal(rejectedActivation.ok, false);
assert.equal(rejectedActivation.reason, "input-unavailable");

const metrics = getCelestialActionBarMetrics({
  playerController: {
    abilities: {
      getGemPowerExact: () => 72.8,
      getGemPowerMax: () => 100,
    },
  },
  digSystem: { getDamagePreview: tileType => 40 + tileType },
});
assert.deepEqual(metrics, { gpCurrent: 72.8, gpMax: 100, miningDamage: 41 });

const legacyScene = {
  playerLevelSystem: { level: 4 },
  starHeartProgressionSystem: { syncTalentUnlockedEngines() {} },
};
const legacySnapshot = initializeCelestialOverhaulRuntime(legacyScene, {
  version: 13,
  starHeartData: { unlockedEngines: ["hollow-sun"] },
  celestialOverhaulData: {
    talents: { purchasedNodeIds: [] },
    actionbar: {},
  },
});
assert.deepEqual(legacySnapshot.unlockedAbilityIds, ["hollow-sun"]);
legacyScene.celestialTalentProgressionSystem.destroy();

const captured = captureCelestialOverhaulState({
  celestialTalentProgressionSystem: {
    getSaveData: () => ({ stars: 68, purchasedNodeIds: ["wayward-star-root"] }),
  },
  celestialActionBarSystem: {
    getLoadout: () => [
      "thunderStrike",
      "quickslash",
      "wayward-star",
      "hollow-sun",
      "comet-engine",
    ],
  },
  _celestialLegacyRarityMigrationVersion: 1,
});
assert.equal(captured.talents.stars, 68);
assert.equal(captured.actionbar.order[0], "thunderStrike");

let activationRecorded = 0;
let activationOptions = null;
let controllerGp = 99;
const controller = Object.assign(Object.create(CelestialEngineController.prototype), {
  scene: {
    time: { now: 500 },
    hudSystem: { flashStatus() {} },
    soundSystem: null,
    screenFlashSystem: null,
    shakeSystem: null,
    playerController: {
      abilities: {
        getGemPowerExact: () => controllerGp,
        canSpendGemPower: cost => controllerGp >= cost,
        consumeGemPower: cost => {
          const spent = Math.min(controllerGp, cost);
          controllerGp -= spent;
          return spent;
        },
        restoreGemPower: amount => {
          controllerGp += amount;
          return amount;
        },
      },
    },
  },
  progression: {
    getSnapshot: () => ({
      selectedEngine: "wayward-star",
      unlocked: true,
    }),
    isGodModeActive: () => false,
    consumeActivation: (_nowMs, options) => {
      activationRecorded += 1;
      activationOptions = options;
      return {
        ok: true,
        engineId: "wayward-star",
        activationId: "star-heart:wayward-star:500:1",
      };
    },
    refundActivation: () => true,
  },
  talentProgression: {
    getSnapshot: () => ({
      unlockedAbilityIds: ["wayward-star"],
      unlockedEffectIds: [],
    }),
  },
  _getDirection: () => ({ x: 1, y: 0 }),
  _createEffect: () => ({ active: true }),
  activeEffect: null,
  activeBudget: null,
  activeDefinition: null,
  hud: null,
});
const activation = controller.tryActivate(500);
assert.equal(activation.ok, false);
assert.equal(activation.reason, "insufficient-gp");
assert.equal(activationRecorded, 0);
assert.equal(controllerGp, 99);
controllerGp = 100;
const gpActivation = controller.tryActivate(500);
assert.equal(gpActivation.ok, true);
assert.equal(gpActivation.gpSpent, 100);
assert.equal(controllerGp, 0);
assert.equal(activationRecorded, 1);
assert.deepEqual(activationOptions, { spendCharge: false });
assert.match(gpActivation.activationId, /^star-heart:wayward-star:/);

let progressionRefunds = 0;
controller.activeEffect = null;
controller.activeBudget = null;
controller.activeDefinition = null;
controllerGp = 100;
controller.progression.refundActivation = () => {
  progressionRefunds += 1;
  return true;
};
controller._createEffect = () => {
  throw new Error("contract activation failure");
};
const originalConsoleError = console.error;
console.error = () => {};
let failedGpActivation;
try {
  failedGpActivation = controller.tryActivate(501);
} finally {
  console.error = originalConsoleError;
}
assert.equal(failedGpActivation.ok, false);
assert.equal(failedGpActivation.reason, "activation-failed");
assert.equal(controllerGp, 100);
assert.equal(progressionRefunds, 1);

const gpProgression = new StarHeartProgressionSystem();
gpProgression.loadSaveData({
  heartsEarned: 1,
  heartsSpent: 1,
  selectedEngine: "wayward-star",
  unlockedEngines: ["wayward-star"],
  charge: 0,
  activationsUsed: 0,
  constellationCount: 10,
}, 10);
const recordedActivation = gpProgression.consumeActivation(600, { spendCharge: false });
assert.equal(recordedActivation.ok, true);
assert.equal(recordedActivation.spentCharge, false);
assert.equal(gpProgression.getSnapshot().charge, 0);
assert.equal(gpProgression.getSnapshot().activationsUsed, 1);
assert.equal(gpProgression.refundActivation(recordedActivation.activationId), true);
assert.equal(gpProgression.getSnapshot().charge, 0);
assert.equal(gpProgression.getSnapshot().activationsUsed, 0);
gpProgression.destroy();

const masteryHits = [];
const hollow = Object.assign(Object.create(HollowSunEngine.prototype), {
  definition: {
    implosionRadiusTiles: 2,
    implosionMaxImpacts: 3,
  },
  x: 0,
  y: 0,
  toTile: () => ({ tx: 10, ty: 10 }),
  probeTile: () => ({ diggable: true }),
  budget: { activationId: "talent:hollow-sun:1" },
  masteryImpacts: 0,
  masteryTargetKeys: new Set(),
  onImpact: (tx, ty, hitId) => masteryHits.push({ tx, ty, hitId }),
});
hollow._applyMasteryImplosion(900);
assert.equal(masteryHits.length, 3);
assert.equal(new Set(masteryHits.map(hit => hit.hitId)).size, 3);
assert.ok(masteryHits.every(hit => hit.hitId.includes(":implosion:")));

{
  const flashes = [];
  const shopStates = [];
  const failedScene = {
    _pillarViewActive: false,
    setShopOpen: value => shopStates.push(value),
    hudSystem: { flashStatus: message => flashes.push(message) },
  };
  const failedPillar = new StarPillarSystem(
    failedScene,
    {},
    { saveSlot: 1 },
    { createCelestialTalentTreeView: () => { throw new Error("contract mount failure"); } },
  );
  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    assert.equal(failedPillar.openConstellationView(), false);
  } finally {
    console.error = originalConsoleError;
  }
  assert.equal(failedPillar._isViewOpen, false);
  assert.equal(failedScene._pillarViewActive, false);
  assert.equal(shopStates.at(-1), false);
  assert.deepEqual(flashes, ["CELESTIAL TALENT TREE UNAVAILABLE"]);
}

const [setupSource, uiSource, updateSource, pillarSource, groupSource, portsSource, saveRuntimeSource] =
  await Promise.all([
    readFile(new URL("../world/playScene/PlaySceneSetup.js", import.meta.url), "utf8"),
    readFile(new URL("../world/playScene/PlaySceneUI.js", import.meta.url), "utf8"),
    readFile(new URL("../world/playScene/PlaySceneUpdate.js", import.meta.url), "utf8"),
    readFile(new URL("../systems/visual/StarPillarSystem.js", import.meta.url), "utf8"),
    readFile(new URL("../world/rendering/runtimeFeatureAssetGroups.js", import.meta.url), "utf8"),
    readFile(new URL("../ui/scenes/PlayScenePorts.js", import.meta.url), "utf8"),
    readFile(new URL("../world/playScene/PlaySceneSaveRuntime.js", import.meta.url), "utf8"),
  ]);
assert.match(setupSource, /uiPorts\.worldUiFactories/);
assert.match(portsSource, /createCelestialTalentTreeView/);
assert.match(setupSource, /talentProgression: this\.celestialTalentProgressionSystem/);
assert.match(setupSource, /showLegacyHud: false/);
assert.match(saveRuntimeSource, /captureCelestialOverhaulState\(scene\)/);
assert.match(uiSource, /new CelestialActionBarSystem/);
assert.match(uiSource, /new CelestialCurrencyHudSystem/);
assert.match(uiSource, /getCelestialActionBarMetrics/);
assert.match(updateSource, /celestialActionBarInputBridge\?\.update/);
assert.equal(resolveInteractionPriorities({ pillar: 2, npc: 3 }).pillar, true);
assert.equal(resolveInteractionPriorities({ pillar: 3, npc: 2 }).pillar, false);
assert.equal(resolveInteractionPriorities({ pillar: 2, specialTile: 2 }).pillar, true);
assert.match(pillarSource, /getInteractionDistance\(playerTile\)/);
assert.match(pillarSource, /queueDugTilesSave/);
assert.match(pillarSource, /syncTalentProgress/);
assert.match(pillarSource, /CELESTIAL_TALENT_TREE_PRELOAD_ASSETS\.map/);
assert.match(pillarSource, /Talent tree mount failed/);
assert.doesNotMatch(pillarSource, /nodeAssetCount:\s*15/);
assert.doesNotMatch(setupSource, /STAR HEART FORGED|constellation mastered/);
assert.doesNotMatch(groupSource, /getStarlightAssets/);

console.log(
  "PASS celestial runtime: GP-funded actionbar powers, queued abilities, bounded mastery, save caller, pillar priority",
);
