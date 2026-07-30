import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CraftingSystem } from "../systems/crafting/CraftingSystem.js";
import { HeavenblocksAccessSystem } from "../systems/environment/HeavenblocksAccessSystem.js";
import { evaluateRuntimeCanaries } from "../systems/health/runtimeCanaryChecks.js";
import { HeavenblocksProgressionSystem } from "../systems/progression/HeavenblocksProgressionSystem.js";
import { UpgradeSystem } from "../systems/progression/UpgradeSystem.js";
import { ShopOverlay } from "../ui/overlays/ShopOverlay.js";
import { ANCIENT_RELIC_CONFIG } from "../values/ancientRelics.js";
import { CRAFTING_RECIPES } from "../values/craftingRecipes.js";
import { GAME_CONFIG } from "../values/gameConfig.js";
import { HEAVENBLOCKS_ACCESS_CONFIG } from "../values/heavenblocksAccessConfig.js";
import {
  HEAVENBLOCKS_PROGRESSION_CONFIG,
  createDefaultHeavenblocksProgressionData,
} from "../values/heavenblocksProgressionConfig.js";
import {
  getHeavenblocksRegionById,
  isHeavenblocksMaterialTileType,
} from "../values/heavenblocksWorldConfig.js";
import { RUNTIME_CANARY_CONFIG } from "../values/runtimeCanaryConfig.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { WORLD_VISUAL_SEMANTIC_ASSETS } from "../values/worldVisualSemanticAssets.js";
import { DugTilesSaveStore } from "../world/model/DugTilesSaveStore.js";
import { WorldModel } from "../world/model/WorldModel.js";
import { TILE_RENDER_INDEX, getTileRenderIndex } from "../world/rendering/tileRenderMap.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fromRoot = (relativePath) => path.join(ROOT, ...relativePath.split("/"));

