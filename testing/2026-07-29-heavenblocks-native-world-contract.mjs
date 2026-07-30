import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { CraftingSystem } from "../systems/crafting/CraftingSystem.js";
import { HeavenblocksRegionAccessGuard } from "../systems/environment/HeavenblocksRegionAccessGuard.js";
import { DigSystem } from "../systems/mining/DigSystem.js";
import { TileCollisionSystem } from "../systems/mining/TileCollisionSystem.js";
import { AncientRelicSystem } from "../systems/progression/AncientRelicSystem.js";
import { HeavenblocksProgressionSystem } from "../systems/progression/HeavenblocksProgressionSystem.js";
import { UpgradeSystem } from "../systems/progression/UpgradeSystem.js";
import {
  ARC_CORE_CRAFT_COST,
  ARC_CORE_UPGRADE_ID,
  OMEGA_ARC_CORE_CRAFT_COST,
  OMEGA_ARC_CORE_UPGRADE_ID,
} from "../values/arcCoreConfig.js";
import {
  CRAFTING_RECIPE_IDS,
  CRAFTING_REQUIREMENTS,
} from "../values/craftingRecipes.js";
import { GAME_CONFIG } from "../values/gameConfig.js";
import { HEAVENBLOCKS_ACCESS_CONFIG } from "../values/heavenblocksAccessConfig.js";
import {
  HEAVENBLOCKS_PROGRESSION_CONFIG,
} from "../values/heavenblocksProgressionConfig.js";
import {
  getHeavenblocksNativePreloadAssets,
  HEAVENBLOCKS_VISUAL_CONFIG,
} from "../values/heavenblocksVisualConfig.js";
import {
  HEAVENBLOCKS_MATERIAL_TILE_TYPES,
  HEAVENBLOCKS_WORLD_CONFIG,
} from "../values/heavenblocksWorldConfig.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { DugTilesSaveStore } from "../world/model/DugTilesSaveStore.js";
import { WorldModel } from "../world/model/WorldModel.js";
import { getTileRenderIndex } from "../world/rendering/tileRenderMap.js";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const MATERIALS = new Set(HEAVENBLOCKS_MATERIAL_TILE_TYPES);

function cellsInRegion(world, region) {
  const cells = [];
  for (let ty = region.bounds.top; ty <= region.bounds.bottom; ty += 1) {
    for (let tx = region.bounds.left; tx <= region.bounds.right; tx += 1) {
      cells.push({ tx, ty, type: world.getTileType(tx, ty) });
    }
  }
  return cells;
}

function addResourceCosts(...costs) {
  const total = { dirt: 7 };
  for (const cost of costs) {
    for (const [key, amount] of Object.entries(cost)) {
      total[key] = (total[key] || 0) + amount;
    }
  }
  return total;
}

assert.equal(HEAVENBLOCKS_VISUAL_CONFIG.nativeTileRenderer, true);
assert.equal(HEAVENBLOCKS_VISUAL_CONFIG.bakedFacadeRuntime, false);
assert.deepEqual(
  HEAVENBLOCKS_WORLD_CONFIG.regions.map(({ levelId }) => levelId),
  [1, 1, 2],
  "Cloud Reef and Halo Bastion belong to Level 1; Eclipse Scar belongs to Level 2",
);
assert.ok(
  HEAVENBLOCKS_WORLD_CONFIG.regions
    .filter(({ levelId }) => levelId === 1)
    .every(({ bounds }) => bounds.right < HEAVENBLOCKS_WORLD_CONFIG.dividerTileX),
);
assert.ok(
  HEAVENBLOCKS_WORLD_CONFIG.regions
    .filter(({ levelId }) => levelId === 2)
    .every(({ bounds }) => bounds.left > HEAVENBLOCKS_WORLD_CONFIG.dividerTileX),
);

const originalLog = console.log;
let world;
try {
  console.log = () => {};
  world = new WorldModel(GAME_CONFIG);
} finally {
  console.log = originalLog;
}
const collision = new TileCollisionSystem(world, GAME_CONFIG);
const layoutHealth = world.getHeavenblocksLayoutHealth();
assert.equal(layoutHealth.nativeWorldReady, true);
assert.equal(layoutHealth.missingFloorCells.length, 0);

