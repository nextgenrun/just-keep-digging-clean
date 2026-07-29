import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WORLD_VISUAL_RUNTIME } from "../values/worldVisualRuntime.js";
import { WORLD_DEPTH_CONFIG } from "../values/worldDepthConfig.js";
import { WORLD_VISUAL_DEPTH_BACKDROPS } from
  "../values/worldVisualDepthBackdrops.js";
import {
  WORLD_VISUAL_SKY_COHESION,
  getWorldVisualSkyCohesionAssets,
  resolveWorldVisualSkyCohesionCells,
  resolveWorldVisualSkyCohesionEnabled,
} from "../values/worldVisualSkyCohesion.js";
import {
  WORLD_VISUAL_TERRAIN_VARIATION,
  getWorldVisualTerrainVariationAssets,
  getWorldVisualTerrainVariationRuntimeAssets,
  resolveWorldVisualTerrainCohesionEnabled,
  resolveWorldVisualTerrainCohesionPlacement,
  resolveWorldVisualTerrainVariationRegions,
} from "../values/worldVisualTerrainVariation.js";
import { WorldVisualSkyCohesionLayer } from
  "../world/rendering/scenic-world/WorldVisualSkyCohesionLayer.js";
import { WorldVisualTerrainCohesionView } from
  "../world/rendering/scenic-world/WorldVisualTerrainCohesionView.js";
import {
  readWebpMetadata,
  sha256,
} from "./2026-07-28-webp-test-utils.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const REVIEW_ROOT = path.join(
  ROOT,
  "visual-approval-previews",
  "sky-underground-game-ready-assets-v1"
);
const reviewManifest = JSON.parse(fs.readFileSync(
  path.join(REVIEW_ROOT, "2026-07-28-library-manifest-v1.json"),
  "utf8"
));
const skyReviewAssets = reviewManifest.assets.filter(asset => asset.type === "sky");
const undergroundReviewAssets = reviewManifest.assets.filter(
  asset => asset.type === "undergroundForeground"
);
const skyAssets = getWorldVisualSkyCohesionAssets();

assert.equal(skyAssets.length, 20);
assert.equal(skyReviewAssets.length, 20);
assert.equal(undergroundReviewAssets.length, 10);
assert.equal(new Set(skyAssets.map(asset => asset.key)).size, 20);
assert.equal(new Set(skyAssets.map(asset => asset.path)).size, 20);

for (const asset of skyAssets) {
  const file = path.basename(asset.path);
  const productionPath = path.join(ROOT, asset.path);
  const reviewPath = path.join(REVIEW_ROOT, file);
  assert.equal(fs.existsSync(productionPath), true, asset.path);
  assert.equal(sha256(productionPath), sha256(reviewPath), `${file} approved bytes`);
  assert.deepEqual(
    readWebpMetadata(productionPath),
    { width: 1672, height: 941, alphaFlag: false, hasAlpha: false },
    `${file} sky geometry`
  );
}

const config = WORLD_VISUAL_TERRAIN_VARIATION;
assert.equal(new Set(
  config.regions.map(region => region.cohesionPlate.key)
).size, 10);
for (const region of config.regions) {
  const file = path.basename(region.cohesionPlate.path);
  const productionPath = path.join(ROOT, region.cohesionPlate.path);
  const reviewPath = path.join(REVIEW_ROOT, file);
  assert.equal(fs.existsSync(productionPath), true, region.cohesionPlate.path);
  assert.equal(sha256(productionPath), sha256(reviewPath), `${file} approved bytes`);
  const metadata = readWebpMetadata(productionPath);
  assert.deepEqual(
    { width: metadata.width, height: metadata.height, hasAlpha: metadata.hasAlpha },
    { width: 1536, height: 1024, hasAlpha: true },
    `${file} foreground geometry`
  );
}

