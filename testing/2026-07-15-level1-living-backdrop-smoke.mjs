import assert from "node:assert/strict";

import { ASSET_KEYS } from "../values/assetKeys.js";
import { LEVEL_ONE_LIVING_BACKDROP } from "../values/levelOneLivingBackdrop.js";
import { LevelOneLivingBackdropSystem } from "../world/rendering/LevelOneLivingBackdropSystem.js";

globalThis.Phaser = {
  BlendModes: { NORMAL: 0, SCREEN: 1 },
  Scenes: { Events: { SHUTDOWN: "shutdown" } },
};
globalThis.location = { search: "" };

function fakeTexture(width, height) {
  const frames = new Set();
  return {
    has(name) { return frames.has(name); },
    add(name) { frames.add(name); },
    getSourceImage() { return { width, height }; },
  };
}

function fakeImage(x, y, key, frame) {
  return {
    x,
    y,
    texture: { key },
    frame: { name: frame },
    visible: true,
    setOrigin() { return this; },
    setDepth(value) { this.depth = value; return this; },
    setAlpha(value) { this.alpha = value; return this; },
    setVisible(value) { this.visible = value; return this; },
    setScrollFactor(value) { this.scrollFactor = value; return this; },
    setBlendMode(value) { this.blendMode = value; return this; },
    setFrame(value) { this.frame.name = value; return this; },
    setPosition(nextX, nextY) { this.x = nextX; this.y = nextY; return this; },
    setDisplaySize(width, height) { this.displayWidth = width; this.displayHeight = height; return this; },
    setRotation(value) { this.rotation = value; return this; },
    setTint(value) { this.tint = value; return this; },
    destroy() { this.destroyed = true; },
  };
}

const atmosphereTexture = fakeTexture(1200, 900);
const images = [];
const scene = {
  add: {
    image(x, y, key, frame) {
      const image = fakeImage(x, y, key, frame);
      images.push(image);
      return image;
    },
  },
  cameras: {
    main: {
      worldView: { x: 0, y: 65 * 94, width: 30 * 94, height: 10 * 94 },
      scrollX: 0,
      scrollY: 65 * 94,
      width: 1280,
      height: 720,
      zoom: 1,
    },
  },
  config: { tileSize: 94 },
  dayNightCycle: { getNightAmount: () => 0.7 },
  events: { once() {}, off() {} },
  game: { loop: { actualFps: 60 } },
  textures: {
    get(key) {
      return key === ASSET_KEYS.environment.skylineWeatherVfx.atmosphere
        ? atmosphereTexture
        : null;
    },
  },
  time: { now: 8000 },
  weatherSystem: {
    wind: 24,
    getLightingSnapshot: () => ({
      fogAmount: 0.35,
      rainAmount: 0.55,
      wind: 24,
      windGustAmount: 0.4,
      undergroundSignal: 0.12,
    }),
  },
  worldBackgroundMasterSystem: { enabled: true, depthEnabled: true },
};

const system = new LevelOneLivingBackdropSystem(scene);
const twin = new LevelOneLivingBackdropSystem(scene);
assert.deepEqual(system.anchors, twin.anchors, "anchor generation must be deterministic");
assert.ok(system.anchors.length > 2500,
  "the deterministic field must cover both complete 2,000-row authored regions");
assert.ok(system.anchors.every(anchor => {
  const region = LEVEL_ONE_LIVING_BACKDROP.regions[anchor.region];
  return region
    && anchor.xTile >= region.leftTile
    && anchor.xTile < region.rightTileExclusive
    && anchor.yTile >= region.topTile
    && anchor.yTile < region.bottomTileExclusive;
}), "all anchors must remain inside their authored Level 1 or Level 2 strip");
assert.deepEqual(new Set(system.anchors.map(anchor => anchor.region)), new Set(["level1", "level2"]));
assert.deepEqual(new Set(system.anchors.map(anchor => anchor.kind)), new Set([
  "mist", "crystalAura", "level2Smoke", "level2Steam",
]));
assert.ok(system.anchors.every(anchor => anchor.periodMs >= 7000 && anchor.periodMs <= 18000),
  "all ambient cycles must stay within the soft 7-18 second range");