function sha256(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function pngInfo(file) {
  const data = readFileSync(file);
  assert.equal(data.subarray(1, 4).toString("ascii"), "PNG", `${file} is not PNG`);
  return {
    width: data.readUInt32BE(16),
    height: data.readUInt32BE(20),
    colorType: data[25],
  };
}

const manifestPath = fromRoot("sprites/UI/heavenblocks-v1/manifest-v1.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
assert.equal(manifest.version, 1);
assert.equal(manifest.relicSemanticFrame, 7);
for (const [relativePath, expected] of Object.entries(manifest.outputs)) {
  const file = fromRoot(relativePath);
  assert.equal(existsSync(file), true, `missing generated asset: ${relativePath}`);
  assert.equal(statSync(file).size, expected.bytes, `byte drift: ${relativePath}`);
  assert.equal(sha256(file), expected.sha256, `hash drift: ${relativePath}`);
}

assert.deepEqual(
  pngInfo(fromRoot(
    "sprites/backgrounds/world-visual-v2/semantic-decals-v1/special-reward-insets-beauty-v2.png",
  )),
  { width: 1024, height: 512, colorType: 6 },
);
for (const [filename, size] of [
  ["ancient-relic-token-v1.png", 64],
  ["ancient-relic-icon-v1.png", 32],
  ["aether-turbine-v1.png", 64],
  ["halo-regulator-v1.png", 64],
  ["eclipse-crucible-v1.png", 64],
]) {
  const info = pngInfo(fromRoot(`sprites/UI/heavenblocks-v1/${filename}`));
  assert.deepEqual(info, { width: size, height: size, colorType: 6 });
}
assert.equal(
  WORLD_VISUAL_SEMANTIC_ASSETS.specialBlocks.beautyAtlas.frameCount,
  12,
);
assert.equal(
  WORLD_VISUAL_SEMANTIC_ASSETS.specialBlocks.frameByTileType[
    TILE_TYPES.ANCIENT_RELIC_CACHE
  ],
  11,
);
assert.equal(
  getTileRenderIndex(TILE_TYPES.ANCIENT_RELIC_CACHE, 1, 1),
  TILE_RENDER_INDEX.ANCIENT_RELIC_CACHE,
);

const originalLog = console.log;
let world;
try {
  console.log = () => {};
  world = new WorldModel(GAME_CONFIG);
} finally {
  console.log = originalLog;
}
for (const band of ANCIENT_RELIC_CONFIG.worldCaches.guaranteedEarly.depthBands) {
  let found = 0;
  const minY = world.topAirRows + band.minDepthTiles;
  const maxY = world.topAirRows + band.maxDepthTiles;
  for (let ty = minY; ty <= maxY; ty += 1) {
    for (
      let tx = ANCIENT_RELIC_CONFIG.worldCaches.guaranteedEarly.minTileX;
      tx <= ANCIENT_RELIC_CONFIG.worldCaches.guaranteedEarly.maxTileX;
      tx += 1
    ) {
      if (world.getType(tx, ty) === TILE_TYPES.ANCIENT_RELIC_CACHE) found += 1;
    }
  }
  assert.ok(found >= 1, `no guaranteed relic cache in ${band.minDepthTiles}-${band.maxDepthTiles}`);
}
const removedLegacyCacheKeys = new Set();
for (const band of ANCIENT_RELIC_CONFIG.worldCaches.guaranteedEarly.depthBands) {
  for (
    let ty = world.topAirRows + band.minDepthTiles;
    ty <= world.topAirRows + band.maxDepthTiles;
    ty += 1
  ) {
    for (
      let tx = ANCIENT_RELIC_CONFIG.worldCaches.guaranteedEarly.minTileX;
      tx <= ANCIENT_RELIC_CONFIG.worldCaches.guaranteedEarly.maxTileX;
      tx += 1
    ) {
      if (world.getType(tx, ty) !== TILE_TYPES.ANCIENT_RELIC_CACHE) continue;
      removedLegacyCacheKeys.add(`${tx},${ty}`);
      world.setTile(tx, ty, TILE_TYPES.AIR, 0);
    }
  }
}
const recoveredCaches = world.ensureAncientRelicMilestoneReachable(1);
assert.equal(recoveredCaches.length, 2);
assert.ok(
  recoveredCaches.every(({ tx, ty }) => !removedLegacyCacheKeys.has(`${tx},${ty}`)),
  "legacy recovery must use still-solid cells instead of regenerating dug coordinates",
);
assert.equal(world.getHeavenblocksLayoutHealth().nativeWorldReady, true);
for (const region of HEAVENBLOCKS_ACCESS_CONFIG.regions) {
  assert.equal(world.getType(region.arrival.tx, region.arrival.ty), TILE_TYPES.AIR);
  assert.equal(
    isHeavenblocksMaterialTileType(
      world.getType(region.arrival.tx, region.arrival.ty + 1),
    ),
    true,
  );
}
const protectedRegion = HEAVENBLOCKS_ACCESS_CONFIG.regions[0];
const nativeRegion = getHeavenblocksRegionById(protectedRegion.id);
let diggableNativeCell = null;
for (let ty = nativeRegion.bounds.top; ty <= nativeRegion.bounds.bottom && !diggableNativeCell; ty += 1) {
  for (let tx = nativeRegion.bounds.left; tx <= nativeRegion.bounds.right; tx += 1) {
    if (!isHeavenblocksMaterialTileType(world.getType(tx, ty))) continue;
    if (ty === nativeRegion.arrivalTile.ty + 1) continue;
    if (ty === nativeRegion.shrine.floorTy) continue;
    diggableNativeCell = { tx, ty, type: world.getType(tx, ty) };
    break;
  }
}
assert.ok(diggableNativeCell);
assert.deepEqual(
  world.applyDugTileKeys([`${diggableNativeCell.tx},${diggableNativeCell.ty}`]),
  [{ tx: diggableNativeCell.tx, ty: diggableNativeCell.ty }],
);
assert.equal(
  world.getType(diggableNativeCell.tx, diggableNativeCell.ty),
  TILE_TYPES.AIR,
  "native island mining must persist as a cell-level hole",
);
assert.equal(
  world.getDugTileSource(diggableNativeCell.tx, diggableNativeCell.ty).type,
  diggableNativeCell.type,
);
assert.equal(world.getHeavenblocksLayoutHealth().nativeWorldReady, true);
assert.doesNotMatch(
  readFileSync(fromRoot("world/playScene/PlaySceneUI.js"), "utf8"),
  /applyHeavenblocksLayout/,
  "save loading must not regenerate native islands over persisted dug cells",
);

let relicCount = 3;
const progression = new HeavenblocksProgressionSystem({
  relicCountProvider: () => relicCount,
});
const presentationEvents = [];
const presentation = {
  create: () => presentationEvents.push("create"),
  redrawAltars: () => presentationEvents.push("redraw"),
  setPrompt: (_anchor, label) => presentationEvents.push(`prompt:${label}`),
  hidePrompt: () => presentationEvents.push("hide"),
  playTransit: () => presentationEvents.push("transit"),
  playComponentClaim: () => presentationEvents.push("component"),
  getHealthSnapshot: () => ({ promptReady: true }),
};
const teleports = [];
const controlStates = [];
const changedEvents = [];
const accessScene = {
  time: { delayedCall: (_delay, callback) => callback() },
  cameras: { main: { flash() {} } },
  hudSystem: { flashStatus() {} },
  earthquakeFeedbackUI: { clearEscapeObjective() {} },
  earthquakeHazardOverlay: { clear() {} },
  heavenblocksTerrainRenderer: { getHealthSnapshot: () => ({ ready: true }) },
};
const artifactSystem = {
  playLockedPortalFeedback() {},
  playRegionUnlock() {},
  playRegionArrival() {},
  playComponentClaim() {},
  playVault() {},
  getHealthSnapshot: () => ({ ready: true }),
};
const regionAccessGuard = {
  syncProgressionState() {},
  update() {},
  getRegionAccessState: (regionId) => ({ allowed: true, regionId }),
  getHealthSnapshot: () => ({ damageGuardReady: true, barriersReady: true }),
};
const access = new HeavenblocksAccessSystem(accessScene, {
  worldModel: world,
  playerController: {
    setControlsEnabled: (enabled) => controlStates.push(enabled),
    teleportToTile: (tx, ty) => teleports.push({ tx, ty }),
  },
  progressionSystem: progression,
  ancientRelicSystem: { getCount: () => relicCount },
  upgradeSystem: new UpgradeSystem(),
  presentationSystem: presentation,
  artifactSystem,
  regionAccessGuard,
  onChanged: (event) => changedEvents.push(event),
});
access.create();
access.update(HEAVENBLOCKS_ACCESS_CONFIG.surfaceGates[0]);
assert.equal(access.handleInteract().type, "heavenblock-ascent");
assert.equal(progression.isSkyGateActivated(), true);
assert.equal(progression.isRegionVisited(protectedRegion.id), true);
assert.deepEqual(teleports.at(-1), protectedRegion.arrival);
assert.deepEqual(controlStates.slice(-2), [false, true]);
access.update(protectedRegion.rewardShrine);
assert.equal(access.handleInteract().type, "heavenblock-component");
assert.equal(progression.isRegionCompleted(protectedRegion.id), true);
assert.equal(progression.isPartInstalled(protectedRegion.partId), true);
for (const regionId of protectedRegion.id === HEAVENBLOCKS_PROGRESSION_CONFIG.skyGate.initialRegionId
  ? HEAVENBLOCKS_PROGRESSION_CONFIG.regions[0].completionUnlocksRegionIds
  : []) {
  assert.equal(progression.isRegionUnlocked(regionId), true);
}
assert.ok(changedEvents.includes("sky-gate-activated"));
assert.ok(changedEvents.includes("region-completed"));
assert.deepEqual(
  {
    promptReady: access.getHealthSnapshot().promptReady,
    layoutReady: access.getHealthSnapshot().layoutReady,
    nativeWorldReady: access.getHealthSnapshot().nativeWorldReady,
    progressionReady: access.getHealthSnapshot().progressionReady,
  },
  {
    promptReady: true,
    layoutReady: true,
    nativeWorldReady: true,
    progressionReady: true,
  },
);

const saveStore = new DugTilesSaveStore();
const savedProgression = progression.getSaveData();
const payload = saveStore.createPayload(
  world.getWorldIdentity(),
  [],
  {},
  null,
  null,
  null,
  null,
  null,
  [],
  null,
  null,
  { count: relicCount },
  null,
  null,
  null,
  savedProgression,
);
assert.equal(payload.version, 13);
assert.deepEqual(payload.heavenblocksData, savedProgression);
const legacy = saveStore.normalizePayload({
  version: 10,
  world: world.getWorldIdentity(),
  dugTiles: [],
  resources: {},
});
assert.deepEqual(legacy.heavenblocksData, createDefaultHeavenblocksProgressionData());

const digResources = { silver: 120, gold: 60 };
const digSystem = {
  getResourceTotals: () => ({ ...digResources }),
  setResourceTotals: (next) => Object.assign(digResources, next),
  trySpendResources(costs) {
    for (const [key, amount] of Object.entries(costs)) {
      if ((digResources[key] || 0) < amount) return { success: false };
    }
    for (const [key, amount] of Object.entries(costs)) digResources[key] -= amount;
    return { success: true, spent: { ...costs } };
  },
};
const craftingUpgrades = new UpgradeSystem(digSystem);
craftingUpgrades.grantUpgrade("worldTwoTunnelAccess");
const completeProgression = new HeavenblocksProgressionSystem({ relicCount: 3 });
completeProgression.activateSkyGate();
for (const region of HEAVENBLOCKS_PROGRESSION_CONFIG.regions) {
  completeProgression.visitRegion(region.id);
  completeProgression.discoverPart(region.uniquePartId);
  completeProgression.installPart(region.uniquePartId);
  completeProgression.completeRegion(region.id);
}
const crafting = new CraftingSystem({
  digSystem,
  upgradeSystem: craftingUpgrades,
  ancientRelicSystem: { getCount: () => 3 },
  heavenblocksProgressionSystem: completeProgression,
});
assert.equal(crafting.getHealthSnapshot().ready, true);
assert.equal(Object.keys(CRAFTING_RECIPES).length, 2);

const warningMessages = [];
const warningOverlay = Object.assign(Object.create(ShopOverlay.prototype), {
  saleConfirmSignature: "",
  sellAllConfirmUntil: 0,
  scene: {
    craftingSystem: {
      getRecipeIngredientConflicts: () => [{ resourceKey: "silver" }],
    },
    digSystem: { getResourceTotals: () => ({ silver: 120 }) },
  },
  soundSystem: { playUiSelect() {} },
  _notify: (message) => warningMessages.push(message),
});
assert.equal(
  warningOverlay._confirmCraftingMaterialSale(["silver"], "resource:silver:120"),
  false,
);
assert.match(warningMessages.at(-1), /FORGE MATERIAL WARNING/);
assert.equal(
  warningOverlay._confirmCraftingMaterialSale(["silver"], "resource:silver:120"),
  true,
);

const healthyHeavenblocks = {
  enabled: true,
  promptReady: true,
  layoutReady: true,
  nativeWorldReady: true,
  progressionReady: true,
};
const playScene = {
  sys: { settings: { key: "PlayScene" } },
  worldModel: {},
  worldRenderer: {},
  digSystem: { _celestialTransactions: new Map() },
  playerController: {},
  hudSystem: {},
  starHeartProgressionSystem: {
    getSnapshot: () => ({
      charge: 0,
      chargeCapacity: 3,
      heartsSpent: 0,
      heartsEarned: 0,
      selectedEngine: null,
    }),
  },
  celestialEngineController: {
    getHealthSnapshot: () => ({ activeCount: 0, activation: null }),
  },
  heavenblocksProgressionSystem: {},
  heavenblocksAccessSystem: { getHealthSnapshot: () => healthyHeavenblocks },
  craftingSystem: crafting,
};
const game = {
  canvas: { isConnected: true },
  scene: { getScenes: () => [playScene] },
  loop: { frame: 1, running: true, inFocus: true, actualFps: 60 },
};
const sampleState = {
  noActiveSinceMs: null,
  activeSinceByScene: new Map([["PlayScene", 0]]),
  lastFrame: 0,
  lastFrameChangedAtMs: 0,
};
const healthy = evaluateRuntimeCanaries(game, sampleState, 6000, false);
assert.equal(
  healthy.findings.some((finding) => finding.code === RUNTIME_CANARY_CONFIG.events.heavenblocksInvariant),
  false,
);
playScene.heavenblocksAccessSystem.getHealthSnapshot = () => ({
  ...healthyHeavenblocks,
  nativeWorldReady: false,
});
const unhealthy = evaluateRuntimeCanaries(game, sampleState, 6001, false);
assert.equal(
  unhealthy.findings.some((finding) => finding.code === RUNTIME_CANARY_CONFIG.events.heavenblocksInvariant),
  true,
);

console.log(
  "Heavenblocks integration contract passed: hashed assets, guaranteed relic reachability, protected travel, save migration, Forge safety, and runtime canary.",
);
