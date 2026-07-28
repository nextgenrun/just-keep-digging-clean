import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { GAME_CONFIG } from "../values/gameConfig.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { WORLD_VISUAL_FEEDBACK } from "../values/worldVisualFeedback.js";
import { WORLD_VISUAL_RUNTIME } from "../values/worldVisualRuntime.js";
import {
  WORLD_VISUAL_SEMANTIC_ASSETS,
  resolveWorldVisualSemanticResourceFrame,
} from "../values/worldVisualSemanticAssets.js";
import { WorldVisualFeedbackLayer } from "../world/rendering/scenic-world/WorldVisualFeedbackLayer.js";
import { WorldVisualSemanticAssetLayer } from "../world/rendering/scenic-world/WorldVisualSemanticAssetLayer.js";

const SPECIAL_REWARD_TYPES = Object.freeze([
  TILE_TYPES.GEM_POWER_BLOCK,
  TILE_TYPES.SPEED_BLOCK,
  TILE_TYPES.XP_BLOCK,
  TILE_TYPES.CRIT_BLOCK,
  TILE_TYPES.BERSERK_BLOCK,
  TILE_TYPES.COMBO_BLOCK,
  TILE_TYPES.LEGEND_BLOCK,
]);

function readPngDimensions(descriptor) {
  const cleanPath = descriptor.path.split(/[?#]/, 1)[0].replace(/\\/g, "/");
  const assetPath = fileURLToPath(new URL(`../${cleanPath}`, import.meta.url));
  assert.ok(fs.existsSync(assetPath), `generated semantic raster is missing: ${cleanPath}`);
  const bytes = fs.readFileSync(assetPath);
  assert.ok(
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    `generated reward raster must be a real PNG: ${cleanPath}`
  );
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), cleanPath };
}

