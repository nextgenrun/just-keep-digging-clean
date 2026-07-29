import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { DigSystem } from "../systems/mining/DigSystem.js";
import { TileCollisionSystem } from "../systems/mining/TileCollisionSystem.js";
import { AncientRelicSystem } from "../systems/progression/AncientRelicSystem.js";
import { HeavenblocksAccessSystem } from "../systems/progression/HeavenblocksAccessSystem.js";
import { HeavenblocksProgressionSystem } from "../systems/progression/HeavenblocksProgressionSystem.js";
import { UpgradeSystem } from "../systems/progression/UpgradeSystem.js";
import { ArcCoreCraftingSystem } from "../systems/crafting/ArcCoreCraftingSystem.js";
import { GAME_CONFIG } from "../values/gameConfig.js";
import {
  ARC_CORE_UPGRADE_ID,
  OMEGA_ARC_CORE_UPGRADE_ID,
} from "../values/arcCoreConfig.js";
import { HEAVENBLOCKS_PROGRESSION_CONFIG } from "../values/heavenblocksProgressionConfig.js";
import { HEAVENBLOCKS_VISUAL_CONFIG } from "../values/heavenblocksVisualConfig.js";
import {
  HEAVENBLOCKS_MATERIAL_TILE_TYPES,
  HEAVENBLOCKS_WORLD_CONFIG,
} from "../values/heavenblocksWorldConfig.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { WORLD_GAMEPLAY_LAYOUT } from "../values/worldGameplayLayout.js";
import { DugTilesSaveStore } from "../world/model/DugTilesSaveStore.js";
import { WorldModel } from "../world/model/WorldModel.js";
import { getTileRenderIndex } from "../world/rendering/tileRenderMap.js";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const MATERIALS = new Set(HEAVENBLOCKS_MATERIAL_TILE_TYPES);
const regionMinimums = Object.freeze({
  "cloud-reef": 800,
  "halo-bastion": 900,
  "eclipse-scar": 2000,
});

function cellsInRegion(world, region) {
  const cells = [];
  for (let ty = region.bounds.top; ty <= region.bounds.bottom; ty += 1) {
    for (let tx = region.bounds.left; tx <= region.bounds.right; tx += 1) {
      cells.push({ tx, ty, type: world.getTileType(tx, ty) });
    }
  }
  return cells;
}

function findDeepRelicCaches(world, count) {
  const matches = [];
  for (let ty = world.topAirRows + 1; ty < world.depthTiles && matches.length < count; ty += 1) {
    for (let tx = 0; tx < world.widthTiles && matches.length < count; tx += 1) {
      if (world.getTileType(tx, ty) === TILE_TYPES.ANCIENT_RELIC_CACHE) {
        matches.push({ tx, ty });
      }
    }
  }
  return matches;
}

function sumRecipeResources(...recipes) {
  const totals = { dirt: 9 };
  for (const recipe of recipes) {
    for (const [key, amount] of Object.entries(recipe.resources)) {
      totals[key] = (totals[key] || 0) + amount;
    }
  }
  return totals;
}

assert.equal(WORLD_GAMEPLAY_LAYOUT.id, "native-heavenblocks-v2");
assert.equal(WORLD_GAMEPLAY_LAYOUT.status, "authoritative");
assert.equal(HEAVENBLOCKS_VISUAL_CONFIG.nativeTileRenderer, true);
assert.equal(HEAVENBLOCKS_VISUAL_CONFIG.bakedFacadeRuntime, false);
assert.deepEqual(
  HEAVENBLOCKS_WORLD_CONFIG.regions.map((region) => region.levelId),
  [1, 1, 2],
  "Cloud Reef and Halo Bastion live in Level 1; Eclipse Scar lives in Level 2"
);

