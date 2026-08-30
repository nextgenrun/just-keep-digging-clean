import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  WORLD_VISUAL_UNDERGROUND_DETAILS,
  getWorldVisualUndergroundDetailAssets,
  resolveWorldVisualUndergroundDetailKinds,
  resolveWorldVisualUndergroundDetailRegions,
} from "../values/worldVisualUndergroundDetails.js";
import {
  WORLD_VISUAL_TERRAIN_VARIATION,
  resolveWorldVisualTerrainVariationRegions,
} from "../values/worldVisualTerrainVariation.js";
import {
  WORLD_VISUAL_GROUND_STRUCTURES,
  getWorldVisualGroundStructureAssets,
  resolveWorldVisualGroundStructureRuntimeRegions,
} from "../values/worldVisualGroundStructures.js";
import { WorldVisualUndergroundDetailRegionView } from
  "../world/rendering/scenic-world/WorldVisualUndergroundDetailRegionView.js";
import { readWebpMetadata, sha256 } from "./2026-07-28-webp-test-utils.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DETAIL_REVIEW = path.join(
  ROOT,
  "visual-approval-previews",
  "underground-foreground-library-v6"
);
const SEAM_REVIEW = path.join(
  ROOT,
  "visual-approval-previews",
  "underground-seam-blend-v6"
);
const detailManifest = JSON.parse(fs.readFileSync(path.join(
  DETAIL_REVIEW,
  "2026-07-29-underground-detail-library-v6.json"
), "utf8"));
const seamManifest = JSON.parse(fs.readFileSync(path.join(
  SEAM_REVIEW,
  "2026-07-29-underground-seam-blend-v6.json"
), "utf8"));

assert.deepEqual(detailManifest.counts, {
  biomes: 10,
  atlases: 20,
  foregroundTextures: 200,
  overlayProps: 200,
  multiTileOverlayProps: 50,
  localizedOverlayProps: 150,
  totalEntries: 400,
  uniqueRgbaFrames: 400,
});
assert.equal(detailManifest.entries.length, 400);
assert.equal(new Set(detailManifest.entries.map(entry => entry.id)).size, 400);
assert.equal(
  new Set(detailManifest.entries.map(entry => entry.rgbaSha256)).size,
  400
);
assert.deepEqual(detailManifest.frameSize, [320, 256]);
assert.deepEqual(detailManifest.grid, [5, 4]);
assert.deepEqual(detailManifest.propScaleClasses, {
  multiTileFrameIndexes: [0, 1, 3, 6, 8],
  multiTileWidthTiles: [9, 17],
  multiTileHeightTiles: [5.5, 11.5],
  localizedWidthTiles: [3.2, 7.8],
  localizedHeightTiles: [2.4, 5.8],
});
assert.equal(
  detailManifest.entries.filter(entry => (
    entry.kind === "overlay-props" && entry.scaleClass === "multi-tile"
  )).length,
  50
);
assert.equal(
  detailManifest.entries.filter(entry => (
    entry.kind === "overlay-props" && entry.scaleClass === "localized"
  )).length,
  150
);
for (const atlas of detailManifest.atlases) {
  const runtimePath = path.join(ROOT, atlas.runtime);
  assert.equal(fs.existsSync(runtimePath), true, atlas.runtime);
  assert.equal(sha256(runtimePath), atlas.runtimeSha256);
  assert.deepEqual(readWebpMetadata(runtimePath), {
    width: 1600,
    height: 1024,
    alphaFlag: true,
    hasAlpha: true,
  });
  assert.equal(atlas.frameCount, 20);
}