for (const region of HEAVENBLOCKS_WORLD_CONFIG.regions) {
  const cells = cellsInRegion(world, region);
  const materials = cells.filter(({ type }) => MATERIALS.has(type));
  assert.ok(materials.length >= region.minimumSolidTiles, `${region.id} is a full native tile world`);
  assert.ok(materials.some(({ type }) => type === region.baseTileType));
  assert.ok(materials.some(({ type }) => type === region.oreTileType));
  assert.equal(cells.some(({ type }) => type === TILE_TYPES.BEDROCK), false);
  assert.equal(world.getTileType(region.relicCache.tx, region.relicCache.ty), TILE_TYPES.ANCIENT_RELIC_CACHE);
  assert.equal(
    getTileRenderIndex(TILE_TYPES.ANCIENT_RELIC_CACHE, 1, 1, region.relicCache.tx, region.relicCache.ty),
    -1,
    "island relic caches are owned by the authored native renderer",
  );
  assert.equal(world.getTileType(region.arrivalTile.tx, region.arrivalTile.ty), TILE_TYPES.AIR);
  assert.ok(MATERIALS.has(world.getTileType(region.arrivalTile.tx, region.arrivalTile.ty + 1)));
  assert.equal(collision.isSolidAtTile(region.arrivalTile.tx, region.arrivalTile.ty + 1), true);
  assert.equal(world.getTileType(region.shrine.tx, region.shrine.floorTy - 1), TILE_TYPES.AIR);
  assert.ok(MATERIALS.has(world.getTileType(region.shrine.tx, region.shrine.floorTy)));
  for (const room of region.rooms) {
    assert.equal(world.getTileType(room.left, room.top), TILE_TYPES.AIR);
  }
  const sample = materials.find(({ tx, ty }) => (
    tx !== region.arrivalTile.tx || ty !== region.arrivalTile.ty + 1
  ));
  assert.equal(world.isDiggable(sample.tx, sample.ty), true);
  assert.ok(world.getTileHp(sample.tx, sample.ty) > 0);
  assert.equal(getTileRenderIndex(sample.type, 1, 1, sample.tx, sample.ty), -1);
}

const relics = new AncientRelicSystem();
const progression = new HeavenblocksProgressionSystem({
  relicCountProvider: () => relics.getCount(),
});
const teleports = [];
const guardScene = {
  time: { now: 1000 },
  worldRenderer: { applyTileUpdate() {} },
  hudSystem: { flashStatus() {} },
  earthquakeFeedbackUI: { clearEscapeObjective() {} },
  earthquakeHazardOverlay: { clear() {} },
};
const guard = new HeavenblocksRegionAccessGuard(guardScene, {
  worldModel: world,
  playerController: {
    teleportToTile: (tx, ty) => teleports.push({ tx, ty }),
  },
  progressionSystem: progression,
  ancientRelicSystem: relics,
});
world.setDamageGuard(({ tx, ty }) => guard.canMutateTile(tx, ty));
guard.syncProgressionState();

const cloud = HEAVENBLOCKS_WORLD_CONFIG.regions[0];
const cloudCell = cellsInRegion(world, cloud).find(({ type }) => MATERIALS.has(type));
const lockedHp = world.getTileHp(cloudCell.tx, cloudCell.ty);
const lockedDamage = world.damageTile(cloudCell.tx, cloudCell.ty, 1);
assert.equal(lockedDamage.success, false);
assert.equal(lockedDamage.reason, HEAVENBLOCKS_ACCESS_CONFIG.regionGuard.blockedDamageReason);
assert.equal(world.getTileHp(cloudCell.tx, cloudCell.ty), lockedHp);
guard.update(cloud.arrivalTile);
assert.deepEqual(teleports.at(-1), HEAVENBLOCKS_ACCESS_CONFIG.surfaceReturn);