const world = new WorldModel();
const collision = new TileCollisionSystem(world, GAME_CONFIG);
let authoritativeSolidCells = 0;
for (const region of HEAVENBLOCKS_WORLD_CONFIG.regions) {
  const cells = cellsInRegion(world, region);
  const materialCells = cells.filter((cell) => MATERIALS.has(cell.type));
  authoritativeSolidCells += cells.filter((cell) => cell.type !== TILE_TYPES.AIR).length;
  assert.ok(materialCells.length >= regionMinimums[region.id], `${region.id} is a full tile world`);
  assert.ok(materialCells.some((cell) => cell.type === region.baseTileType));
  assert.ok(materialCells.some((cell) => cell.type === region.oreTileType));
  assert.equal(cells.some((cell) => cell.type === TILE_TYPES.BEDROCK), false);
  assert.equal(world.getTileType(region.relicCache.tx, region.relicCache.ty), TILE_TYPES.ANCIENT_RELIC_CACHE);
  assert.equal(getTileRenderIndex(TILE_TYPES.ANCIENT_RELIC_CACHE), -1);
  assert.equal(world.getTileType(region.arrivalTile.tx, region.arrivalTile.ty), TILE_TYPES.AIR);
  assert.notEqual(world.getTileType(region.arrivalTile.tx, region.arrivalTile.ty + 1), TILE_TYPES.AIR);
  assert.equal(collision.isSolidAtTile(region.arrivalTile.tx, region.arrivalTile.ty + 1), true);
  assert.equal(world.getTileType(region.shrine.tx, region.shrine.floorTy - 1), TILE_TYPES.AIR);
  assert.notEqual(world.getTileType(region.shrine.tx, region.shrine.floorTy), TILE_TYPES.AIR);
  for (const room of region.rooms) {
    assert.equal(world.getTileType(room.left, room.top), TILE_TYPES.AIR);
  }
  const sample = materialCells[0];
  assert.equal(world.isDiggable(sample.tx, sample.ty), true);
  assert.ok(world.getTileHp(sample.tx, sample.ty) > 0);
  assert.equal(getTileRenderIndex(sample.type), -1, "native renderer exclusively owns Heavenblocks");
}
assert.ok(authoritativeSolidCells >= 3900);

for (const region of HEAVENBLOCKS_WORLD_CONFIG.regions.filter((entry) => entry.barrier)) {
  for (let offset = 0; offset < region.barrier.height; offset += 1) {
    assert.equal(
      world.getTileType(region.barrier.tx, region.barrier.topTy + offset),
      TILE_TYPES.HEAVEN_BARRIER
    );
  }
}

const relics = new AncientRelicSystem();
const unlockEvents = [];
const changedTiles = [];
const progression = new HeavenblocksProgressionSystem({
  relicSystem: relics,
  worldModel: world,
  onRegionUnlocked: (regionId) => unlockEvents.push(regionId),
  onTileChanged: (tx, ty) => changedTiles.push(`${tx},${ty}`),
});
const playerTeleports = [];
const access = new HeavenblocksAccessSystem({
  progressionSystem: progression,
  playerController: { teleportToTile: (tx, ty) => playerTeleports.push({ tx, ty }) },
});
world.setDamageGuard(({ tx, ty }) => access.canMutateTile(tx, ty));

const cloud = HEAVENBLOCKS_WORLD_CONFIG.regions[0];
const cloudCell = cellsInRegion(world, cloud).find((cell) => MATERIALS.has(cell.type));
const cloudHp = world.getTileHp(cloudCell.tx, cloudCell.ty);
assert.equal(world.damageTile(cloudCell.tx, cloudCell.ty, 1).reason, "region-locked");
assert.equal(world.getTileHp(cloudCell.tx, cloudCell.ty), cloudHp);
const halo = HEAVENBLOCKS_WORLD_CONFIG.regions[1];
const denied = access.update(halo.arrivalTile, 5000);
assert.equal(denied.repelled, true);
assert.deepEqual(playerTeleports.at(-1), halo.lockedFallbackTile);