assert.deepEqual(seamManifest.counts, {
  terrainV4Derivatives: 50,
  terrainV5Derivatives: 40,
  terrainTotal: 90,
  groundStructures: 50,
});
assert.deepEqual(seamManifest.stridePx, [1152, 768]);
assert.deepEqual(seamManifest.incomingFadePx, [320, 128]);
for (const entry of [...seamManifest.terrain, ...seamManifest.groundStructures]) {
  const runtimePath = path.join(ROOT, entry.runtime);
  assert.equal(fs.existsSync(runtimePath), true, entry.runtime);
  assert.equal(sha256(runtimePath), entry.runtimeSha256);
  const metadata = readWebpMetadata(runtimePath);
  assert.deepEqual([metadata.width, metadata.height], [1536, 1024]);
  assert.equal(metadata.hasAlpha, true);
}
for (const contact of [
  ...detailManifest.contactSheets,
  ...seamManifest.contactSheets,
]) {
  assert.equal(fs.existsSync(path.join(ROOT, contact)), true, contact);
}

const allDetailAssets = getWorldVisualUndergroundDetailAssets();
const v6DetailAssets = allDetailAssets.filter(asset => asset.path.includes("-v6/"));
assert.equal(v6DetailAssets.length, 20);
assert.equal(new Set(v6DetailAssets.map(asset => asset.key)).size, 20);
assert.ok(v6DetailAssets.every(asset => asset.path.includes("-v6/")));
assert.equal(allDetailAssets.length, 112, "release registry includes 92 depth variants");
assert.deepEqual(
  resolveWorldVisualUndergroundDetailKinds(undefined, ""),
  { textures: true, props: true }
);
assert.deepEqual(
  resolveWorldVisualUndergroundDetailKinds(
    undefined,
    "?undergroundForegroundTextures=0"
  ),
  { textures: false, props: true }
);
assert.deepEqual(
  resolveWorldVisualUndergroundDetailKinds(undefined, "?undergroundDetailLibrary=0"),
  { textures: false, props: false }
);
assert.equal(
  resolveWorldVisualUndergroundDetailRegions(65, 5065).length,
  10
);
assert.deepEqual(
  WORLD_VISUAL_UNDERGROUND_DETAILS.props.largeFrameIndexes,
  [0, 1, 3, 6, 8]
);
assert.equal(WORLD_VISUAL_UNDERGROUND_DETAILS.textures.maxSourceScale, 1);
assert.equal(WORLD_VISUAL_UNDERGROUND_DETAILS.props.maxSourceScale, 0.82);
assert.equal(WORLD_VISUAL_UNDERGROUND_DETAILS.props.largeMinSourceScale, 0.86);
assert.equal(WORLD_VISUAL_UNDERGROUND_DETAILS.props.largeMaxSourceScale, 1);
assert.equal("largeMinWidthTiles" in WORLD_VISUAL_UNDERGROUND_DETAILS.props, false);
assert.deepEqual(
  WORLD_VISUAL_UNDERGROUND_DETAILS.props.largeFrameIndexes,
  detailManifest.propScaleClasses.multiTileFrameIndexes
);
assert.equal(WORLD_VISUAL_TERRAIN_VARIATION.seamBlendV6.plateAlpha, 1);
assert.equal(WORLD_VISUAL_GROUND_STRUCTURES.seamBlendV6.alpha, 1);

function segmentCount(spanPx, cardSizePx, stridePx) {
  if (spanPx <= cardSizePx) return 1;
  return Math.ceil((spanPx - cardSizePx) / stridePx) + 1;
}

