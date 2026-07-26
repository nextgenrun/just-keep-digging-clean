import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import { DigSystem } from "../systems/mining/DigSystem.js";
import { HeavenblocksProgressionSystem } from "../systems/progression/HeavenblocksProgressionSystem.js";
import { GAME_CONFIG } from "../values/gameConfig.js";
import {
  HEAVENBLOCK_CELL_MARKERS,
  HEAVENBLOCKS_WORLD_CONFIG,
} from "../values/heavenblocksWorldConfig.js";
import { RESOURCE_TILE_TYPE_VALUES } from "../values/resourceTypes.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { WorldModel } from "../world/model/WorldModel.js";

const silenceWorldBuild = () => {
  const originalLog = console.log;
  try {
    console.log = () => {};
    return new WorldModel(GAME_CONFIG);
  } finally {
    console.log = originalLog;
  }
};

const worldConfig = HEAVENBLOCKS_WORLD_CONFIG;
assert.equal(worldConfig.version, 3);
assert.equal(worldConfig.regions.length, 3);
assert.deepEqual(worldConfig.regions.map(({ levelId }) => levelId), [1, 1, 2]);
assert.ok(worldConfig.regions.filter(({ levelId }) => levelId === 1).length >= 2);

for (const region of worldConfig.regions) {
  assert.equal(region.layoutRows.length, region.heightTiles);
  assert.ok(region.layoutRows.every((row) => row.length === region.widthTiles));
  const localArrivalX = region.arrival.tx - region.leftTile;
  const localArrivalY = region.arrival.ty - region.topTile;
  assert.equal(region.layoutRows[localArrivalY][localArrivalX], HEAVENBLOCK_CELL_MARKERS.AIR);
  assert.equal(
    region.layoutRows[localArrivalY + 1][localArrivalX],
    HEAVENBLOCK_CELL_MARKERS.PROTECTED,
  );
  const localShaftX = region.entryShaft.tx - region.leftTile;
  const localShaftY = region.entryShaft.ty - region.topTile;
  assert.equal(
    region.layoutRows[localShaftY][localShaftX],
    HEAVENBLOCK_CELL_MARKERS.AIR,
  );
  assert.ok(Math.abs(localShaftX - localArrivalX) <= 1);
  assert.ok(Math.abs(localShaftY - localArrivalY) <= 1);
  assert.equal(
    region.layoutRows[region.core.ty - region.topTile][region.core.tx - region.leftTile],
    HEAVENBLOCK_CELL_MARKERS.COMPONENT_HEART,
  );
  for (const assetPath of [region.heartAssetPath, region.backdropPath]) {
    assert.equal(existsSync(new URL(`../${assetPath}`, import.meta.url)), true, assetPath);
  }
  const heart = readFileSync(new URL(`../${region.heartAssetPath}`, import.meta.url));
  assert.equal(heart.readUInt32BE(16), 512);
  assert.equal(heart.readUInt32BE(20), 512);
  assert.equal(heart[25], 6, "runtime heart must be RGBA");
}
for (const assetPath of [
  "sprites/tiles/approved-world/sky-island-top.webp",
  "sprites/tiles/approved-world/sky-island-corner.webp",
  "sprites/tiles/approved-world/sky-island-under.webp",
]) {
  assert.equal(existsSync(new URL(`../${assetPath}`, import.meta.url)), true, assetPath);
}

for (let leftIndex = 0; leftIndex < worldConfig.regions.length; leftIndex += 1) {
  for (let rightIndex = leftIndex + 1; rightIndex < worldConfig.regions.length; rightIndex += 1) {
    const left = worldConfig.regions[leftIndex];
    const right = worldConfig.regions[rightIndex];
    const separated = (
      left.leftTile + left.widthTiles <= right.leftTile
      || right.leftTile + right.widthTiles <= left.leftTile
      || left.topTile + left.heightTiles <= right.topTile
      || right.topTile + right.heightTiles <= left.topTile
    );
    assert.equal(separated, true, `${left.id} overlaps ${right.id}`);
  }
}

const world = silenceWorldBuild();
const health = world.getHeavenblocksLayoutHealth();
const expectedCounts = worldConfig.regions.reduce((counts, region) => {
  for (const marker of region.layoutRows.join("")) {
    if (marker === HEAVENBLOCK_CELL_MARKERS.MATERIAL) counts.material += 1;
    if (marker === HEAVENBLOCK_CELL_MARKERS.PROTECTED) counts.protected += 1;
    if (marker === HEAVENBLOCK_CELL_MARKERS.RELIC_CACHE) counts.relic += 1;
    if (marker === HEAVENBLOCK_CELL_MARKERS.COMPONENT_HEART) counts.core += 1;
  }
  return counts;
}, { material: 0, protected: 0, relic: 0, core: 0 });
assert.equal(health.nativeTilesReady, true);
assert.equal(health.levelDistributionReady, true);
assert.deepEqual(health.counts, expectedCounts);
assert.equal(health.counts.material, 342);
assert.equal(health.counts.protected, 13);
assert.deepEqual(health.missingCells, []);

