import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import {
  WORLD_VISUAL_DEPTH_BACKDROPS,
  getWorldVisualDepthBackdropPreloadAssets,
  isWorldVisualDepthBackdropCoveredTile,
  isWorldVisualDepthBackdropRegionReady,
  resolveWorldVisualDepthBackdropRegions,
  resolveWorldVisualDepthBackdropsEnabled,
} from "../values/worldVisualDepthBackdrops.js";
import { resolveWorldVisualMaterialBands } from "../values/worldVisualMaterials.js";
import { WorldVisualDepthBackdropStage } from "../world/rendering/scenic-world/WorldVisualDepthBackdropStage.js";
import { WorldVisualMaterialField } from "../world/rendering/scenic-world/WorldVisualMaterialField.js";

assert.equal(resolveWorldVisualDepthBackdropsEnabled(undefined, ""), true);
assert.equal(resolveWorldVisualDepthBackdropsEnabled(undefined, "?levelOneBackdrops=0"), false);
assert.equal(resolveWorldVisualDepthBackdropsEnabled(undefined, "?shallowCavern=off"), false);
assert.deepEqual(
  getWorldVisualDepthBackdropPreloadAssets().map(assetEntry => assetEntry.key),
  ["world-visual-v2-shallow-cavern-backwall", "bg-sky-v3-clouds-near"],
  "surface backwall and the shared mist veil start resident",
);
assert.equal(getWorldVisualDepthBackdropPreloadAssets(undefined, "?levelOneBackdrops=0").length, 0);

const { regions, segment, assets } = WORLD_VISUAL_DEPTH_BACKDROPS;
assert.deepEqual(regions.map(({ id, topTile, bottomTileExclusive }) => (
  { id, topTile, bottomTileExclusive }
)), [
  { id: "surface-entry", topTile: 65, bottomTileExclusive: 160 },
  { id: "level1-blue", topTile: 160, bottomTileExclusive: 520 },
  { id: "level1-amber", topTile: 520, bottomTileExclusive: 1040 },
  { id: "level1-silver", topTile: 1040, bottomTileExclusive: 1600 },
  { id: "level1-magma", topTile: 1600, bottomTileExclusive: 2065 },
]);
assert.equal(segment.logicalWidthPx, 1536);
assert.equal(segment.logicalHeightPx, 1024);
assert.equal(segment.neighborSegments, 1);

const boundaryContracts = [
  [160, ["surface-entry", "level1-blue"], ["surface-earth", "level1-shallow"], ["level1-blue"], ["level1-shallow"]],
  [520, ["level1-blue", "level1-amber"], ["level1-shallow", "level1-amber"], ["level1-amber"], ["level1-amber"]],
  [1040, ["level1-amber", "level1-silver"], ["level1-amber", "level1-silver"], ["level1-silver"], ["level1-silver"]],
  [1600, ["level1-silver", "level1-magma"], ["level1-silver", "level1-deep-magma"], ["level1-magma"], ["level1-deep-magma"]],
  [2065, ["level1-magma"], ["level1-deep-magma", "level2-magma"], [], ["level2-magma"]],
];

for (const [row, straddledBackdrops, straddledMaterials, incomingBackdrops, incomingMaterials] of boundaryContracts) {
  assert.deepEqual(
    resolveWorldVisualDepthBackdropRegions(row - 1, row + 1).map(entry => entry.id),
    straddledBackdrops,
    `row ${row} backdrop transition pair`
  );
  assert.deepEqual(
    resolveWorldVisualMaterialBands(row - 1, row + 1).map(entry => entry.id),
    straddledMaterials,
    `row ${row} material transition pair`
  );
  assert.deepEqual(
    resolveWorldVisualDepthBackdropRegions(row, row + 1).map(entry => entry.id),
    incomingBackdrops,
    `row ${row} backdrop owner`
  );
  assert.deepEqual(
    resolveWorldVisualMaterialBands(row, row + 1).map(entry => entry.id),
    incomingMaterials,
    `row ${row} material owner`
  );
}

assert.deepEqual(resolveWorldVisualDepthBackdropRegions(2100, 2101), []);
assert.deepEqual(
  resolveWorldVisualMaterialBands(2100, 2101).map(entry => entry.id),
  ["level2-magma"],
  "Level 2 retains its material without inheriting a Level 1 scenic backdrop"
);
assert.equal(isWorldVisualDepthBackdropCoveredTile(0, 65), true);
assert.equal(isWorldVisualDepthBackdropCoveredTile(279, 2064), true);
assert.equal(isWorldVisualDepthBackdropCoveredTile(0, 2065), false);
assert.equal(isWorldVisualDepthBackdropCoveredTile(0, 2100), false);
assert.equal(isWorldVisualDepthBackdropCoveredTile(280, 100), false);