relics.add(3);
assert.equal(progression.syncRelicEligibility().changed, true);
assert.equal(progression.activateSkyGate().success, true);
assert.equal(progression.isRegionUnlocked(cloud.id), true);
guard.syncProgressionState();
assert.equal(world.damageTile(cloudCell.tx, cloudCell.ty, 1).success, true);
const protectedLanding = {
  tx: cloud.arrivalTile.tx,
  ty: cloud.arrivalTile.ty + 1,
};
assert.equal(
  world.damageTile(protectedLanding.tx, protectedLanding.ty, 1).reason,
  HEAVENBLOCKS_ACCESS_CONFIG.regionGuard.safetyAnchorDamageReason,
);
assert.deepEqual(
  world.applyDugTileKeys([`${protectedLanding.tx},${protectedLanding.ty}`]),
  [],
  "save restoration cannot erase a teleport landing floor",
);const persistentNativeCell = cellsInRegion(world, cloud).find(({ tx, ty, type }) => (
  MATERIALS.has(type)
  && (tx !== cloudCell.tx || ty !== cloudCell.ty)
  && guard.canMutateTile(tx, ty).allowed
));
assert.ok(persistentNativeCell, "Cloud Reef exposes a non-safety native cell for persistence");
const persistentNativeKey = `${persistentNativeCell.tx},${persistentNativeCell.ty}`;
const persistentNativeResult = world.damageTile(
  persistentNativeCell.tx,
  persistentNativeCell.ty,
  world.getTileHp(persistentNativeCell.tx, persistentNativeCell.ty),
);
assert.equal(persistentNativeResult.success, true);
assert.equal(persistentNativeResult.destroyed, true);
assert.equal(world.getTileType(persistentNativeCell.tx, persistentNativeCell.ty), TILE_TYPES.AIR);
assert.equal(world.isSolid(persistentNativeCell.tx, persistentNativeCell.ty), false);
assert.ok(world.getDugTileKeys().includes(persistentNativeKey));
assert.equal(
  world.getDugTileSource(persistentNativeCell.tx, persistentNativeCell.ty)?.type,
  persistentNativeCell.type,
);

for (const region of HEAVENBLOCKS_PROGRESSION_CONFIG.regions) {
  assert.equal(progression.visitRegion(region.id).success, true);
  assert.equal(progression.discoverPart(region.uniquePartId).success, true);
  assert.equal(progression.installPart(region.uniquePartId).success, true);
  assert.equal(progression.completeRegion(region.id).success, true);
  guard.syncProgressionState();
}
assert.equal(progression.isArcCoreBlueprintEligible(), true);
for (const region of HEAVENBLOCKS_WORLD_CONFIG.regions.filter(({ barrier }) => barrier)) {
  for (let offset = 0; offset < region.barrier.height; offset += 1) {
    assert.equal(world.getTileType(region.barrier.tx, region.barrier.topTy + offset), TILE_TYPES.AIR);
  }
}
assert.equal(guard.getHealthSnapshot().barriersReady, true);
assert.equal(guard.getHealthSnapshot().damageGuardReady, true);

const dig = new DigSystem(null, null, {});
dig.setResourceTotals(addResourceCosts(ARC_CORE_CRAFT_COST, OMEGA_ARC_CORE_CRAFT_COST));
const upgrades = new UpgradeSystem(dig);
upgrades.grantUpgrade("worldTwoTunnelAccess");
const crafting = new CraftingSystem({
  digSystem: dig,
  upgradeSystem: upgrades,
  ancientRelicSystem: relics,
  heavenblocksProgressionSystem: progression,
});
const progressionBeforeCraft = progression.getSaveData();
const arcResult = crafting.craft(CRAFTING_RECIPE_IDS.ARC_CORE);
assert.equal(arcResult.success, true);
assert.equal(upgrades.getUpgradeLevel(ARC_CORE_UPGRADE_ID), 1);
assert.equal(relics.getCount(), CRAFTING_REQUIREMENTS.arcCoreRelics);
assert.deepEqual(progression.getSaveData(), progressionBeforeCraft);

