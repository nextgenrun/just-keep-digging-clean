import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import {
  WORLD_VISUAL_DEPTH_BACKDROPS,
  getWorldVisualDepthBackdropAllAssets,
  getWorldVisualDepthBackdropPreloadAssets,
  isWorldVisualDepthBackdropCoveredTile,
  isWorldVisualDepthBackdropRegionReady,
  resolveWorldVisualDepthBackdropMotionEnabled,
  resolveWorldVisualDepthBackdropRegionAssets,
  resolveWorldVisualDepthBackdropRegions,
  resolveWorldVisualDepthBackdropVariantsEnabled,
  resolveWorldVisualDepthBackdropsEnabled,
} from "../values/worldVisualDepthBackdrops.js";
import { resolveWorldVisualMaterialBands } from "../values/worldVisualMaterials.js";
import { WORLD_VISUAL_RUNTIME } from "../values/worldVisualRuntime.js";
import { WorldVisualDepthBackdropStage } from "../world/rendering/scenic-world/WorldVisualDepthBackdropStage.js";
import { WorldVisualMaterialField } from "../world/rendering/scenic-world/WorldVisualMaterialField.js";

const LEGACY_QUERY = "?biomeBackdropVariants=0";
const regionAssets = (region, search = "") => (
  resolveWorldVisualDepthBackdropRegionAssets(region, WORLD_VISUAL_DEPTH_BACKDROPS, search)
);

assert.equal(resolveWorldVisualDepthBackdropsEnabled(undefined, ""), true);
assert.equal(resolveWorldVisualDepthBackdropsEnabled(undefined, "?levelOneBackdrops=0"), false);
assert.equal(resolveWorldVisualDepthBackdropsEnabled(undefined, "?shallowCavern=off"), false);
assert.equal(resolveWorldVisualDepthBackdropVariantsEnabled(undefined, ""), true);
assert.equal(resolveWorldVisualDepthBackdropVariantsEnabled(undefined, LEGACY_QUERY), false);
assert.equal(resolveWorldVisualDepthBackdropMotionEnabled(undefined, ""), true);
assert.equal(resolveWorldVisualDepthBackdropMotionEnabled(undefined, "?biomeBackdropMotion=0"), false);
assert.equal(resolveWorldVisualDepthBackdropMotionEnabled(undefined, "?worldMotion=off"), false);
assert.deepEqual(
  getWorldVisualDepthBackdropPreloadAssets().map(entry => entry.key),
  ["world-visual-biome-weathered-roots-root-canyon", "bg-sky-v3-clouds-near"],
  "the first roots plate and shared mist start resident"
);
assert.deepEqual(
  getWorldVisualDepthBackdropPreloadAssets(undefined, LEGACY_QUERY).map(entry => entry.key),
  ["world-visual-v2-shallow-cavern-backwall", "bg-sky-v3-clouds-near"],
  "the variant rollback restores the original startup plate"
);
assert.equal(getWorldVisualDepthBackdropPreloadAssets(undefined, "?levelOneBackdrops=0").length, 0);

const { regions, segment, assets, render } = WORLD_VISUAL_DEPTH_BACKDROPS;
assert.deepEqual(regions.map(({ id, topTile, bottomTileExclusive }) => (
  { id, topTile, bottomTileExclusive }
)), [
  { id: "surface-entry", topTile: 65, bottomTileExclusive: 160 },
  { id: "level1-blue", topTile: 160, bottomTileExclusive: 520 },
  { id: "level1-amber", topTile: 520, bottomTileExclusive: 1040 },
  { id: "level1-silver", topTile: 1040, bottomTileExclusive: 1600 },
  { id: "level1-magma", topTile: 1600, bottomTileExclusive: 2065 },
  { id: "level2-slagworks", topTile: 2065, bottomTileExclusive: 2665 },
  { id: "level2-obsidian", topTile: 2665, bottomTileExclusive: 3265 },
  { id: "level2-foundry", topTile: 3265, bottomTileExclusive: 3865 },
  { id: "level2-blackglass", topTile: 3865, bottomTileExclusive: 4465 },
  { id: "level2-starfire", topTile: 4465, bottomTileExclusive: 5065 },
]);
assert.equal(segment.logicalWidthPx, 1536);
assert.equal(segment.logicalHeightPx, 1024);
assert.equal(segment.neighborSegments, 1);
assert.ok(
  [render.backwallDepth, render.emissiveDepth, render.mistDepth, render.ambientDepth]
    .every(depth => depth < WORLD_VISUAL_RUNTIME.render.terrainDepth),
  "all scenic structures and motion render behind authoritative terrain"
);
assert.ok(regions.every(region => regionAssets(region).length === 5), "every biome has five new plates");
assert.ok(regions.slice(0, 5).every(region => regionAssets(region, LEGACY_QUERY).length > 0));
assert.ok(regions.slice(5).every(region => regionAssets(region, LEGACY_QUERY).length === 0));
assert.equal(getWorldVisualDepthBackdropAllAssets().length, 50);

