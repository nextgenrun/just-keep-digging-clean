import assert from "node:assert/strict";
import fs from "node:fs";

import { ARC_CORE_CONFIG } from "../values/arcCoreConfig.js";
import { ARC_CORE_VISUAL_CONFIG } from "../values/arcCoreVisualConfig.js";
import { GAME_CONFIG } from "../values/gameConfig.js";
import { circleIntersectsRect } from "../systems/mining/collisionShapeMath.js";
import { resolveArcCoreDigFootprint } from "../systems/vehicles/arcCoreDigFootprint.js";
import { resolveArcCoreCollisionProfile } from "../systems/vehicles/arcCoreCollisionProfile.js";
import {
  countArcCoreMineTiles,
  createArcCoreTestMine,
} from "./animation-sandbox/tanktest-v1/arcCoreTestMine.js";

const TILE = Object.freeze({
  AIR: 0,
  DIRT: 1,
  STONE: 2,
  FLOOR: 3,
  BEDROCK: 4,
});
const TILE_SIZE = GAME_CONFIG.tileSize;
const HIT_EPSILON = 0.001;
const stage = ARC_CORE_VISUAL_CONFIG.reviewStage;
const mine = stage.mine;
const pack = JSON.parse(
  fs.readFileSync(new URL("../values/arcCoreVisuals.sprite.json", import.meta.url)),
);
const smallCollision = resolveArcCoreCollisionProfile(
  pack.spriteMeta.modes.arcCoreSmall,
  pack.spriteMeta,
);
const omegaCollision = resolveArcCoreCollisionProfile(
  pack.spriteMeta.modes.arcCoreOmega,
  pack.spriteMeta,
);
const sandbox = fs.readFileSync(
  new URL("./animation-sandbox/tanktest-v1/sandbox.js", import.meta.url),
  "utf8",
);
const sandboxStage = fs.readFileSync(
  new URL("./animation-sandbox/tanktest-v1/arcCorePiskelStage.js", import.meta.url),
  "utf8",
);
const sandboxHtml = fs.readFileSync(
  new URL("./animation-sandbox/tanktest-v1/index.html", import.meta.url),
  "utf8",
);

const createWorld = () => createArcCoreTestMine(stage, TILE);
const isDiggable = type => type === TILE.DIRT || type === TILE.STONE;
const getCell = (world, tx, ty) => world[ty]?.[tx];
const getArcTarget = (profile, direction, digConfig, world) => {
  const centerX = mine.spawnTileX * TILE_SIZE + TILE_SIZE * 0.5;
  const centerY = mine.spawnTileY * TILE_SIZE + TILE_SIZE * 0.5;
  const halfWidth = Math.floor((digConfig.widthTiles - 1) * 0.5);
  const reverseHalfWidth = Math.ceil((digConfig.widthTiles - 1) * 0.5);
  let startX = mine.spawnTileX;
  let startY = mine.spawnTileY;
  if (direction === "RIGHT") {
    startX = Math.ceil((centerX + profile.radiusPx - HIT_EPSILON) / TILE_SIZE);
    startY -= halfWidth;
  } else if (direction === "LEFT") {
    startX = Math.floor((centerX - profile.radiusPx + HIT_EPSILON) / TILE_SIZE) - 1;
    startY += reverseHalfWidth;
  } else if (direction === "UP") {
    startY = Math.floor((centerY - profile.radiusPx + HIT_EPSILON) / TILE_SIZE) - 1;
    startX -= halfWidth;
  } else {
    startY = Math.ceil((centerY + profile.radiusPx - HIT_EPSILON) / TILE_SIZE);
    startX -= halfWidth;
  }
  const vector = {
    RIGHT: { x: 1, y: 0 },
    LEFT: { x: -1, y: 0 },
    UP: { x: 0, y: -1 },
    DOWN: { x: 0, y: 1 },
  }[direction];
  for (let scan = 0; scan < stage.maxTargetScanTiles; scan += 1) {
    const primary = {
      tx: startX + vector.x * scan,
      ty: startY + vector.y * scan,
    };
    const targets = resolveArcCoreDigFootprint(primary, direction, digConfig);
    const breakableCount = targets.filter(
      target => isDiggable(getCell(world, target.tx, target.ty)),
    ).length;
    if (breakableCount === targets.length) {
      return { primary, targets };
    }
    const hasMixedDepthSlice = Array.from(
      { length: digConfig.depthTiles },
      (_, depthIndex) => targets.filter(target => target.depthIndex === depthIndex),
    ).some(depthSlice => {
      const sliceBreakable = depthSlice.filter(
        target => isDiggable(getCell(world, target.tx, target.ty)),
      ).length;
      return sliceBreakable > 0 && sliceBreakable < depthSlice.length;
    });
    if (hasMixedDepthSlice) return null;
  }
  return null;
};

