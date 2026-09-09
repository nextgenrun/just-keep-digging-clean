import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createCollisionE2EPreviewController } from "./JkdE2ECollisionPreview.js";
import { PLAYER_COLLISION_REVIEW_CONFIG as CONFIG } from "../values/playerCollisionReview.js";
import { PLAYER_COLLISION_CONFIG } from "../values/playerCollision.js";
import { TILE_TYPES } from "../values/tileTypes.js";

const environment = {
  location: { hostname: "127.0.0.1", search: "?jkd_e2e=1&collisionReview=1" },
  production: false,
};
const gallery = { ok: true, playerTile: { tx: 4, ty: 6 } };
let cases = 0;
const check = (_name, run) => { run(); cases += 1; };
function fixture() {
  const body = {
    x: 410, y: 583, w: 31, h: 75, vx: 0, vy: 0,
    setPosition(x, y) { this.x = x; this.y = y; return true; },
    resetVelocity() { this.vx = 0; this.vy = 0; },
  };
  const caption = {
    text: "", destroys: 0,
    setText(text) { this.text = text; return this; },
    setScrollFactor() { return this; }, setDepth() { return this; },
    setLineSpacing() { return this; }, destroy() { this.destroys += 1; },
  };
  const player = {
    x: 425.5, y: 658, scaleX: 0.4, scaleY: 0.4,
    originX: 0.5, originY: 0.89, flipX: false, flipY: false,
    frame: { name: 19 },
    anims: { currentAnim: { key: "real-dig" }, currentFrame: { index: 6 }, timeScale: 1.4 },
  };
  const scene = {
    _saveWritesBlocked: true, player, config: { tileSize: 94 }, caption,
    add: { text: () => caption }, tiles: [], updates: [],
    playerController: {
      physicsBody: body, movement: { setFacingRight() {} },
      movingSideDigStandOff: { config: Object.freeze({ enabled: true }), end() {} },
      _syncSpriteWithPhysics() { player.x = body.x + body.w / 2; player.y = body.y + body.h; },
    },
    worldModel: { setTile: (...args) => scene.tiles.push(args) },
    worldRenderer: { applyTileUpdate: (...args) => scene.updates.push(args), invalidate() {} },
    scene: {
      paused: false, isPaused() { return this.paused; },
      pause() { this.paused = true; }, resume() { this.paused = false; },
    },
  };
  scene.playerSolidOcclusion = {
    mask: {}, enabled: true,
    destroy() { this.mask = null; this.enabled = false; player.mask = null; },
    create() { this.mask = {}; player.mask = this.mask; return true; },
  };
  return scene;
}
const state = scene => JSON.stringify({
  player: { ...scene.player, mask: undefined }, body: scene.playerController.physicsBody,
  tiles: scene.tiles, updates: scene.updates, savesBlocked: scene._saveWritesBlocked,
});