const boundaryContracts = [
  [160, "surface-entry", "level1-blue", "surface-earth", "level1-shallow"],
  [520, "level1-blue", "level1-amber", "level1-shallow", "level1-amber"],
  [1040, "level1-amber", "level1-silver", "level1-amber", "level1-silver"],
  [1600, "level1-silver", "level1-magma", "level1-silver", "level1-deep-magma"],
  [2065, "level1-magma", "level2-slagworks", "level1-deep-magma", "level2-magma"],
  [2665, "level2-slagworks", "level2-obsidian", "level2-magma", "level2-obsidian"],
  [3265, "level2-obsidian", "level2-foundry", "level2-obsidian", "level2-foundry"],
  [3865, "level2-foundry", "level2-blackglass", "level2-foundry", "level2-blackglass"],
  [4465, "level2-blackglass", "level2-starfire", "level2-blackglass", "level2-starfire"],
];
for (const [row, outgoingBackdrop, incomingBackdrop, outgoingMaterial, incomingMaterial] of boundaryContracts) {
  assert.deepEqual(
    resolveWorldVisualDepthBackdropRegions(row - 1, row + 1).map(entry => entry.id),
    [outgoingBackdrop, incomingBackdrop],
    `row ${row} backdrop transition pair`
  );
  assert.deepEqual(
    resolveWorldVisualMaterialBands(row - 1, row + 1).map(entry => entry.id),
    [outgoingMaterial, incomingMaterial],
    `row ${row} ground transition pair`
  );
  assert.deepEqual(
    resolveWorldVisualDepthBackdropRegions(row, row + 1).map(entry => entry.id),
    [incomingBackdrop],
    `row ${row} incoming backdrop`
  );
}
assert.deepEqual(resolveWorldVisualDepthBackdropRegions(2100, 2101, undefined, LEGACY_QUERY), []);
assert.equal(isWorldVisualDepthBackdropCoveredTile(0, 65), true);
assert.equal(isWorldVisualDepthBackdropCoveredTile(279, 5064), true);
assert.equal(isWorldVisualDepthBackdropCoveredTile(0, 5065), false);
assert.equal(isWorldVisualDepthBackdropCoveredTile(280, 100), false);
assert.equal(isWorldVisualDepthBackdropCoveredTile(0, 2100, undefined, LEGACY_QUERY), false);

function webpDimensions(buffer) {
  assert.equal(buffer.toString("ascii", 0, 4), "RIFF");
  assert.equal(buffer.toString("ascii", 8, 12), "WEBP");
  const chunk = buffer.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    return [buffer.readUIntLE(24, 3) + 1, buffer.readUIntLE(27, 3) + 1];
  }
  if (chunk === "VP8L") {
    const bits = buffer.readUInt32LE(21);
    return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1];
  }
  const signature = buffer.indexOf(Buffer.from([0x9d, 0x01, 0x2a]), 20);
  assert.ok(signature >= 0, `unsupported WebP chunk ${chunk}`);
  return [
    buffer.readUInt16LE(signature + 3) & 0x3fff,
    buffer.readUInt16LE(signature + 5) & 0x3fff,
  ];
}

const assetKeys = new Set();
const assetPaths = new Set();
for (const entry of getWorldVisualDepthBackdropAllAssets()) {
  const webp = fs.readFileSync(new URL(`../${entry.path}`, import.meta.url));
  assert.deepEqual(webpDimensions(webp), [1536, 1024], `${entry.key} exact production dimensions`);
  assert.ok(webp.length > 4096, `${entry.key} is not an empty placeholder`);
  assetKeys.add(entry.key);
  assetPaths.add(entry.path);
}
assert.equal(assetKeys.size, 50);
assert.equal(assetPaths.size, 50);

class FakeLoader extends EventEmitter {
  constructor() {
    super();
    this.loading = false;
    this.queued = [];
  }
  isLoading() { return this.loading; }
  image(key, path) { this.queued.push({ key, path }); }
  start() { this.loading = true; }
}

class FakeImage {
  constructor(x, y, key) {
    this.x = x;
    this.y = y;
    this.key = key;
    this.scaleX = 1;
    this.scaleY = 1;
  }
  setOrigin() { return this; }
  setDepth(value) { this.depth = value; return this; }
  setCrop(x, y, width, height) { this.crop = { x, y, width, height }; return this; }
  setDisplaySize(width, height) { this.displayWidth = width; this.displayHeight = height; return this; }
  setFlipX(value) { this.flipX = value; return this; }
  setFlipY(value) { this.flipY = value; return this; }
  setBlendMode(value) { this.blendMode = value; return this; }
  setTint(value) { this.tint = value; return this; }
  setAlpha(value) { this.alpha = value; return this; }
  setPosition(x, y) { this.x = x; this.y = y; return this; }
  setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; }
  destroy() { this.destroyed = true; }
}

