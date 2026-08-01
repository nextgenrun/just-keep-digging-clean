import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WORLD_VISUAL_RUNTIME } from "../values/worldVisualRuntime.js";
import { RUNTIME_ASSET_LOADING } from "../values/runtimeAssetLoading.js";
import { WORLD_DEPTH_CONFIG } from "../values/worldDepthConfig.js";
import { WORLD_VISUAL_DEPTH_BACKDROPS } from
  "../values/worldVisualDepthBackdrops.js";
import {
  WORLD_VISUAL_SKY_COHESION,
  getWorldVisualSkyCohesionAssets,
  multiplyWorldVisualSkyTints,
  resolveWorldVisualSkyCohesionCells,
  resolveWorldVisualSkyCohesionEnabled,
  resolveWorldVisualSkyCells,
  resolveWorldVisualSkyRuntimeMode,
} from "../values/worldVisualSkyCohesion.js";
import {
  WORLD_VISUAL_SKY_TRANSITION_ORDER,
  resolveWorldVisualSkyTransition,
} from "../values/worldVisualSkyTransitionOrder.js";
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
const skyAssets = Object.values(WORLD_VISUAL_SKY_COHESION.assets);
const skyRuntimeAssets = getWorldVisualSkyCohesionAssets();
const skyFoundation = WORLD_VISUAL_SKY_COHESION.foundation;

assert.equal(skyAssets.length, 20);
assert.equal(skyRuntimeAssets.length, 21);
assert.equal(skyReviewAssets.length, 20);
assert.equal(undergroundReviewAssets.length, 10);
assert.equal(new Set(skyAssets.map(asset => asset.key)).size, 20);
assert.equal(new Set(skyAssets.map(asset => asset.path)).size, 20);
assert.equal(new Set(skyRuntimeAssets.map(asset => asset.key)).size, 21);

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
const foundationPath = path.join(ROOT, skyFoundation.asset.path);
assert.equal(fs.existsSync(foundationPath), true, skyFoundation.asset.path);
assert.deepEqual(
  readWebpMetadata(foundationPath),
  { width: 1024, height: 2048, alphaFlag: false, hasAlpha: false },
  "the stable foundation is a full opaque sky field"
);
const foundationManifest = JSON.parse(fs.readFileSync(
  path.join(
    ROOT,
    "sprites/backgrounds/world-visual-v2/far/sky-foundation-v2/"
      + "sky-atmosphere-foundation-v2.manifest.json"
  ),
  "utf8"
));
assert.equal(foundationManifest.sha256, sha256(foundationPath));
assert.equal(foundationManifest.horizontalSeamMaximumChannelDelta, 0);
assert.equal(foundationManifest.sourceCount, 20);

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