check("requires local explicit opt-in and already-disabled save authority", () => {
  for (const override of [
    { production: true },
    { location: { hostname: "example.com", search: environment.location.search } },
    { location: { ...environment.location, search: "?jkd_e2e=1" } },
    { location: { ...environment.location, search: "?collisionReview=1" } },
  ]) assert.equal(createCollisionE2EPreviewController(fixture(), { ...environment, ...override }), null);
  const scene = fixture();
  scene._saveWritesBlocked = false;
  assert.equal(createCollisionE2EPreviewController(scene, environment), null);
});
check("stages only a repeatable right wall and ceiling with a safe body gap", () => {
  const scene = fixture();
  const review = createCollisionE2EPreviewController(scene, environment);
  assert.equal(review.stage(null), false);
  assert.equal(review.stage(gallery), true);
  assert.deepEqual(scene.tiles, [[5, 6, TILE_TYPES.STONE, CONFIG.targetHp], [4, 5, TILE_TYPES.STONE, CONFIG.targetHp]]);
  const body = scene.playerController.physicsBody;
  assert.equal(body.x, 5 * 94 - body.w - PLAYER_COLLISION_CONFIG.skinPx);
  assert.equal(body.y, 583);
  assert.match(scene.caption.text, /SAVES OFF/);
});
check("toggle changes only the mask, not actor, tiles, cadence or saves", () => {
  const scene = fixture();
  const review = createCollisionE2EPreviewController(scene, environment);
  review.stage(gallery);
  const before = state(scene);
  assert.equal(review.handleKey({ code: CONFIG.toggleCode }), true);
  assert.equal(scene.playerSolidOcclusion.mask, null);
  assert.equal(state(scene), before);
  assert.ok(scene.caption.text.includes(CONFIG.caption.unchanged));
  review.handleKey({ code: CONFIG.toggleCode });
  assert.ok(scene.playerSolidOcclusion.mask);
  assert.equal(state(scene), before);
});
check("held/repeated keys cannot rapidly toggle a comparison", () => {
  const scene = fixture();
  const review = createCollisionE2EPreviewController(scene, environment);
  review.stage(gallery);
  const mask = scene.playerSolidOcclusion.mask;
  review.handleKey({ code: CONFIG.toggleCode, repeat: true });
  review.handleKey({ code: CONFIG.standOffCode, repeat: true });
  review.handleKey({ code: CONFIG.freezeCode, repeat: true });
  assert.equal(scene.playerSolidOcclusion.mask, mask);
  assert.equal(scene.playerController.movingSideDigStandOff.config.enabled, true);
  assert.equal(scene.scene.paused, false);
});
check("hold-back override is instance-local, next-action-only and reversible", () => {
  const scene = fixture();
  const review = createCollisionE2EPreviewController(scene, environment);
  review.stage(gallery);
  const helper = scene.playerController.movingSideDigStandOff;
  const original = helper.config;
  const before = state(scene);
  review.handleKey({ code: CONFIG.standOffCode });
  assert.equal(helper.config.enabled, false);
  assert.equal(original.enabled, true);
  assert.equal(state(scene), before);
  review.handleKey({ code: CONFIG.standOffCode });
  assert.equal(helper.config, original);
  review.handleKey({ code: CONFIG.standOffCode });
  review.destroy();
  assert.equal(helper.config, original);
});
check("same frozen gameplay frame can be compared and resumed", () => {
  const scene = fixture();
  const review = createCollisionE2EPreviewController(scene, environment);
  review.stage(gallery);
  const before = state(scene);
  review.handleKey({ code: CONFIG.freezeCode });
  assert.equal(scene.scene.paused, true);
  review.handleKey({ code: CONFIG.toggleCode });
  assert.equal(state(scene), before);
  assert.ok(scene.caption.text.includes(CONFIG.caption.frozen));
  review.handleKey({ code: CONFIG.freezeCode });
  assert.equal(scene.scene.paused, false);
});
check("reset resumes only the pause owned by this review", () => {
  const scene = fixture();
  const review = createCollisionE2EPreviewController(scene, environment);
  review.stage(gallery);
  review.handleKey({ code: CONFIG.freezeCode });
  review.resume();
  assert.equal(scene.scene.paused, false);
  scene.scene.paused = true;
  review.handleKey({ code: CONFIG.freezeCode });
  review.resume();
  assert.equal(scene.scene.paused, true);
});
check("unrelated controls and unstaged sessions are not intercepted", () => {
  const scene = fixture();
  const review = createCollisionE2EPreviewController(scene, environment);
  assert.equal(review.handleKey({ code: CONFIG.toggleCode }), false);
  review.stage(gallery);
  for (const code of ["Space", "ShiftLeft", "KeyA", "KeyD", "F1"]) {
    assert.equal(review.handleKey({ code }), false);
  }
  review.destroy();
  review.destroy();
  assert.equal(scene.caption.destroys, 1);
});
check("one local harness instance owns reset, key routing and teardown", () => {
  const source = readFileSync(new URL("./JkdE2EHarness.js", import.meta.url), "utf8");
  assert.equal(source.match(/const collisionPreview = createCollisionE2EPreviewController/g)?.length, 1);
  assert.ok(source.indexOf("scene._saveWritesBlocked = true") < source.indexOf("const collisionPreview"));
  assert.match(source, /collisionPreview\?\.handleKey\(event\)/);
  assert.match(source, /collisionPreview\?\.stage\(gallery\)/);
  assert.match(source, /collisionPreview\?\.destroy\(\)/);
});
console.log("PLAYER_COLLISION_REVIEW_REGRESSIONS_OK", { cases, defaultGameplayChanged: false });