assert.equal(WORLD_VISUAL_SKY_COHESION.runtimeMode, "world-grid");
assert.equal(resolveWorldVisualSkyCohesionEnabled(undefined, ""), true);
assert.equal(resolveWorldVisualSkyCohesionEnabled(undefined, "?skyCohesion=0"), false);
const cells = resolveWorldVisualSkyCohesionCells(280, 65, 94);
assert.equal(cells.length, 144);
assert.equal(new Set(cells.map(cell => cell.id)).size, cells.length);
assert.equal(new Set(cells.map(cell => cell.asset.key)).size, 20);
assert.deepEqual(
  new Set(cells.map(cell => cell.asset.key)),
  new Set(skyAssets.map(asset => asset.key)),
  "every approved sky asset participates in the continuous field"
);
const skyAssetCounts = new Map(skyAssets.map(asset => [asset.key, 0]));
cells.forEach(cell => skyAssetCounts.set(
  cell.asset.key,
  skyAssetCounts.get(cell.asset.key) + 1
));
assert.ok(
  Math.max(...skyAssetCounts.values()) - Math.min(...skyAssetCounts.values()) <= 1,
  "required repetition is balanced across all twenty assets"
);
for (const cell of cells) {
  assert.ok(cell.leftTile >= 0);
  assert.ok(cell.leftTile < 280);
  assert.ok(cell.topTile >= 0);
  assert.ok(cell.topTile < 65);
  assert.ok(cell.displayScale <= 1, `${cell.id} never enlarges source pixels`);
  assert.ok(cell.displayWidthPx <= WORLD_VISUAL_SKY_COHESION.source.widthPx);
  assert.ok(cell.displayHeightPx <= WORLD_VISUAL_SKY_COHESION.source.heightPx);
  assert.equal(cell.blendEdges.left, cell.columnIndex > 0);
  assert.equal(cell.blendEdges.top, cell.rowIndex > 0);
  assert.equal(cell.blendEdges.right, false);
  assert.equal(cell.blendEdges.bottom, false);
  assert.ok(
    Math.abs(
      cell.displayWidthPx / cell.displayHeightPx
      - WORLD_VISUAL_SKY_COHESION.source.widthPx
        / WORLD_VISUAL_SKY_COHESION.source.heightPx
    ) < Number.EPSILON * 2,
    `${cell.id} preserves the authored aspect ratio`
  );
}
const skyRows = cells[0].rowCount;
const skyColumns = cells[0].columnCount;
assert.deepEqual([skyColumns, skyRows], [18, 8]);
for (let row = 0; row < skyRows; row += 1) {
  const rowCells = cells
    .filter(cell => cell.rowIndex === row)
    .sort((left, right) => left.columnIndex - right.columnIndex);
  assert.equal(rowCells[0].leftTile, 0);
  assert.ok(rowCells.at(-1).rightTileExclusive >= 280);
  for (let index = 1; index < rowCells.length; index += 1) {
    assert.ok(
      rowCells[index].leftTile < rowCells[index - 1].rightTileExclusive,
      `sky row ${row} has no horizontal gap at column ${index}`
    );
  }
}
for (let column = 0; column < skyColumns; column += 1) {
  const columnCells = cells
    .filter(cell => cell.columnIndex === column)
    .sort((top, bottom) => top.rowIndex - bottom.rowIndex);
  assert.equal(columnCells[0].topTile, 0);
  assert.ok(columnCells.at(-1).bottomTileExclusive >= 65);
  for (let index = 1; index < columnCells.length; index += 1) {
    assert.ok(
      columnCells[index].topTile
        < columnCells[index - 1].bottomTileExclusive,
      `sky column ${column} has no vertical gap at row ${index}`
    );
  }
}

