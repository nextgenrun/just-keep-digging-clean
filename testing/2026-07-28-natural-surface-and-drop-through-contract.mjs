import assert from "node:assert/strict";
import { GAME_CONFIG } from "../values/gameConfig.js";
import {
  PLAYER_COLLISION_CONFIG,
  resolveSurfaceDropThroughEnabled,
} from "../values/playerCollision.js";
import { SECOND_WORLD_CONFIG } from "../values/secondWorldConfig.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { UAL_NATIVE_PLAYER_ASSET_PROFILE } from "../values/ualNativePlayerAssetProfile.js";
import { WORLD_VISUAL_SURFACE_PROP_ASSETS } from "../values/worldVisualSurfacePropAssets.js";
import {
  TITAN_SURFACE_GALLERY_CLEAR_ZONE,
  TITAN_SURFACE_STATUE_CLEAR_ZONES,
  WORLD_VISUAL_SURFACE_PROP_LAYOUT,
} from "../values/worldVisualSurfacePropLayout.js";
import { WORLD_VISUAL_SURFACE_PROPS } from "../values/worldVisualSurfaceProps.js";
import { PlayerPhysicsBody } from "../player/PlayerPhysicsBody.js";
import { PlayerSurfaceDropController } from "../player/PlayerSurfaceDropController.js";
import { TileCollisionSystem } from "../systems/mining/TileCollisionSystem.js";
import { prepareOpeningFlightStarterSeam } from
  "../systems/onboarding/OpeningFlightStarterSeam.js";
import { WorldModel } from "../world/model/WorldModel.js";
import {
  resolveSurfacePropDisplayGeometry,
  resolveSurfacePropScaleMultiplier,
} from "../world/rendering/scenic-world/surfacePropGeometry.js";

const surfaceRow = GAME_CONFIG.topAirRows;
const tileSize = GAME_CONFIG.tileSize;
const placements = WORLD_VISUAL_SURFACE_PROP_LAYOUT.placements;

assert.deepEqual(
  [...new Set(placements.map(item => item.sizeVariant))].sort(),
  ["large", "small", "standard"],
);
const levelOnePlacements = placements.filter(item => item.level === "level1");
assert.equal(levelOnePlacements.length, 12);
assert.ok(levelOnePlacements.every(item => item.id.startsWith("l1-titan-gap-")));
assert.ok(levelOnePlacements.every(item => item.lane !== "front"));
assert.deepEqual(
  [...new Set(levelOnePlacements.map(item => item.assetId))].sort(),
  ["bench", "fence", "handcart", "lantern", "plants", "supplies"],
  "the Titan promenade reuses only the existing low prop library",
);
const levelOnePositions = levelOnePlacements
  .map(item => item.tileX)
  .sort((left, right) => left - right);
const levelOneGaps = levelOnePositions
  .slice(1)
  .map((position, index) => position - levelOnePositions[index]);