function fakeGraphics() {
  return {
    fills: [],
    clear() { this.fills = []; return this; },
    fillStyle(tint, alpha) { this.style = { tint, alpha }; return this; },
    fillRect(x, y, width, height) {
      this.fills.push({ shape: "rect", x, y, width, height });
      return this;
    },
    fillCircle(x, y, radius) {
      this.fills.push({ shape: "circle", x, y, radius });
      return this;
    },
    setDepth(value) { this.depth = value; return this; },
    setBlendMode(value) { this.blendMode = value; return this; },
    destroy() { this.destroyed = true; },
  };
}

globalThis.Phaser = { BlendModes: { SCREEN: "screen", ADD: "add" } };
const loader = new FakeLoader();
const surfaceAssets = regionAssets(regions[0]);
const surfaceKey = surfaceAssets[0].key;
const textureKeys = new Set([surfaceKey, assets.mist.key]);
const removedKeys = [];
const fakeScene = {
  config: { tileSize: 94 },
  time: { now: 0 },
  game: { loop: { actualFps: 60 } },
  load: loader,
  textures: {
    exists: key => textureKeys.has(key),
    get: key => ({
      getSourceImage: () => key === assets.mist.key
        ? { width: 2048, height: 768 }
        : { width: 1536, height: 1024 },
    }),
    remove: key => { removedKeys.push(key); textureKeys.delete(key); },
  },
  add: {
    image: (x, y, key) => new FakeImage(x, y, key),
    graphics: () => fakeGraphics(),
  },
};
const complete = key => {
  textureKeys.add(key);
  loader.emit(`filecomplete-image-${key}`);
};
const completeRegion = region => regionAssets(region).forEach(entry => complete(entry.key));
const neutralLighting = { farTint: 0xffffff, lightning: 0, wet: 0, fog: 0 };

const stage = new WorldVisualDepthBackdropStage(fakeScene);
assert.equal(stage.create(), true);
assert.ok(stage.ambientLayer, "ambient motion layer is enabled by default");
assert.equal(stage.sync({ left: 73, right: 84, top: 150, bottom: 160 }, neutralLighting), true);
assert.equal(stage.segments.size, 0, "surface waits for all five production plates");
assert.deepEqual(
  loader.queued.map(entry => entry.key),
  surfaceAssets.slice(1).map(entry => entry.key)
);
surfaceAssets.slice(1).forEach(entry => complete(entry.key));
loader.queued = [];

const assertNear = (actual, expected, message) => assert.ok(
  Math.abs(actual - expected) < 0.000001,
  `${message}: expected ${expected}, got ${actual}`
);
const assertRegionTailCrop = (region, expectedRow, expectedTiles, expectedSourceHeight) => {
  assert.equal(stage.sync(
    { left: 73, right: 84, top: region.bottomTileExclusive - 1, bottom: region.bottomTileExclusive },
    neutralLighting,
    true
  ), true, `${region.id} tail resolves`);
  const tail = [...stage.segments.entries()].find(([key, entry]) => (
    key.startsWith(`${region.id}:`) && entry.row === expectedRow
  ))?.[1];
  assert.ok(tail, `${region.id} final card is visible`);
  for (const layerName of ["backwall", "emissive"]) {
    const card = tail[layerName];
    assertNear(card.displayHeight, expectedTiles * 94, `${region.id} ${layerName} display tail`);
    assert.equal(card.crop.height, expectedSourceHeight, `${region.id} ${layerName} source crop`);
    assert.equal(card.crop.y, card.flipY ? 1024 - expectedSourceHeight : 0);
  }
  return tail;
};

const surfaceTail = assertRegionTailCrop(regions[0], 8, 738 / 94, 738);
assert.equal(surfaceTail.emissive.blendMode, "screen");
assert.ok(surfaceTail.backwall.depth < WORLD_VISUAL_RUNTIME.render.terrainDepth);
stage.update(1000, neutralLighting);
assert.ok(stage.ambientLayer.graphics.fills.length > 0, "pooled scenic motes animate");
fakeScene.game.loop.actualFps = 20;
stage.update(2000, neutralLighting);
assert.equal(stage.ambientLayer.graphics.fills.length, 0, "ambient motes shed below the FPS floor");
fakeScene.game.loop.actualFps = 60;