assert.equal(config.cohesion.runtimeMode, "world-overlay");
assert.equal(resolveWorldVisualTerrainCohesionEnabled(config, ""), true);
assert.equal(resolveWorldVisualTerrainCohesionEnabled(
  config,
  "?undergroundForegroundCohesion=0"
), false);
const placements = config.regions.map(region => (
  resolveWorldVisualTerrainCohesionPlacement(region, 94, config)
));
assert.equal(placements.length, 10);
assert.equal(new Set(placements.map(entry => entry.asset.key)).size, 10);
assert.equal(
  new Set(placements.map(entry => entry.leftTile)).size,
  10,
  "every biome foreground uses a distinct horizontal world anchor"
);
for (let index = 0; index < placements.length; index += 1) {
  const placement = placements[index];
  const region = config.regions[index];
  assert.ok(placement.leftTile >= region.leftTile);
  assert.ok(placement.rightTileExclusive <= region.rightTileExclusive);
  assert.ok(placement.topTile >= region.topTile);
  assert.ok(placement.bottomTileExclusive <= region.bottomTileExclusive);
  assert.ok(placement.displayScale <= 1);
  assert.ok(placement.displayWidthPx <= config.segment.logicalWidthPx);
  assert.ok(placement.displayHeightPx <= config.segment.logicalHeightPx);
}
assert.ok(placements.slice(0, 5).every(
  placement => placement.rightTileExclusive <= WORLD_DEPTH_CONFIG.levelTwoLeftTile
));
assert.ok(placements.slice(5).every(
  placement => placement.leftTile >= WORLD_DEPTH_CONFIG.levelTwoLeftTile
));

assert.equal(getWorldVisualTerrainVariationAssets().length, 60);
const activeRegions = resolveWorldVisualTerrainVariationRegions(65, 5065, config, "");
const cohesionKeys = new Set(config.regions.map(region => region.cohesionPlate.key));
for (const region of activeRegions) {
  assert.equal(
    region.plates.length,
    region.basePlates.length + region.v5Plates.length,
    `${region.id} keeps transparent cohesion out of the full plate pool`
  );
  assert.ok(region.plates.every(asset => !cohesionKeys.has(asset.key)));
}
const runtimeAssets = getWorldVisualTerrainVariationRuntimeAssets(config, "");
assert.equal(
  runtimeAssets.filter(asset => cohesionKeys.has(asset.key)).length,
  10,
  "all underground overlays remain streamable"
);

class FakeImage {
  constructor(x, y, key) {
    this.x = x;
    this.y = y;
    this.key = key;
  }
  setOrigin(x, y = x) { this.origin = { x, y }; return this; }
  setDisplayOrigin(x, y = x) {
    this.displayOrigin = { x, y };
    return this;
  }
  setDepth(value) { this.depth = value; return this; }
  setAlpha(value) { this.alpha = value; return this; }
  setTint(value) { this.tint = value; return this; }
  setCrop(x, y, width, height) {
    this.crop = { x, y, width, height };
    return this;
  }
  setScale(x, y = x) { this.scale = { x, y }; return this; }
  setDisplaySize(width, height) {
    this.displayWidth = width;
    this.displayHeight = height;
    return this;
  }
  setMask(mask) { this.mask = mask; return this; }
  clearMask() { this.mask = null; return this; }
  setVisible(value) { this.visible = value; return this; }
  createBitmapMask() {
    return { destroyed: false, destroy() { this.destroyed = true; } };
  }
  destroy() { this.destroyed = true; }
}

function createSceneStub() {
  const images = [];
  const scene = {
    config: {
      tileSize: 94,
      worldWidthTiles: 280,
      worldWidthPx: 280 * 94,
      topAirRows: 65,
    },
    load: {
      on() {},
      off() {},
      once() {},
      isLoading() { return false; },
      image() {},
      start() {},
    },
    textures: {
      exists() { return true; },
      get(key) {
        const sky = key.startsWith("world-visual-sky-cohesion-v1-");
        const frames = new Set();
        return {
          has(name) { return frames.has(name); },
          add(name) { frames.add(name); },
          getSourceImage: () => (
            sky ? { width: 1672, height: 941 } : { width: 1536, height: 1024 }
          ),
        };
      },
      remove() {},
    },
    add: {
      image(x, y, key) {
        const image = new FakeImage(x, y, key);
        images.push(image);
        return image;
      },
    },
    make: {
      image({ x, y, key }) {
        return new FakeImage(x, y, key);
      },
    },
    images,
  };
  return scene;
}

