import assert from "node:assert/strict";
import test from "node:test";
import {
  applyCaveBackdropTone, resolveCaveCompositionEnabled, resolveCaveCompositionWeight,
} from "../values/caveVisualComposition.js";
import { CAVE_VISUAL_COMPOSITION_REVIEW } from "../values/caveVisualCompositionReview.js";
import {
  WORLD_VISUAL_DEPTH_BACKDROPS, resolveWorldVisualDepthBackdropTint,
} from "../values/worldVisualDepthBackdrops.js";
import { WorldVisualLightingBridge } from "../world/rendering/scenic-world/WorldVisualLightingBridge.js";
import { PlayerContactShadowSystem } from "../systems/visual/PlayerContactShadowSystem.js";
import { PLAYER_CONTACT_SHADOW_CONFIG as SHADOW } from "../values/playerContactShadow.js";

const channels = color => [color >> 16 & 255, color >> 8 & 255, color & 255];
const maxDifference = (a, b) => Math.max(...channels(a).map((c, i) => Math.abs(c - channels(b)[i])));
function sceneAt(depth, storm = false) {
  return {
    config: { tileSize: 94, topAirRows: 65 },
    playerController: { physicsBody: { x: 0, y: (65 + depth) * 94 - 37.5, w: 31, h: 75 } },
    dayNightCycle: { getNightAmount: () => storm ? 1 : 0 },
    weatherSystem: { getLightingSnapshot: () => storm
      ? { kind: "storm", intensity: 1, lightning: 1, surfaceWetness: 1 }
      : { kind: "clear", intensity: 0 } },
  };
}

test("presentation is enabled by default with explicit rollback aliases", () => {
  assert.equal(resolveCaveCompositionEnabled(""), true);
  for (const value of ["0", "false", "OFF", "legacy"]) {
    assert.equal(resolveCaveCompositionEnabled(`?caveComposition=${value}`), false);
  }
  assert.equal(resolveCaveCompositionEnabled("?caveComposition=1"), true);
});
test("cave entrance blends smoothly without changing the surface", () => {
  assert.equal(resolveCaveCompositionWeight(-3), 0);
  assert.equal(resolveCaveCompositionWeight(0), 0);
  assert.equal(resolveCaveCompositionWeight(6), 0.5);
  assert.equal(resolveCaveCompositionWeight(12), 1);
  assert.equal(resolveCaveCompositionWeight(1000), 1);
  assert.ok(resolveCaveCompositionWeight(0.01) < 0.001);
  for (const storm of [false, true]) {
    const scene = sceneAt(0, storm);
    const before = new WorldVisualLightingBridge(scene, "?caveComposition=0").sample();
    const after = new WorldVisualLightingBridge(scene, "").sample();
    const { caveCompositionEnabled: oldFlag, ...oldSurface } = before;
    const { caveCompositionEnabled: newFlag, ...newSurface } = after;
    assert.deepEqual(newSurface, oldSurface);
  }
});
test("deep terrain loses surface weather cast without mutating simulation", () => {
  for (const storm of [false, true]) {
    const scene = sceneAt(18, storm);
    const originalBody = { ...scene.playerController.physicsBody };
    const sample = new WorldVisualLightingBridge(scene, "").sample();
    assert.equal(sample.terrainTint, 0xffffff);
    assert.deepEqual(scene.playerController.physicsBody, originalBody);
  }
  const transition = new WorldVisualLightingBridge(sceneAt(6), "").sample();
  assert.notEqual(transition.terrainTint, 0xffffff);
});
test("cave backdrop tone preserves black and each biome's tonal range", () => {
  assert.equal(applyCaveBackdropTone(0x123456, 0), 0x123456);
  assert.equal(applyCaveBackdropTone(0, 1), 0);
  const lighting = { farTint: 0xffffff, lightning: 0 };
  for (const region of WORLD_VISUAL_DEPTH_BACKDROPS.regions) {
    const row = (region.topTile + region.bottomTileExclusive) / 2;
    const oldTint = resolveWorldVisualDepthBackdropTint(row, lighting);
    const newTint = resolveWorldVisualDepthBackdropTint(row, { ...lighting, caveCompositionEnabled: true });
    assert.notEqual(newTint, oldTint, region.id);
    channels(newTint).forEach((channel, i) => assert.ok(channel <= channels(oldTint)[i], region.id));
    assert.ok(channels(newTint).every(channel => channel > 0), region.id);
    assert.equal(resolveWorldVisualDepthBackdropTint(row, { ...lighting, caveCompositionEnabled: false }), oldTint);
  }
});
test("deep backdrop ignores nearly all surface lightning while retaining biome variation", () => {
  const clear = { farTint: 0xffffff, lightning: 0, caveCompositionEnabled: true };
  const flash = { farTint: 0xeaf7ff, lightning: 1, caveCompositionEnabled: true };
  for (const row of [90, 220, 800, 1200]) {
    assert.ok(maxDifference(resolveWorldVisualDepthBackdropTint(row, clear),
      resolveWorldVisualDepthBackdropTint(row, flash)) <= 3);
  }
  assert.notEqual(resolveWorldVisualDepthBackdropTint(220, clear),
    resolveWorldVisualDepthBackdropTint(800, clear));
});

