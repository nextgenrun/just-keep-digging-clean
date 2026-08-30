import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  CELESTIAL_ENGINE_CONFIG,
  CELESTIAL_ENGINE_IDS,
  CELESTIAL_ENGINE_ORDER,
  getEarnedStarHeartCount,
  isCelestialEnginesEnabled,
  sanitizeStarHeartData,
} from "../values/celestialEngines.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { StarHeartProgressionSystem } from "../systems/celestial/StarHeartProgressionSystem.js";
import { CelestialActivationBudget } from "../systems/celestial/CelestialActivationBudget.js";
import { DigSystem } from "../systems/mining/DigSystem.js";
import { evaluateRuntimeCanaries } from "../systems/health/runtimeCanaryChecks.js";
import { DugTilesSaveStore } from "../world/model/DugTilesSaveStore.js";
import { RUNTIME_CANARY_CONFIG } from "../values/runtimeCanaryConfig.js";

const changes = [];
const progression = new StarHeartProgressionSystem({
  onChanged: (_snapshot, event) => changes.push(event),
});
progression.loadSaveData(null, 9);
assert.equal(progression.isUnlocked(), false);
progression.syncConstellationCount(10);
assert.equal(progression.getAvailableHearts(), 1);
assert.equal(changes.at(-1), "heart-earned");

const attuned = progression.chooseEngine(CELESTIAL_ENGINE_IDS.WAYWARD_STAR);
assert.equal(attuned.ok, true);
assert.equal(progression.getSnapshot().charge, CELESTIAL_ENGINE_CONFIG.charge.initialOnAttune);
assert.deepEqual(progression.getSnapshot().unlockedEngines, [
  CELESTIAL_ENGINE_IDS.WAYWARD_STAR,
]);
assert.equal(
  progression.chooseEngine(CELESTIAL_ENGINE_IDS.HOLLOW_SUN).reason,
  "heart-locked",
);

const activation = progression.consumeActivation(1000);
assert.equal(activation.ok, true);
assert.equal(progression.getSnapshot().charge, 0);
assert.equal(progression.consumeActivation(1001).reason, "not-charged");
assert.equal(
  progression.recordCollectedSkyStar(0),
  CELESTIAL_ENGINE_CONFIG.charge.starChargeByRarity[0],
);
for (let index = 0; index < 20; index += 1) progression.recordCollectedSkyStar(5);
assert.equal(progression.getSnapshot().charge, CELESTIAL_ENGINE_CONFIG.charge.capacity);
assert.equal(progression.consumeActivation(1100).ok, true);
assert.equal(progression.getSnapshot().charge, CELESTIAL_ENGINE_CONFIG.charge.activationCost);
assert.equal(progression.getSnapshot().charged, true);
assert.equal(progression.consumeActivation(1101).ok, true);
assert.equal(progression.getSnapshot().charge, 0);

const masteryProgression = new StarHeartProgressionSystem();
masteryProgression.loadSaveData({
  constellationCount: 10,
  activationsUsed: 19,
  heartsEarned: 1,
  unlockedEngines: [CELESTIAL_ENGINE_IDS.WAYWARD_STAR],
  selectedEngine: CELESTIAL_ENGINE_IDS.WAYWARD_STAR,
  charge: CELESTIAL_ENGINE_CONFIG.charge.capacity,
}, 10);
assert.equal(masteryProgression.consumeActivation(2000).ok, true);
assert.equal(masteryProgression.getSnapshot().heartsEarned, 2);
assert.equal(masteryProgression.getSnapshot().availableHearts, 1);
assert.equal(masteryProgression.getSnapshot().nextHeartActivationMilestone, 50);
assert.equal(masteryProgression.chooseEngine(CELESTIAL_ENGINE_IDS.HOLLOW_SUN).ok, true);
assert.deepEqual(masteryProgression.getSnapshot().unlockedEngines, [
  CELESTIAL_ENGINE_IDS.WAYWARD_STAR,
  CELESTIAL_ENGINE_IDS.HOLLOW_SUN,
]);

masteryProgression.loadSaveData({
  ...masteryProgression.getSaveData(),
  activationsUsed: 49,
  charge: CELESTIAL_ENGINE_CONFIG.charge.capacity,
}, 10);
assert.equal(masteryProgression.consumeActivation(3000).ok, true);
assert.equal(masteryProgression.getSnapshot().heartsEarned, 3);
assert.equal(masteryProgression.chooseEngine(CELESTIAL_ENGINE_IDS.COMET_ENGINE).ok, true);
assert.equal(masteryProgression.getSnapshot().allEnginesUnlocked, true);
assert.deepEqual(masteryProgression.getSnapshot().unlockedEngines, CELESTIAL_ENGINE_ORDER);
assert.equal(masteryProgression.chooseEngine(CELESTIAL_ENGINE_IDS.WAYWARD_STAR).ok, true);
assert.equal(masteryProgression.getSnapshot().selectedEngine, CELESTIAL_ENGINE_IDS.WAYWARD_STAR);
assert.equal(masteryProgression.getSnapshot().availableHearts, 0);
assert.equal(getEarnedStarHeartCount(10, 50), 3);

