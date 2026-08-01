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
  resolveWorldVisualDepthBackdropExpansionEnabled,
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
const EXPANSION_ROLLBACK_QUERY = "?biomeBackdropExpansion=0";
const V3_SMOKE_QUERY = "?biomeBackdropExpansionV5=0&scenicDemandStreaming=0";
const regionAssets = (region, search = V3_SMOKE_QUERY) => (
  resolveWorldVisualDepthBackdropRegionAssets(region, WORLD_VISUAL_DEPTH_BACKDROPS, search)
);

assert.equal(resolveWorldVisualDepthBackdropsEnabled(undefined, ""), true);
assert.equal(resolveWorldVisualDepthBackdropsEnabled(undefined, "?levelOneBackdrops=0"), false);
assert.equal(resolveWorldVisualDepthBackdropsEnabled(undefined, "?shallowCavern=off"), false);
assert.equal(resolveWorldVisualDepthBackdropVariantsEnabled(undefined, ""), true);
assert.equal(resolveWorldVisualDepthBackdropVariantsEnabled(undefined, LEGACY_QUERY), false);
assert.equal(resolveWorldVisualDepthBackdropExpansionEnabled(undefined, ""), true);
assert.equal(
  resolveWorldVisualDepthBackdropExpansionEnabled(undefined, EXPANSION_ROLLBACK_QUERY),
  false
);
assert.equal(resolveWorldVisualDepthBackdropMotionEnabled(undefined, ""), true);
assert.equal(resolveWorldVisualDepthBackdropMotionEnabled(undefined, "?biomeBackdropMotion=0"), false);
assert.equal(resolveWorldVisualDepthBackdropMotionEnabled(undefined, "?worldMotion=off"), false);
assert.deepEqual(
  getWorldVisualDepthBackdropPreloadAssets().map(entry => entry.key),
  [
    "world-visual-biome-weathered-roots-root-canyon",
    "world-visual-backdrop-card-blend-mask-atlas-v5",
  ],
  "the first roots plate and shared crossfade mask start resident"
);
assert.deepEqual(
  getWorldVisualDepthBackdropPreloadAssets(undefined, LEGACY_QUERY).map(entry => entry.key),
  [
    "world-visual-v2-shallow-cavern-backwall",
    "world-visual-backdrop-card-blend-mask-atlas-v4",
  ],
  "the variant rollback restores the original plate with shared blending"
);
assert.equal(getWorldVisualDepthBackdropPreloadAssets(undefined, "?levelOneBackdrops=0").length, 0);

const { regions, segment, render, motion } = WORLD_VISUAL_DEPTH_BACKDROPS;
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
assert.equal(segment.logicalWidthPx, 1152);
assert.equal(segment.logicalHeightPx, 768);
assert.equal(segment.neighborSegments, 1);
assert.equal(segment.overlapXPx, 144);
assert.equal(segment.overlapYPx, 140);
assert.equal(segment.strideXPx, 1008);
assert.equal(segment.strideYPx, 628);
assert.deepEqual(motion.smoothVideo, {
  widthPx: 1536,
  heightPx: 1024,
  durationMs: 8000,
  frameRate: 60,
  codec: "h264",
  noAudio: true,
  loop: true,
  pauseBelowFps: 36,
});
assert.ok(
  render.backwallDepth < WORLD_VISUAL_RUNTIME.render.terrainDepth,
  "the finished scenic media renders behind authoritative terrain"
);
assert.ok(regions.every(region => regionAssets(region).length === 12), "every biome has twelve approved plates");
assert.ok(regions.every(region => (
  regionAssets(region).slice(0, 11).every(entry => entry.type === "image")
  && regionAssets(region).filter(entry => entry.path.includes("/biome-expansion-v3/")).length === 5
  && regionAssets(region)[10].path.endsWith("-motion-v1.webp")
  && regionAssets(region)[11].type === "video"
  && regionAssets(region)[11].path.includes("/biome-motion-v3/")
)), "each biome has five older images, five new images, one concept static, and one V3 loop");
assert.ok(regions.every(region => (
  regionAssets(region, EXPANSION_ROLLBACK_QUERY).length === 7
)), "the additive expansion rollback restores the previous seven-card pool");
assert.ok(regions.slice(0, 5).every(region => regionAssets(region, LEGACY_QUERY).length > 0));
assert.ok(regions.slice(5).every(region => regionAssets(region, LEGACY_QUERY).length === 0));