const representativeBounds = [
  { left: 0, right: 34 * 94, top: 590 * 94, bottom: 610 * 94 },
  { left: 120 * 94, right: 158 * 94, top: 890 * 94, bottom: 910 * 94 },
];
for (const bounds of representativeBounds) {
  for (const kind of Object.keys(LEVEL_ONE_LIVING_BACKDROP.layers)) {
    const cap = LEVEL_ONE_LIVING_BACKDROP.performance.maxVisible[kind];
    const expected = system.anchorsByKind[kind]
      .filter(anchor => system._isVisible(anchor, bounds, 94))
      .slice(0, cap)
      .map(anchor => anchor.id);
    const actual = system._getVisibleAnchors(kind, bounds, 94, cap)
      .map(anchor => anchor.id);
    assert.deepEqual(actual, expected,
      `${kind} spatial lookup must preserve the authored full-scan selection order`);
  }
}
const mistIndex = system.anchorSpatialIndexByKind.mist;
const deepBounds = representativeBounds[0];
let indexedMistCandidates = 0;
for (
  let key = Math.floor(deepBounds.top / 94 / mistIndex.bucketSizeTiles);
  key <= Math.floor(deepBounds.bottom / 94 / mistIndex.bucketSizeTiles);
  key += 1
) {
  indexedMistCandidates += mistIndex.buckets.get(key)?.length || 0;
}
assert.ok(indexedMistCandidates < system.anchorsByKind.mist.length / 4,
  "deep-camera lookup must avoid scanning the complete 2,000-row anchor field");

assert.equal(system.create(), true);
const fullPoolSize = Object.values(LEVEL_ONE_LIVING_BACKDROP.performance.maxVisible)
  .reduce((sum, value) => sum + value, 0);
assert.equal(images.length, fullPoolSize, "only the fixed capped pool may allocate images");
assert.ok(images.every(image => image.scrollFactor === 1), "all pooled images must be world-space");
assert.equal(system.pools.mist[0].sprite.depth, -4.74);
assert.equal(system.pools.crystalAura[0].sprite.depth, -4.70);
assert.equal(system.pools.level2Smoke[0].sprite.depth, -4.73);
assert.equal(system.pools.level2Steam[0].sprite.depth, -4.69);
assert.equal(atmosphereTexture.has("atmosphere-0"), true);
assert.equal(atmosphereTexture.has("atmosphere-11"), true);

system.update(8000);
const visibleCount = () => Object.values(system.pools).flat()
  .filter(actor => actor.sprite.visible).length;
assert.ok(visibleCount() > 0 && visibleCount() <= fullPoolSize);
assert.equal(images.length, fullPoolSize, "updates must reuse the pool");

const beforeCameraMove = new Map(Object.values(system.pools).flat()
  .filter(actor => actor.anchorId)
  .map(actor => [actor.anchorId, { x: actor.sprite.x, y: actor.sprite.y }]));
scene.cameras.main.worldView.x += 94;
scene.cameras.main.scrollX += 94;
system.nextUpdateAt = 0;
system.update(8000);
const afterCameraMove = new Map(Object.values(system.pools).flat()
  .filter(actor => beforeCameraMove.has(actor.anchorId))
  .map(actor => [actor.anchorId, { x: actor.sprite.x, y: actor.sprite.y }]));
assert.ok(afterCameraMove.size > 0, "the nearby camera views should share anchors");
for (const [id, position] of afterCameraMove) {
  assert.deepEqual(position, beforeCameraMove.get(id), `${id} must not follow the camera`);
}

