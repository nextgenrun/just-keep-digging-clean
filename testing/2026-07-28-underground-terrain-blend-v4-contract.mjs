import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TILE_TYPES } from "../values/tileTypes.js";
import { WORLD_VISUAL_DEPTH_BACKDROPS } from "../values/worldVisualDepthBackdrops.js";
import {
  WORLD_VISUAL_TERRAIN_VARIATION,
  getWorldVisualTerrainVariationAssets,
  isWorldVisualTerrainCapTileType,
  resolveWorldVisualTerrainVariationEnabled,
  resolveWorldVisualTerrainVariationRegions,
} from "../values/worldVisualTerrainVariation.js";
import { WorldVisualTerrainVariationRegionView } from
  "../world/rendering/scenic-world/WorldVisualTerrainVariationRegionView.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REVIEW_ROOT = path.join(
  ROOT,
  "visual-approval-previews",
  "underground-terrain-blend-v4"
);
const RUNTIME_ROOT = path.join(
  ROOT,
  "sprites",
  "backgrounds",
  "world-visual-v2",
  "depth",
  "terrain-variation-v4"
);
const manifest = JSON.parse(fs.readFileSync(path.join(
  REVIEW_ROOT,
  "2026-07-28-underground-terrain-blend-v4.json"
), "utf8"));

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

function assertWebpAlpha(filePath, expectedDimensions) {
  const payload = fs.readFileSync(filePath);
  assert.deepEqual(webpDimensions(payload), expectedDimensions, filePath);
  assert.equal(payload.toString("ascii", 12, 16), "VP8X", `${filePath} is extended WebP`);
  assert.ok((payload[20] & 0x10) !== 0, `${filePath} retains authored alpha`);
  assert.ok(payload.length > 4096, `${filePath} is not a placeholder`);
}

assert.equal(manifest.version, 4);
assert.equal(manifest.generatedWith, "built-in ImageGen");
assert.deepEqual(manifest.sourceDimensions, [1536, 1024]);
assert.deepEqual(manifest.counts, {
  masterPlates: 50,
  runtimePlateFiles: 50,
  capAtlasFiles: 10,
  capFrames: 200,
  backgroundBlendMaskFrames: 16,
  effectiveTerrainVisuals: 250,
  runtimeFiles: 61,
});
assert.deepEqual(manifest.plateGeometry, {
  width: 1536,
  height: 1024,
  featherPx: [192, 128],
  stridePx: [1344, 896],
});
assert.equal(manifest.plates.length, 50);
assert.equal(manifest.capAtlases.length, 10);
assert.equal(
  new Set(manifest.plates.map(entry => entry.sourceSha256)).size,
  50,
  "all accepted ImageGen masters are distinct"
);
assert.equal(
  new Set(manifest.plates.map(entry => entry.runtimeSha256)).size,
  50,
  "all feathered runtime plates are distinct"
);

for (const entry of manifest.plates) {
  const sourcePath = path.join(ROOT, entry.source);
  const runtimePath = path.join(ROOT, entry.runtime);
  assert.ok(fs.existsSync(sourcePath), entry.source);
  assertWebpAlpha(runtimePath, [1536, 1024]);
}
for (const entry of manifest.capAtlases) {
  assert.equal(entry.frameCount, 20);
  assert.equal(entry.frames.length, 20);
  assert.equal(new Set(entry.frames.map(frame => frame.index)).size, 20);
  assertWebpAlpha(path.join(ROOT, entry.runtime), [1280, 384]);
}