const discoveries = [];
const rendererStub = {
  scene: { hudSystem: { flashStatus() {} } },
  applyTileUpdate() {},
};
const dig = new DigSystem(world, rendererStub, GAME_CONFIG);
dig.setAncientRelicSystem(relics);
dig.setRelicDiscoveryHandler((discovery) => discoveries.push(discovery));
const deepCaches = findDeepRelicCaches(world, 3);
assert.equal(deepCaches.length, 3);
for (const cache of deepCaches) {
  const result = dig.tryMine(cache, 0, null, null, {
    ignoreCooldown: true,
    damageMultiplier: 100000,
    skipHeavyPunch: true,
  });
  assert.equal(result.success, true);
  assert.equal(result.destroyed, true);
  assert.equal(result.ancientRelics, 1);
}
assert.equal(discoveries.length, 3);
assert.equal(relics.getCount(), 3);
assert.equal(progression.isRegionUnlocked("cloud-reef"), true);
assert.deepEqual(unlockEvents, ["cloud-reef"]);
assert.equal(world.damageTile(cloudCell.tx, cloudCell.ty, 1).success, true);
assert.equal(world.getTileHp(cloudCell.tx, cloudCell.ty), cloudHp - 1);

assert.equal(progression.attuneHeart("cloud-reef").success, true);
assert.equal(progression.isRegionUnlocked("halo-bastion"), true);
assert.equal(progression.attuneHeart("halo-bastion").success, true);
assert.equal(progression.isRegionUnlocked("eclipse-scar"), true);
assert.deepEqual(unlockEvents, ["cloud-reef", "halo-bastion", "eclipse-scar"]);
assert.equal(changedTiles.length, 10);
assert.ok(changedTiles.every((key) => {
  const [tx, ty] = key.split(",").map(Number);
  return world.getTileType(tx, ty) === TILE_TYPES.AIR;
}));

const upgrade = new UpgradeSystem(dig);
const craftedEvents = [];
const crafting = new ArcCoreCraftingSystem({
  digSystem: dig,
  upgradeSystem: upgrade,
  progressionSystem: progression,
  onCrafted: (result) => craftedEvents.push(result.recipeId),
});
const small = HEAVENBLOCKS_PROGRESSION_CONFIG.recipes.smallArcCore;
const omega = HEAVENBLOCKS_PROGRESSION_CONFIG.recipes.omegaArcCore;
dig.setResourceTotals(sumRecipeResources(small, omega));
const resourcesBeforeFailure = dig.getResourceTotals();
const spendResource = dig.spendResource.bind(dig);
let spendCalls = 0;
dig.spendResource = (key, amount) => (++spendCalls === 2 ? false : spendResource(key, amount));
assert.equal(crafting.craft("smallArcCore").reason, "atomic-spend-failed");
assert.deepEqual(dig.getResourceTotals(), resourcesBeforeFailure);
assert.equal(upgrade.getUpgradeLevel(ARC_CORE_UPGRADE_ID), 0);
dig.spendResource = spendResource;

assert.equal(crafting.craft("smallArcCore").success, true);
assert.equal(upgrade.getUpgradeLevel(ARC_CORE_UPGRADE_ID), 1);
assert.deepEqual(crafting.getRecipeState("omegaArcCore").missingHearts, ["eclipse-scar"]);
assert.equal(progression.attuneHeart("eclipse-scar").success, true);
assert.equal(crafting.craft("omegaArcCore").success, true);
assert.equal(upgrade.getUpgradeLevel(OMEGA_ARC_CORE_UPGRADE_ID), 1);
assert.deepEqual(craftedEvents, ["smallArcCore", "omegaArcCore"]);
assert.equal(dig.getResourceTotals().dirt, 9);
for (const key of new Set([...Object.keys(small.resources), ...Object.keys(omega.resources)])) {
  assert.equal(dig.getResourceTotals()[key], 0);
}

