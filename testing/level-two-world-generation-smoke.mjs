import assert from "node:assert/strict";
import { GAME_CONFIG } from "../values/gameConfig.js";
import { SECOND_WORLD_CONFIG } from "../values/secondWorldConfig.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { WorldModel } from "../world/WorldModel.js";

const world = new WorldModel(GAME_CONFIG);
const secondWorldResourceTypes = new Set([
  TILE_TYPES.LAVA_DIRT,
  TILE_TYPES.OBSIDIAN,
  TILE_TYPES.EMBER_ORE,
  TILE_TYPES.MAGMA_CRYSTAL,
]);
assert.equal(world.depthTiles, 5065);
assert.notEqual(
  world.getTileType(20, 3000),
  TILE_TYPES.BEDROCK,
  "Deep Level One terrain must remain mineable instead of becoming a bedrock seal",
);

const levelTwoSurfaceY = SECOND_WORLD_CONFIG.entry.floorY;
for (const tx of [151, 200, 279]) {
  assert.notEqual(world.getTileType(tx, levelTwoSurfaceY), TILE_TYPES.BEDROCK,
    `Level Two surface tile ${tx},${levelTwoSurfaceY} must not be bedrock`);
  assert.equal(world.isDiggable(tx, levelTwoSurfaceY), true,
    `Level Two surface tile ${tx},${levelTwoSurfaceY} must be diggable`);
}
assert.equal(
  world.getTileType(
    Math.max(SECOND_WORLD_CONFIG.entry.bridgeStartX, SECOND_WORLD_CONFIG.runtimeArea.leftTile),
    levelTwoSurfaceY,
  ),
  TILE_TYPES.FLOOR_TOWN_2,
  "Level Two entry bridge must remain a safe floor",
);

const divider = SECOND_WORLD_CONFIG.levelDivider;
for (let ty = divider.topTileY; ty < world.depthTiles; ty += 1) {
  const expectedType = ty === divider.floorTileY
    ? TILE_TYPES.FLOOR_TOWN_2
    : TILE_TYPES.BEDROCK;
  assert.equal(
    world.getTileType(divider.tileX, ty),
    expectedType,
    `Level 1/2 divider tile ${divider.tileX},${ty} must remain unbreakable`,
  );
  assert.equal(
    world.isDiggable(divider.tileX, ty),
    false,
    `Level 1/2 divider tile ${divider.tileX},${ty} must be unbreakable`,
  );
}
assert.equal(
  world.getTileType(divider.tileX, divider.gateTopTileY),
  TILE_TYPES.BEDROCK,
  "The Level 2 gate cell must start locked",
);
assert.equal(
  world.getTileType(divider.legacyGateTileX, divider.gateTopTileY),
  TILE_TYPES.AIR,
  "The obsolete x119 gate cell must be open after the gate moves onto the divider",
);
assert.equal(
  world.getTileType(divider.tileX, divider.floorTileY + 1),
  TILE_TYPES.BEDROCK,
  "The divider must continue immediately beneath the bridge floor",
);
assert.equal(
  world.getTileType(divider.tileX, divider.topTileY),
  TILE_TYPES.BEDROCK,
  "The divider must reach the very top of the map",
);
assert.notEqual(
  world.getTileType(divider.tileX + 1, divider.floorTileY + 1),
  TILE_TYPES.BEDROCK,
  "The divider must remain one tile wide so Level Two terrain stays playable",
);

let strayUndergroundBedrock = 0;
for (let ty = world.topAirRows + 1; ty < world.depthTiles; ty += 1) {
  for (let tx = 0; tx < world.widthTiles; tx += 1) {
    if (world.getTileType(tx, ty) !== TILE_TYPES.BEDROCK) continue;
    if (tx === divider.tileX && ty >= divider.topTileY) continue;
    strayUndergroundBedrock += 1;
  }
}
assert.equal(
  strayUndergroundBedrock,
  0,
  "The Level 1/2 divider must be the only underground bedrock on the map",
);

let secondWorldResources = 0;
for (let ty = 2000; ty < world.depthTiles; ty += 37) {
  for (let tx = 132; tx < world.widthTiles; tx += 7) {
    if (secondWorldResourceTypes.has(world.getTileType(tx, ty))) {
      secondWorldResources += 1;
    }
  }
}

assert.ok(secondWorldResources > 500, "Level Two deep samples should render its resource tile types");
console.log(`level-two-world-generation-smoke: ok (${secondWorldResources} sampled resource tiles)`);