const maskPath = path.join(
  ROOT,
  manifest.backgroundBlendMaskAtlas.runtime
);
const mask = fs.readFileSync(maskPath);
assert.deepEqual([...mask.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
assert.equal(mask.readUInt32BE(16), 1536);
assert.equal(mask.readUInt32BE(20), 1024);
assert.equal(mask[25], 6, "blend mask has an RGBA alpha channel");
assert.ok(mask.length > 4096);

const runtimeFiles = fs.readdirSync(RUNTIME_ROOT);
assert.equal(runtimeFiles.filter(name => name.endsWith("-v4.webp")).length, 60);
assert.equal(
  runtimeFiles.filter(name => name === "backdrop-card-blend-mask-atlas-v4.png").length,
  1
);
assert.ok(fs.existsSync(path.join(
  REVIEW_ROOT,
  "2026-07-28-terrain-plates-contact-sheet-v4.jpg"
)));
assert.ok(fs.existsSync(path.join(
  REVIEW_ROOT,
  "2026-07-28-exposed-top-caps-contact-sheet-v4.png"
)));
assert.ok(fs.existsSync(path.join(
  REVIEW_ROOT,
  "2026-07-28-imagegen-prompt-manifest.md"
)));

const config = WORLD_VISUAL_TERRAIN_VARIATION;
assert.equal(resolveWorldVisualTerrainVariationEnabled(undefined, ""), true);
assert.equal(
  resolveWorldVisualTerrainVariationEnabled(undefined, "?undergroundTerrainVariation=0"),
  false
);
assert.equal(resolveWorldVisualTerrainVariationRegions(65, 5065).length, 10);
assert.deepEqual(
  config.regions.map(region => [
    region.id,
    region.topTile,
    region.bottomTileExclusive,
  ]),
  WORLD_VISUAL_DEPTH_BACKDROPS.regions.map(region => [
    region.id,
    region.topTile,
    region.bottomTileExclusive,
  ]),
  "terrain variation follows the existing layout exactly"
);
assert.ok(config.regions.every(region => region.plates.length === 5));
assert.equal(getWorldVisualTerrainVariationAssets().length, 60);
assert.equal(new Set(
  getWorldVisualTerrainVariationAssets().map(asset => asset.key)
).size, 60);
assert.equal(config.render.plateDepth > 0.1, true);
assert.equal(config.render.plateDepth < 0.16, true);
assert.equal(config.render.capDepth > 0.16, true);
assert.equal(config.render.capDepth < 0.2, true);
assert.equal(isWorldVisualTerrainCapTileType(TILE_TYPES.DIRT), true);
assert.equal(isWorldVisualTerrainCapTileType(TILE_TYPES.LAVA_DIRT), true);
assert.equal(isWorldVisualTerrainCapTileType(TILE_TYPES.COPPER), false);
assert.equal(isWorldVisualTerrainCapTileType(TILE_TYPES.GEM_POWER_BLOCK), false);

assert.deepEqual(
  {
    overlapXPx: WORLD_VISUAL_DEPTH_BACKDROPS.segment.overlapXPx,
    overlapYPx: WORLD_VISUAL_DEPTH_BACKDROPS.segment.overlapYPx,
    strideXPx: WORLD_VISUAL_DEPTH_BACKDROPS.segment.strideXPx,
    strideYPx: WORLD_VISUAL_DEPTH_BACKDROPS.segment.strideYPx,
  },
  { overlapXPx: 192, overlapYPx: 128, strideXPx: 1344, strideYPx: 896 }
);
assert.equal(WORLD_VISUAL_DEPTH_BACKDROPS.blend.maskAtlas.path, (
  "sprites/backgrounds/world-visual-v2/depth/terrain-variation-v4/"
  + "backdrop-card-blend-mask-atlas-v4.png"
));

class FakeImage {
  constructor(x = 0, y = 0, key = "") {
    this.x = x;
    this.y = y;
    this.key = key;
  }
  setOrigin() { return this; }
  setDepth(value) { this.depth = value; return this; }
  setAlpha(value) { this.alpha = value; return this; }
  setCrop(x, y, width, height) { this.crop = { x, y, width, height }; return this; }
  setDisplaySize(width, height) {
    this.displayWidth = width;
    this.displayHeight = height;
    return this;
  }
  setMask(value) { this.mask = value; return this; }
  setTint(value) { this.tint = value; return this; }
  destroy() { this.destroyed = true; }
}

const firstRegion = config.regions[0];
const loaded = new Set([
  ...firstRegion.plates.map(asset => asset.key),
  firstRegion.capAtlas.key,
]);
const terrainMask = { id: "authoritative-solid-terrain-mask" };
const tileOverrides = new Map();
const worldModel = {
  getTileType(tx, ty) {
    const override = tileOverrides.get(`${tx}:${ty}`);
    if (override !== undefined) return override;
    return ty < firstRegion.topTile ? TILE_TYPES.AIR : TILE_TYPES.DIRT;
  },
};
const scene = {
  config: { tileSize: 64 },
  textures: {
    exists: key => loaded.has(key),
    get: key => ({
      getSourceImage: () => (
        key === firstRegion.capAtlas.key
          ? { width: 1280, height: 384 }
          : { width: 1536, height: 1024 }
      ),
    }),
  },
  add: {
    image: (x, y, key) => new FakeImage(x, y, key),
  },
};
const view = new WorldVisualTerrainVariationRegionView(
  scene,
  worldModel,
  firstRegion,
  config,
  terrainMask
);
assert.equal(view.sync(
  { left: 0, right: 6, top: 65, bottom: 70 },
  { terrainTint: 0xddeeff },
  true
), true);
assert.ok(view.plateImages.size > 0);
assert.equal(view.capImages.size, 6);
assert.ok([...view.plateImages.values()].every(image => image.mask === terrainMask));
assert.ok([...view.capImages.values()].every(image => image.mask === terrainMask));
assert.ok([...view.plateImages.values()].every(image => image.depth === config.render.plateDepth));
assert.ok([...view.capImages.values()].every(image => image.depth === config.render.capDepth));
tileOverrides.set("1:65", TILE_TYPES.COPPER);
tileOverrides.set("2:65", TILE_TYPES.AIR);
view.sync({ left: 0, right: 6, top: 65, bottom: 70 }, { terrainTint: 0xffffff });
assert.equal(view.capImages.size, 5, "digging reveals the next valid painted edge cap");
assert.equal(view.capImages.has("1:65"), false, "resource tiles never receive dirt caps");
assert.equal(view.capImages.has("2:65"), false, "dug-air tiles never retain dirt caps");
assert.equal(view.capImages.has("2:66"), true, "the newly exposed dirt below receives a cap");
view.destroy();

const backdropSource = fs.readFileSync(path.join(
  ROOT,
  "world/rendering/scenic-world/WorldVisualDepthBackdropRegionView.js"
), "utf8");
const backdropBlendSource = fs.readFileSync(path.join(
  ROOT,
  "world/rendering/scenic-world/worldVisualBlendMaskFrame.js"
), "utf8");
const variationSource = fs.readFileSync(path.join(
  ROOT,
  "world/rendering/scenic-world/WorldVisualTerrainVariationRegionView.js"
), "utf8");
const layerSource = fs.readFileSync(path.join(
  ROOT,
  "world/rendering/scenic-world/WorldVisualTerrainVariationLayer.js"
), "utf8");
const materialSource = fs.readFileSync(path.join(
  ROOT,
  "world/rendering/scenic-world/WorldVisualMaterialField.js"
), "utf8");
const runtimeSource = fs.readFileSync(path.join(
  ROOT,
  "world/rendering/scenic-world/WorldVisualRuntime.js"
), "utf8");
assert.match(`${backdropSource}\n${backdropBlendSource}`, /createBitmapMask/);
assert.match(backdropSource, /strideXPx/);
assert.doesNotMatch(backdropSource, /setFlipX|setFlipY/);
assert.doesNotMatch(
  `${variationSource}\n${layerSource}`,
  /add\.graphics|fillRect|lineStyle|tweens|document\.|innerHTML/
);
assert.doesNotMatch(
  `${variationSource}\n${layerSource}`,
  /setTile|damageTile|digTile|createTilemap|save|collision/
);
assert.match(materialSource, /usesAuthoredTopCap/);
assert.match(runtimeSource, /WorldVisualTerrainVariationLayer/);
assert.match(
  runtimeSource,
  /materialField\.sync[\s\S]{0,120}terrainVariationLayer\?\.sync[\s\S]{0,120}groundStructureLayer\?\.sync/
);

console.log("Underground terrain blend V4 additive runtime contract passed");