for (const region of HEAVENBLOCKS_WORLD_CONFIG.regions) progression.markDiscovered(region.id);
const store = new DugTilesSaveStore();
const worldIdentity = {
  seed: GAME_CONFIG.seed,
  width: GAME_CONFIG.worldWidthTiles,
  depth: GAME_CONFIG.worldDepthTiles,
  topAirRows: GAME_CONFIG.topAirRows,
  layoutId: WORLD_GAMEPLAY_LAYOUT.id,
  layoutRevision: WORLD_GAMEPLAY_LAYOUT.revision,
};
const payload = store.createPayload(
  worldIdentity,
  world.getDugTileKeys(),
  dig.getResourceTotals(),
  upgrade.getUpgradeLevels(),
  null, null, null, null,
  world.getRubbleTiles(),
  "survivor",
  null,
  relics.getSaveData(),
  null,
  { progression: progression.getSaveData(), crafting: crafting.getSaveData() }
);
assert.equal(payload.version, 10);
assert.deepEqual(payload.heavenblocksData.progression.attunedHearts, [
  "cloud-reef", "halo-bastion", "eclipse-scar",
]);
assert.deepEqual(payload.heavenblocksData.crafting.craftedRecipes, [
  "smallArcCore", "omegaArcCore",
]);
const tampered = JSON.parse(JSON.stringify(payload));
tampered.heavenblocksData.progression.attunedHearts.push("fake-region");
tampered.heavenblocksData.crafting.craftedRecipes.push("free-core");
assert.equal(store.normalizePayload(tampered).heavenblocksData.progression.attunedHearts.includes("fake-region"), false);
assert.equal(store.normalizePayload(tampered).heavenblocksData.crafting.craftedRecipes.includes("free-core"), false);

const manifestPath = join(ROOT, "sprites/heavenblocks-v2/manifest-v2.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
assert.equal(manifest.runtimeFacadeImages, 0);
assert.equal(manifest.modularSprites, 48);
assert.equal(manifest.atmosphereOnlyBackgrounds, 3);
const runtimeAssets = manifest.assets.filter((asset) => asset.path.endsWith(".webp"));
assert.equal(runtimeAssets.length, 51);
assert.equal(runtimeAssets.some((asset) => /facade|platform/i.test(asset.path)), false);
for (const asset of runtimeAssets) {
  const absolute = join(ROOT, asset.path);
  assert.equal(existsSync(absolute), true, asset.path);
  assert.ok(statSync(absolute).size > 1000, asset.path);
  assert.ok(asset.width >= 180 && asset.height >= 180, asset.path);
  assert.equal(createHash("sha256").update(readFileSync(absolute)).digest("hex"), asset.sha256);
}
const textureKeys = Object.values(HEAVENBLOCKS_VISUAL_CONFIG.biomes)
  .flatMap((biome) => Object.values(biome.keys));
assert.equal(textureKeys.length, 51);
assert.equal(new Set(textureKeys).size, 51);

const sourceContracts = [
  ["world/model/WorldModel.js", "applyHeavenblocksWorld"],
  ["world/rendering/WorldRenderer.js", "HeavenblocksTerrainRenderer"],
  ["world/rendering/scenic-world/WorldVisualRuntime.js", "HeavenblocksTerrainRenderer"],
  ["world/playScene/PlaySceneSetup.js", "setDamageGuard"],
  ["world/playScene/PlaySceneSetup.js", "HeavenblocksArtifactSystem"],
  ["world/playScene/PlaySceneUI.js", "ArcForgeOverlay"],
  ["world/playScene/PlaySceneUpdate.js", "heavenblocksAccessSystem"],
  ["ui/scenes/BootScene.js", "HEAVENBLOCKS_VISUAL_CONFIG.biomes"],
];
for (const [path, token] of sourceContracts) {
  assert.match(readFileSync(join(ROOT, path), "utf8"), new RegExp(token));
}
assert.equal(existsSync(join(ROOT, "systems/environment/V11SkyIslandVisualSystem.js")), false);
assert.equal(existsSync(join(ROOT, "sprites/backgrounds/heavenblocks-v1")), false);
assert.doesNotMatch(readFileSync(join(ROOT, "values/assetKeys.js"), "utf8"), /skyIslands:/);

progression.destroy();
world.setDamageGuard(null);
console.log("Heavenblocks native world contract passed: geometry, collision, relic access, hearts, crafting, saves, assets, and dual render wiring");