for (const region of regions) {
  for (const backwall of region.backwalls) {
    const png = fs.readFileSync(new URL(`../${backwall.path}`, import.meta.url));
    assert.equal(png.toString("ascii", 1, 4), "PNG", `${backwall.key} is PNG`);
    assert.equal(png.readUInt32BE(16), 1536, `${backwall.key} width`);
    assert.equal(png.readUInt32BE(20), 1024, `${backwall.key} height`);
  }
}

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
  constructor(x, y, key) { this.x = x; this.y = y; this.key = key; }
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
  destroy() { this.destroyed = true; }
}

function fakeMaskGraphics() {
  return {
    fills: [],
    clear() { this.fills = []; return this; },
    fillStyle() { return this; },
    fillRect(x, y, width, height) {
      this.fills.push({ x, y, width, height });
      return this;
    },
    destroy() {},
  };
}

globalThis.Phaser = { BlendModes: { SCREEN: "screen", ADD: "add" } };
const loader = new FakeLoader();
const surfaceKey = regions[0].backwall.key;
const textureKeys = new Set([surfaceKey, assets.mist.key]);
const removedKeys = [];
const images = [];
const fakeScene = {
  config: { tileSize: 94 },
  time: { now: 0 },
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
  add: { image: (x, y, key) => { const image = new FakeImage(x, y, key); images.push(image); return image; } },
};
const complete = key => {
  textureKeys.add(key);
  loader.emit(`filecomplete-image-${key}`);
};

const stage = new WorldVisualDepthBackdropStage(fakeScene);
assert.equal(stage.create(), true);
const neutralLighting = { farTint: 0xffffff, lightning: 0, wet: 0, fog: 0 };
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
  assert.ok(tail, `${region.id} final ${expectedTiles}-tile card is visible`);
  for (const layerName of ["backwall", "emissive"]) {
    const card = tail[layerName];
    assertNear(card.displayHeight, expectedTiles * 94, `${region.id} ${layerName} display tail`);
    assert.equal(card.crop.height, expectedSourceHeight, `${region.id} ${layerName} source crop height`);
    assert.equal(
      card.crop.y,
      card.flipY ? 1024 - expectedSourceHeight : 0,
      `${region.id} ${layerName} source crop edge follows vertical flip`
    );
  }
  const mistCropHeight = Math.round(768 * (expectedTiles * 94) / segment.logicalHeightPx);
  const mistWidthScale = (segment.logicalWidthPx + segment.overlapPx) / 2048;
  assert.equal(tail.mist.crop.height, mistCropHeight, `${region.id} mist proportional source crop`);
  assert.equal(
    tail.mist.crop.y,
    tail.mist.flipY ? 768 - mistCropHeight : 0,
    `${region.id} mist crop edge follows vertical flip`
  );
  assertNear(
    tail.mist.displayHeight,
    Math.min(expectedTiles * 94, mistCropHeight * mistWidthScale),
    `${region.id} mist keeps its source aspect instead of stretching to card height`
  );
  return tail;
};

const finalSurfaceSegment = assertRegionTailCrop(regions[0], 8, 738 / 94, 738);
assert.equal(finalSurfaceSegment.emissive.blendMode, "screen");
assert.ok(finalSurfaceSegment.emissive.alpha > 0 && finalSurfaceSegment.emissive.alpha < 0.08);
const fullNativeSegment = [...stage.segments.values()].find(entry => (
  entry.backwall.crop.width === segment.logicalWidthPx
  && entry.backwall.crop.height === segment.logicalHeightPx
));
assert.ok(fullNativeSegment, "surface streaming retains a full native-density plate");
assert.equal(fullNativeSegment.backwall.displayWidth, segment.logicalWidthPx + segment.overlapPx);
assert.equal(fullNativeSegment.backwall.displayHeight, segment.logicalHeightPx + segment.overlapPx);
assert.ok(fullNativeSegment.mist.displayHeight < fullNativeSegment.backwall.displayHeight * 0.6);

