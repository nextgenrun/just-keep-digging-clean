import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  WORLD_VISUAL_DEPTH_BACKDROPS,
  getWorldVisualDepthBackdropPreloadAssets,
  resolveWorldVisualDepthBackdropBlendMask,
  resolveWorldVisualDepthBackdropExpansionV5Enabled,
  resolveWorldVisualDepthBackdropRegionAssets,
} from "../values/worldVisualDepthBackdrops.js";
import {
  WORLD_VISUAL_TERRAIN_VARIATION,
  getWorldVisualTerrainVariationAssets,
  getWorldVisualTerrainVariationRuntimeAssets,
  resolveWorldVisualTerrainCohesionEnabled,
  resolveWorldVisualTerrainCohesionPlacement,
  resolveWorldVisualTerrainExpansionV5Enabled,
  resolveWorldVisualTerrainVariationRegions,
} from "../values/worldVisualTerrainVariation.js";
import {
  WORLD_VISUAL_RUNTIME,
  getWorldVisualPreloadAssets,
  resolveWorldVisualSurfaceGroundVariationEnabled,
} from "../values/worldVisualRuntime.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { WorldVisualTerrainVariationRegionView } from
  "../world/rendering/scenic-world/WorldVisualTerrainVariationRegionView.js";
import { readWebpMetadata, sha256 } from "./2026-07-28-webp-test-utils.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REVIEW_ROOT = path.join(
  ROOT,
  "visual-approval-previews",
  "whole-world-visual-expansion-v5"
);
const manifestPath = path.join(
  REVIEW_ROOT,
  "2026-07-28-whole-world-visual-expansion-v5.json"
);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

assert.equal(manifest.version, 5);
assert.equal(manifest.generatedWith, "built-in ImageGen");
assert.deepEqual(manifest.sourceDimensions, [1536, 1024]);
assert.deepEqual(manifest.counts, {
  imageGenMasters: 100,
  backgrounds: 50,
  terrainPlates: 40,
  surfaceGroundSources: 10,
  deepMastersCoreMagmaOrLower: 71,
  capAtlasFiles: 10,
  capFrames: 200,
  backgroundBlendMaskFrames: 16,
  runtimeFiles: 111,
});
assert.equal(manifest.backgrounds.length, 50);
assert.equal(manifest.terrainPlates.length, 40);
assert.equal(manifest.surfaceGround.length, 10);
assert.equal(manifest.capAtlases.length, 10);
assert.equal(manifest.geometry.background.crossBiomeOverlapYPx, 128);
assert.equal(manifest.geometry.terrain.crossBiomeOverlapYPx, 128);
assert.equal(
  new Set([
    ...manifest.backgrounds,
    ...manifest.terrainPlates,
    ...manifest.surfaceGround,
  ].map(entry => entry.sourceSha256)).size,
  100,
  "all 100 ImageGen masters are pixel-distinct"
);
assert.equal(
  new Set([
    ...manifest.backgrounds,
    ...manifest.terrainPlates,
    ...manifest.surfaceGround,
  ].map(entry => entry.runtimeSha256)).size,
  100,
  "all 100 promoted runtime images are distinct"
);

for (const entry of manifest.backgrounds) {
  const sourcePath = path.join(ROOT, entry.reviewSource);
  const runtimePath = path.join(ROOT, entry.runtime);
  assert.ok(fs.existsSync(sourcePath), entry.reviewSource);
  assert.equal(sha256(sourcePath), entry.sourceSha256);
  assert.equal(sha256(runtimePath), entry.runtimeSha256);
  const metadata = readWebpMetadata(runtimePath);
  assert.deepEqual([metadata.width, metadata.height], [1536, 1024]);
}
for (const entry of manifest.terrainPlates) {
  const metadata = readWebpMetadata(path.join(ROOT, entry.runtime));
  assert.deepEqual([metadata.width, metadata.height], [1536, 1024]);
  assert.equal(metadata.hasAlpha, true, `${entry.id} keeps overlap alpha`);
  assert.deepEqual(entry.featherPx, [192, 128]);
  assert.equal(entry.featherShape, "irregular-low-frequency");
}
for (const entry of manifest.surfaceGround) {
  const metadata = readWebpMetadata(path.join(ROOT, entry.runtime));
  assert.deepEqual([metadata.width, metadata.height], [1536, 160]);
  assert.equal(metadata.hasAlpha, true, `${entry.id} keeps painted ground alpha`);
  assert.ok(entry.opaqueCoverage > 0.45 && entry.opaqueCoverage < 0.7);
  assert.ok(fs.existsSync(path.join(ROOT, entry.alphaReview)));
}
for (const entry of manifest.capAtlases) {
  const metadata = readWebpMetadata(path.join(ROOT, entry.runtime));
  assert.deepEqual([metadata.width, metadata.height], [1280, 384]);
  assert.equal(metadata.hasAlpha, true);
  assert.equal(entry.frameCount, 20);
  assert.equal(entry.frames.length, 20);
}