assert.equal(WORLD_VISUAL_SKY_COHESION.runtimeMode, "ordered-features");
assert.equal(resolveWorldVisualSkyRuntimeMode(undefined, ""), "ordered-features");
assert.equal(
  resolveWorldVisualSkyRuntimeMode(undefined, "?skyComposition=grid"),
  "world-grid"
);
assert.equal(resolveWorldVisualSkyCohesionEnabled(undefined, ""), true);
assert.equal(resolveWorldVisualSkyCohesionEnabled(undefined, "?skyCohesion=0"), false);
assert.ok(
  RUNTIME_ASSET_LOADING.priorities.skyCohesion
    > RUNTIME_ASSET_LOADING.priorities.depthBackdrop
);
assert.ok(
  RUNTIME_ASSET_LOADING.priorities.skyCohesion
    > RUNTIME_ASSET_LOADING.priorities.terrainVariation
);
const cells = resolveWorldVisualSkyCohesionCells(280, 65, 94);
assert.equal(cells.length, 336);
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
for (const asset of skyAssets) {
  assert.ok(
    skyAssetCounts.get(asset.key) > 0,
    `${asset.id} participates in its authored world chapter`
  );
  assert.ok(
    Number.isInteger(asset.atmosphereTint)
      && asset.atmosphereTint >= 0
      && asset.atmosphereTint <= 0xffffff,
    `${asset.id} has a bounded atmospheric grade`
  );
}
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
  assert.equal(cell.blendEdges.right, cell.columnIndex < cell.columnCount - 1);
  assert.equal(cell.blendEdges.bottom, cell.rowIndex < cell.rowCount - 1);
  assert.ok(
    Math.abs(
      cell.displayWidthPx / cell.displayHeightPx
      - WORLD_VISUAL_SKY_COHESION.source.safeFrame.widthPx
        / WORLD_VISUAL_SKY_COHESION.source.safeFrame.heightPx
    ) < Number.EPSILON * 2,
    `${cell.id} preserves the native safe-frame aspect ratio`
  );
}
const skyRows = cells[0].rowCount;
const skyColumns = cells[0].columnCount;
assert.deepEqual([skyColumns, skyRows], [28, 12]);
const bandIndexById = new Map(
  WORLD_VISUAL_SKY_COHESION.bands.map((band, index) => [band.id, index])
);
const rowBandIndexes = [];
for (let row = 0; row < skyRows; row += 1) {
  const rowCells = cells
    .filter(cell => cell.rowIndex === row)
    .sort((left, right) => left.columnIndex - right.columnIndex);
  assert.equal(
    new Set(rowCells.map(cell => cell.bandId)).size,
    1,
    `sky row ${row} stays in one physical altitude family`
  );
  rowBandIndexes.push(bandIndexById.get(rowCells[0].bandId));
  assert.equal(rowCells[0].leftTile, 0);
  assert.ok(Math.abs(rowCells.at(-1).rightTileExclusive - 280) < 1e-9);
  for (let index = 1; index < rowCells.length; index += 1) {
    assert.ok(
      Math.abs(
        (rowCells[index - 1].rightTileExclusive - rowCells[index].leftTile) * 94
          - rowCells[index].overlapXPx
      ) < 1e-9,
      `sky row ${row} overlap ${index - 1}->${index} matches its blend feather`
    );
    assert.ok(
      rowCells[index].leftTile < rowCells[index - 1].rightTileExclusive,
      `sky row ${row} has no horizontal gap at column ${index}`
    );
  }
}
assert.deepEqual(
  [...rowBandIndexes].sort((left, right) => left - right),
  rowBandIndexes,
  "sky sprite families descend monotonically from far sky to ground"
);
assert.equal(rowBandIndexes[0], 0);
assert.equal(rowBandIndexes.at(-1), WORLD_VISUAL_SKY_COHESION.bands.length - 1);
const chapterIndexById = new Map(
  WORLD_VISUAL_SKY_COHESION.columns.map((chapter, index) => (
    [chapter.id, index]
  ))
);
const columnChapterIndexes = [];
for (let column = 0; column < skyColumns; column += 1) {
  const columnCells = cells
    .filter(cell => cell.columnIndex === column)
    .sort((top, bottom) => top.rowIndex - bottom.rowIndex);
  assert.equal(
    new Set(columnCells.map(cell => cell.columnId)).size,
    1,
    `sky column ${column} stays in one physical world chapter`
  );
  const chapterIndex = chapterIndexById.get(columnCells[0].columnId);
  const nearestChapterIndex = WORLD_VISUAL_SKY_COHESION.columns.reduce(
    (nearest, chapter, index, chapters) => (
      Math.abs(columnCells[0].horizontalCenterTile - chapter.centerTile)
        < Math.abs(
          columnCells[0].horizontalCenterTile
          - chapters[nearest].centerTile
        )
        ? index
        : nearest
    ),
    0
  );
  assert.equal(
    chapterIndex,
    nearestChapterIndex,
    `sky column ${column} uses the closest authored world chapter`
  );
  columnChapterIndexes.push(chapterIndex);
  assert.equal(columnCells[0].topTile, 0);
  assert.ok(Math.abs(columnCells.at(-1).bottomTileExclusive - 65) < 1e-9);
  for (let index = 1; index < columnCells.length; index += 1) {
    assert.ok(
      Math.abs(
        (columnCells[index - 1].bottomTileExclusive - columnCells[index].topTile) * 94
          - columnCells[index].overlapYPx
      ) < 1e-9,
      `sky column ${column} overlap ${index - 1}->${index} matches its blend feather`
    );
    assert.ok(
      columnCells[index].topTile
        < columnCells[index - 1].bottomTileExclusive,
      `sky column ${column} has no vertical gap at row ${index}`
    );
  }
}
assert.deepEqual(
  [...columnChapterIndexes].sort((left, right) => left - right),
  columnChapterIndexes,
  "sky chapters progress monotonically west to east without shuffled jumps"
);
for (let index = 1; index < columnChapterIndexes.length; index += 1) {
  assert.ok(
    columnChapterIndexes[index] - columnChapterIndexes[index - 1] <= 1,
    `sky chapter handoff ${index - 1}->${index} is adjacent`
  );
}