assert.ok(Math.min(...levelOneGaps) >= 3.4 - 1e-9);
assert.ok(Math.max(...levelOneGaps) >= 6.8 - 1e-9);
for (const level of ["level2"]) {
  const positions = placements
    .filter(item => item.level === level)
    .map(item => item.tileX)
    .sort((left, right) => left - right);
  const gaps = positions.slice(1).map((position, index) => position - positions[index]);
  assert.ok(new Set(gaps.map(gap => gap.toFixed(1))).size >= 8, `${level} spacing must vary`);
  assert.ok(Math.min(...gaps) <= 1.5, `${level} needs clustered prop moments`);
  assert.ok(Math.max(...gaps) >= 4.5, `${level} needs deliberate breathing space`);
}
for (const item of levelOnePlacements) {
  const scale = resolveSurfacePropScaleMultiplier(item, WORLD_VISUAL_SURFACE_PROPS);
  const geometry = resolveSurfacePropDisplayGeometry(
    WORLD_VISUAL_SURFACE_PROP_ASSETS[item.level][item.assetId],
    tileSize,
    UAL_NATIVE_PLAYER_ASSET_PROFILE,
    scale,
  );
  const left = item.tileX - geometry.widthTiles / 2;
  const right = item.tileX + geometry.widthTiles / 2;
  assert.ok(
    left > TITAN_SURFACE_GALLERY_CLEAR_ZONE.leftTile
      && right < TITAN_SURFACE_GALLERY_CLEAR_ZONE.rightTile,
    `${item.id} must remain inside the Titan promenade`,
  );
  const blockedPlinth = TITAN_SURFACE_STATUE_CLEAR_ZONES.find(zone => (
    right > zone.leftTile && left < zone.rightTile
  ));
  assert.equal(blockedPlinth, undefined, `${item.id} must stay between plinths`);
  const blockedGameplay = WORLD_VISUAL_SURFACE_PROP_LAYOUT.protectedClearZones
    .filter(zone => !zone.id.startsWith("titan-plinth-"))
    .find(zone => (
      (!zone.levels || zone.levels.includes(item.level))
      && right > zone.leftTile
      && left < zone.rightTile
    ));
  assert.equal(blockedGameplay, undefined, `${item.id} must preserve gameplay gates`);
}

function createWorld(surfaceType, belowType, lowerType = TILE_TYPES.DIRT) {
  return {
    inBounds: (tx, ty) => tx >= 0 && tx < 280 && ty >= 0 && ty < 200,
    getTileType(_tx, ty) {
      if (ty < surfaceRow) return TILE_TYPES.AIR;
      if (ty === surfaceRow) return surfaceType;
      if (ty === surfaceRow + 1) return belowType;
      return lowerType;
    },
    isSolid(tx, ty) {
      return this.inBounds(tx, ty) && this.getTileType(tx, ty) !== TILE_TYPES.AIR;
    },
  };
}

function createStandingBody(tileX = 132) {
  return new PlayerPhysicsBody(
    GAME_CONFIG,
    tileX * tileSize + tileSize / 2 - GAME_CONFIG.playerBodyWidthPx / 2,
    surfaceRow * tileSize - GAME_CONFIG.playerBodyHeightPx,
  );
}

assert.equal(resolveSurfaceDropThroughEnabled(PLAYER_COLLISION_CONFIG, ""), true);
assert.equal(
  resolveSurfaceDropThroughEnabled(PLAYER_COLLISION_CONFIG, "?surfaceDrop=0"),
  false,
);

const openWorld = createWorld(
  TILE_TYPES.FLOOR_TOWN_2,
  TILE_TYPES.AIR,
  TILE_TYPES.DIRT,
);
const collision = new TileCollisionSystem(openWorld, GAME_CONFIG);
const body = createStandingBody();
assert.equal(collision.isOnGround(body), true);
body.vx = tileSize * 2;
assert.equal(collision.tryBeginSurfaceDropThrough(body, surfaceRow), true);
assert.equal(body.surfaceDropThroughRow, surfaceRow);
assert.equal(body.vx, tileSize * 2, "moving surface drops must preserve horizontal velocity");
assert.ok(
  body.vy >= PLAYER_COLLISION_CONFIG.surfaceDropThrough.minimumDownVelocityTilesPerSecond
    * tileSize,
);
assert.equal(collision.isOnGround(body), false);
collision.moveAndCollideY(body, tileSize * 2 + 2);
assert.equal(body.surfaceDropThroughRow, null);
assert.equal(body.onGround, true);
assert.equal(body.y, (surfaceRow + 2) * tileSize - body.h);
assert.equal(body.vx, tileSize * 2);

const solidBelowCollision = new TileCollisionSystem(
  createWorld(TILE_TYPES.FLOOR_TOWN_1, TILE_TYPES.DIRT),
  GAME_CONFIG,
);
assert.equal(
  solidBelowCollision.tryBeginSurfaceDropThrough(createStandingBody(), surfaceRow),
  false,
  "S must not pass through when the first underground row is occupied",
);