const skyScene = createSceneStub();
const skyLayer = new WorldVisualSkyCohesionLayer(skyScene);
assert.equal(skyLayer.create(), true);
assert.equal(skyLayer.sync(
  { left: 0, right: 280, top: 0, bottom: 65 },
  { farTint: 0xddeeff }
), true);
assert.equal(skyLayer.cards.size, cells.length);
for (const { cell, image, blendBits } of skyLayer.cards.values()) {
  assert.equal(image.x, cell.leftTile * 94);
  assert.equal(image.y, cell.topTile * 94);
  assert.equal(image.scrollFactor, undefined);
  assert.ok(image.mask, `${cell.id} has feather mask`);
  assert.equal(
    blendBits,
    (cell.blendEdges.left
      ? WORLD_VISUAL_DEPTH_BACKDROPS.blend.edgeBits.left
      : 0)
      | (cell.blendEdges.top
        ? WORLD_VISUAL_DEPTH_BACKDROPS.blend.edgeBits.top
        : 0),
    `${cell.id} feathers only incoming edges`
  );
  assert.equal(
    image.depth,
    WORLD_VISUAL_SKY_COHESION.render.depth
      + cell.renderOrder * WORLD_VISUAL_SKY_COHESION.render.depthStep,
    `${cell.id} has deterministic overlap ordering`
  );
  assert.deepEqual(
    image.scale,
    { x: cell.displayScale, y: cell.displayScale },
    `${cell.id} renders the complete source at native density`
  );
  assert.equal(image.crop, undefined, `${cell.id} is not cover-cropped`);
}
for (const { cell, maskImage } of skyLayer.cards.values()) {
  assert.equal(maskImage.displayWidth, cell.displayWidthPx);
  assert.equal(maskImage.displayHeight, cell.displayHeightPx);
}
const beforeUpdate = [...skyLayer.cards.values()].map(({ image }) => [image.x, image.y]);
skyLayer.update(1234, { farTint: 0xaabbcc });
assert.deepEqual(
  [...skyLayer.cards.values()].map(({ image }) => [image.x, image.y]),
  beforeUpdate,
  "frame updates never reposition sky cards around the camera"
);
skyLayer.destroy();

const terrainScene = createSceneStub();
const terrainMask = { id: "terrain-geometry-mask" };
const cohesionView = new WorldVisualTerrainCohesionView(
  terrainScene,
  activeRegions[0],
  config,
  terrainMask,
  true
);
const firstPlacement = placements[0];
assert.equal(cohesionView.sync(
  {
    left: firstPlacement.leftTile,
    right: firstPlacement.rightTileExclusive,
    top: firstPlacement.topTile,
    bottom: firstPlacement.bottomTileExclusive,
  },
  { terrainTint: 0xffffff }
), true);
assert.equal(cohesionView.image.mask, terrainMask);
assert.equal(cohesionView.image.depth, config.render.cohesionDepth);
assert.equal(cohesionView.getActiveAsset().key, firstPlacement.asset.key);
assert.deepEqual(
  cohesionView.image.scale,
  { x: firstPlacement.displayScale, y: firstPlacement.displayScale }
);
assert.equal(cohesionView.image.displayWidth, undefined);
cohesionView.destroy();

assert.equal(
  WORLD_VISUAL_RUNTIME.assets.far.path,
  "sprites/backgrounds/world-visual-v2/far/moonlit-mountain-forest-v1.png",
  "the original Town Square-style far plate remains the continuous base"
);
const runtimeSource = fs.readFileSync(path.join(
  ROOT,
  "world/rendering/scenic-world/WorldVisualRuntime.js"
), "utf8");
const skySource = fs.readFileSync(path.join(
  ROOT,
  "world/rendering/scenic-world/WorldVisualSkyCohesionLayer.js"
), "utf8");
assert.match(runtimeSource, /new WorldVisualSkyCohesionLayer\(this\.scene\)/);
assert.match(runtimeSource, /skyCohesionLayer\?\.sync/);
assert.doesNotMatch(skySource, /\.setScrollFactor\s*\(\s*0\s*\)/);
assert.doesNotMatch(skySource, /fitCover|setDisplaySize/);
assert.match(skySource, /createWorldVisualBlendMask/);

console.log("sky and underground world-space cohesion runtime contract: ok");