for (const atlas of [
  WORLD_VISUAL_SEMANTIC_ASSETS.specialBlocks.beautyAtlas,
  WORLD_VISUAL_SEMANTIC_ASSETS.specialBlocks.emissiveAtlas,
]) {
  const dimensions = readPngDimensions(atlas);
  assert.match(dimensions.cleanPath, /^sprites\/backgrounds\/world-visual-v2\/semantic-decals-v1\//);
  assert.doesNotMatch(`${atlas.key} ${dimensions.cleanPath}`, /feedback-atlas|recognition-atlas/i);
  assert.ok(atlas.frameSizePx >= 188, `reward frames must be at least 188px, got ${atlas.frameSizePx}px`);
  assert.ok(dimensions.width >= atlas.frameSizePx && dimensions.height >= atlas.frameSizePx);
  assert.ok(atlas.frameCount >= SPECIAL_REWARD_TYPES.length);
}
assert.equal(WORLD_VISUAL_FEEDBACK.atlas.frameSizePx, 94, "the suppressed legacy marker is the 94px atlas");
for (const [frame, tileType] of SPECIAL_REWARD_TYPES.entries()) {
  assert.equal(
    WORLD_VISUAL_SEMANTIC_ASSETS.specialBlocks.frameByTileType[tileType],
    frame,
    `special reward tile ${tileType} needs a generated beauty/emissive frame`
  );
}

function createGraphicsStub() {
  const mask = { destroyed: false, destroy() { this.destroyed = true; } };
  const target = {
    calls: [],
    destroyed: false,
    mask,
    createGeometryMask() { this.calls.push(["createGeometryMask"]); return mask; },
    destroy() { this.destroyed = true; this.calls.push(["destroy"]); return proxy; },
  };
  let proxy = null;
  proxy = new Proxy(target, {
    get(object, method) {
      if (method in object) {
        const value = object[method];
        return typeof value === "function" ? value.bind(object) : value;
      }
      return (...args) => { object.calls.push([method, ...args]); return proxy; };
    },
  });
  return proxy;
}

class ImageStub {
  constructor(x, y, key) {
    this.x = x;
    this.y = y;
    this.textureKey = key;
    this.visible = true;
    this.calls = [];
  }
  record(method, values = []) { this.calls.push([method, ...values]); return this; }
  setDepth(value) { this.depth = value; return this.record("setDepth", [value]); }
  setMask(value) { this.mask = value; return this.record("setMask", [value]); }
  setVisible(value) { this.visible = value; return this.record("setVisible", [value]); }
  setPosition(x, y) { this.x = x; this.y = y; return this.record("setPosition", [x, y]); }
  setTexture(key, frame) { this.textureKey = key; this.textureFrame = frame; return this.record("setTexture", [key, frame]); }
  setDisplaySize(width, height) { this.displaySize = [width, height]; return this.record("setDisplaySize", [width, height]); }
  setRotation(value) { this.rotation = value; return this.record("setRotation", [value]); }
  setAlpha(value) { this.alpha = value; return this.record("setAlpha", [value]); }
  setTint(value) { this.tint = value; return this.record("setTint", [value]); }
  setBlendMode(value) { this.blendMode = value; return this.record("setBlendMode", [value]); }
  setOrigin(value) { this.origin = value; return this.record("setOrigin", [value]); }
  destroy() { this.destroyed = true; return this.record("destroy"); }
}

function createSceneStub() {
  const framesByTexture = new Map();
  const images = [];
  const graphics = [];
  const madeGraphics = [];
  const getTexture = key => {
    if (!framesByTexture.has(key)) framesByTexture.set(key, new Set());
    const frames = framesByTexture.get(key);
    return {
      has: frame => frames.has(frame),
      add: frame => frames.add(frame),
      getSourceImage: () => ({ width: 2508, height: 2508 }),
    };
  };
  return {
    config: {
      tileSize: GAME_CONFIG.tileSize,
      topAirRows: GAME_CONFIG.topAirRows,
    },
    images,
    graphics,
    madeGraphics,
    framesByTexture,
    textures: { exists: () => true, get: getTexture },
    add: {
      image: (x, y, key) => { const image = new ImageStub(x, y, key); images.push(image); return image; },
      graphics: () => { const item = createGraphicsStub(); graphics.push(item); return item; },
    },
    make: {
      graphics: () => { const item = createGraphicsStub(); madeGraphics.push(item); return item; },
    },
  };
}

const row = [
  TILE_TYPES.STONE, TILE_TYPES.STONE, TILE_TYPES.STONE, TILE_TYPES.STONE,
  TILE_TYPES.STONE, TILE_TYPES.STONE, TILE_TYPES.COPPER, TILE_TYPES.GOLD,
  TILE_TYPES.SKY_TILE, ...SPECIAL_REWARD_TYPES, TILE_TYPES.BEDROCK,
];
const world = {
  reads: 0,
  getTileType(tx, ty) { this.reads += 1; return ty === 0 ? (row[tx] ?? TILE_TYPES.AIR) : TILE_TYPES.AIR; },
  getSkyTileRarity: () => 4,
};
const semanticConfig = {
  ...WORLD_VISUAL_SEMANTIC_ASSETS,
  resources: {
    ...WORLD_VISUAL_SEMANTIC_ASSETS.resources,
    stoneDensity: 1,
    maxVisibleStone: 8,
  },
  performance: {
    ...WORLD_VISUAL_SEMANTIC_ASSETS.performance,
    maxVisibleResources: 2,
  },
};
const scene = createSceneStub();
const layer = new WorldVisualSemanticAssetLayer(scene, world, { id: "solid-mask" }, semanticConfig);
assert.equal(layer.create(), true, "semantic lifecycle create must install generated atlases");
assert.ok(layer.bedrockLayer, "semantic create must own the bedrock material lifecycle");

const initialBounds = { left: 0, right: 10, top: 0, bottom: 1 };
layer.sync(initialBounds, { terrainTint: 0xaabbcc });
assert.equal(layer.resourcePool.length, 2, "the resource cap should be filled by ordinary ores before stone");
assert.deepEqual(
  layer.resourcePool.map(image => image.textureFrame),
  [
    `${semanticConfig.resources.atlas.framePrefix}${resolveWorldVisualSemanticResourceFrame(6, 0, "copper", semanticConfig)}`,
    `${semanticConfig.resources.atlas.framePrefix}${resolveWorldVisualSemanticResourceFrame(7, 0, "gold", semanticConfig)}`,
  ],
  "common stone must not starve visible non-stone resources"
);

const readsAfterInitialSync = world.reads;
const bedrockClearsAfterInitialSync = layer.bedrockLayer.maskGraphics.calls
  .filter(([method]) => method === "clear").length;
layer.sync(initialBounds, { terrainTint: 0x778899 });
assert.equal(world.reads, readsAfterInitialSync, "same-bounds sync must not rescan the WorldModel");
assert.equal(
  layer.bedrockLayer.maskGraphics.calls.filter(([method]) => method === "clear").length,
  bedrockClearsAfterInitialSync,
  "same-bounds sync must not rebuild the bedrock mask"
);

layer.setEmissiveDepth(777);
const fullBounds = { left: 0, right: row.length, top: 0, bottom: 1 };
layer.sync(fullBounds, { terrainTint: 0xffffff });
assert.equal(layer.specialBeautyPool.length, SPECIAL_REWARD_TYPES.length);
assert.equal(layer.specialEmissivePool.length, SPECIAL_REWARD_TYPES.length);
assert.ok(layer.specialBeautyPool.every(image => (
  image.textureKey === semanticConfig.specialBlocks.beautyAtlas.key && image.visible
)));
assert.ok(layer.specialEmissivePool.every(image => (
  image.textureKey === semanticConfig.specialBlocks.emissiveAtlas.key && image.visible
)));
assert.ok(
  [...layer.starEmissivePool, ...layer.specialEmissivePool].every(image => image.depth === 777),
  "setEmissiveDepth must persist for emissive images allocated by later syncs"
);
layer.update(4100);

const readsBeforeOutsideInvalidation = world.reads;
layer.invalidateCell(row.length + 10, 0);
assert.equal(world.reads, readsBeforeOutsideInvalidation, "offscreen invalidation must not rebuild the layer");
layer.invalidateCell(6, 0);
assert.ok(world.reads > readsBeforeOutsideInvalidation, "onscreen invalidation must resync authoritative state");

const semanticImages = [...scene.images];
const semanticMask = layer.bedrockLayer.geometryMask;
const semanticMaskGraphics = layer.bedrockLayer.maskGraphics;
layer.destroy();
assert.ok(semanticImages.every(image => image.destroyed), "destroy must release pooled semantic and bedrock images");
assert.equal(semanticMask.destroyed, true, "destroy must release the bedrock geometry mask");
assert.equal(semanticMaskGraphics.destroyed, true, "destroy must release the bedrock mask graphics");
for (const pool of [
  layer.resourcePool, layer.starBeautyPool, layer.starEmissivePool,
  layer.specialBeautyPool, layer.specialEmissivePool,
]) assert.equal(pool.length, 0, "destroy must clear semantic pools");

const feedbackScene = createSceneStub();
const feedbackWorld = {
  getTileType: tx => SPECIAL_REWARD_TYPES[tx] ?? TILE_TYPES.AIR,
  getTileHp: () => 100,
  getTileMaxHp: () => 100,
};
const feedbackLayer = new WorldVisualFeedbackLayer(
  feedbackScene,
  feedbackWorld,
  { id: "solid-mask" },
  WORLD_VISUAL_RUNTIME,
  WORLD_VISUAL_FEEDBACK
);
feedbackLayer.create();
feedbackLayer.sync({ left: 0, right: SPECIAL_REWARD_TYPES.length, top: 0, bottom: 1 });
assert.equal(feedbackLayer.semanticAssetsEnabled, true);
assert.equal(feedbackLayer.markerPool.length, 0, "generated reward rasters must suppress all seven 94px markers");
assert.equal(
  feedbackScene.images.some(image => image.textureKey === WORLD_VISUAL_FEEDBACK.atlas.key),
  false,
  "terrainSemantics=1 must not instantiate the legacy feedback atlas for generated rewards"
);
feedbackLayer.destroy();

console.log("Scenic semantic runtime lifecycle smoke passed: generated rewards suppress 94px markers, ores outrank stone, and pooling/depth/invalidation cleanup remain stable");
