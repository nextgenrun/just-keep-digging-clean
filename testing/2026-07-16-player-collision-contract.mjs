import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { PlayerState } from "../player/PlayerState.js";
import { TileCollisionSystem } from "../systems/mining/TileCollisionSystem.js";
import { UAL_NATIVE_PLAYER_ASSET_PROFILE } from "../values/ualNativePlayerAssetProfile.js";

const TILE_SIZE = 94;
const createWorld = (solidKeys) => ({
  isSolid: (tx, ty) => solidKeys.has([tx, ty].join(",")),
});
const createBody = (overrides = {}) => ({
  x: 0,
  y: 0,
  w: UAL_NATIVE_PLAYER_ASSET_PROFILE.playerBodyWidthPx,
  h: UAL_NATIVE_PLAYER_ASSET_PROFILE.playerBodyHeightPx,
  vx: 0,
  vy: 0,
  onGround: false,
  resetVelocity() { this.vx = 0; this.vy = 0; },
  ...overrides,
});

assert.equal(UAL_NATIVE_PLAYER_ASSET_PROFILE.playerBodyWidthPx, 31);
assert.equal(UAL_NATIVE_PLAYER_ASSET_PROFILE.playerBodyHeightPx, 75);
assert.equal(
  Math.round(
    UAL_NATIVE_PLAYER_ASSET_PROFILE.displaySizePx
      * UAL_NATIVE_PLAYER_ASSET_PROFILE.referenceIdleVisibleWidthPx
      / UAL_NATIVE_PLAYER_ASSET_PROFILE.frameWidth,
  ),
  UAL_NATIVE_PLAYER_ASSET_PROFILE.playerBodyWidthPx,
);

const rightWall = new TileCollisionSystem(createWorld(new Set(["2,0"])), { tileSize: TILE_SIZE });
const movingRight = createBody({ x: 0, y: 10, vx: 6000 });
assert.equal(rightWall.moveAndCollideX(movingRight, 300), true);
assert.equal(movingRight.x, TILE_SIZE * 2 - movingRight.w);
assert.equal(movingRight.vx, 0);
assert.equal(rightWall.isBodyOverlappingSolid(movingRight), false);

const leftWall = new TileCollisionSystem(createWorld(new Set(["0,0"])), { tileSize: TILE_SIZE });
const movingLeft = createBody({ x: TILE_SIZE * 2, y: 10, vx: -6000 });
assert.equal(leftWall.moveAndCollideX(movingLeft, -300), true);
assert.equal(movingLeft.x, TILE_SIZE);
assert.equal(leftWall.isBodyOverlappingSolid(movingLeft), false);

const floor = new TileCollisionSystem(createWorld(new Set(["0,1"])), { tileSize: TILE_SIZE });
const falling = createBody({ x: 30, y: -100, vy: 6000 });
assert.equal(floor.moveAndCollideY(falling, 300), true);
assert.equal(falling.y, TILE_SIZE - falling.h);
assert.equal(falling.vy, 0);
assert.equal(falling.onGround, true);
assert.equal(floor.isOnGround(falling), true);

const ceiling = new TileCollisionSystem(createWorld(new Set(["0,0"])), { tileSize: TILE_SIZE });
const rising = createBody({ x: 30, y: TILE_SIZE * 2, vy: -6000 });
assert.equal(ceiling.moveAndCollideY(rising, -200), true);
assert.equal(rising.y, TILE_SIZE);
assert.equal(rising.vy, 0);
assert.equal(ceiling.isHittingCeiling(rising), true);

const overlapSolver = new TileCollisionSystem(createWorld(new Set(["1,1"])), { tileSize: TILE_SIZE });
const overlapping = createBody({ x: 70, y: 100, vx: 50 });
assert.equal(overlapSolver.isBodyOverlappingSolid(overlapping), true);
assert.equal(overlapSolver.resolveBodyOverlap(overlapping), true);
assert.equal(overlapping.x, TILE_SIZE - overlapping.w);
assert.equal(overlapSolver.isBodyOverlappingSolid(overlapping), false);
assert.equal(overlapping.vx, 0);

const straddledFloorWorld = createWorld(new Set(["0,1"]));
const straddled = createBody({ x: 80, y: TILE_SIZE - 75 });
const playerState = new PlayerState(straddled, straddledFloorWorld, { tileSize: TILE_SIZE }, null);
playerState.update(0, { getHorizontalMovement: () => ({ left: false, right: false }) }, {});
assert.equal(playerState.isGrounded(), true);
assert.equal(straddled.onGround, true);
straddled.y -= 2;
playerState.refreshAfterPhysics(
  { getHorizontalMovement: () => ({ left: false, right: false }) },
  {},
  new TileCollisionSystem(straddledFloorWorld, { tileSize: TILE_SIZE }),
);
assert.equal(playerState.isGrounded(), false);

const movementSource = readFileSync(new URL("../player/PlayerMovement.js", import.meta.url), "utf8");
const controllerSource = readFileSync(new URL("../player/PlayerController.js", import.meta.url), "utf8");
assert.match(movementSource, /resolveBodyOverlap/);
assert.match(controllerSource, /resolveBodyOverlap/);

console.log(JSON.stringify({
  result: "PLAYER_COLLISION_CONTRACT_OK",
  collider: [
    UAL_NATIVE_PLAYER_ASSET_PROFILE.playerBodyWidthPx,
    UAL_NATIVE_PLAYER_ASSET_PROFILE.playerBodyHeightPx,
  ].join("x"),
  sweptHorizontal: true,
  sweptVertical: true,
  overlapRecovery: true,
  straddledGroundProbe: true,
}, null, 2));