const world = createWorld();
const initialStats = countArcCoreMineTiles(world, TILE);
assert.equal(world.length, stage.worldRows);
assert.ok(world.every(row => row.length === stage.worldCols));
assert.ok(stage.worldCols >= 60);
assert.ok(stage.worldRows >= 28);
assert.ok(initialStats.diggable >= 1_200);
assert.ok(initialStats.dirt > 0);
assert.ok(initialStats.stone > 0);
assert.equal(getCell(world, mine.spawnTileX, mine.spawnTileY), TILE.AIR);

for (let row = mine.chamber.topTile; row <= mine.chamber.bottomTile; row += 1) {
  for (let column = mine.chamber.leftTile; column <= mine.chamber.rightTile; column += 1) {
    assert.equal(getCell(world, column, row), TILE.AIR);
  }
}
for (let row = 0; row < stage.worldRows; row += 1) {
  for (let column = 0; column < stage.worldCols; column += 1) {
    const boundary = (
      column < mine.boundaryThicknessTiles
      || row < mine.boundaryThicknessTiles
      || column >= stage.worldCols - mine.boundaryThicknessTiles
      || row >= stage.worldRows - mine.boundaryThicknessTiles
    );
    if (boundary) assert.equal(getCell(world, column, row), TILE.BEDROCK);
  }
}

const centerX = mine.spawnTileX * TILE_SIZE + TILE_SIZE * 0.5;
const centerY = mine.spawnTileY * TILE_SIZE + TILE_SIZE * 0.5;
for (const profile of [smallCollision, omegaCollision]) {
  for (let row = 0; row < stage.worldRows; row += 1) {
    for (let column = 0; column < stage.worldCols; column += 1) {
      if (getCell(world, column, row) === TILE.AIR) continue;
      assert.equal(
        circleIntersectsRect(
          centerX,
          centerY,
          profile.radiusPx,
          column * TILE_SIZE,
          row * TILE_SIZE,
          (column + 1) * TILE_SIZE,
          (row + 1) * TILE_SIZE,
          HIT_EPSILON,
        ),
        false,
        `${profile.label} must spawn clear of tile ${column},${row}`,
      );
    }
  }
}

for (const direction of ["LEFT", "RIGHT", "UP", "DOWN"]) {
  const smallTarget = getArcTarget(
    smallCollision,
    direction,
    ARC_CORE_CONFIG.dig,
    world,
  );
  const omegaTarget = getArcTarget(
    omegaCollision,
    direction,
    ARC_CORE_CONFIG.omega.dig,
    world,
  );
  assert.ok(smallTarget, `Small Arc needs a ${direction} test face`);
  assert.ok(omegaTarget, `Omega Arc needs a ${direction} test face`);
  assert.equal(smallTarget.targets.length, 4);
  assert.equal(omegaTarget.targets.length, 64);
  assert.ok(smallTarget.targets.every(target => (
    isDiggable(getCell(world, target.tx, target.ty))
  )));
  assert.ok(omegaTarget.targets.every(target => (
    isDiggable(getCell(world, target.tx, target.ty))
  )));
}

const smallWorld = createWorld();
const smallDig = getArcTarget(
  smallCollision,
  "RIGHT",
  ARC_CORE_CONFIG.dig,
  smallWorld,
);
for (const target of smallDig.targets) {
  smallWorld[target.ty][target.tx] = TILE.AIR;
}
assert.equal(
  countArcCoreMineTiles(smallWorld, TILE).diggable,
  initialStats.diggable - 4,
);
assert.equal(
  getArcTarget(
    omegaCollision,
    "RIGHT",
    ARC_CORE_CONFIG.omega.dig,
    smallWorld,
  ),
  null,
  "Omega must not skip over a partially opened Small Arc face",
);
assert.equal(
  countArcCoreMineTiles(createWorld(), TILE).diggable,
  initialStats.diggable,
  "refilling must rebuild the deterministic shared mine",
);

const switchMethod = sandbox.match(
  /syncArcCoreReviewStage: function[\s\S]*?\n  },\n\n  cancelDigToIdle:/,
)?.[0] || "";
assert.match(sandbox, /createArcCoreTestMine/);
assert.match(sandbox, /countArcCoreMineTiles/);
assert.match(sandbox, /cameras\.main\.startFollow/);
assert.match(sandbox, /findNearestSafeArcPosition/);
assert.match(sandbox, /KeyCodes\.ONE/);
assert.match(sandbox, /KeyCodes\.TWO/);
assert.match(sandbox, /Refill Mine \(R\)/);
assert.match(sandbox, /maxTargetScanTiles/);
assert.match(sandbox, /Math\.ceil\(\(bounds\.right - HIT_EPS\) \/ TILE_SIZE\)/);
assert.doesNotMatch(sandbox, /makeOmegaReviewWorld|omegaWallTile|normalWallTile/);
assert.doesNotMatch(
  switchMethod,
  /this\.world\s*=/,
  "switching Arc forms must preserve the same mined terrain",
);
assert.match(sandboxStage, /firstRow/);
assert.match(sandboxStage, /lastColumn/);
assert.match(sandboxStage, /REVIEW_TILE\.BEDROCK/);
assert.match(sandboxHtml, /arc-core-shared-mine-v5/);

console.log("Arc Core shared mine contract: PASS");