const bedrockCollision = new TileCollisionSystem(
  createWorld(TILE_TYPES.BEDROCK, TILE_TYPES.AIR),
  GAME_CONFIG,
);
assert.equal(
  bedrockCollision.tryBeginSurfaceDropThrough(createStandingBody(), surfaceRow),
  false,
  "S must never bypass bedrock",
);

const virtualSurfaceCollision = new TileCollisionSystem(
  createWorld(TILE_TYPES.AIR, TILE_TYPES.AIR),
  GAME_CONFIG,
);
const virtualBody = createStandingBody();
virtualBody.y -= 3;
virtualBody.vy = tileSize;
virtualSurfaceCollision.moveAndCollideY(virtualBody, 6);
assert.equal(virtualBody.y, surfaceRow * tileSize - virtualBody.h);
assert.equal(virtualBody.onGround, true, "dug top cells retain one-way surface support");

let controllerCalls = 0;
const controller = new PlayerSurfaceDropController(
  { consumeSurfaceDropInput: () => true },
  {
    tryBeginSurfaceDropThrough(receivedBody, receivedRow) {
      assert.equal(receivedBody, virtualBody);
      assert.equal(receivedRow, surfaceRow);
      controllerCalls += 1;
      return true;
    },
    cancelSurfaceDropThrough: () => {
      controllerCalls += 1;
    },
  },
  virtualBody,
  surfaceRow,
);
assert.equal(controller.update(), true);
controller.reset();
assert.equal(controllerCalls, 2);

const productionWorld = new WorldModel(GAME_CONFIG);
for (let tx = 0; tx < productionWorld.widthTiles; tx += 1) {
  const isDemoLevelTwoBoundary = tx === SECOND_WORLD_CONFIG.runtimeArea.leftTile;
  if (isDemoLevelTwoBoundary) {
    assert.equal(
      productionWorld.getTileType(tx, surfaceRow),
      TILE_TYPES.BEDROCK,
      "demo Level-Two exclusion wall must remain solid at the surface",
    );
    assert.equal(
      productionWorld.getTileType(tx, surfaceRow + 1),
      TILE_TYPES.BEDROCK,
      "demo Level-Two exclusion wall must remain continuous below the surface",
    );
    continue;
  }
  assert.ok(
    productionWorld.getTileType(tx, surfaceRow) === TILE_TYPES.FLOOR_TOWN_1
      || productionWorld.getTileType(tx, surfaceRow) === TILE_TYPES.FLOOR_TOWN_2,
    `surface cell ${tx},${surfaceRow} must be dedicated one-way ground`,
  );
  assert.equal(
    productionWorld.getTileType(tx, surfaceRow + 1),
    TILE_TYPES.AIR,
    `surface clearance cell ${tx},${surfaceRow + 1} must be completely empty`,
  );
}
assert.equal(
  productionWorld.getTileType(
    SECOND_WORLD_CONFIG.levelDivider.tileX,
    surfaceRow + 1,
  ),
  TILE_TYPES.BEDROCK,
  "the demo Level-Two exclusion wall intentionally seals the shared clearance row",
);

const productionSpawnBody = createStandingBody(GAME_CONFIG.playerSpawnTileX);
const productionCollision = new TileCollisionSystem(productionWorld, GAME_CONFIG);
assert.equal(
  productionCollision.tryBeginSurfaceDropThrough(productionSpawnBody, surfaceRow),
  true,
  "S must release the real generated surface at the player spawn",
);
productionCollision.moveAndCollideY(productionSpawnBody, tileSize * 2 + 2);
assert.equal(productionSpawnBody.surfaceDropThroughRow, null);
assert.equal(productionSpawnBody.onGround, true);
assert.equal(
  productionSpawnBody.y,
  (surfaceRow + 2) * tileSize - productionSpawnBody.h,
  "the player must land on terrain beneath one complete clearance row",
);

