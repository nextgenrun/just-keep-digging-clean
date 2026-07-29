import assert from "node:assert/strict";
import { CAVE_SCENE_CONFIG } from "../values/caveSceneConfig.js";
import { GAME_CONFIG } from "../values/gameConfig.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { CaveWorldModel, makeCaveTileSaveKey } from "../world/model/CaveWorldModel.js";
import { WorldModel } from "../world/model/WorldModel.js";
import { CaveEntryController } from "../world/playScene/CaveEntryController.js";

const world = new WorldModel(GAME_CONFIG);
const controller = new CaveEntryController({ worldModel: world });
const health = controller.getHealthSnapshot();

assert.ok(health.entranceZones > 1, "production must expose multiple cave mouths");
assert.ok(health.usableEntrances >= 20, "production must retain a meaningful safe-mouth route");
assert.equal(
  health.interactiveEntrances,
  health.usableEntrances,
  "every safe approved Level One mouth must be enterable",
);
assert.ok(
  world.caveZones
    .filter(zone => controller._isInteractiveZone(zone))
    .every(zone => !world.isSolid(zone.entry.tx, zone.entry.ty)
      && world.isSolid(zone.entry.tx, zone.entry.ty + 1)),
  "interactive cave mouths must have open admission and a supporting floor",
);

const grid = CAVE_SCENE_CONFIG.grid;
for (const [archetypeId, interior] of Object.entries(CAVE_SCENE_CONFIG.interiors)) {
  const caveId = `repair-${archetypeId}`;
  const runtime = {
    caveId,
    floorRow: grid.floorRow,
    boundaryThicknessTiles: grid.boundaryThicknessTiles,
    safeFloorTileXs: grid.safeFloorTileXs,
    floorResourceKeys: grid.floorResourceKeys,
    resourcePool: ["copper", "iron", "bronze"],
    nodeLayout: CAVE_SCENE_CONFIG.rewards.nodeLayout,
    signatureNode: grid.signatureNode,
    signatureTileTypeKey: interior.signatureTileTypeKey,
    collectedTileKeys: [],
  };
  const model = new CaveWorldModel({
    ...GAME_CONFIG,
    seed: 991,
    worldWidthTiles: grid.widthTiles,
    worldDepthTiles: grid.heightTiles,
    worldWidthPx: grid.widthTiles * GAME_CONFIG.tileSize,
    worldDepthPx: grid.heightTiles * GAME_CONFIG.tileSize,
    topAirRows: -120,
    caveRuntime: runtime,
  });
  const signatureType = TILE_TYPES[interior.signatureTileTypeKey];
  assert.equal(
    model.getTileType(grid.signatureNode.tx, grid.signatureNode.ty),
    signatureType,
    `${archetypeId} must place its signature reward`,
  );
  assert.equal(
    model.isDiggable(grid.signatureNode.tx, grid.signatureNode.ty),
    true,
    `${archetypeId} signature reward must use normal mining gameplay`,
  );

  const restored = new CaveWorldModel({
    ...model.config,
    caveRuntime: {
      ...runtime,
      collectedTileKeys: [
        makeCaveTileSaveKey(caveId, grid.signatureNode.tx, grid.signatureNode.ty),
      ],
    },
  });
  assert.equal(
    restored.getTileType(grid.signatureNode.tx, grid.signatureNode.ty),
    TILE_TYPES.AIR,
    `${archetypeId} signature reward must stay collected after re-entry`,
  );
}

console.log("multi-cave entrance repair contract passed", health);