const featureCells = resolveWorldVisualSkyCells(280, 65, 94);
assert.equal(featureCells.length, 56, "four altitude bands use fourteen ordered feature slots");
assert.equal(new Set(featureCells.map(cell => cell.id)).size, featureCells.length);
assert.deepEqual(
  new Set(featureCells.map(cell => cell.asset.key)),
  new Set(skyAssets.map(asset => asset.key)),
  "the ordered composition retains all twenty approved paintings"
);
assert.ok(featureCells.every(cell => (
  cell.blendEdges.left
  && cell.blendEdges.right
  && cell.blendEdges.top
  && cell.blendEdges.bottom
)), "every feature card feathers back into the stable foundation on all edges");
assert.ok(featureCells.every(cell => (
  cell.leftTile >= 0
  && cell.rightTileExclusive <= 280
  && cell.topTile >= 0
  && cell.bottomTileExclusive <= 65
)), "ordered features stay inside the authored upper-world field");
assert.deepEqual(
  [...new Set(featureCells
    .filter(cell => cell.rowIndex === 0)
    .map(cell => cell.slotId))],
  WORLD_VISUAL_SKY_TRANSITION_ORDER.featureSlots.map(slot => slot.id),
  "feature slots keep the explicit west-to-east story order"
);
assert.equal(WORLD_VISUAL_SKY_TRANSITION_ORDER.horizontalTransitions.length, 16);
assert.equal(WORLD_VISUAL_SKY_TRANSITION_ORDER.verticalTransitions.length, 15);
assert.equal(
  resolveWorldVisualSkyTransition("sky02", "sky05", "horizontal").profile,
  "direct"
);
assert.equal(
  resolveWorldVisualSkyTransition("sky04", "sky08", "horizontal").profile,
  "foundation"
);
assert.equal(
  resolveWorldVisualSkyTransition("sky03", "sky07", "horizontal").profile,
  "haze"
);
assert.equal(
  resolveWorldVisualSkyTransition("sky04", "sky03", "vertical").profile,
  "foundation"
);
assert.ok(
  WORLD_VISUAL_SKY_COHESION.composition.transitionAlphaScale.direct
    > WORLD_VISUAL_SKY_COHESION.composition.transitionAlphaScale.haze
);
assert.ok(
  WORLD_VISUAL_SKY_COHESION.composition.transitionAlphaScale.haze
    > WORLD_VISUAL_SKY_COHESION.composition.transitionAlphaScale.foundation
);
assert.equal(
  resolveWorldVisualSkyCells(280, 65, 94, undefined, "?skyComposition=grid").length,
  cells.length,
  "the previous dense world grid remains an explicit comparison rollback"
);
assert.ok(
  WORLD_VISUAL_SKY_COHESION.foundation.depth < WORLD_VISUAL_RUNTIME.render.farDepth,
  "the atmosphere stays behind the older tree-bearing surface plate"
);
assert.ok(
  WORLD_VISUAL_SKY_COHESION.composition.bandAlpha.lower
    < WORLD_VISUAL_SKY_COHESION.composition.bandAlpha.middle,
  "lower sky art recedes so the forest surface plate remains legible"
);

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
  setBlendMode(value) { this.blendMode = value; return this; }
  setCrop(x, y, width, height) {
    this.crop = { x, y, width, height };
    return this;
  }
  setScale(x, y = x) { this.scale = { x, y }; return this; }
  setTileScale(x, y = x) { this.tileScale = { x, y }; return this; }
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
        const foundation = key === WORLD_VISUAL_SKY_COHESION.foundation.asset.key;
        const frames = new Set();
        return {
          has(name) { return frames.has(name); },
          add(name) { frames.add(name); },
          getSourceImage: () => {
            if (sky) return { width: 1672, height: 941 };
            if (foundation) return { width: 1024, height: 2048 };
            return { width: 1536, height: 1024 };
          },
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
      tileSprite(x, y, width, height, key) {
        const image = new FakeImage(x, y, key);
        image.tileSprite = { width, height };
        images.push(image);
        return image;
      },
      rectangle(x, y, width, height, color, alpha) {
        const image = new FakeImage(x, y, "rectangle");
        image.rectangle = { width, height, color, alpha };
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
assert.equal(skyLayer.runtimeMode, "ordered-features");
assert.equal(skyLayer.matte, null, "ordered features never introduce a black matte");
assert.ok(skyLayer.foundationView.fallback, "a cobalt fallback exists before streaming");
assert.equal(skyLayer.foundationView.fallback.depth, skyFoundation.fallbackDepth);
assert.equal(
  skyLayer.foundationView.fallback.rectangle.color,
  skyFoundation.fallbackColor
);
assert.ok(skyLayer.foundationView.image, "the stable atmosphere is created before feature sync");
assert.equal(skyLayer.foundationView.image.depth, skyFoundation.depth);
assert.equal(skyLayer.foundationView.image.alpha, skyFoundation.alpha);
assert.equal(
  skyLayer.foundationView.images.length,
  Math.ceil(280 * 94 / skyFoundation.expectedSource.widthPx)
);
skyLayer.foundationView.images.forEach((image, index) => {
  assert.equal(image.x, index * skyFoundation.expectedSource.widthPx);
  assert.equal(image.y, 0);
  assert.deepEqual(image.scale, {
    x: 1,
    y: 65 * 94 / skyFoundation.expectedSource.heightPx,
  });
});
assert.equal(skyLayer.sync(
  { left: 0, right: 280, top: 0, bottom: 65 },
  { farTint: 0xddeeff }
), true);
assert.equal(skyLayer.coverageReady, true);
assert.equal(skyLayer.matte, null);
assert.equal(skyLayer.foundationView.image.tint, 0xddeeff);
assert.equal(skyLayer.cards.size, featureCells.length);
assert.deepEqual(skyLayer.getSnapshot(), {
  enabled: true,
  runtimeMode: "ordered-features",
  fallbackReady: true,
  foundationReady: true,
  foundationAssetKey: skyFoundation.asset.key,
  activeFeatureCards: featureCells.length,
  pendingFeatureAssets: 0,
  coverageReady: true,
  blackMatteActive: false,
});
assert.equal(globalThis.__jkdSkyComposition.snapshot().blackMatteActive, false);
for (const { cell, image, blendBits } of skyLayer.cards.values()) {
  assert.equal(image.x, cell.leftTile * 94);
  assert.equal(image.y, cell.topTile * 94);
  assert.equal(image.scrollFactor, undefined);
  assert.ok(image.mask, `${cell.id} has a four-edge feather mask`);
  assert.equal(
    blendBits,
    WORLD_VISUAL_SKY_COHESION.blend.edgeBits.left
      | WORLD_VISUAL_SKY_COHESION.blend.edgeBits.right
      | WORLD_VISUAL_SKY_COHESION.blend.edgeBits.top
      | WORLD_VISUAL_SKY_COHESION.blend.edgeBits.bottom,
    `${cell.id} returns every edge to the foundation`
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
    `${cell.id} renders the safe source frame at native density`
  );
  assert.deepEqual(image.crop, {
    x: WORLD_VISUAL_SKY_COHESION.source.safeFrame.xPx,
    y: WORLD_VISUAL_SKY_COHESION.source.safeFrame.yPx,
    width: WORLD_VISUAL_SKY_COHESION.source.safeFrame.widthPx,
    height: WORLD_VISUAL_SKY_COHESION.source.safeFrame.heightPx,
  }, `${cell.id} excludes only the authored dark edge`);
  assert.deepEqual(image.displayOrigin, {
    x: WORLD_VISUAL_SKY_COHESION.source.safeFrame.xPx,
    y: WORLD_VISUAL_SKY_COHESION.source.safeFrame.yPx,
  }, `${cell.id} keeps its safe crop grounded at the feature origin`);
  assert.equal(
    image.tint,
    multiplyWorldVisualSkyTints(0xddeeff, cell.asset.atmosphereTint),
    `${cell.id} is color-graded into the shared weather palette`
  );
  assert.equal(image.blendMode, WORLD_VISUAL_SKY_COHESION.render.featureBlendMode);
  const transitionAlpha = [
    cell.incomingHorizontalTransition?.profile,
    cell.incomingVerticalTransition?.profile,
  ].filter(Boolean).reduce((alpha, profile) => Math.min(
    alpha,
    WORLD_VISUAL_SKY_COHESION.composition.transitionAlphaScale[profile]
  ), 1);
  assert.equal(
    image.alpha,
    WORLD_VISUAL_SKY_COHESION.render.alpha
      * WORLD_VISUAL_SKY_COHESION.composition.bandAlpha[cell.bandId]
      * transitionAlpha,
    `${cell.id} obeys altitude and measured compatibility alpha`
  );
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
  "frame updates never reposition sky features around the camera"
);
assert.equal(skyLayer.foundationView.image.tint, 0xaabbcc);
skyLayer.destroy();
assert.equal(globalThis.__jkdSkyComposition, undefined);

function skyCellsIntersecting(bounds, margin = 0) {
  return cells.filter(cell => (
    bounds.right + margin > cell.leftTile
    && bounds.left - margin < cell.rightTileExclusive
    && bounds.bottom + margin > cell.topTile
    && bounds.top - margin < cell.bottomTileExclusive
  ));
}

const transitionStartBounds = Object.freeze({
  left: 26,
  right: 44,
  top: 53,
  bottom: 65,
});
const transitionNextBounds = Object.freeze({
  left: 28,
  right: 46,
  top: 53,
  bottom: 65,
});
const transitionStartCells = skyCellsIntersecting(
  transitionStartBounds,
  WORLD_VISUAL_SKY_COHESION.worldGrid.loadMarginTiles
);
const transitionAvailableKeys = new Set(
  transitionStartCells.map(cell => cell.asset.key)
);
const transitionScene = createSceneStub();
transitionScene.textures.exists = key => (
  !key.startsWith("world-visual-sky-cohesion-v1-")
  || transitionAvailableKeys.has(key)
);
const transitionLayer = new WorldVisualSkyCohesionLayer(
  transitionScene,
  WORLD_VISUAL_SKY_COHESION,
  "?skyComposition=grid"
);
assert.equal(transitionLayer.create(), true);
assert.equal(transitionLayer.runtimeMode, "world-grid");
assert.equal(transitionLayer.sync(
  transitionStartBounds,
  { farTint: 0xddeeff }
), true);
assert.equal(transitionLayer.coverageReady, true);
assert.equal(transitionLayer.matte.alpha, 1);
const committedBeforeTransition = new Set(transitionLayer.committedCellIds);
assert.ok(committedBeforeTransition.size > 0);

assert.equal(transitionLayer.sync(
  transitionNextBounds,
  { farTint: 0xddeeff }
), true);
assert.ok(
  [...transitionLayer.activeCellIds].some(id => !transitionLayer.cards.has(id)),
  "the moved camera window is still waiting for at least one prefetched card"
);
assert.deepEqual(
  transitionLayer.committedCellIds,
  committedBeforeTransition,
  "pending cells do not replace the last complete sky window"
);
assert.equal(
  transitionLayer.coverageReady,
  true,
  "the last complete sky remains visible while its replacement streams"
);
assert.equal(transitionLayer.matte.alpha, 1);
assert.ok([...transitionLayer.cards.entries()].every(([id, card]) => (
  committedBeforeTransition.has(id) ? card.image.alpha === 1 : card.image.alpha === 0
)));

assert.equal(transitionLayer.sync(
  { left: 216, right: 234, top: 53, bottom: 65 },
  { farTint: 0xddeeff }
), true);
assert.equal(
  transitionLayer.coverageReady,
  false,
  "a real teleport reveals the resident far fallback instead of a black matte"
);
assert.equal(transitionLayer.matte.alpha, 0);
assert.ok([...transitionLayer.cards.values()].every(card => card.image.alpha === 0));
transitionLayer.destroy();

const pendingSkyScene = createSceneStub();
pendingSkyScene.textures.exists = () => false;
const pendingSkyLayer = new WorldVisualSkyCohesionLayer(pendingSkyScene);
assert.equal(pendingSkyLayer.create(), true);
assert.equal(pendingSkyLayer.runtimeMode, "ordered-features");
assert.ok(
  pendingSkyLayer.foundationView.fallback,
  "the immediate cobalt field exists while the foundation texture streams"
);
assert.equal(pendingSkyLayer.foundationView.image, null);
assert.equal(pendingSkyLayer.sync(
  { left: 220, right: 246, top: 54, bottom: 65 },
  { farTint: 0xddeeff }
), true);
assert.equal(pendingSkyLayer.cards.size, 0);
assert.equal(pendingSkyLayer.coverageReady, true);
assert.equal(pendingSkyLayer.matte, null);
assert.equal(pendingSkyLayer.foundationView.fallback.tint, 0xddeeff);
pendingSkyLayer.destroy();

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
const skyFoundationSource = fs.readFileSync(path.join(
  ROOT,
  "world/rendering/scenic-world/WorldVisualSkyFoundationView.js"
), "utf8");
assert.match(runtimeSource, /new WorldVisualSkyCohesionLayer\(this\.scene\)/);
assert.match(runtimeSource, /skyCohesionLayer\?\.sync/);
assert.doesNotMatch(skySource, /\.setScrollFactor\s*\(\s*0\s*\)/);
assert.doesNotMatch(skySource, /fitCover|setDisplaySize/);
assert.match(skySource, /createWorldVisualNormalizedBlendMask/);
assert.doesNotMatch(skyFoundationSource, /tileSprite/);
assert.match(skyFoundationSource, /Math\.ceil\(fieldWidthPx \/ segmentWidthPx\)/);

console.log("sky and underground world-space cohesion runtime contract: ok");
