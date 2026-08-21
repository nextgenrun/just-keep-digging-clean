import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

globalThis.Phaser = {
  Scenes: { Events: { SHUTDOWN: "shutdown" } },
  BlendModes: { NORMAL: 0, SCREEN: 1 },
};
globalThis.location = { search: "?deepWorldLiving=1&worldFacade=1" };

const { ASSET_KEYS } = await import("../values/assetKeys.js");
const {
  DEEP_WORLD_LIVING_BACKDROP,
  resolveDeepWorldLivingBackdropEnabled,
} = await import("../values/deepWorldLivingBackdrop.js");
const { WORLD_SCENIC_FACADE } = await import("../values/worldScenicFacade.js");
const { DeepWorldLivingBackdropSystem } = await import("../world/rendering/DeepWorldLivingBackdropSystem.js");

function makeSprite(key, frame) {
  return {
    key,
    frame: { name: frame },
    visible: false,
    destroyed: false,
    setOrigin() { return this; },
    setDepth(value) { this.depth = value; return this; },
    setAlpha(value) { this.alpha = value; return this; },
    setVisible(value) { this.visible = value; return this; },
    setScrollFactor(value) { this.scrollFactor = value; return this; },
    setBlendMode(value) { this.blendMode = value; return this; },
    setFrame(value) { this.frame = { name: value }; return this; },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setDisplaySize(width, height) { this.displayWidth = width; this.displayHeight = height; return this; },
    setRotation(value) { this.rotation = value; return this; },
    setTint(value) { this.tint = value; return this; },
    destroy() { this.destroyed = true; },
  };
}

function makeScene() {
  const frames = new Set();
  const sprites = [];
  const view = { x: 132 * 94, y: 2065 * 94, width: 14 * 94, height: 10 * 94 };
  const scene = {
    config: { tileSize: 94 },
    gameplayCapabilities: { isEnabled: () => true },
    time: { now: 0 },
    game: { loop: { actualFps: 60 } },
    worldBackgroundMasterSystem: { enabled: true, depthEnabled: true },
    worldScenicFacadeSystem: { enabled: true },
    weatherSystem: {
      wind: 96,
      getLightingSnapshot: () => ({ rainAmount: 0.8, fogAmount: 0.6, windGustAmount: 0.7, wind: 96 }),
    },
    dayNightCycle: { getNightAmount: () => 0.75 },
    cameras: { main: { worldView: view, zoom: 1, width: view.width, height: view.height } },
    textures: {
      get(key) {
        if (key !== ASSET_KEYS.environment.skylineWeatherVfx.atmosphere) return null;
        return {
          getSourceImage: () => ({ width: 1200, height: 900 }),
          has: frame => frames.has(frame),
          add: frame => frames.add(frame),
        };
      },
    },
    add: {
      image(x, y, key, frame) {
        const sprite = makeSprite(key, frame);
        sprite.x = x;
        sprite.y = y;
        sprites.push(sprite);
        return sprite;
      },
    },
    events: { once() {}, off() {} },
  };
  return { scene, sprites, view };
}

const valuesSource = await readFile(new URL("../values/deepWorldLivingBackdrop.js", import.meta.url), "utf8");
assert.equal(/^\s*import\s/m.test(valuesSource), false, "deep values config must remain import-free");
assert.deepEqual(DEEP_WORLD_LIVING_BACKDROP.region, {
  leftTile: 132,
  rightTileExclusive: 280,
  topTile: 2065,
  bottomTileExclusive: 5065,
  anchorPaddingTiles: 0.45,
});
const facadeBands = new Map(WORLD_SCENIC_FACADE.bands.map(band => [band.id, band]));
for (const layer of Object.values(DEEP_WORLD_LIVING_BACKDROP.layers)) {
  assert.ok(layer.periodMs.min >= 8000 && layer.periodMs.max <= 20000, "motion must stay soft and slow");
  for (const bandId of Object.keys(layer.bands)) {
    const band = facadeBands.get(bandId);
    assert.ok(band, `missing facade band ${bandId}`);
    assert.ok(band.topTile >= 2065, `${bandId} must be a separated Level Two band`);
  }
}