const configuredAssets = getWorldVisualDepthBackdropAllAssets(
  WORLD_VISUAL_DEPTH_BACKDROPS,
  V3_SMOKE_QUERY
);
assert.equal(configuredAssets.length, 120);
assert.equal(configuredAssets.filter(entry => entry.type === "image").length, 110);
assert.equal(configuredAssets.filter(entry => entry.type === "video").length, 10);

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
for (const entry of configuredAssets) {
  const contents = fs.readFileSync(new URL(`../${entry.path}`, import.meta.url));
  if (entry.type === "video") {
    assert.equal(contents.toString("ascii", 4, 8), "ftyp", `${entry.key} is an MP4`);
    assert.ok(contents.length > 1_000_000, `${entry.key} is not an empty video placeholder`);
  } else {
    assert.deepEqual(webpDimensions(contents), [1536, 1024], `${entry.key} exact production dimensions`);
    assert.ok(contents.length > 4096, `${entry.key} is not an empty image placeholder`);
  }
  assetKeys.add(entry.key);
  assetPaths.add(entry.path);
}
assert.equal(assetKeys.size, 120);
assert.equal(assetPaths.size, 120);

class FakeLoader extends EventEmitter {
  constructor() {
    super();
    this.loading = false;
    this.queued = [];
    this.activeEntry = null;
  }
  isLoading() { return this.loading; }
  image(key, path) {
    this.activeEntry = { type: "image", key, path };
    this.queued.push(this.activeEntry);
  }
  video(key, path, noAudio) {
    this.activeEntry = { type: "video", key, path, noAudio };
    this.queued.push(this.activeEntry);
  }
  start() { this.loading = true; }
}

class FakeImage {
  constructor(x, y, key, frame = null) {
    this.x = x;
    this.y = y;
    this.key = key;
    this.frame = frame;
    this.scaleX = 1;
    this.scaleY = 1;
  }
  setOrigin() { return this; }
  setDisplayOrigin(x, y = x) {
    this.displayOriginX = x;
    this.displayOriginY = y;
    return this;
  }
  setDepth(value) { this.depth = value; return this; }
  setCrop(x, y, width, height) { this.crop = { x, y, width, height }; return this; }
  setDisplaySize(width, height) {
    this.displayWidth = width;
    this.displayHeight = height;
    if (this.frame?.width && this.frame?.height) {
      this.scaleX = width / this.frame.width;
      this.scaleY = height / this.frame.height;
    }
    return this;
  }
  setFlipX(value) { this.flipX = value; return this; }
  setFlipY(value) { this.flipY = value; return this; }
  setBlendMode(value) { this.blendMode = value; return this; }
  setTint(value) { this.tint = value; return this; }
  setAlpha(value) { this.alpha = value; return this; }
  setPosition(x, y) { this.x = x; this.y = y; return this; }
  setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; }
  setVisible(value) { this.visible = value; return this; }
  setMask(value) { this.mask = value; return this; }
  clearMask() { this.mask = null; return this; }
  createBitmapMask() {
    return {
      source: this,
      destroy() { this.destroyed = true; },
    };
  }
  destroy() { this.destroyed = true; }
}

class FakeVideo extends FakeImage {
  once(event, callback) {
    this.listeners ||= new Map();
    this.listeners.set(event, callback);
    return this;
  }
  play(loop) {
    this.played = true;
    this.loop = loop;
    this.listeners?.get("created")?.();
    this.listeners?.delete("created");
    return this;
  }
  setPaused(value) { this.paused = value; return this; }
  stop() { this.stopped = true; return this; }
}