const tileSize = 64;
const seamSegment = WORLD_VISUAL_TERRAIN_VARIATION.seamBlendV6.segment;
const maximumColumns = segmentCount(
  WORLD_VISUAL_TERRAIN_VARIATION.regions[0].rightTileExclusive * tileSize,
  seamSegment.logicalWidthPx,
  seamSegment.strideXPx
);
const maximumRegionHeightTiles = Math.max(
  ...WORLD_VISUAL_TERRAIN_VARIATION.regions.map(region => (
    region.bottomTileExclusive - region.topTile
  ))
);
const maximumRows = segmentCount(
  maximumRegionHeightTiles * tileSize + seamSegment.crossBiomeOverlapYPx,
  seamSegment.logicalHeightPx,
  seamSegment.strideYPx
);
const depthOrder = WORLD_VISUAL_TERRAIN_VARIATION.seamBlendV6.depthOrder;
const maximumColumnOffset = (maximumColumns - 1) * depthOrder.columnStep;
const maximumRegionLocalOffset = (
  (maximumRows - 1) * depthOrder.rowStep + maximumColumnOffset
);
assert.ok(
  depthOrder.rowStep > maximumColumnOffset,
  "a lower card always sorts above every card in the previous row"
);
assert.ok(
  depthOrder.regionStep > maximumRegionLocalOffset,
  "a deeper biome always sorts above every retained card in the previous biome"
);
assert.deepEqual(
  WORLD_VISUAL_GROUND_STRUCTURES.seamBlendV6.depthOrder,
  depthOrder
);
const lastRegionOrder = WORLD_VISUAL_TERRAIN_VARIATION.regions.length - 1;
assert.ok(
  WORLD_VISUAL_TERRAIN_VARIATION.render.plateDepth
    + lastRegionOrder * depthOrder.regionStep
    + maximumRegionLocalOffset
    < WORLD_VISUAL_UNDERGROUND_DETAILS.render.textureDepth,
  "ordered terrain cards stay below additive foreground textures"
);
assert.ok(
  WORLD_VISUAL_GROUND_STRUCTURES.render.depth
    + lastRegionOrder * depthOrder.regionStep
    + maximumRegionLocalOffset
    < WORLD_VISUAL_UNDERGROUND_DETAILS.render.propDepth,
  "ordered structures stay below additive overlay props"
);

const terrainV6 = resolveWorldVisualTerrainVariationRegions(65, 5065);
const terrainRollback = resolveWorldVisualTerrainVariationRegions(
  65,
  5065,
  WORLD_VISUAL_TERRAIN_VARIATION,
  "?undergroundSeamBlend=0"
);
assert.ok(terrainV6.every(region => (
  region.seamBlendEnabled
  && region.segment.strideXPx === 1152
  && region.segment.strideYPx === 768
  && region.plates.every(asset => asset.path.includes("/terrain-seam-blend-v6/"))
)));
assert.ok(terrainRollback.every(region => (
  !region.seamBlendEnabled
  && region.segment.strideXPx === 1344
  && region.segment.strideYPx === 896
  && region.plates.every(asset => !asset.path.includes("/terrain-seam-blend-v6/"))
)));

const groundV6 = resolveWorldVisualGroundStructureRuntimeRegions(65, 5065);
const groundV4 = resolveWorldVisualGroundStructureRuntimeRegions(
  65,
  5065,
  WORLD_VISUAL_GROUND_STRUCTURES,
  "?undergroundSeamBlend=0"
);
const groundV3 = resolveWorldVisualGroundStructureRuntimeRegions(
  65,
  5065,
  WORLD_VISUAL_GROUND_STRUCTURES,
  "?groundStructureBlend=0"
);
assert.ok(groundV6.every(region => (
  region.seamBlendEnabled
  && region.segment.strideXPx === 1152
  && region.assets.every(asset => asset.path.includes("/biome-ground-structures-v6/"))
)));
assert.ok(groundV4.every(region => (
  !region.seamBlendEnabled
  && region.blendEnabled
  && (region.segment || WORLD_VISUAL_GROUND_STRUCTURES.segment).strideXPx === 1344
  && region.assets.every(asset => asset.path.includes("/biome-ground-structures-v4/"))
)));
assert.ok(groundV3.every(region => (
  !region.seamBlendEnabled
  && !region.blendEnabled
  && region.assets.every(asset => asset.path.includes("/biome-ground-structures-v3/"))
)));
assert.ok(getWorldVisualGroundStructureAssets().every(asset => (
  asset.path.includes("/biome-ground-structures-v4/")
)));