const budget = new CelestialActivationBudget(
  CELESTIAL_ENGINE_IDS.WAYWARD_STAR,
  activation.activationId,
  1000,
);
for (let index = 0; index < 40; index += 1) budget.tryImpact(index, 1);
assert.equal(
  budget.impacts,
  CELESTIAL_ENGINE_CONFIG.engines[CELESTIAL_ENGINE_IDS.WAYWARD_STAR].maxImpacts,
);
assert.equal(budget.tryImpact(0, 1), null);
for (let index = 0; index < 30; index += 1) budget.tryBounce();
assert.equal(
  budget.bounces,
  CELESTIAL_ENGINE_CONFIG.engines[CELESTIAL_ENGINE_IDS.WAYWARD_STAR].maxBounces,
);
for (let index = 0; index < 30; index += 1) budget.tryRedirect();
assert.equal(
  budget.redirects,
  CELESTIAL_ENGINE_CONFIG.engines[CELESTIAL_ENGINE_IDS.WAYWARD_STAR].maxRedirects,
);
assert.equal(budget.isExpired(14000), true);

const cells = new Map([
  ["1,1", { type: TILE_TYPES.DIRT, hp: 5 }],
  ["2,1", { type: TILE_TYPES.BEDROCK, hp: 999 }],
]);
const worldModel = {
  config: { skyTileRarities: [] },
  inBounds: (tx, ty) => tx >= 0 && ty >= 0 && tx < 4 && ty < 4,
  isSolid: (tx, ty) => (cells.get(`${tx},${ty}`)?.type ?? TILE_TYPES.AIR) !== TILE_TYPES.AIR,
  isDiggable: (tx, ty) => cells.get(`${tx},${ty}`)?.type === TILE_TYPES.DIRT,
  getTile(tx, ty) {
    const cell = cells.get(`${tx},${ty}`) || { type: TILE_TYPES.AIR, hp: 0 };
    return {
      ...cell,
      solid: cell.type !== TILE_TYPES.AIR,
      diggable: cell.type === TILE_TYPES.DIRT,
    };
  },
  damageTile(tx, ty, damage) {
    const key = `${tx},${ty}`;
    const cell = cells.get(key);
    if (!cell || cell.type === TILE_TYPES.AIR) return { success: false, reason: "air" };
    if (cell.type !== TILE_TYPES.DIRT) return { success: false, reason: "blocked" };
    const hpBefore = cell.hp;
    const destroyed = damage >= hpBefore;
    if (destroyed) cells.set(key, { type: TILE_TYPES.AIR, hp: 0 });
    else cell.hp -= damage;
    return {
      success: true,
      destroyed,
      hp: destroyed ? 0 : cell.hp,
      hpBefore,
      maxHp: 5,
      typeBeforeDamage: TILE_TYPES.DIRT,
      wasRubble: false,
      overkillDamage: Math.max(0, damage - hpBefore),
    };
  },
};
const rendererUpdates = [];
const digSystem = new DigSystem(
  worldModel,
  { applyTileUpdate: (tx, ty) => rendererUpdates.push(`${tx},${ty}`) },
  { seed: 133742, topAirRows: 0, tileSize: 16 },
);

const protectedResult = digSystem.applyCelestialDamage({
  activationId: "test:1",
  engineId: CELESTIAL_ENGINE_IDS.COMET_ENGINE,
  hitId: "protected",
  tx: 2,
  ty: 1,
  nowMs: 2000,
});
assert.equal(protectedResult.protected, true);
assert.equal(cells.get("2,1").type, TILE_TYPES.BEDROCK);

const destroyedResult = digSystem.applyCelestialDamage({
  activationId: "test:1",
  engineId: CELESTIAL_ENGINE_IDS.COMET_ENGINE,
  hitId: "dirt",
  tx: 1,
  ty: 1,
  nowMs: 2001,
});
assert.equal(destroyedResult.destroyed, true);
assert.equal(digSystem.getTilesBroken(), 1);
assert.equal(digSystem.getResourceTotals().dirt > 0, true);
const duplicateResult = digSystem.applyCelestialDamage({
  activationId: "test:1",
  engineId: CELESTIAL_ENGINE_IDS.COMET_ENGINE,
  hitId: "dirt",
  tx: 1,
  ty: 1,
  nowMs: 2002,
});
assert.equal(duplicateResult.duplicate, true);
assert.equal(digSystem.getTilesBroken(), 1);
assert.deepEqual(rendererUpdates, ["1,1"]);