for (const vault of HEAVENBLOCKS_PROGRESSION_CONFIG.omegaVaults) {
  assert.equal(progression.openOmegaVault(vault.id).success, true);
}
assert.equal(progression.hasZenithKeystone(), true);
relics.add(CRAFTING_REQUIREMENTS.omegaArcCoreRelics - relics.getCount());
const omegaResult = crafting.craft(CRAFTING_RECIPE_IDS.OMEGA_ARC_CORE);
assert.equal(omegaResult.success, true);
assert.equal(upgrades.getUpgradeLevel(OMEGA_ARC_CORE_UPGRADE_ID), 1);
assert.equal(dig.getResourceTotals().dirt, 7);
for (const key of new Set([
  ...Object.keys(ARC_CORE_CRAFT_COST),
  ...Object.keys(OMEGA_ARC_CORE_CRAFT_COST),
])) {
  assert.equal(dig.getResourceTotals()[key], 0, `${key} was not consumed by the Arc Forge`);
}

const saveStore = new DugTilesSaveStore();
const payload = saveStore.createPayload(
  world.getWorldIdentity(),
  world.getDugTileKeys(),
  dig.getResourceTotals(),
  upgrades.getUpgradeLevels(),
  null, null, null, null,
  world.getRubbleTiles(),
  null, null,
  relics.getSaveData(),
  null, null, null,
  progression.getSaveData(),
);
assert.equal(payload.version, 13);
assert.ok(
  payload.dugTiles.includes(persistentNativeKey),
  "serialized saves retain destroyed above-surface Heavenblocks cells",
);assert.deepEqual(payload.heavenblocksData, progression.getSaveData());
assert.equal(payload.upgrades[ARC_CORE_UPGRADE_ID], 1);
assert.equal(payload.upgrades[OMEGA_ARC_CORE_UPGRADE_ID], 1);
let restoredWorld;
try {
  console.log = () => {};
  restoredWorld = new WorldModel(GAME_CONFIG);
} finally {
  console.log = originalLog;
}
const restoredNativeCells = restoredWorld.applyDugTileKeys(payload.dugTiles);
assert.ok(
  restoredNativeCells.some(({ tx, ty }) => (
    tx === persistentNativeCell.tx && ty === persistentNativeCell.ty
  )),
  "save restoration reapplies the destroyed native coordinate",
);
assert.equal(
  restoredWorld.getTileType(persistentNativeCell.tx, persistentNativeCell.ty),
  TILE_TYPES.AIR,
);
assert.equal(
  restoredWorld.isSolid(persistentNativeCell.tx, persistentNativeCell.ty),
  false,
);
assert.equal(
  restoredWorld.getDugTileSource(
    persistentNativeCell.tx,
    persistentNativeCell.ty,
  )?.type,
  persistentNativeCell.type,
);
assert.equal(
  new TileCollisionSystem(restoredWorld, GAME_CONFIG).isSolidAtTile(
    persistentNativeCell.tx,
    persistentNativeCell.ty,
  ),
  false,
);const tampered = structuredClone(payload);
tampered.heavenblocksData.unlockedRegionIds.push("fake-region");
tampered.heavenblocksData.discoveredPartIds.push("fake-part");
const normalized = saveStore.normalizePayload(tampered);
assert.equal(normalized.heavenblocksData.unlockedRegionIds.includes("fake-region"), false);
assert.equal(normalized.heavenblocksData.discoveredPartIds.includes("fake-part"), false);

