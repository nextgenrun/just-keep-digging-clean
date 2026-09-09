import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { PlayerPhysicsBody } from "../player/PlayerPhysicsBody.js";
import { TileCollisionSystem } from "../systems/mining/TileCollisionSystem.js";
import {
  PLAYER_COLLISION_CONFIG,
  PLAYER_COLLISION_POLISH_V2,
} from "../values/playerCollision.js";
import { UAL_NATIVE_PLAYER_ASSET_PROFILE } from "../values/ualNativePlayerAssetProfile.js";

const TILE_SIZE = 94;
const solids = new Set();
for (let ty = 0; ty < 3; ty += 1) {
  for (let tx = 0; tx < 3; tx += 1) solids.add(`${tx},${ty}`);
}
const world = {
  isSolid: (tx, ty) => solids.has(`${tx},${ty}`),
};
const config = {
  tileSize: TILE_SIZE,
  playerBodyWidthPx: UAL_NATIVE_PLAYER_ASSET_PROFILE.playerBodyWidthPx,
  playerBodyHeightPx: UAL_NATIVE_PLAYER_ASSET_PROFILE.playerBodyHeightPx,
  gravityY: 0,
  maxFallSpeedPxPerSec: TILE_SIZE * 30,
  walkSpeedPxPerSec: TILE_SIZE * 2,
};
const collision = new TileCollisionSystem(world, config);
const body = new PlayerPhysicsBody(config, -TILE_SIZE, TILE_SIZE);
body.setCollisionValidator((candidate) => collision.resolveBodyOverlap(candidate));

assert.equal(PLAYER_COLLISION_CONFIG.rollbackFailedOverlaps, true);
assert.equal(collision.resolveBodyOverlap(body), true);
const initialSafe = body.getCollisionSafeStateSnapshot();
assert.ok(initialSafe);

body.vx = TILE_SIZE;
body.vy = TILE_SIZE;
assert.equal(body.setPosition(TILE_SIZE + 10, TILE_SIZE + 10), false);
assert.equal(body.x, initialSafe.profile.x);
assert.equal(body.y, initialSafe.profile.y);
assert.equal(body.vx, 0);
assert.equal(body.vy, 0);
assert.equal(collision.isBodyOverlappingSolid(body), false);

assert.equal(body.setPosition(-TILE_SIZE, 0), true);
body.forceRectProfile("crouch", PLAYER_COLLISION_POLISH_V2.profiles.crouch);
assert.equal(collision.resolveBodyOverlap(body), true);
const newestSafe = body.getCollisionSafeStateSnapshot();
body.x = TILE_SIZE + 10;
body.y = TILE_SIZE + 10;
assert.equal(collision.resolveBodyOverlap(body), false);
assert.equal(body.x, newestSafe.profile.x);
assert.equal(body.y, newestSafe.profile.y);
assert.equal(body.collisionProfileId, "crouch");
assert.equal(body.w, PLAYER_COLLISION_POLISH_V2.profiles.crouch.widthPx);
assert.equal(body.h, PLAYER_COLLISION_POLISH_V2.profiles.crouch.heightPx);
assert.equal(collision.isBodyOverlappingSolid(body), false);

const singleTileWorld = {
  isSolid: (tx, ty) => tx === 1 && ty === 1,
};
const recoverableCollision = new TileCollisionSystem(singleTileWorld, config);
const recoverableBody = new PlayerPhysicsBody(config, 0, TILE_SIZE);
recoverableBody.setCollisionValidator(
  (candidate) => recoverableCollision.resolveBodyOverlap(candidate),
);
assert.equal(recoverableCollision.resolveBodyOverlap(recoverableBody), true);
const beforeRecoverablePlacement = recoverableBody.getCollisionSafeStateSnapshot();
assert.equal(recoverableBody.setPosition(TILE_SIZE + 10, TILE_SIZE + 10), true);
assert.notEqual(recoverableBody.x, beforeRecoverablePlacement.profile.x);
assert.equal(recoverableCollision.isBodyOverlappingSolid(recoverableBody), false);

const controllerSource = readFileSync(
  new URL("../player/PlayerController.js", import.meta.url),
  "utf8",
);
const standOffSource = readFileSync(
  new URL("../player/MovingSideDigStandOffController.js", import.meta.url),
  "utf8",
);
const ledgeSource = readFileSync(
  new URL("../player/PlayerLedgeAssist.js", import.meta.url),
  "utf8",
);
const gameplaySource = readFileSync(
  new URL("../world/playScene/PlaySceneGameplay.js", import.meta.url),
  "utf8",
);

assert.match(controllerSource, /setCollisionValidator/);
assert.ok((controllerSource.match(/_validateCollisionSafety\(\);/g) || []).length >= 3);
assert.match(controllerSource, /if \(placed === false\) return false;/);
assert.match(standOffSource, /body\.setPosition\(boundaryX, body\.y\)/);
assert.doesNotMatch(standOffSource, /if \(tooClose\) body\.x = boundaryX/);
assert.match(ledgeSource, /setPosition\(ledge\.hangX, ledge\.hangY\) === false/);
assert.match(gameplaySource, /if \(placed === false\) return false;/);

console.log(JSON.stringify({
  result: "PLAYER_COLLISION_ROLLBACK_CONTRACT_OK",
  safeFaceRecoveryPreserved: true,
  failedRecoveryRolledBack: true,
  directMutationRolledBack: true,
  scriptedPlacementsGuarded: true,
}, null, 2));