class FakeImage {
  constructor(x, y, key, frameName, frame) {
    this.x = x;
    this.y = y;
    this.key = key;
    this.frameName = frameName;
    this.frame = frame;
  }
  setOrigin() { return this; }
  setDepth(value) { this.depth = value; return this; }
  setAlpha(value) { this.alpha = value; return this; }
  setDisplaySize(width, height) {
    this.displayWidth = width;
    this.displayHeight = height;
    this.scaleX = width / this.frame.width;
    this.scaleY = height / this.frame.height;
    return this;
  }
  setRotation(value) { this.rotation = value; return this; }
  setMask(value) { this.mask = value; return this; }
  setFlipX(value) { this.flipX = value; return this; }
  setTint(value) { this.tint = value; return this; }
  destroy() { this.destroyed = true; }
}

class FakeTexture {
  constructor() {
    this.frames = new Map();
  }
  has(name) {
    return this.frames.has(name);
  }
  add(name, sourceIndex, x, y, width, height) {
    const frame = { name, sourceIndex, x, y, width, height };
    this.frames.set(name, frame);
    return frame;
  }
}

function createDetailScene(assets) {
  const loadedKeys = new Set(assets.map(asset => asset.key));
  const texturesByKey = new Map(
    [...loadedKeys].map(key => [key, new FakeTexture()])
  );
  return {
    config: { tileSize: 64 },
    textures: {
      exists: key => loadedKeys.has(key),
      get: key => texturesByKey.get(key),
    },
    add: {
      image: (x, y, key, frameName) => new FakeImage(
        x,
        y,
        key,
        frameName,
        texturesByKey.get(key).frames.get(frameName)
      ),
    },
  };
}

const detailRegion = resolveWorldVisualUndergroundDetailRegions(65, 110)[0];
const scene = createDetailScene(detailRegion.assets);
const terrainMask = { id: "authoritative-solid-terrain-mask" };
const bounds = { left: 0, right: 42, top: 65, bottom: 92 };
const view = new WorldVisualUndergroundDetailRegionView(
  scene,
  detailRegion,
  WORLD_VISUAL_UNDERGROUND_DETAILS,
  terrainMask
);
assert.equal(view.sync(bounds, { terrainTint: 0xddeeff }, true), true);
assert.ok(view.textureImages.size > 0);
assert.ok(view.propImages.size > 0);
const renderedProps = [...view.propImages.values()];
assert.ok(renderedProps.some(image => (
  image._worldVisualScaleClass === "multi-tile"
  && image._worldVisualSourceScale >= 0.86
  && image._worldVisualSourceScale <= 1
  && image.displayWidth <= 320
)));
assert.ok(renderedProps.some(image => (
  image._worldVisualScaleClass === "localized"
  && image._worldVisualSourceScale >= 0.5
  && image._worldVisualSourceScale <= 0.82
  && image.displayWidth < 320
)));
const firstRender = [...view.textureImages, ...view.propImages]
  .map(([id, image]) => [
    id,
    image.x,
    image.y,
    image.key,
    image.frameName,
    image.depth,
  ])
  .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
for (const image of [
  ...view.textureImages.values(),
  ...view.propImages.values(),
]) {
  assert.equal(image.mask, terrainMask);
  assert.equal(image.frame.width, 320);
  assert.equal(image.frame.height, 256);
  assert.ok(image.frame.x >= 0 && image.frame.x <= 1280);
  assert.ok(image.frame.y >= 0 && image.frame.y <= 768);
  assert.match(image.frameName, /^world-visual-underground-detail-v6-\d+$/);
  assert.equal(
    image.frameName,
    `${WORLD_VISUAL_UNDERGROUND_DETAILS.atlas.framePrefix}`
      + `${image._worldVisualFrameIndex}`
  );
  assert.ok(
    Math.abs(image.displayWidth - image.scaleX * image.frame.width)
      < Number.EPSILON * Math.max(1, image.displayWidth) * 2
  );
  assert.ok(
    Math.abs(image.displayHeight - image.scaleY * image.frame.height)
      < Number.EPSILON * Math.max(1, image.displayHeight) * 2
  );
  assert.ok(image.scaleX <= 1, "underground frames may never be enlarged");
  assert.ok(
    Math.abs(image.scaleX - image.scaleY) < Number.EPSILON * 4,
    "underground frames must retain their authored aspect ratio",
  );
  assert.ok(
    Math.abs(image.scaleX - image._worldVisualSourceScale) < Number.EPSILON * 4,
  );
  assert.ok(image.depth >= 0.145 && image.depth < 0.176);
}
view.destroy();