const steamSprite = system.pools.level2Steam[0].sprite;
const steamAnchor = system.anchorsByKind.level2Steam[0];
const steamLayer = LEVEL_ONE_LIVING_BACKDROP.layers.level2Steam;
const clearEnvironment = { night: 0, fog: 0, rain: 0, gust: 0, undergroundSignal: 0, wind: 0 };
const stormEnvironment = { night: 1, fog: 1, rain: 1, gust: 1, undergroundSignal: 0, wind: 72 };
system._applyPose(steamSprite, { ...steamAnchor, yTile: 66 }, steamLayer, 94, 8000, clearEnvironment);
const surfaceClearAlpha = steamSprite.alpha;
system._applyPose(steamSprite, { ...steamAnchor, yTile: 66 }, steamLayer, 94, 8000, stormEnvironment);
const surfaceStormAlpha = steamSprite.alpha;
system._applyPose(steamSprite, { ...steamAnchor, yTile: 600 }, steamLayer, 94, 8000, clearEnvironment);
const deepClearAlpha = steamSprite.alpha;
system._applyPose(steamSprite, { ...steamAnchor, yTile: 600 }, steamLayer, 94, 8000, stormEnvironment);
const deepStormAlpha = steamSprite.alpha;
assert.ok(surfaceStormAlpha > surfaceClearAlpha,
  "rain, fog, and night must strengthen near-surface steam subtly");
assert.ok(Math.abs(deepStormAlpha - deepClearAlpha) < 0.000001,
  "surface weather and day/night modulation must fade out at cave depth");

scene.game.loop.actualFps = 42;
system.nextUpdateAt = 0;
system.update(9000);
for (const [kind, pool] of Object.entries(system.pools)) {
  assert.ok(pool.filter(actor => actor.sprite.visible).length
    <= LEVEL_ONE_LIVING_BACKDROP.performance.reducedMaxVisible[kind]);
}

scene.game.loop.actualFps = 30;
system.update(9100);
assert.equal(visibleCount(), 0, "the backdrop must switch off below the FPS floor");

scene.game.loop.actualFps = 60;
scene.worldBackgroundMasterSystem.depthEnabled = false;
system.update(9200);
assert.equal(visibleCount(), 0, "depth rollback must hide every actor");
scene.worldBackgroundMasterSystem.depthEnabled = true;
scene.cameras.main.worldView.x = 130 * 94;
scene.cameras.main.scrollX = 130 * 94;
scene.cameras.main.worldView.y = 2055 * 94;
system.nextUpdateAt = 0;
system.update(9250);
assert.ok(system.pools.level2Smoke.some(actor => actor.sprite.visible)
  || system.pools.level2Steam.some(actor => actor.sprite.visible),
"the living backdrop must reach the final authored Level 2 camera band");
scene.cameras.main.worldView.y = 10 * 94;
system.nextUpdateAt = 0;
system.update(9300);
assert.equal(visibleCount(), 0, "surface camera views must not show underground actors");

system.destroy();
assert.ok(images.every(image => image.destroyed), "destroy must release the complete pool");

const rollbackImageCount = images.length;
globalThis.location.search = "?worldLiving=0";
const rollback = new LevelOneLivingBackdropSystem(scene);
assert.equal(rollback.create(), false);
assert.equal(images.length, rollbackImageCount, "query rollback must allocate nothing");

globalThis.location.search = "?level1Living=0";
const legacyRollback = new LevelOneLivingBackdropSystem(scene);
assert.equal(legacyRollback.create(), false, "the Level 1 rollback alias must remain supported");

globalThis.location.search = "?worldMotion=0&worldLiving=1";
const sharedRollback = new LevelOneLivingBackdropSystem(scene);
assert.equal(sharedRollback.create(), false, "shared motion rollback must win over the narrow enable flag");

globalThis.location.search = "";
scene.worldBackgroundMasterSystem.enabled = false;
const missingMaster = new LevelOneLivingBackdropSystem(scene);
assert.equal(missingMaster.create(), false, "master rollback must prevent creation");

console.log("Authored-world living backdrop smoke: two-region atlas field, pooling, world space, depth-aware weather, FPS gates, and rollback passed");