const maskEntry = manifest.backgroundBlendMaskAtlas;
const mask = fs.readFileSync(path.join(ROOT, maskEntry.runtime));
assert.deepEqual([...mask.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
assert.equal(mask.readUInt32BE(16), 1536);
assert.equal(mask.readUInt32BE(20), 1024);
assert.equal(mask[25], 6, "V5 mask atlas keeps authored alpha");
assert.equal(maskEntry.shape, "irregular-low-frequency");

const backgroundConfig = WORLD_VISUAL_DEPTH_BACKDROPS;
assert.equal(resolveWorldVisualDepthBackdropExpansionV5Enabled(undefined, ""), true);
assert.equal(
  resolveWorldVisualDepthBackdropExpansionV5Enabled(
    undefined,
    "?biomeBackdropExpansionV5=0"
  ),
  false
);
assert.equal(
  resolveWorldVisualDepthBackdropExpansionV5Enabled(
    undefined,
    "?biomeBackdropExpansion=0"
  ),
  false,
  "disabling the prior expansion also restores the pre-expansion base pool"
);
const expectedBackgroundCounts = [2, 3, 3, 3, 4, 6, 6, 7, 8, 8];
backgroundConfig.regions.forEach((region, index) => {
  const prior = resolveWorldVisualDepthBackdropRegionAssets(
    region,
    backgroundConfig,
    "?biomeBackdropExpansionV5=0"
  );
  const current = resolveWorldVisualDepthBackdropRegionAssets(
    region,
    backgroundConfig,
    ""
  );
  assert.equal(prior.length, 12, `${region.id} preserves its exact V3 pool`);
  assert.equal(
    current.length,
    prior.length + expectedBackgroundCounts[index],
    `${region.id} adds only its allocated V5 cards`
  );
});
const selectedV5Backgrounds = backgroundConfig.regions.flatMap(region => (
  resolveWorldVisualDepthBackdropRegionAssets(region, backgroundConfig, "")
    .filter(asset => asset.path.includes("/biome-expansion-v5/"))
));
assert.equal(selectedV5Backgrounds.length, 50);
assert.equal(new Set(selectedV5Backgrounds.map(asset => asset.path)).size, 50);
assert.deepEqual(
  new Set(selectedV5Backgrounds.map(asset => asset.path)),
  new Set(manifest.backgrounds.map(entry => entry.runtime))
);
assert.equal(
  resolveWorldVisualDepthBackdropBlendMask(backgroundConfig, "").path,
  maskEntry.runtime
);
assert.equal(
  resolveWorldVisualDepthBackdropBlendMask(
    backgroundConfig,
    "?biomeBackdropExpansionV5=0"
  ).path.includes("/terrain-variation-v4/"),
  true
);
assert.equal(
  getWorldVisualDepthBackdropPreloadAssets(backgroundConfig, "")[1].path,
  maskEntry.runtime
);

const terrainConfig = WORLD_VISUAL_TERRAIN_VARIATION;
assert.ok(terrainConfig.regions.every(region => region.plates.length === 5));
assert.equal(
  getWorldVisualTerrainVariationAssets(terrainConfig).length,
  60,
  "the existing V4 inventory API remains pixel-exact and unchanged"
);
assert.equal(resolveWorldVisualTerrainExpansionV5Enabled(undefined, ""), true);
assert.equal(
  resolveWorldVisualTerrainExpansionV5Enabled(
    undefined,
    "?undergroundTerrainExpansionV5=0"
  ),
  false
);
const expectedTerrainCounts = [2, 2, 2, 2, 3, 5, 5, 6, 6, 7];
const expandedTerrainRegions = resolveWorldVisualTerrainVariationRegions(
  65,
  5065,
  terrainConfig,
  ""
);
expandedTerrainRegions.forEach((region, index) => {
  assert.equal(region.v5Plates.length, expectedTerrainCounts[index]);
  assert.equal(region.plates.length, 5 + expectedTerrainCounts[index]);
  assert.equal(region.capAtlases.length, 2);
  assert.equal(region.capAtlases[0], region.capAtlas);
  assert.equal(region.capAtlases[1], region.v5CapAtlas);
});
assert.equal(terrainConfig.segment.crossBiomeOverlapYPx, 128);
assert.equal(WORLD_VISUAL_DEPTH_BACKDROPS.blend.crossBiomeOverlapYPx, 140);

class FakeTerrainImage {
  constructor(x, y, key) {
    this.x = x;
    this.y = y;
    this.key = key;
  }
  setOrigin() { return this; }
  setDepth(value) { this.depth = value; return this; }
  setAlpha(value) { this.alpha = value; return this; }
  setCrop(x, y, width, height) {
    this.crop = { x, y, width, height };
    return this;
  }
  setScale(x, y = x) {
    this.scaleX = x;
    this.scaleY = y;
    return this;
  }
  setMask(value) { this.mask = value; return this; }
  setTint(value) { this.tint = value; return this; }
  destroy() { this.destroyed = true; }
}

const transitionTerrainRegion = expandedTerrainRegions[1];
const transitionTerrainMask = { id: "authoritative-production-terrain" };
const transitionTerrainScene = {
  config: { tileSize: 64 },
  textures: {
    exists: () => true,
    get: () => ({
      getSourceImage: () => ({ width: 1536, height: 1024 }),
    }),
  },
  add: {
    image: (x, y, key) => new FakeTerrainImage(x, y, key),
  },
};
const transitionTerrainView = new WorldVisualTerrainVariationRegionView(
  transitionTerrainScene,
  { getTileType: () => TILE_TYPES.AIR },
  transitionTerrainRegion,
  terrainConfig,
  transitionTerrainMask
);
assert.equal(transitionTerrainView.sync(
  {
    left: 0,
    right: 1,
    top: transitionTerrainRegion.topTile - 2,
    bottom: transitionTerrainRegion.topTile,
  },
  { terrainTint: 0xffffff },
  true
), true);
assert.equal(
  Math.min(...[...transitionTerrainView.plateImages.values()].map(image => image.y)),
  transitionTerrainRegion.topTile * transitionTerrainScene.config.tileSize
    - terrainConfig.segment.crossBiomeOverlapYPx,
  "the next biome's alpha-feathered material begins inside the previous biome"
);
assert.ok(
  [...transitionTerrainView.plateImages.values()]
    .every(image => image.mask === transitionTerrainMask),
  "the cross-biome material transition remains clipped to production ground"
);
transitionTerrainView.destroy();

const priorTerrainRegions = resolveWorldVisualTerrainVariationRegions(
  65,
  5065,
  terrainConfig,
  "?undergroundTerrainExpansionV5=0"
);
assert.ok(priorTerrainRegions.every(region => region.plates.length === 5));
assert.ok(priorTerrainRegions.every(region => region.capAtlases.length === 1));
assert.equal(
  getWorldVisualTerrainVariationRuntimeAssets(terrainConfig, "").length,
  120
);
assert.equal(
  getWorldVisualTerrainVariationRuntimeAssets(
    terrainConfig,
    "?undergroundTerrainExpansionV5=0"
  ).length,
  70
);
const selectedV5Terrain = expandedTerrainRegions.flatMap(region => region.v5Plates);
assert.equal(selectedV5Terrain.length, 40);
assert.deepEqual(
  new Set(selectedV5Terrain.map(asset => asset.path)),
  new Set(manifest.terrainPlates.map(entry => entry.runtime))
);
assert.equal(terrainConfig.cohesion.runtimeMode, "world-overlay");
assert.equal(resolveWorldVisualTerrainCohesionEnabled(terrainConfig, ""), true);
assert.equal(
  resolveWorldVisualTerrainCohesionEnabled(
    terrainConfig,
    "?undergroundForegroundCohesion=0"
  ),
  false
);
const terrainRuntimeAssets = getWorldVisualTerrainVariationRuntimeAssets(
  terrainConfig,
  ""
);
for (const region of expandedTerrainRegions) {
  const placement = resolveWorldVisualTerrainCohesionPlacement(
    region,
    94,
    terrainConfig
  );
  assert.equal(
    placement.displayWidthPx,
    terrainConfig.segment.logicalWidthPx
      * terrainConfig.cohesion.placement.sourceDensityScale
  );
  assert.equal(
    placement.displayHeightPx,
    terrainConfig.segment.logicalHeightPx
      * terrainConfig.cohesion.placement.sourceDensityScale
  );
  assert.ok(placement.displayScale <= 1);
  assert.ok(
    terrainRuntimeAssets.some(asset => asset.key === placement.asset.key),
    `${region.id} cohesion painting is in the streamed runtime inventory`
  );
}
const cohesionViewSource = fs.readFileSync(path.join(
  ROOT,
  "world",
  "rendering",
  "scenic-world",
  "WorldVisualTerrainCohesionView.js"
), "utf8");
assert.match(cohesionViewSource, /this\.scene\.add\.image\(/);
assert.match(cohesionViewSource, /\.setMask\(this\.terrainMask\)/);
assert.doesNotMatch(
  cohesionViewSource,
  /\.graphics\(|setScrollFactor\s*\(\s*0/
);

const runtimeConfig = WORLD_VISUAL_RUNTIME;
assert.equal(resolveWorldVisualSurfaceGroundVariationEnabled(undefined, ""), true);
assert.equal(
  resolveWorldVisualSurfaceGroundVariationEnabled(
    undefined,
    "?surfaceGroundVariation=0"
  ),
  false
);
assert.equal(
  resolveWorldVisualSurfaceGroundVariationEnabled(undefined, "?surfaceEdge=0"),
  false
);
const surfaceAssets = runtimeConfig.surface.surfaceGroundVariation.assets;
assert.equal(surfaceAssets.length, 10);
assert.equal(new Set(surfaceAssets.map(asset => asset.key)).size, 10);
assert.deepEqual(
  new Set(surfaceAssets.map(asset => asset.path)),
  new Set(manifest.surfaceGround.map(entry => entry.runtime))
);
const preload = getWorldVisualPreloadAssets(runtimeConfig, "");
assert.ok(preload.some(asset => asset === runtimeConfig.assets.surfaceEdge));
assert.ok(surfaceAssets.every(asset => preload.includes(asset)));
const rollbackPreload = getWorldVisualPreloadAssets(
  runtimeConfig,
  "?surfaceGroundVariation=0"
);
assert.ok(rollbackPreload.some(asset => asset === runtimeConfig.assets.surfaceEdge));
assert.ok(surfaceAssets.every(asset => !rollbackPreload.includes(asset)));
assert.equal(
  runtimeConfig.surface.surfaceGroundVariation.expectedSourceWidthPx
    - runtimeConfig.surface.surfaceGroundVariation.overlapPx,
  runtimeConfig.surface.surfaceGroundVariation.stridePx
);

const surfaceStageSource = fs.readFileSync(path.join(
  ROOT,
  "world",
  "rendering",
  "scenic-world",
  "WorldVisualSurfaceStage.js"
), "utf8");
assert.match(
  surfaceStageSource,
  /this\.surfaceEdges\.forEach\(image => image\.setMask\?\.\(terrainMask\)\)/,
  "existing and V5 surface art share the authoritative terrain mask"
);
const variationMethodStart = surfaceStageSource.indexOf(
  "\n  _createSurfaceGroundVariation() {"
);
assert.ok(variationMethodStart >= 0);
const variationMethod = surfaceStageSource.slice(
  variationMethodStart,
  surfaceStageSource.indexOf("\n  update(", variationMethodStart)
);
assert.doesNotMatch(
  variationMethod,
  /setFlipX/,
  "V5 surface cards are varied rather than mirrored"
);

for (const fileName of [
  "2026-07-28-backgrounds-contact-sheet-v5.jpg",
  "2026-07-28-terrain-contact-sheet-v5.jpg",
  "2026-07-28-surface-ground-contact-sheet-v5.png",
  "2026-07-28-imagegen-prompt-manifest.md",
  "readme.md",
]) {
  assert.ok(fs.existsSync(path.join(REVIEW_ROOT, fileName)), fileName);
}

console.log("Whole-world visual expansion V5 additive contract passed.");
