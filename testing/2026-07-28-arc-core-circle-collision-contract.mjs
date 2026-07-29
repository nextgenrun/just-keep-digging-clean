import assert from "node:assert/strict";
import fs from "node:fs";

import {
  circleIntersectsRect,
} from "../systems/mining/collisionShapeMath.js";
import { TileCollisionSystem } from "../systems/mining/TileCollisionSystem.js";
import {
  applyBodyCollisionProfile,
  captureBodyCollisionProfile,
  resolveArcCoreCollisionProfile,
} from "../systems/vehicles/arcCoreCollisionProfile.js";

const pack = JSON.parse(
  fs.readFileSync(new URL("../values/arcCoreVisuals.sprite.json", import.meta.url)),
);
const meta = pack.spriteMeta;
const small = resolveArcCoreCollisionProfile(meta.modes.arcCoreSmall, meta);
const omega = resolveArcCoreCollisionProfile(meta.modes.arcCoreOmega, meta);

assert.equal(small.kind, "circle");
assert.equal(small.diameterPx, 104);
assert.equal(small.radiusPx, 52);
assert.equal(omega.kind, "circle");
assert.equal(omega.diameterPx, 416);
assert.equal(omega.radiusPx, 208);
assert.deepEqual(small.centerPx, meta.anchorPx);
assert.deepEqual(omega.centerPx, meta.anchorPx);

const body = {
  x: 100,
  y: 200,
  w: 32,
  h: 48,
  collisionKind: "rect",
  collisionRadiusPx: null,
};
const humanProfile = captureBodyCollisionProfile(body);
assert.equal(applyBodyCollisionProfile(body, small), true);
assert.deepEqual(
  {
    x: body.x,
    y: body.y,
    w: body.w,
    h: body.h,
    kind: body.collisionKind,
  },
  { x: 64, y: 144, w: 104, h: 104, kind: "circle" },
);
assert.equal(applyBodyCollisionProfile(body, humanProfile), true);
assert.deepEqual(
  {
    x: body.x,
    y: body.y,
    w: body.w,
    h: body.h,
    kind: body.collisionKind,
  },
  { x: 100, y: 200, w: 32, h: 48, kind: "rect" },
);

assert.equal(
  circleIntersectsRect(150, 150, 50, 200, 100, 300, 200),
  false,
  "a tangent circle must not penetrate the neighboring tile",
);
assert.equal(
  circleIntersectsRect(170, 150, 50, 200, 100, 300, 200),
  true,
  "side penetration must be detected",
);
assert.equal(
  circleIntersectsRect(150, 150, 50, 200, 200, 300, 300),
  false,
  "empty circular corners must not collide like an AABB",
);

const solids = new Set(["2,1"]);
const world = {
  isSolid: (tx, ty) => solids.has(`${tx},${ty}`),
};
const collision = new TileCollisionSystem(world, {
  tileSize: 100,
  topAirRows: -100,
});
const circleBody = {
  x: 100,
  y: 100,
  w: 100,
  h: 100,
  vx: 20,
  vy: 0,
  onGround: false,
  collisionKind: "circle",
  collisionRadiusPx: 50,
};

assert.equal(collision.isBodyOverlappingSolid(circleBody), false);
assert.equal(collision.moveAndCollideX(circleBody, 20), true);
assert.ok(Math.abs(circleBody.x - 100) < 0.001);
assert.equal(circleBody.vx, 0);

solids.clear();
solids.add("1,2");
assert.equal(collision.isOnGround(circleBody), true);

console.log("Arc Core circle collision contract: PASS");
