import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  PLAYER_TILE_CONTACT_CONFIG,
  resolvePlayerSolidOcclusionEnabled,
} from "../values/playerTileContact.js";
import { PlayerSolidOcclusionSystem } from
  "../systems/visual/PlayerSolidOcclusionSystem.js";

const TILE_SIZE = 94;
const SOLID_CELL = Object.freeze({ tx: 2, ty: 1 });

function createHarness(rendererType, { search = "?playerSolidOcclusion=1", isUalNative = true } = {}) {
  const listeners = new Map();
  const solids = new Set([`${SOLID_CELL.tx},${SOLID_CELL.ty}`]);
  const graphics = {
    rects: [],
    clear() { this.rects = []; return this; },
    fillStyle(color, alpha) { this.style = { color, alpha }; return this; },
    fillRect(x, y, width, height) {
      this.rects.push({ x, y, width, height });
      return this;
    },
    createGeometryMask() {
      return {
        invertAlpha: false,
        destroyed: false,
        destroy() { this.destroyed = true; },
      };
    },
    destroy() { this.destroyed = true; },
  };
  const player = {
    active: true,
    x: 141,
    y: 188,
    displayWidth: 117,
    displayHeight: 117,
    flipX: true,
    anims: { currentAnim: { key: "survival-moving-side-dig" }, timeScale: 1 },
    body: Object.freeze({ x: 125.5, y: 113, width: 31, height: 75 }),
    mask: null,
    getBounds: () => ({ left: 94, top: 94, right: 188, bottom: 188 }),
    setMask(mask) { this.mask = mask; return this; },
    clearMask() { this.mask = null; return this; },
  };
  let graphicsCreated = 0;
  const scene = {
    game: { renderer: { type: rendererType } },
    config: { tileSize: TILE_SIZE },
    make: {
      graphics() {
        graphicsCreated += 1;
        return graphics;
      },
    },
    events: {
      on(event, callback) { listeners.set(event, callback); },
      off(event, callback) {
        if (listeners.get(event) === callback) listeners.delete(event);
      },
    },
  };
  const worldModel = {
    inBounds: (tx, ty) => tx >= 0 && tx < 5 && ty >= 0 && ty < 5,
    isSolid: (tx, ty) => solids.has(`${tx},${ty}`),
  };
  const system = new PlayerSolidOcclusionSystem(
    scene,
    player,
    worldModel,
    { isUalNative },
    PLAYER_TILE_CONTACT_CONFIG.solidOcclusion,
    search,
  );
  return {
    graphics,
    listeners,
    player,
    solids,
    system,
    get graphicsCreated() { return graphicsCreated; },
  };
}

const previousPhaser = globalThis.Phaser;
globalThis.Phaser = {
  WEBGL: 2,
  CANVAS: 1,
  HEADLESS: 3,
  Scenes: { Events: { POST_UPDATE: "postupdate" } },
};

try {
  assert.equal(resolvePlayerSolidOcclusionEnabled(undefined, ""), false);
  const unmaskedDefault = createHarness(globalThis.Phaser.WEBGL, { search: "" });
  assert.equal(unmaskedDefault.system.create(), false);
  assert.equal(unmaskedDefault.graphicsCreated, 0);
  assert.equal(
    resolvePlayerSolidOcclusionEnabled(undefined, "?playerSolidOcclusion=1"),
    true,
  );
  for (const value of ["0", "false", "off", "disabled", "legacy"]) {
    assert.equal(
      resolvePlayerSolidOcclusionEnabled(
        undefined,
        `?playerSolidOcclusion=${value}`,
      ),
      false,
    );
  }

  for (const rendererType of [globalThis.Phaser.WEBGL, globalThis.Phaser.CANVAS]) {
    const harness = createHarness(rendererType);
    const presentationBefore = {
      x: harness.player.x,
      y: harness.player.y,
      displayWidth: harness.player.displayWidth,
      displayHeight: harness.player.displayHeight,
      flipX: harness.player.flipX,
      animationKey: harness.player.anims.currentAnim.key,
      animationTimeScale: harness.player.anims.timeScale,
      body: harness.player.body,
    };

    assert.equal(harness.system.create(), true);
    assert.equal(harness.graphicsCreated, 1);
    assert.equal(harness.player.mask.invertAlpha, false);
    assert.equal(harness.graphics.rects.length, 8);
    assert.equal(
      harness.graphics.rects.some(rect => (
        rect.x === SOLID_CELL.tx * TILE_SIZE
        && rect.y === SOLID_CELL.ty * TILE_SIZE
      )),
      false,
      "solid terrain must remain a hole in the air-cell stencil",
    );
    assert.deepEqual({
      x: harness.player.x,
      y: harness.player.y,
      displayWidth: harness.player.displayWidth,
      displayHeight: harness.player.displayHeight,
      flipX: harness.player.flipX,
      animationKey: harness.player.anims.currentAnim.key,
      animationTimeScale: harness.player.anims.timeScale,
      body: harness.player.body,
    }, presentationBefore, "occlusion must not alter animation, size, pose, or physics");

    harness.solids.clear();
    assert.equal(harness.system.update(), 0);
    assert.equal(harness.graphics.rects.length, 9);
    assert.equal(
      harness.graphics.rects.some(rect => (
        rect.x === SOLID_CELL.tx * TILE_SIZE
        && rect.y === SOLID_CELL.ty * TILE_SIZE
      )),
      true,
      "destroyed terrain must reveal the animated limb pixels on the next update",
    );
    harness.system.destroy();
    assert.equal(harness.player.mask, null);
    assert.equal(harness.listeners.size, 0);
  }

  const rollback = createHarness(
    globalThis.Phaser.WEBGL,
    { search: "?playerSolidOcclusion=0" },
  );
  assert.equal(rollback.system.create(), false);
  assert.equal(rollback.graphicsCreated, 0);
  assert.equal(rollback.player.mask, null);

  const nonUal = createHarness(globalThis.Phaser.WEBGL, { isUalNative: false });
  assert.equal(nonUal.system.create(), false);
  assert.equal(nonUal.graphicsCreated, 0);

  const headless = createHarness(globalThis.Phaser.HEADLESS);
  assert.equal(headless.system.create(), false);
  assert.equal(headless.graphicsCreated, 0);
} finally {
  globalThis.Phaser = previousPhaser;
}

const source = readFileSync(
  new URL("../systems/visual/PlayerSolidOcclusionSystem.js", import.meta.url),
  "utf8",
);
assert.doesNotMatch(source, /setPosition|setDisplaySize|\.play\(|anims\.timeScale|body\.[xywhv]/);
assert.doesNotMatch(source, /setInvertAlpha\(true\)/);
assert.match(source, /this\.worldModel\.isSolid/);

await import("./2026-09-03-player-collision-review-regressions.js");

console.log(JSON.stringify({
  result: "PLAYER_LIMB_OCCLUSION_CONTRACT_OK",
  renderers: ["webgl", "canvas"],
  physicsOrAnimationMutation: false,
  rollback: "?playerSolidOcclusion=0",
}, null, 2));