function ellipse() {
  return {
    alpha: 0, visible: false, scaleX: 1, scaleY: 1, destroyed: false,
    setDepth(depth) { this.depth = depth; return this; },
    setAlpha(alpha) { this.alpha = alpha; return this; },
    setVisible(visible) { this.visible = visible; return this; },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setScale(x, y) { this.scaleX = x; this.scaleY = y; return this; },
    destroy() { this.destroyed = true; },
  };
}
function shadowHarness(search = "", custom = true) {
  const body = custom ? { x: 100, y: 200, w: 31, h: 75, vx: 280 }
    : { center: { x: 115.5 }, bottom: 275, velocity: { x: 280 }, blocked: { down: true } };
  const player = { x: 118, y: 275, originY: 1, displayHeight: 101, visible: true, alpha: 1 };
  let grounded = true;
  const controller = { isGrounded: () => grounded };
  if (custom) controller.physicsBody = body;
  else player.body = body;
  const system = new PlayerContactShadowSystem({ add: { ellipse } }, player, controller, SHADOW, search);
  assert.equal(system.create(), true);
  return { system, player, body, airborne: () => { grounded = false; } };
}
test("custom-body shadow follows real floor and speed despite sprite pose offsets", () => {
  const { system, body, player } = shadowHarness();
  const original = { ...body };
  system.update(50);
  assert.equal(system.inner.x, 115.5);
  assert.equal(system.inner.y, 273);
  assert.ok(system.inner.scaleX > 1);
  assert.ok(system.inner.scaleY < 1);
  player.y += 20;
  system.update(50);
  assert.equal(system.inner.y, 273);
  assert.deepEqual(body, original);
});
test("Arcade-body fallback stays anchored and rollback reproduces the former custom-body offset", () => {
  const arcade = shadowHarness("", false).system;
  arcade.update(50);
  assert.equal(arcade.inner.x, 115.5);
  assert.equal(arcade.inner.y, 273);
  const before = shadowHarness("?caveComposition=0").system;
  before.update(50);
  assert.equal(before.inner.y, 323.5);
  assert.equal(before.inner.scaleX, 1);
});
test("shadow fades out in the air or when hidden and releases its objects", () => {
  const h = shadowHarness();
  h.system.update(50);
  assert.equal(h.system.inner.visible, true);
  h.airborne();
  for (let i = 0; i < 15; i += 1) h.system.update(50);
  assert.equal(h.system.inner.visible, false);
  const outer = h.system.outer, inner = h.system.inner;
  h.system.destroy();
  h.system.destroy();
  assert.equal(outer.destroyed && inner.destroyed, true);
  const hidden = shadowHarness();
  hidden.player.visible = false;
  hidden.system.update(50);
  assert.equal(hidden.system.inner.visible, false);
});
test("comparison uses separate fixture slots and the same gameplay and torch settings", () => {
  const [before, after] = CAVE_VISUAL_COMPOSITION_REVIEW.scenarios;
  assert.ok(before.saveSlot > 3 && after.saveSlot > 3);
  assert.notEqual(before.saveSlot, after.saveSlot);
  const { caveComposition: oldFlag, ...oldQuery } = before.query;
  const { caveComposition: newFlag, ...newQuery } = after.query;
  assert.deepEqual(oldQuery, newQuery);
  assert.equal(oldQuery.jkd_e2e, "1");
  assert.equal(oldQuery.cinematics, "0");
});