const manifestPath = join(ROOT, "sprites/heavenblocks-v2/manifest-v2.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
assert.equal(manifest.runtimeFacadeImages, 0);
assert.equal(manifest.modularSprites, 48);
assert.equal(manifest.regionWideBackgrounds, 0);
const runtimeAssets = manifest.assets.filter(({ path }) => path.endsWith(".webp"));
assert.equal(runtimeAssets.length, 48);
assert.equal(runtimeAssets.some(({ path }) => /facade|platform|background|atmosphere/i.test(path)), false);
for (const asset of runtimeAssets) {
  const absolute = join(ROOT, asset.path);
  assert.equal(existsSync(absolute), true, asset.path);
  assert.ok(statSync(absolute).size > 1000, asset.path);
  assert.ok(asset.width >= 180 && asset.height >= 180, asset.path);
  assert.equal(createHash("sha256").update(readFileSync(absolute)).digest("hex"), asset.sha256);
}
const preloadAssets = getHeavenblocksNativePreloadAssets();
assert.equal(preloadAssets.length, 48);
assert.equal(new Set(preloadAssets.map(({ key }) => key)).size, 48);
assert.deepEqual(
  new Set(preloadAssets.map(({ path }) => path)),
  new Set(runtimeAssets.map(({ path }) => path)),
);

const sourceContracts = [
  ["world/model/WorldModel.js", "applyHeavenblocksWorld"],
  ["world/playScene/PlaySceneSetup.js", "HeavenblocksTerrainRenderer"],
  ["world/playScene/PlaySceneSetup.js", "HeavenblocksRegionAccessGuard"],
  ["world/playScene/PlaySceneSetup.js", "HeavenblocksArtifactSystem"],
  ["world/playScene/PlaySceneSetup.js", "setDamageGuard"],
  ["world/playScene/PlaySceneUI.js", "syncProgressionState"],
  ["world/playScene/PlaySceneUpdate.js", "heavenblocksTerrainRenderer"],
  ["world/rendering/WorldRenderer.js", "heavenblocksTerrainRenderer"],
  ["world/rendering/scenic-world/WorldVisualRuntime.js", "heavenblocksTerrainRenderer"],
  ["world/rendering/scenic-world/WorldVisualMaterialField.js", "getHeavenblocksRegionAt\\(tx, ty\\)"],
  ["testing/JkdE2EHarness.js", "HEAVENBLOCKS_WORLD_CONFIG.regions"],
  ["testing/JkdE2EHarness.js", "forcePlayerState\\(scene, region\\.arrivalTile\\)"],
  ["ui/scenes/BootScene.js", "getHeavenblocksNativePreloadAssets"],
  ["ui/overlays/ShopOverlay.js", "playCraftSuccess"],
];
for (const [path, token] of sourceContracts) {
  assert.match(readFileSync(join(ROOT, path), "utf8"), new RegExp(token));
}const playSceneUpdateSource = readFileSync(
  join(ROOT, "world/playScene/PlaySceneUpdate.js"),
  "utf8",
);
assert.match(
  playSceneUpdateSource,
  /if \(result\.destroyed\) \{\s*scene\.queueDugTilesSave\?\.\(\)/,
  "the production mining result path queues a save after native destruction",
);
const e2eHarnessSource = readFileSync(join(ROOT, "testing/JkdE2EHarness.js"), "utf8");
assert.match(
  e2eHarnessSource,
  /scene\.queueDugTilesSave = \(\) => undefined/,
  "the no-write E2E harness remains explicit so it cannot be used as persistence proof",
);
assert.equal(existsSync(join(ROOT, "systems/environment/V11SkyIslandVisualSystem.js")), false);
assert.equal(existsSync(join(ROOT, "sprites/backgrounds/heavenblocks-v1")), false);
assert.equal(existsSync(join(ROOT, "sprites/backgrounds/heavenblocks-v2")), false);
assert.equal(existsSync(join(ROOT, "systems/environment/HeavenblocksAtmosphereSystem.js")), false);
assert.doesNotMatch(readFileSync(join(ROOT, "values/assetKeys.js"), "utf8"), /skyIslands:|heavenblocks-v2-.*-atmosphere/);
assert.doesNotMatch(readFileSync(join(ROOT, "values/heavenblocksVisualConfig.js"), "utf8"), /backgroundBasePath|atmosphereFile/);

guard.destroy();
world.setDamageGuard(null);
console.log(
  "Heavenblocks native world contract passed: diggable geometry, access, relic gate, parts, Arc Forge, vaults, saves, assets, and lifecycle wiring",
);