const deterministicView = new WorldVisualUndergroundDetailRegionView(
  scene,
  detailRegion,
  WORLD_VISUAL_UNDERGROUND_DETAILS,
  terrainMask
);
deterministicView.sync(bounds, { terrainTint: 0xddeeff }, true);
const secondRender = [
  ...deterministicView.textureImages,
  ...deterministicView.propImages,
].map(([id, image]) => [
  id,
  image.x,
  image.y,
  image.key,
  image.frameName,
  image.depth,
])
  .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
assert.deepEqual(secondRender, firstRender);
deterministicView.destroy();

for (const region of resolveWorldVisualUndergroundDetailRegions(65, 5065)) {
  const fullRegionScene = createDetailScene(region.assets);
  const fullRegionView = new WorldVisualUndergroundDetailRegionView(
    fullRegionScene,
    region,
    WORLD_VISUAL_UNDERGROUND_DETAILS,
    terrainMask
  );
  fullRegionView.sync({
    left: region.leftTile,
    right: region.rightTileExclusive,
    top: region.topTile,
    bottom: region.bottomTileExclusive,
  }, { terrainTint: 0xffffff }, true);
  assert.deepEqual(
    [...new Set(
      [...fullRegionView.textureImages.values()]
        .map(image => image._worldVisualFrameIndex)
    )].sort((left, right) => left - right),
    Array.from({ length: 20 }, (_value, index) => index),
    `${region.id} uses every foreground texture frame`
  );
  assert.deepEqual(
    [...new Set(
      [...fullRegionView.propImages.values()]
        .map(image => image._worldVisualFrameIndex)
    )].sort((left, right) => left - right),
    Array.from({ length: 20 }, (_value, index) => index),
    `${region.id} uses every overlay prop frame`
  );
  assert.deepEqual(
    [...new Set(
      [...fullRegionView.propImages.values()]
        .filter(image => image._worldVisualScaleClass === "multi-tile")
        .map(image => image._worldVisualFrameIndex)
    )].sort((left, right) => left - right),
    WORLD_VISUAL_UNDERGROUND_DETAILS.props.largeFrameIndexes,
    `${region.id} uses all five guaranteed multi-tile prop identities`
  );
  fullRegionView.destroy();
}

const runtimeSource = fs.readFileSync(path.join(
  ROOT,
  "world/rendering/scenic-world/WorldVisualRuntime.js"
), "utf8");
assert.match(runtimeSource, /WorldVisualUndergroundDetailLayer/);
assert.match(runtimeSource, /undergroundDetailLayer\?\.sync/);
assert.match(runtimeSource, /undergroundDetailLayer\?\.destroy/);
for (const sourcePath of [
  "values/worldVisualUndergroundDetails.js",
  "world/rendering/scenic-world/WorldVisualUndergroundDetailRegionView.js",
  "world/rendering/scenic-world/WorldVisualUndergroundDetailLayer.js",
]) {
  const source = fs.readFileSync(path.join(ROOT, sourcePath), "utf8");
  assert.doesNotMatch(
    source,
    /setTile|damageTile|digTile|createTilemap|collision|localStorage|saveGame/
  );
}

console.log("Underground detail library and complementary seam V6 contract passed");
