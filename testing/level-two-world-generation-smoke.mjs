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
assert.equal(world.getTileType(20, 3000), TILE_TYPES.BEDROCK, "Level One must end at its existing boundary");

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

const divider = SECOND_WORLD_CONFIG.undergroundDivider;
for (const ty of [divider.startTileY, 100, 500, 1000, 1999, 2000, 3000, world.depthTiles - 1]) {
  assert.equal(
    world.getTileType(divider.tileX, ty),
    TILE_TYPES.BEDROCK,
    `Level 1/2 divider tile ${divider.tileX},${ty} must be bedrock`,
  );
  assert.equal(
    world.isDiggable(divider.tileX, ty),
    false,
    `Level 1/2 divider tile ${divider.tileX},${ty} must be unbreakable`,
  );
}
assert.equal(
  world.getTileType(divider.tileX, divider.startTileY - 1),
  TILE_TYPES.AIR,
  "The divider must leave the surface bridge passage open for the upgrade-controlled door",
);
assert.notEqual(
  world.getTileType(divider.tileX + 1, divider.startTileY),
  TILE_TYPES.BEDROCK,
  "The divider must remain one tile wide so Level Two terrain stays playable",
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