const upwardBody = createStandingBody(GAME_CONFIG.playerSpawnTileX);
upwardBody.y = (surfaceRow + 1) * tileSize + 2;
upwardBody.vy = -tileSize * 5;
const upwardTargetY = surfaceRow * tileSize - upwardBody.h - 2;
assert.equal(
  productionCollision.moveAndCollideY(
    upwardBody,
    upwardTargetY - upwardBody.y,
  ),
  false,
  "upward flight must pass through the Town Square platform without a ceiling hit",
);
assert.ok(
  Math.abs(upwardBody.y - upwardTargetY) < 0.001,
  "upward traversal must reach the requested position without collision correction",
);
assert.equal(upwardBody.vy, -tileSize * 5);
assert.equal(productionCollision.isHittingCeiling(upwardBody), false);
upwardBody.vy = tileSize * 5;
assert.equal(
  productionCollision.moveAndCollideY(upwardBody, tileSize),
  true,
  "the same one-way platform must still catch a player descending from above",
);
assert.equal(upwardBody.y, surfaceRow * tileSize - upwardBody.h);
assert.equal(upwardBody.onGround, true);

assert.equal(
  productionWorld.setRubbleTile(
    GAME_CONFIG.playerSpawnTileX,
    surfaceRow + 1,
    TILE_TYPES.DIRT,
  ),
  null,
  "legacy rubble saves may not repopulate the surface-clearance row",
);
assert.equal(
  productionWorld.getTileType(GAME_CONFIG.playerSpawnTileX, surfaceRow + 1),
  TILE_TYPES.AIR,
);

const openingSeamX = GAME_CONFIG.spawnTileX;
prepareOpeningFlightStarterSeam(
  {
    config: GAME_CONFIG,
    worldModel: productionWorld,
    worldRenderer: { applyTileUpdate() {} },
  },
  {
    starterSeam: {
      tileXOffsetFromLegacySpawn: 0,
      surfaceRowOffset: 0,
      tileTypeNames: ["DIRT", "STONE"],
      tileHp: 1,
      bottomTileTypeName: "BEDROCK",
      bottomDepthTiles: 3,
    },
  },
);
assert.ok(
  productionWorld.getTileType(openingSeamX, surfaceRow) === TILE_TYPES.FLOOR_TOWN_1
    || productionWorld.getTileType(openingSeamX, surfaceRow) === TILE_TYPES.FLOOR_TOWN_2,
  "opening-flight setup may not remove the shared Town Square platform",
);
assert.equal(
  productionWorld.getTileType(openingSeamX, surfaceRow + 1),
  TILE_TYPES.AIR,
  "opening-flight setup may not refill the shared clearance row",
);

const findSurfaceX = type => Array.from(
  { length: productionWorld.widthTiles },
  (_, tx) => tx,
).find(tx => productionWorld.getTileType(tx, surfaceRow) === type);
const floorOneX = findSurfaceX(TILE_TYPES.FLOOR_TOWN_1);
const floorTwoX = findSurfaceX(TILE_TYPES.FLOOR_TOWN_2);
assert.ok(Number.isInteger(floorOneX));
assert.ok(Number.isInteger(floorTwoX));
const protectedSurfaceKeys = [`${floorOneX},${surfaceRow}`, `${floorTwoX},${surfaceRow}`];
assert.deepEqual(productionWorld.applyDugTileKeys(protectedSurfaceKeys), []);
assert.equal(productionWorld.getTileType(floorOneX, surfaceRow), TILE_TYPES.FLOOR_TOWN_1);
assert.equal(productionWorld.getTileType(floorTwoX, surfaceRow), TILE_TYPES.FLOOR_TOWN_2);

console.log("Natural surface foundation and conditional S drop-through contract passed");
