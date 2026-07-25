import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  PLAYER_TARGET_VARIANTS,
  PLAYER_TILE_CONTACT_CONFIG,
} from "../values/playerTileContact.js";
import {
  getAabbAdjacentAimCandidates,
  getPlayerBodyTileSpan,
  isTargetTileAdjacentToPlayerBody,
  resolvePlayerTargetDirection,
} from "../player/playerDirectionalTargets.js";
import { PlayerSolidOcclusionSystem } from "../systems/visual/PlayerSolidOcclusionSystem.js";

const TILE_SIZE = 94;
const BODY_WIDTH = 31;
const BODY_HEIGHT = 75;
const EPSILON = PLAYER_TILE_CONTACT_CONFIG.targeting.edgeEpsilonPx;

function tileIntersectsBody(tile, body) {
  const left = tile.tx * TILE_SIZE;
  const right = left + TILE_SIZE;
  const top = tile.ty * TILE_SIZE;
  const bottom = top + TILE_SIZE;
  return left < body.x + body.w - EPSILON
    && right > body.x + EPSILON
    && top < body.y + body.h - EPSILON
    && bottom > body.y + EPSILON;
}

const body = {
  x: 10 * TILE_SIZE + (TILE_SIZE - BODY_WIDTH) * 0.5,
  y: 11 * TILE_SIZE - BODY_HEIGHT,
  w: BODY_WIDTH,
  h: BODY_HEIGHT,
};

assert.deepEqual(getPlayerBodyTileSpan(body, TILE_SIZE), {
  left: 10,
  right: 10,
  top: 10,
  bottom: 10,
  centerX: 10,
  centerY: 10,
});

const expectedCandidates = new Map([
  ["right", [{ tx: 11, ty: 10 }]],
  ["left", [{ tx: 9, ty: 10 }]],
  ["up", [{ tx: 10, ty: 9 }]],
  ["down", [{ tx: 10, ty: 11 }]],
  ["up-right", [{ tx: 11, ty: 9 }, { tx: 11, ty: 10 }]],
  ["down-left", [{ tx: 9, ty: 11 }, { tx: 9, ty: 10 }]],
]);
const aimByName = new Map([
  ["right", { x: 1, y: 0 }],
  ["left", { x: -1, y: 0 }],
  ["up", { x: 0, y: -1 }],
  ["down", { x: 0, y: 1 }],
  ["up-right", { x: 1, y: -1 }],
  ["down-left", { x: -1, y: 1 }],
]);

for (const [name, expected] of expectedCandidates) {
  const candidates = getAabbAdjacentAimCandidates(body, TILE_SIZE, aimByName.get(name));
  assert.deepEqual(candidates, expected, `${name} candidate order changed`);
  assert.ok(candidates.every((tile) => !tileIntersectsBody(tile, body)), `${name} overlaps the player body`);
}

const straddledBody = { x: 10 * TILE_SIZE + 80, y: body.y, w: BODY_WIDTH, h: BODY_HEIGHT };
assert.deepEqual(getPlayerBodyTileSpan(straddledBody, TILE_SIZE), {
  left: 10,
  right: 11,
  top: 10,
  bottom: 10,
  centerX: 11,
  centerY: 10,
});
assert.deepEqual(
  getAabbAdjacentAimCandidates(straddledBody, TILE_SIZE, { x: 0, y: -1 }),
  [{ tx: 11, ty: 9 }, { tx: 10, ty: 9 }],
);
assert.deepEqual(getAabbAdjacentAimCandidates(null, TILE_SIZE, { x: 1, y: 0 }), []);
assert.deepEqual(getAabbAdjacentAimCandidates(body, TILE_SIZE, { x: 0, y: 0 }), []);

const targetDirectionCases = [
  [{ tx: 11, ty: 10 }, { aimLabel: "RIGHT", variant: PLAYER_TARGET_VARIANTS.side, x: 1, y: 0 }],
  [{ tx: 11, ty: 9 }, { aimLabel: "UP-RIGHT", variant: PLAYER_TARGET_VARIANTS.upSide, x: 1, y: -1 }],
  [{ tx: 10, ty: 9 }, { aimLabel: "UP", variant: PLAYER_TARGET_VARIANTS.up, x: 0, y: -1 }],
  [{ tx: 10, ty: 11 }, { aimLabel: "DOWN", variant: PLAYER_TARGET_VARIANTS.down, x: 0, y: 1 }],
  [{ tx: 9, ty: 11 }, { aimLabel: "DOWN-LEFT", variant: PLAYER_TARGET_VARIANTS.downSide, x: -1, y: 1 }],
];
for (const [targetTile, expected] of targetDirectionCases) {
  assert.deepEqual(resolvePlayerTargetDirection(body, TILE_SIZE, targetTile), expected);
  assert.equal(isTargetTileAdjacentToPlayerBody(body, TILE_SIZE, targetTile), true);
}
assert.equal(resolvePlayerTargetDirection(body, TILE_SIZE, { tx: 10, ty: 10 }), null);
assert.equal(resolvePlayerTargetDirection(body, TILE_SIZE, { tx: 10, ty: 12 }), null);
assert.equal(isTargetTileAdjacentToPlayerBody(body, TILE_SIZE, { tx: 10, ty: 12 }), false);
assert.deepEqual(
  resolvePlayerTargetDirection(straddledBody, TILE_SIZE, { tx: 10, ty: 9 }),
  { aimLabel: "UP-LEFT", variant: PLAYER_TARGET_VARIANTS.upSide, x: -1, y: -1 },
);