const saveStore = new DugTilesSaveStore();
const payload = saveStore.createPayload(
  { seed: 1, width: 4, depth: 4, topAirRows: 0 },
  [],
  undefined,
  null,
  null,
  null,
  null,
  null,
  [],
  null,
  null,
  null,
  null,
  masteryProgression.getSaveData(),
);
assert.ok(payload.version >= 10);
assert.equal(payload.starHeartData.selectedEngine, CELESTIAL_ENGINE_IDS.WAYWARD_STAR);
assert.deepEqual(payload.starHeartData.unlockedEngines, CELESTIAL_ENGINE_ORDER);
assert.equal(payload.starHeartData.heartsSpent, 3);
assert.equal(sanitizeStarHeartData({ charge: 99999 }).charge, CELESTIAL_ENGINE_CONFIG.charge.capacity);
assert.deepEqual(
  sanitizeStarHeartData({
    selectedEngine: CELESTIAL_ENGINE_IDS.HOLLOW_SUN,
    heartsEarned: 1,
  }).unlockedEngines,
  [CELESTIAL_ENGINE_IDS.HOLLOW_SUN],
  "legacy one-Engine saves must migrate into the permanent ownership list",
);
assert.equal(isCelestialEnginesEnabled("?starHearts=0"), false);
assert.equal(isCelestialEnginesEnabled("?starHearts=1"), true);

const unsafeScene = {
  sys: { settings: { key: "PlayScene" }, isActive: () => true },
  scene: { isActive: () => true },
  worldModel: {},
  worldRenderer: {},
  playerController: {},
  hudSystem: {},
  digSystem: { _celestialTransactions: new Map() },
  starHeartProgressionSystem: {
    getSnapshot: () => ({
      charge: 101,
      chargeCapacity: 100,
      heartsSpent: 2,
      heartsEarned: 1,
      selectedEngine: CELESTIAL_ENGINE_IDS.WAYWARD_STAR,
      unlockedEngines: [
        CELESTIAL_ENGINE_IDS.WAYWARD_STAR,
        CELESTIAL_ENGINE_IDS.HOLLOW_SUN,
      ],
    }),
  },
  celestialEngineController: {
    getHealthSnapshot: () => ({
      activeCount: 2,
      activation: {
        impacts: 19,
        maxImpacts: 18,
        bounces: 0,
        maxBounces: 10,
        redirects: 0,
        maxRedirects: 3,
        ageMs: 1,
        lifetimeMs: 12000,
      },
    }),
  },
};
const canaryResult = evaluateRuntimeCanaries(
  {
    canvas: { isConnected: true },
    loop: { frame: 2, actualFps: 60, running: true, inFocus: true },
    scene: { getScenes: () => [unsafeScene], scenes: [unsafeScene] },
  },
  {
    noActiveSinceMs: null,
    lastFrame: 1,
    lastFrameChangedAtMs: 0,
    activeSinceByScene: new Map([["PlayScene", 0]]),
  },
  RUNTIME_CANARY_CONFIG.scenes.PlayScene.settleMs + 1,
  false,
);
assert.ok(
  canaryResult.findings.some(
    finding => finding.code === RUNTIME_CANARY_CONFIG.events.celestialInvariant,
  ),
);

const [
  setupSource,
  updateSource,
  bootSource,
  pillarSource,
  portsSource,
  talentUiSource,
] = await Promise.all([
  readFile(new URL("../world/playScene/PlaySceneSetup.js", import.meta.url), "utf8"),
  readFile(new URL("../world/playScene/PlaySceneUpdate.js", import.meta.url), "utf8"),
  readFile(new URL("../ui/scenes/BootScene.js", import.meta.url), "utf8"),
  readFile(new URL("../systems/visual/StarPillarSystem.js", import.meta.url), "utf8"),
  readFile(new URL("../ui/scenes/PlayScenePorts.js", import.meta.url), "utf8"),
  readFile(new URL("../values/celestialTalentTreeUi.js", import.meta.url), "utf8"),
]);
assert.match(setupSource, /new StarHeartProgressionSystem/);
assert.match(setupSource, /new CelestialEngineController/);
assert.match(updateSource, /celestialEngineController\?\.update/);
assert.match(bootSource, /CELESTIAL_TALENT_TREE_PRELOAD_ASSETS/);
assert.match(talentUiSource, /sprites\/UI\/celestial-overhaul-v1/);
assert.match(talentUiSource, /talent-icon-/);
assert.match(setupSource, /uiPorts\.worldUiFactories/);
assert.match(portsSource, /createCelestialTalentTreeView/);
assert.match(pillarSource, /createCelestialTalentTreeView/);
assert.match(pillarSource, /celestialTalentProgressionSystem/);

console.log("celestial engines contract: three permanent unlocks, milestones, caps, protected tiles, rewards, and save migration passed");