const nativeResourceTypes = new Set(RESOURCE_TILE_TYPE_VALUES);
for (const region of worldConfig.regions) {
  assert.equal(world.getType(region.arrival.tx, region.arrival.ty), TILE_TYPES.AIR);
  assert.equal(world.getType(region.arrival.tx, region.arrival.ty + 1), TILE_TYPES.BEDROCK);
  assert.equal(world.getType(region.entryShaft.tx, region.entryShaft.ty), TILE_TYPES.AIR);
  const firstDiggableBelowShaft = Array.from(
    { length: region.heightTiles },
    (_, offset) => region.entryShaft.ty + offset + 1,
  ).find((tileY) => world.isDiggable(region.entryShaft.tx, tileY));
  assert.ok(
    Number.isInteger(firstDiggableBelowShaft),
    `${region.id} needs a diggable route below its marked entry shaft`,
  );
  assert.equal(world.getType(region.core.tx, region.core.ty), TILE_TYPES.HEAVENBLOCK_CORE);
  assert.equal(world.isDiggable(region.core.tx, region.core.ty), true);
  for (let localY = 0; localY < region.heightTiles; localY += 1) {
    for (let localX = 0; localX < region.widthTiles; localX += 1) {
      if (region.layoutRows[localY][localX] !== HEAVENBLOCK_CELL_MARKERS.MATERIAL) continue;
      assert.equal(
        nativeResourceTypes.has(world.getType(region.leftTile + localX, region.topTile + localY)),
        true,
      );
    }
  }
}

const progression = new HeavenblocksProgressionSystem({ relicCount: 3 });
assert.equal(progression.activateSkyGate(3).success, true);
const dig = new DigSystem(world, { applyTileUpdate() {}, scene: {} }, GAME_CONFIG);
dig.setHeavenblocksProgressionSystem(progression);
let artifactEvent = null;
dig.setHeavenblockArtifactHandler((artifact) => { artifactEvent = artifact; });
const cloud = worldConfig.regions[0];
const coreResult = dig.tryMine(cloud.core, 1, null, null, {
  ignoreCooldown: true,
  skipHeavyPunch: true,
  damageMultiplier: 1000,
});
assert.equal(coreResult.destroyed, true);
assert.equal(coreResult.heavenblockArtifact.success, true);
assert.equal(artifactEvent.regionId, cloud.id);
assert.equal(progression.isPartInstalled(cloud.partId), true);
assert.equal(progression.isRegionCompleted(cloud.id), true);
assert.equal(progression.isRegionUnlocked(worldConfig.regions[1].id), true);
assert.equal(progression.isRegionUnlocked(worldConfig.regions[2].id), true);

const angel = worldConfig.regions[1];
const angelDamage = world.damageTile(
  angel.core.tx,
  angel.core.ty,
  world.getTileMaxHp(angel.core.tx, angel.core.ty) * 2,
);
assert.equal(angelDamage.destroyed, true);
const abilityReward = dig.processDestroyedTile(
  angel.core.tx,
  angel.core.ty,
  angelDamage.typeBeforeDamage,
  2,
);
assert.equal(abilityReward.heavenblockArtifact.success, true);
assert.equal(progression.isRegionCompleted(angel.id), true);

const savedDugTiles = world.getDugTileKeys();
const restored = silenceWorldBuild();
restored.applyDugTileKeys(savedDugTiles);
restored.restoreHeavenblockProtectedCells();
assert.equal(restored.getType(cloud.core.tx, cloud.core.ty), TILE_TYPES.AIR);
assert.equal(restored.getType(angel.core.tx, angel.core.ty), TILE_TYPES.AIR);
assert.equal(restored.getHeavenblocksLayoutHealth().nativeTilesReady, true);

const materialDescriptor = (() => {
  for (const region of worldConfig.regions) {
    for (let localY = 0; localY < region.heightTiles; localY += 1) {
      const localX = region.layoutRows[localY].indexOf(HEAVENBLOCK_CELL_MARKERS.MATERIAL);
      if (localX >= 0) return {
        tx: region.leftTile + localX,
        ty: region.topTile + localY,
      };
    }
  }
  return null;
})();
restored.damageTile(
  materialDescriptor.tx,
  materialDescriptor.ty,
  restored.getTileMaxHp(materialDescriptor.tx, materialDescriptor.ty) * 2,
);
restored.restoreHeavenblockProtectedCells();
assert.equal(restored.getType(materialDescriptor.tx, materialDescriptor.ty), TILE_TYPES.AIR);

const v11Source = readFileSync(
  new URL("../systems/environment/V11SkyIslandVisualSystem.js", import.meta.url),
  "utf8",
);
assert.doesNotMatch(v11Source, /HEAVENBLOCKS_VISUAL_CONFIG|addHeavenblockImages/);
const rendererSource = readFileSync(
  new URL("../world/rendering/WorldRenderer.js", import.meta.url),
  "utf8",
);
assert.match(rendererSource, /heavenblockWorldVisualSystem\?\.invalidateCell/);
assert.match(rendererSource, /_syncDedicatedHeavenblockTileAlpha/);
const saveSource = readFileSync(
  new URL("../world/playScene/PlaySceneUI.js", import.meta.url),
  "utf8",
);
assert.match(saveSource, /restoreHeavenblockProtectedCells/);
assert.doesNotMatch(saveSource, /applyHeavenblocksLayout\?\.\(\)/);
const harnessSource = readFileSync(
  new URL("../testing/JkdE2EHarness.js", import.meta.url),
  "utf8",
);
assert.match(harnessSource, /event\.code === "KeyM"/);
assert.match(harnessSource, /Native Heavenblock core mine/);

console.log(
  "Heavenblocks native-world contract passed: 342 resource cells, adjacent playable entry shafts, 3 relic caches, 3 diggable hearts, Level 1/2 distribution, mining progression, and persistent tunnels.",
);