function createMaskHarness(rendererType, isUalNative = true) {
  const listeners = new Map();
  const graphics = {
    rects: [],
    destroyed: false,
    clear() { this.rects = []; return this; },
    fillStyle(color, alpha) { this.style = { color, alpha }; return this; },
    fillRect(x, y, width, height) { this.rects.push({ x, y, width, height }); return this; },
    createGeometryMask() {
      return {
        inverted: false,
        destroyed: false,
        setInvertAlpha(value = true) { this.inverted = value; return this; },
        destroy() { this.destroyed = true; },
      };
    },
    destroy() { this.destroyed = true; },
  };
  const player = {
    active: true,
    mask: null,
    clearedWith: null,
    getBounds: () => ({ left: 94, top: 94, right: 188, bottom: 188 }),
    setMask(mask) { this.mask = mask; return this; },
    clearMask(destroyMask) { this.clearedWith = destroyMask; this.mask = null; return this; },
  };
  const solids = new Set(["2,1"]);
  let graphicsCreated = 0;
  const scene = {
    game: { renderer: { type: rendererType } },
    config: { tileSize: TILE_SIZE },
    make: { graphics() { graphicsCreated += 1; return graphics; } },
    events: {
      on(event, callback) { listeners.set(event, callback); },
      off(event, callback) { if (listeners.get(event) === callback) listeners.delete(event); },
    },
  };
  const world = {
    inBounds: (tx, ty) => tx >= 0 && tx < 5 && ty >= 0 && ty < 5,
    isSolid: (tx, ty) => solids.has(`${tx},${ty}`),
  };
  const system = new PlayerSolidOcclusionSystem(scene, player, world, { isUalNative });
  return { system, scene, player, graphics, solids, listeners, get graphicsCreated() { return graphicsCreated; } };
}

const previousPhaser = globalThis.Phaser;
globalThis.Phaser = {
  WEBGL: 2,
  CANVAS: 1,
  Scenes: { Events: { POST_UPDATE: "postupdate" } },
};

try {
  const webgl = createMaskHarness(globalThis.Phaser.WEBGL);
  assert.equal(webgl.system.create(), true);
  assert.equal(webgl.graphicsCreated, 1);
  assert.equal(webgl.player.mask.inverted, true);
  assert.deepEqual(webgl.graphics.style, {
    color: PLAYER_TILE_CONTACT_CONFIG.solidOcclusion.maskFillColor,
    alpha: PLAYER_TILE_CONTACT_CONFIG.solidOcclusion.maskFillAlpha,
  });
  assert.deepEqual(webgl.graphics.rects, [{ x: 188, y: 94, width: 94, height: 94 }]);
  assert.equal(webgl.listeners.has("postupdate"), true);

  webgl.solids.clear();
  assert.equal(webgl.system.update(), 0);
  assert.deepEqual(webgl.graphics.rects, []);
  const ownedMask = webgl.player.mask;
  webgl.system.destroy();
  assert.equal(webgl.player.mask, null);
  assert.equal(webgl.player.clearedWith, false);
  assert.equal(ownedMask.destroyed, true);
  assert.equal(webgl.graphics.destroyed, true);
  assert.equal(webgl.listeners.has("postupdate"), false);

  const canvas = createMaskHarness(globalThis.Phaser.CANVAS);
  assert.equal(canvas.system.create(), false);
  assert.equal(canvas.graphicsCreated, 0);
  assert.equal(canvas.player.mask, null);

  const nonUal = createMaskHarness(globalThis.Phaser.WEBGL, false);
  assert.equal(nonUal.system.create(), false);
  assert.equal(nonUal.graphicsCreated, 0);
  assert.equal(nonUal.player.mask, null);
} finally {
  globalThis.Phaser = previousPhaser;
}

const inputHandlerSource = readFileSync(
  new URL("../world/playScene/PlayerInputHandler.js", import.meta.url),
  "utf8",
);
assert.match(inputHandlerSource, /getAabbAdjacentAimCandidates\(body, tileSize, aim\)/);
assert.match(inputHandlerSource, /resolveAimTargetTileForVector/);
assert.match(inputHandlerSource, /return inBounds\[0\] \?\? null/);
assert.doesNotMatch(inputHandlerSource, /baseTile\.ty \+ 1/);
const gameplaySource = readFileSync(
  new URL("../world/playScene/PlaySceneGameplay.js", import.meta.url),
  "utf8",
);
const caveGameplaySource = readFileSync(
  new URL("../world/playScene/CaveGameplayController.js", import.meta.url),
  "utf8",
);
const playUpdateSource = readFileSync(
  new URL("../world/playScene/PlaySceneUpdate.js", import.meta.url),
  "utf8",
);
assert.match(gameplaySource, /resolvePlayerTargetDirection\([\s\S]{0,180}direction\?\.aimLabel/);
assert.match(playUpdateSource, /resolveLiveContactDirection[\s\S]{0,260}if \(!contactDirection\) return/);
assert.match(caveGameplaySource, /contactDirection[\s\S]{0,180}if \(!contactDirection\) return/);

console.log(JSON.stringify({
  result: "PLAYER_TILE_CONTACT_CONTRACT_OK",
  bodySpan: getPlayerBodyTileSpan(body, TILE_SIZE),
  targetVariants: targetDirectionCases.length,
  webglOcclusion: true,
  canvasGuard: true,
}, null, 2));