const blue = regions[1];
assert.equal(stage.sync(
  { left: 0, right: 50, top: 200, bottom: 210 },
  { farTint: 0xffffff, lightning: 0, wet: 0, fog: 0 }
), true);
assert.equal(stage.segments.size, 0, "generic material remains while both blue plates stream");
assert.deepEqual(loader.queued.map(entry => entry.key), blue.backwalls.map(entry => entry.key));
complete(blue.backwalls[0].key);
assert.equal(stage.segments.size, 0, "one of two variants is not considered region-ready");
assert.equal(isWorldVisualDepthBackdropRegionReady(blue, key => textureKeys.has(key)), false);
const fallbackField = new WorldVisualMaterialField(fakeScene, { getTileType: () => 1 });
fallbackField.backdropMaskGraphics = fakeMaskGraphics();
fallbackField._drawBackdropMask({ left: 0, right: 50, top: 200, bottom: 210 }, 94);
assert.deepEqual(fallbackField.backdropMaskGraphics.fills, [{
  x: 0,
  y: 200 * 94,
  width: 50 * 94,
  height: 10 * 94,
}], "generic material backdrop remains fully visible while one blue plate is missing");
complete(blue.backwalls[1].key);
assert.equal(isWorldVisualDepthBackdropRegionReady(blue, key => textureKeys.has(key)), true);
fallbackField._drawBackdropMask({ left: 0, right: 50, top: 200, bottom: 210 }, 94);
assert.deepEqual(
  fallbackField.backdropMaskGraphics.fills,
  [],
  "generic material backdrop is suppressed only after every blue plate is ready"
);
assert.ok(stage.segments.size > 0);
assert.deepEqual(
  new Set([...stage.segments.values()].map(entry => entry.backwall.key)),
  new Set(blue.backwalls.map(entry => entry.key)),
  "blue A/B plates alternate deterministically"
);
assertRegionTailCrop(blue, 33, 48 / 94, 48);

const amber = regions[2];
stage.sync(
  { left: 10, right: 20, top: 515, bottom: 525 },
  { farTint: 0xffffff, lightning: 0.1, wet: 0, fog: 0.2 }
);
assert.deepEqual(stage.activeRegionIds, new Set([blue.id, amber.id]));
complete(amber.backwall.key);
assert.ok([...stage.segments.keys()].some(key => key.startsWith(`${blue.id}:`)));
assert.ok([...stage.segments.keys()].some(key => key.startsWith(`${amber.id}:`)));
assertRegionTailCrop(amber, 47, 752 / 94, 752);

const silver = regions[3];
stage.sync(
  { left: 10, right: 20, top: 1100, bottom: 1110 },
  { farTint: 0xffffff, lightning: 0, wet: 0, fog: 0 }
);
assert.ok(removedKeys.includes(blue.backwalls[0].key));
assert.ok(removedKeys.includes(blue.backwalls[1].key));
assert.ok(removedKeys.includes(amber.backwall.key));
assert.equal(textureKeys.has(surfaceKey), true, "surface startup plate stays retained");
complete(silver.backwall.key);
assert.ok([...stage.segments.keys()].every(key => key.startsWith(`${silver.id}:`)));
assert.equal(isWorldVisualDepthBackdropRegionReady(silver, key => textureKeys.has(key)), true);
assert.equal(isWorldVisualDepthBackdropRegionReady(blue, key => textureKeys.has(key)), false);
assertRegionTailCrop(silver, 51, 416 / 94, 416);

const magma = regions[4];
assert.equal(stage.sync(
  { left: 10, right: 20, top: 2060, bottom: 2065 },
  neutralLighting
), true);
assert.equal(stage.segments.size, 0, "magma waits for its streamed plate");
complete(magma.backwall.key);
assertRegionTailCrop(magma, 42, 702 / 94, 702);
assert.equal(stage.sync(
  { left: 10, right: 20, top: 2100, bottom: 2101 },
  neutralLighting
), false, "Level 1 scenic backdrops stop exactly before Level 2");
assert.equal(stage.segments.size, 0);
fallbackField.destroy();
stage.destroy();

const disabledStage = new WorldVisualDepthBackdropStage(fakeScene, undefined, "?shallowCavern=0");
assert.equal(disabledStage.create(), false);

const stageSource = fs.readFileSync(
  new URL("../world/rendering/scenic-world/WorldVisualDepthBackdropRegionView.js", import.meta.url),
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
assert.match(stageSource, /setCrop/);
assert.match(stageSource, /region\.backwalls/);
assert.match(stageSource, /emissive/);
assert.match(stageSource, /Phaser\.BlendModes\.SCREEN/);
assert.doesNotMatch(stageSource, /setTile|damageTile|digTile|createTilemap|WorldModel/);
assert.match(runtimeSource, /new WorldVisualDepthBackdropStage/);
assert.match(runtimeSource, /depthBackdropStage\?\.sync/);
assert.match(materialSource, /isWorldVisualDepthBackdropRegionReady/);
assert.match(bootSource, /getWorldVisualDepthBackdropPreloadAssets/);

console.log("Scenic Level 1 depth-backdrop contract passed");
