import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { sanitizeRetentionProgressData } from "../systems/progression/retentionProgressState.js";
import { GAME_CONFIG } from "../values/gameConfig.js";
import {
  GEODE_RETIREMENT_CONFIG,
  isLegacyGeodeTileType,
  migrateLegacyGeodeTileType,
} from "../values/geodeRetirement.js";
import { RETENTION_CONFIG } from "../values/retentionConfig.js";
import { TILED_WORLD_OVERRIDE } from "../values/tiledWorldOverrideData.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { WorldModel } from "../world/model/WorldModel.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = relative => readFile(path.join(root, relative), "utf8");

assert.equal(GEODE_RETIREMENT_CONFIG.active, true);
for (const legacyType of [TILE_TYPES.GEODE_INTERIOR, TILE_TYPES.GEODE_WALL]) {
  assert.equal(isLegacyGeodeTileType(legacyType), true);
  assert.equal(migrateLegacyGeodeTileType(legacyType), TILE_TYPES.STONE);
}
assert.equal(TILED_WORLD_OVERRIDE.retirementMigration.id, "retire-geodes-v1");
for (let index = 2; index < TILED_WORLD_OVERRIDE.runs.length; index += 3) {
  assert.equal(isLegacyGeodeTileType(TILED_WORLD_OVERRIDE.runs[index]), false);
}

const world = new WorldModel(GAME_CONFIG);
assert.equal(world.tileType.includes(TILE_TYPES.GEODE_INTERIOR), false);
assert.equal(world.tileType.includes(TILE_TYPES.GEODE_WALL), false);
assert.equal(Array.isArray(world.geodeZones), false);

const tx = 4;
const ty = Math.max(world.topAirRows + 8, 70);
world.setTile(tx, ty, TILE_TYPES.GEODE_INTERIOR, 0);
assert.equal(world.getType(tx, ty), TILE_TYPES.STONE);
assert.ok(world.getHp(tx, ty) > 0, "legacy empty-HP tiles must become valid stone");

world.setType(tx + 1, ty, TILE_TYPES.GEODE_WALL);
assert.equal(world.getType(tx + 1, ty), TILE_TYPES.STONE);
assert.ok(world.getHp(tx + 1, ty) > 0);

const rubble = world.setRubbleTile(tx + 2, ty, TILE_TYPES.GEODE_WALL);
assert.equal(rubble?.type, TILE_TYPES.STONE);
assert.equal(world.getType(tx + 2, ty), TILE_TYPES.STONE);

const migratedRetention = sanitizeRetentionProgressData({
  version: RETENTION_CONFIG.saveVersion - 1,
  discoveries: {
    journal: ["geode-12-30", "geode:legacy-pocket", "cave-12-30"],
  },
});
assert.deepEqual(migratedRetention.discoveries.journal, ["cave-12-30"]);
assert.equal(migratedRetention.version, RETENTION_CONFIG.saveVersion);

const [worldGen, digSystem, renderer, lightConfig, caveVisuals, assetKeys, exporter] = await Promise.all([
  source("values/worldGen.js"),
  source("systems/mining/DigSystem.js"),
  source("world/rendering/tileRenderMap.js"),
  source("values/lightConfig.js"),
  source("systems/visual/CaveTemplateVisualSystem.js"),
  source("values/assetKeys.js"),
  source("tools/export_tiled_runtime_override.py"),
]);

assert.doesNotMatch(worldGen, /\bgeodes\s*:/);
assert.doesNotMatch(digSystem, /GEODE_(?:WALL|INTERIOR)/);
assert.doesNotMatch(renderer, /GEODE_(?:WALL|INTERIOR)|geodeInterior/);
assert.doesNotMatch(lightConfig, /geodeTileLights/);
assert.doesNotMatch(caveVisuals, /caveGeodeCrystalTemplates|\.geodeZones/);
assert.doesNotMatch(assetKeys, /geodeInterior/);
assert.doesNotMatch(exporter, /TILE_TYPE_GEODE/);

console.log("GEODE_RETIREMENT_CONTRACT_OK");