const { scene, sprites, view } = makeScene();
const system = new DeepWorldLivingBackdropSystem(scene);
const twin = new DeepWorldLivingBackdropSystem(scene);
for (const kind of Object.keys(DEEP_WORLD_LIVING_BACKDROP.layers)) {
  const anchors = system.anchorsByKind[kind];
  assert.ok(anchors.length > 0, `${kind} needs deterministic deep anchors`);
  assert.deepEqual(anchors.slice(0, 3), twin.anchorsByKind[kind].slice(0, 3));
  for (const anchor of anchors) {
    const band = facadeBands.get(anchor.bandId);
    assert.ok(anchor.xTile >= 132 && anchor.xTile < 280, `${kind} x must remain in Level Two`);
    assert.ok(anchor.yTile >= 2065 && anchor.yTile < 5065, `${kind} y must remain in Level Two`);
    assert.ok(anchor.yTile >= band.topTile && anchor.yTile < band.bottomTileExclusive,
      `${kind} must inherit ${anchor.bandId} bounds`);
  }
}
assert.equal(system.create(), true);
for (const [kind, max] of Object.entries(DEEP_WORLD_LIVING_BACKDROP.performance.maxVisible)) {
  assert.equal(system.pools[kind].length, max, `${kind} pool must stay fixed`);
  assert.ok(system.pools[kind].every(actor => actor.sprite.scrollFactor === 1), `${kind} must be world-space`);
}

const first = system.anchorsByKind.ember[0];
view.x = first.xTile * 94 - view.width / 2;
view.y = first.yTile * 94 - view.height / 2;
system.update(1000);
const visibleEmber = system.pools.ember.find(actor => actor.sprite.visible);
assert.ok(visibleEmber, "deep camera should activate a pooled ember");
assert.ok(visibleEmber.sprite.y > 2065 * 94, "pose must use world y rather than camera y");
assert.ok(Math.abs(visibleEmber.sprite.x - first.xTile * 94) < 94,
  "deep wind must be strongly attenuated underground");

const steamProbe = makeSprite(null, null);
const steamAnchor = system.anchorsByKind.steam[0];
const steamLayer = DEEP_WORLD_LIVING_BACKDROP.layers.steam;
system._applyPose(steamProbe, steamAnchor, steamLayer, 94, 1000,
  { night: 0.75, fog: 0.6, rain: 0.8, gust: 0.7, wind: 96 });
const stormPose = { x: steamProbe.x, alpha: steamProbe.alpha };
system._applyPose(steamProbe, steamAnchor, steamLayer, 94, 1000,
  { night: 0.75, fog: 0, rain: 0, gust: 0, wind: 0 });
assert.notEqual(steamProbe.alpha, stormPose.alpha, "weather must still softly modulate deep steam");
assert.ok(Math.abs(steamProbe.alpha - stormPose.alpha) < 0.01,
  "surface weather modulation must be strongly attenuated at Level Two depth");
assert.ok(Math.abs(steamProbe.x - stormPose.x) < 1,
  "surface wind displacement must stay below one pixel underground");

scene.game.loop.actualFps = 40;
system.nextUpdateAt = 0;
system.update(2000);
for (const [kind, cap] of Object.entries(DEEP_WORLD_LIVING_BACKDROP.performance.reducedMaxVisible)) {
  assert.ok(system.pools[kind].filter(actor => actor.sprite.visible).length <= cap, `${kind} must respect reduced cap`);
}
scene.game.loop.actualFps = 20;
system.nextUpdateAt = 0;
system.update(3000);
assert.ok(sprites.every(sprite => !sprite.visible), "low FPS gate must hide the entire pass");

globalThis.location.search = "?deepWorldLiving=0&worldFacade=1";
assert.equal(resolveDeepWorldLivingBackdropEnabled(), false);
assert.equal(new DeepWorldLivingBackdropSystem(makeScene().scene).create(), false);
globalThis.location.search = "?deepWorldLiving=1&worldMotion=0&worldFacade=1";
assert.equal(resolveDeepWorldLivingBackdropEnabled(), false, "shared motion rollback must win");
const missingFacade = makeScene().scene;
missingFacade.worldScenicFacadeSystem.enabled = false;
globalThis.location.search = "?deepWorldLiving=1&worldFacade=0";
assert.equal(new DeepWorldLivingBackdropSystem(missingFacade).create(), false);

system.destroy();
assert.ok(sprites.every(sprite => sprite.destroyed), "destroy must release every pooled sprite");
console.log("Deep world living backdrop smoke test passed");