function fakeGraphics() {
  return {
    fills: [],
    strokes: [],
    clear() { this.fills = []; this.strokes = []; return this; },
    fillStyle(tint, alpha) { this.style = { tint, alpha }; return this; },
    fillRect(x, y, width, height) {
      this.fills.push({ shape: "rect", x, y, width, height });
      return this;
    },
    lineStyle(width, tint, alpha) {
      this.line = { width, tint, alpha };
      return this;
    },
    beginPath() { this.path = []; return this; },
    moveTo(x, y) { this.path.push({ x, y }); return this; },
    lineTo(x, y) { this.path.push({ x, y }); return this; },
    strokePath() {
      this.strokes.push({ line: this.line, path: this.path });
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
const blendMaskKey = WORLD_VISUAL_DEPTH_BACKDROPS.blend.maskAtlas.key;
const textureKeys = new Set([surfaceKey, blendMaskKey]);
const videoKeys = new Set();
const removedKeys = [];
const removedVideoKeys = [];
const textureFrameMaps = new Map();
const canvasTextures = new Map();
const getTexture = (key) => {
  if (!textureFrameMaps.has(key)) textureFrameMaps.set(key, new Map());
  const frames = textureFrameMaps.get(key);
  return {
    getSourceImage: () => ({ width: 1536, height: 1024 }),
    has: frameName => frames.has(frameName),
    add(frameName, sourceIndex, x, y, width, height) {
      const frame = {
        name: frameName,
        sourceIndex,
        cutX: x,
        cutY: y,
        width,
        height,
      };
      frames.set(frameName, frame);
      return frame;
    },
  };
};
const fakeScene = {
  config: { tileSize: 94 },
  time: { now: 0 },
  game: { loop: { actualFps: 60 } },
  cameras: {
    main: { scrollX: 0, scrollY: 0, width: 1280, height: 720 },
  },
  load: loader,
  cache: {
    video: {
      exists: key => videoKeys.has(key),
      remove: key => { removedVideoKeys.push(key); videoKeys.delete(key); },
    },
  },
  textures: {
    exists: key => textureKeys.has(key),
    get: key => canvasTextures.get(key) || getTexture(key),
    createCanvas(key, width, height) {
      const context = {
        createImageData: (w, h) => ({
          width: w,
          height: h,
          data: new Uint8ClampedArray(w * h * 4),
        }),
        putImageData(imageData) { this.imageData = imageData; },
      };
      const texture = {
        width,
        height,
        getContext: () => context,
        refresh() { this.refreshed = true; return this; },
      };
      canvasTextures.set(key, texture);
      textureKeys.add(key);
      return texture;
    },
    remove: key => {
      removedKeys.push(key);
      textureKeys.delete(key);
      canvasTextures.delete(key);
    },
  },
  add: {
    image: (x, y, key) => new FakeImage(x, y, key),
    video: (x, y, key) => new FakeVideo(x, y, key),
    graphics: () => fakeGraphics(),
    rectangle: (x, y, width, height, color, alpha) => {
      const image = new FakeImage(x, y, "rectangle");
      image.rectangle = { width, height, color, alpha };
      return image;
    },
  },
  make: {
    image: ({ x, y, key, frame }) => (
      new FakeImage(
        x,
        y,
        key,
        frame
          ? textureFrameMaps.get(key)?.get(frame)
          : canvasTextures.get(key)
      )
    ),
  },
};
const completeAsset = entry => {
  if (assetReady(entry)) return;
  assert.equal(loader.activeEntry?.key, entry.key, `${entry.key} must be the active stream batch`);
  if (entry.type === "video") {
    videoKeys.add(entry.key);
    loader.emit(`filecomplete-video-${entry.key}`);
  } else {
    textureKeys.add(entry.key);
    loader.emit(`filecomplete-image-${entry.key}`);
  }
  loader.loading = false;
  loader.activeEntry = null;
  loader.emit("complete");
};
const completeRegion = region => regionAssets(region).forEach(completeAsset);
const assetReady = entry => entry.type === "video"
  ? videoKeys.has(entry.key)
  : textureKeys.has(entry.key);
const neutralLighting = { farTint: 0xffffff, lightning: 0, wet: 0, fog: 0 };

const stage = new WorldVisualDepthBackdropStage(
  fakeScene,
  WORLD_VISUAL_DEPTH_BACKDROPS,
  V3_SMOKE_QUERY
);
assert.equal(stage.create(), true);
assert.equal(stage.assetCache.release("not-loaded"), false, "unknown media releases are harmless");
assert.equal("ambientLayer" in stage, false, "no procedural ambient overlay is attached");
assert.equal("signatureLayer" in stage, false, "the rejected signature overlay is removed");
assert.equal(stage.sync({ left: 73, right: 84, top: 140, bottom: 150 }, neutralLighting), true);
assert.ok(stage.segments.size > 0, "the resident roots fallback covers the surface immediately");
assert.ok(
  [...stage.segments.values()].every(entry => entry.asset.key === surfaceKey),
  "visible surface cards use the resident fallback while their requested art streams"
);
assert.deepEqual(
  loader.queued.map(entry => entry.key),
  [surfaceAssets[1].key]
);
surfaceAssets.slice(1).forEach(completeAsset);
assert.deepEqual(
  loader.queued.map(entry => entry.key),
  surfaceAssets.slice(1).map(entry => entry.key)
);
loader.queued = [];

const assertNear = (actual, expected, message) => assert.ok(
  Math.abs(actual - expected) < 0.000001,
  `${message}: expected ${expected}, got ${actual}`
);
const assertRegionTailCrop = region => {
  const hasPreviousRegion = regions.some(entry => (
    entry.id !== region.id
    && entry.bottomTileExclusive === region.topTile
  ));
  const regionHeightPx = (
    region.bottomTileExclusive - region.topTile
  ) * fakeScene.config.tileSize + (
    hasPreviousRegion
      ? WORLD_VISUAL_DEPTH_BACKDROPS.blend.crossBiomeOverlapYPx
      : 0
  );
  const expectedRow = regionHeightPx <= segment.logicalHeightPx
    ? 0
    : Math.ceil(
      (regionHeightPx - segment.logicalHeightPx) / segment.strideYPx
    );
  const expectedDisplayHeight = (
    regionHeightPx - expectedRow * segment.strideYPx
  );
  const expectedSourceHeight = Math.round(expectedDisplayHeight);
  assert.equal(stage.sync(
    { left: 73, right: 84, top: region.bottomTileExclusive - 1, bottom: region.bottomTileExclusive },
    neutralLighting,
    true
  ), true, `${region.id} tail resolves`);
  const tail = [...stage.segments.entries()].find(([key, entry]) => (
    key.startsWith(`${region.id}:`) && entry.row === expectedRow
  ))?.[1];
  assert.ok(tail, `${region.id} final card is visible`);
  assertNear(
    tail.backwall.crop.height * tail.backwall.scaleY,
    expectedDisplayHeight,
    `${region.id} backwall display tail`
  );
  assert.equal(tail.backwall.crop.height, expectedSourceHeight, `${region.id} backwall source crop`);
  assert.equal(tail.backwall.crop.y, segment.sourceCrop.yPx);
  assert.equal(tail.backwall.crop.x, segment.sourceCrop.xPx);
  assert.equal(tail.backwall.flipX, undefined, `${region.id} never mirrors artwork`);
  assert.equal(tail.backwall.flipY, undefined, `${region.id} never mirrors artwork`);
  assert.ok(tail.bitmapMask, `${region.id} card uses the image crossfade mask`);
  assertNear(
    tail.blendMaskImage.scaleX,
    tail.widthPx / tail.blendMaskImage.frame.width,
    `${region.id} blend mask covers the complete card width`
  );
  assertNear(
    tail.blendMaskImage.scaleY,
    tail.heightPx / tail.blendMaskImage.frame.height,
    `${region.id} blend mask covers the complete card height`
  );
  assert.equal("emissive" in tail, false, `${region.id} has no duplicate light overlay`);
  assert.equal("mist" in tail, false, `${region.id} has no drifting atmosphere overlay`);
  return tail;
};

const blue = regions[1];
assert.equal(stage.sync({ left: 0, right: 50, top: 200, bottom: 210 }, neutralLighting), true);
assert.ok(stage.segments.size > 0, "the roots fallback prevents a black blue-biome interval");
assert.ok(
  [...stage.segments.values()].every(entry => entry.asset.key === surfaceKey),
  "the preloaded scenic fallback remains visible while blue plates stream"
);
assert.deepEqual(loader.queued.map(entry => entry.key), [regionAssets(blue)[0].key]);
completeAsset(regionAssets(blue)[0]);
assert.equal(isWorldVisualDepthBackdropRegionReady(
  blue,
  assetReady,
  regionAssets(blue)
), false);
const fallbackField = new WorldVisualMaterialField(fakeScene, { getTileType: () => 1 });
fallbackField.backdropMaskGraphics = fakeGraphics();
fallbackField._drawBackdropMask({ left: 0, right: 50, top: 200, bottom: 210 }, 94);
assert.equal(
  fallbackField.backdropMaskGraphics.fills.length,
  0,
  "the generic fill stays hidden because the scenic fallback is renderable"
);
regionAssets(blue).slice(1).forEach(completeAsset);
fallbackField._drawBackdropMask({ left: 0, right: 50, top: 200, bottom: 210 }, 94);
assert.equal(
  fallbackField.backdropMaskGraphics.fills.length,
  0,
  "generic cave fill disappears only when every selected plate is resident"
);
stage.sync(
  { left: 0, right: 280, top: blue.topTile, bottom: blue.bottomTileExclusive },
  neutralLighting,
  true
);
assert.deepEqual(
  new Set(
    [...stage.segments.entries()]
      .filter(([key]) => key.startsWith(`${blue.id}:`))
      .map(([, entry]) => entry.backwall.key)
  ),
  new Set(regionAssets(blue).map(entry => entry.key)),
  "older images, new images, concept static, and smooth V3 loop all participate"
);
const staticBlue = [...stage.segments.values()].find(entry => !entry.isSmoothVideo);
const videoBlue = [...stage.segments.values()].find(entry => entry.isSmoothVideo);
assert.ok(staticBlue, "the blue biome creates finished static image cards");
assert.ok(videoBlue, "the blue biome creates a finished smooth-video card");
assert.equal("emissive" in staticBlue, false, "light is not duplicated by an overlay");
assert.equal("mist" in staticBlue, false, "atmosphere is not duplicated by an overlay");
assert.equal(videoBlue.backwall.played, true);
assert.equal(videoBlue.backwall.loop, true);
assert.equal(videoBlue.backwall.visible, true);
fakeScene.cameras.main.scrollX = 50;
fakeScene.cameras.main.scrollY = 50;
stage.update(1016, neutralLighting);
assert.equal(stage.cameraMotion.current.mode, "distant-lag");
assert.ok(stage.cameraMotion.current.x > 0 && stage.cameraMotion.current.y > 0);
assertNear(
  staticBlue.backwall.x,
  staticBlue.baseX + stage.cameraMotion.current.x,
  "camera response transforms the actual static image"
);
assertNear(
  videoBlue.backwall.x,
  videoBlue.baseX + stage.cameraMotion.current.x,
  "camera response transforms the complete finished video image"
);
fakeScene.game.loop.actualFps = 20;
stage.update(1032, neutralLighting);
assert.equal(videoBlue.backwall.paused, true, "smooth video pauses below its FPS floor");
fakeScene.game.loop.actualFps = 60;
stage.update(1048, neutralLighting);
assert.equal(videoBlue.backwall.paused, false, "smooth video resumes after FPS recovers");
assertRegionTailCrop(blue);
const surfaceTail = assertRegionTailCrop(regions[0]);
assert.ok(surfaceTail.backwall.depth < WORLD_VISUAL_RUNTIME.render.terrainDepth);

for (const region of regions.slice(2)) {
  stage.sync(
    { left: 10, right: 20, top: region.topTile + 1, bottom: region.topTile + 8 },
    neutralLighting
  );
  assert.ok(stage.segments.size > 0, `${region.id} receives the scenic fallback immediately`);
  completeRegion(region);
  assert.ok([...stage.segments.keys()].some(key => key.startsWith(`${region.id}:`)));
  assertRegionTailCrop(region);
}
assert.ok(
  removedKeys.includes(regionAssets(blue)[0].key),
  "departed biome plates are released"
);
assert.ok(
  removedVideoKeys.includes(regionAssets(blue)[11].key),
  "departed biome videos are stopped and released"
);
assert.equal(textureKeys.has(surfaceKey), true, "startup plate stays retained");
assert.equal(
  stage.sync({ left: 10, right: 20, top: 5065, bottom: 5066 }, neutralLighting),
  false,
  "scenic bands stop at the authored world boundary"
);
assert.equal(stage.segments.size, 0);
fallbackField.destroy();
stage.destroy();

for (const entry of regionAssets(regions[0])) {
  if (entry.type === "video") videoKeys.add(entry.key);
  else textureKeys.add(entry.key);
}
const staticStage = new WorldVisualDepthBackdropStage(
  fakeScene,
  WORLD_VISUAL_DEPTH_BACKDROPS,
  `${V3_SMOKE_QUERY}&biomeBackdropMotion=0`
);
assert.equal(staticStage.create(), true);
assert.equal(staticStage.motionEnabled, false);
staticStage.sync({ left: 0, right: 100, top: 80, bottom: 130 }, neutralLighting, true);
assert.ok(
  [...staticStage.segments.values()]
    .filter(entry => entry.isSmoothVideo)
    .every(entry => entry.backwall.paused),
  "motion rollback freezes every smooth-video card"
);
fakeScene.cameras.main.scrollX += 100;
staticStage.update(2200, neutralLighting);
assert.deepEqual(
  staticStage.cameraMotion.current,
  { x: 0, y: 0, mode: "anchored", regionId: "surface-entry" },
  "motion rollback disables complete-image camera response"
);
staticStage.destroy();
const disabledStage = new WorldVisualDepthBackdropStage(fakeScene, undefined, "?shallowCavern=0");
assert.equal(disabledStage.create(), false);

const viewSource = fs.readFileSync(
  new URL("../world/rendering/scenic-world/WorldVisualDepthBackdropRegionView.js", import.meta.url),
  "utf8"
);
const blendMaskSource = fs.readFileSync(
  new URL("../world/rendering/scenic-world/worldVisualBlendMaskFrame.js", import.meta.url),
  "utf8"
);
const stageSource = fs.readFileSync(
  new URL("../world/rendering/scenic-world/WorldVisualDepthBackdropStage.js", import.meta.url),
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
assert.match(viewSource, /scene\.add\.video/);
assert.match(viewSource, /setPaused/);
assert.doesNotMatch(viewSource, /bakedVideo|opticalFlow|minterpolate/);
assert.match(viewSource, /setCrop/);
assert.match(`${viewSource}\n${blendMaskSource}`, /createBitmapMask/);
assert.doesNotMatch(viewSource, /setFlipX|setFlipY/);
assert.doesNotMatch(`${viewSource}\n${stageSource}`, /lineStyle|fillCircle|SignatureLayer|AmbientLayer/);
assert.doesNotMatch(
  `${viewSource}\n${stageSource}`,
  /setTile|damageTile|digTile|createTilemap|WorldModel/
);
assert.match(runtimeSource, /new WorldVisualDepthBackdropStage/);
assert.match(materialSource, /resolveWorldVisualDepthBackdropRegionAssets/);
assert.match(bootSource, /getWorldVisualDepthBackdropPreloadAssets/);
assert.equal(
  fs.existsSync(new URL("../world/rendering/scenic-world/WorldVisualDepthSignatureLayer.js", import.meta.url)),
  false
);

console.log("Scenic ten-biome smooth-video and ground-layer contract passed");