const blue = regions[1];
assert.equal(stage.sync({ left: 0, right: 50, top: 200, bottom: 210 }, neutralLighting), true);
assert.equal(stage.segments.size, 0, "generic material remains while blue plates stream");
assert.deepEqual(loader.queued.map(entry => entry.key), regionAssets(blue).map(entry => entry.key));
complete(regionAssets(blue)[0].key);
assert.equal(isWorldVisualDepthBackdropRegionReady(
  blue,
  key => textureKeys.has(key),
  regionAssets(blue)
), false);
const fallbackField = new WorldVisualMaterialField(fakeScene, { getTileType: () => 1 });
fallbackField.backdropMaskGraphics = fakeGraphics();
fallbackField._drawBackdropMask({ left: 0, right: 50, top: 200, bottom: 210 }, 94);
assert.equal(fallbackField.backdropMaskGraphics.fills.length, 1);
regionAssets(blue).slice(1).forEach(entry => complete(entry.key));
fallbackField._drawBackdropMask({ left: 0, right: 50, top: 200, bottom: 210 }, 94);
assert.equal(
  fallbackField.backdropMaskGraphics.fills.length,
  0,
  "generic cave fill disappears only when every selected plate is resident"
);
stage.sync({ left: 0, right: 100, top: 200, bottom: 240 }, neutralLighting, true);
assert.deepEqual(
  new Set([...stage.segments.values()].map(entry => entry.backwall.key)),
  new Set(regionAssets(blue).map(entry => entry.key)),
  "all five plates participate in deterministic card variation"
);
assertRegionTailCrop(blue, 33, 48 / 94, 48);

const tailContracts = [
  [regions[2], 47, 752],
  [regions[3], 51, 416],
  [regions[4], 42, 702],
  ...regions.slice(5).map(region => [region, 55, 80]),
];
for (const [region, row, pixels] of tailContracts) {
  stage.sync(
    { left: 10, right: 20, top: region.topTile + 1, bottom: region.topTile + 8 },
    neutralLighting
  );
  assert.equal(stage.segments.size, 0, `${region.id} waits for its full pool`);
  completeRegion(region);
  assert.ok([...stage.segments.keys()].some(key => key.startsWith(`${region.id}:`)));
  assertRegionTailCrop(region, row, pixels / 94, pixels);
}
assert.ok(removedKeys.includes(regionAssets(blue)[0].key), "departed biome plates are released");
assert.equal(textureKeys.has(surfaceKey), true, "startup plate stays retained");
assert.equal(
  stage.sync({ left: 10, right: 20, top: 5065, bottom: 5066 }, neutralLighting),
  false,
  "scenic bands stop at the authored world boundary"
);
assert.equal(stage.segments.size, 0);
fallbackField.destroy();
stage.destroy();

const staticStage = new WorldVisualDepthBackdropStage(fakeScene, undefined, "?biomeBackdropMotion=0");
assert.equal(staticStage.create(), true);
assert.equal(staticStage.motionEnabled, false);
assert.equal(staticStage.ambientLayer, null);
staticStage.destroy();
const disabledStage = new WorldVisualDepthBackdropStage(fakeScene, undefined, "?shallowCavern=0");
assert.equal(disabledStage.create(), false);

const viewSource = fs.readFileSync(
  new URL("../world/rendering/scenic-world/WorldVisualDepthBackdropRegionView.js", import.meta.url),
  "utf8"
);
const ambientSource = fs.readFileSync(
  new URL("../world/rendering/scenic-world/WorldVisualDepthAmbientLayer.js", import.meta.url),
  "utf8"
);
const runtimeSource = fs.readFileSync(
  new URL("../world/rendering/scenic-world/WorldVisualRuntime.js", import.meta.url),
  "utf8"
);
const materialSource = fs.readFileSync(
  new URL("../world/rendering/scenic-world/WorldVisualMaterialField.js", import.meta.url),
  "utf8"
);
const bootSource = fs.readFileSync(new URL("../ui/scenes/BootScene.js", import.meta.url), "utf8");
assert.match(viewSource, /setCrop/);
assert.match(viewSource, /this\.backwalls/);
assert.match(viewSource, /emissiveScalePulse/);
assert.match(ambientSource, /actualFps/);
assert.match(ambientSource, /maxMotes/);
assert.doesNotMatch(`${viewSource}\n${ambientSource}`, /setTile|damageTile|digTile|createTilemap|WorldModel/);
assert.match(runtimeSource, /new WorldVisualDepthBackdropStage/);
assert.match(materialSource, /resolveWorldVisualDepthBackdropRegionAssets/);
assert.match(bootSource, /getWorldVisualDepthBackdropPreloadAssets/);

console.log("Scenic ten-biome depth-backdrop and ambient-motion contract passed");
