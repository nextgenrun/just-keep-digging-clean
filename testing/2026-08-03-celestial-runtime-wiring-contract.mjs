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
import { HollowSunEngine } from "../systems/celestial/HollowSunEngine.js";

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
  playerLevelSystem: { level: 30 },
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

let legacyChargeConsumed = false;
const controller = Object.assign(Object.create(CelestialEngineController.prototype), {
  scene: {
    time: { now: 500 },
    hudSystem: { flashStatus() {} },
    soundSystem: null,
    screenFlashSystem: null,
    shakeSystem: null,
  },
  progression: {
    getSnapshot: () => ({
      selectedEngine: "wayward-star",
      charged: false,
      unlocked: true,
    }),
    consumeActivation: () => {
      legacyChargeConsumed = true;
      return { ok: false };
    },
  },
  talentProgression: {
    getSnapshot: () => ({
      unlockedAbilityIds: ["wayward-star"],
      unlockedEffectIds: [],
    }),
  },
  _talentActivationSequence: 0,
  _getDirection: () => ({ x: 1, y: 0 }),
  _createEffect: () => ({ active: true }),
  activeEffect: null,
  activeBudget: null,
  activeDefinition: null,
  hud: null,
});
const activation = controller.tryActivate(500);
assert.equal(activation.ok, true);
assert.equal(legacyChargeConsumed, false);
assert.match(activation.activationId, /^talent:wayward-star:/);

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
  onImpact: (tx, ty, hitId) => masteryHits.push({ tx, ty, hitId }),
});
hollow._applyMasteryImplosion(900);
assert.equal(masteryHits.length, 3);
assert.equal(new Set(masteryHits.map(hit => hit.hitId)).size, 3);
assert.ok(masteryHits.every(hit => hit.hitId.includes(":implosion:")));

const [setupSource, uiSource, updateSource, pillarSource, groupSource] =
  await Promise.all([
    readFile(new URL("../world/playScene/PlaySceneSetup.js", import.meta.url), "utf8"),
    readFile(new URL("../world/playScene/PlaySceneUI.js", import.meta.url), "utf8"),
    readFile(new URL("../world/playScene/PlaySceneUpdate.js", import.meta.url), "utf8"),
    readFile(new URL("../systems/visual/StarPillarSystem.js", import.meta.url), "utf8"),
    readFile(new URL("../world/rendering/runtimeFeatureAssetGroups.js", import.meta.url), "utf8"),
  ]);
assert.match(setupSource, /createCelestialTalentTreeView/);
assert.match(setupSource, /talentProgression: this\.celestialTalentProgressionSystem/);
assert.match(setupSource, /showLegacyHud: false/);
assert.match(uiSource, /captureCelestialOverhaulState\(this\)/);
assert.match(uiSource, /new CelestialActionBarSystem/);
assert.match(uiSource, /new CelestialCurrencyHudSystem/);
assert.match(uiSource, /getCelestialActionBarMetrics/);
assert.match(updateSource, /celestialActionBarInputBridge\?\.update/);
assert.match(updateSource, /pillarHasPriority/);
assert.match(pillarSource, /getInteractionDistance\(playerTile\)/);
assert.match(pillarSource, /queueDugTilesSave/);
assert.match(pillarSource, /syncTalentProgress/);
assert.doesNotMatch(setupSource, /STAR HEART FORGED|constellation mastered/);
assert.doesNotMatch(groupSource, /getStarlightAssets/);

console.log(
  "PASS celestial runtime: GP authority, queued abilities, talent Engines, bounded mastery, save caller, pillar priority",
);
