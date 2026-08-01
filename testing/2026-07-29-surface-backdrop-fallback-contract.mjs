import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import {
  WORLD_VISUAL_DEPTH_BACKDROPS,
  getWorldVisualDepthBackdropFallbackAsset,
  getWorldVisualDepthBackdropPreloadAssets,
  resolveWorldVisualDepthBackdropBlendMask,
  resolveWorldVisualDepthBackdropRegionAssets,
} from "../values/worldVisualDepthBackdrops.js";
import { WorldVisualDepthBackdropStage } from
  "../world/rendering/scenic-world/WorldVisualDepthBackdropStage.js";
import { WorldVisualMaterialField } from
  "../world/rendering/scenic-world/WorldVisualMaterialField.js";

class FakeLoader extends EventEmitter {
  constructor() {
    super();
    this.loading = false;
    this.queued = [];
    this.active = null;
  }

  isLoading() { return this.loading; }

  image(key, path) {
    this.active = { key, path, type: "image" };
    this.queued.push(this.active);
  }

  video(key, path, noAudio) {
    this.active = { key, path, type: "video", noAudio };
    this.queued.push(this.active);
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
    this.destroyed = false;
  }

  setOrigin() { return this; }
  setDisplayOrigin(x, y = x) {
    this.displayOriginX = x;
    this.displayOriginY = y;
    return this;
  }
  setDepth(value) { this.depth = value; return this; }
  setCrop(x, y, width, height) { this.crop = { x, y, width, height }; return this; }
  setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; }
  setDisplaySize(width, height) {
    this.displayWidth = width;
    this.displayHeight = height;
    if (this.frame?.width && this.frame?.height) {
      this.scaleX = width / this.frame.width;
      this.scaleY = height / this.frame.height;
    }
    return this;
  }
  setVisible(value) { this.visible = value; return this; }
  setMask(value) { this.mask = value; return this; }
  clearMask() { this.mask = null; return this; }
  setPosition(x, y) { this.x = x; this.y = y; return this; }
  setTint(value) { this.tint = value; return this; }
  setBlendMode(value) { this.blendMode = value; return this; }
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
    this.createdCallback = event === "created" ? callback : null;
    return this;
  }

  play(loop) {
    this.loop = loop;
    this.createdCallback?.();
    this.createdCallback = null;
    return this;
  }

  setPaused(value) { this.paused = value; return this; }
  stop() { this.stopped = true; return this; }
}

function fakeGraphics() {
  return {
    fills: [],
    clear() { this.fills = []; return this; },
    fillStyle() { return this; },
    fillRect(x, y, width, height) {
      this.fills.push({ x, y, width, height });
      return this;
    },
    destroy() { this.destroyed = true; },
  };
}

const fallbackAsset = getWorldVisualDepthBackdropFallbackAsset();
const blendMaskAsset = resolveWorldVisualDepthBackdropBlendMask();
assert.ok(fallbackAsset, "a deterministic startup backdrop fallback is configured");
assert.deepEqual(
  getWorldVisualDepthBackdropPreloadAssets().map(asset => asset.key),
  [fallbackAsset.key, blendMaskAsset.key],
  "the fallback and its card mask are both resident before gameplay starts",
);

const loader = new FakeLoader();
const textureKeys = new Set([fallbackAsset.key, blendMaskAsset.key]);
const videoKeys = new Set();
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
const scene = {
  config: { tileSize: 94 },
  time: { now: 0 },
  game: { loop: { actualFps: 60 } },
  cameras: {
    main: { scrollX: 0, scrollY: 161 * 94, width: 1280, height: 720 },
  },
  load: loader,
  cache: {
    video: {
      exists: key => videoKeys.has(key),
      remove: key => videoKeys.delete(key),
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
      textureKeys.delete(key);
      canvasTextures.delete(key);
    },
  },
  add: {
    image: (x, y, key) => new FakeImage(x, y, key),
    video: (x, y, key) => new FakeVideo(x, y, key),
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

const blueRegion = WORLD_VISUAL_DEPTH_BACKDROPS.regions[1];
const blueAsset = resolveWorldVisualDepthBackdropRegionAssets(
  blueRegion,
  WORLD_VISUAL_DEPTH_BACKDROPS,
  "",
)[0];
const bounds = { left: 0, right: 10, top: 161, bottom: 169 };
const lighting = { farTint: 0xffffff, lightning: 0 };
const stage = new WorldVisualDepthBackdropStage(scene);
assert.equal(stage.create(), true);
assert.equal(stage.sync(bounds, lighting), true);
assert.ok(stage.segments.size > 0, "visible underground cards render on the first sync");
const fallbackSegment = [...stage.segments.values()][0];
assert.equal(
  fallbackSegment.asset.key,
  fallbackAsset.key,
  "the preloaded scenic plate fills the safety row while its biome card streams",
);
assert.equal(fallbackSegment.requestedAssetKey, blueAsset.key);
assert.deepEqual(
  loader.queued.map(asset => asset.key),
  [blueAsset.key],
  "the desired biome card still streams in the background",
);

const materialField = new WorldVisualMaterialField(
  scene,
  { getTileType: () => 1 },
);
materialField.backdropMaskGraphics = fakeGraphics();
materialField._drawBackdropMask(bounds, 94);
assert.equal(
  materialField.backdropMaskGraphics.fills.length,
  0,
  "the terrain fallback may not cover a region that already has a scenic fallback",
);

textureKeys.add(blueAsset.key);
loader.loading = false;
loader.emit(`filecomplete-image-${blueAsset.key}`);
loader.emit("complete");
const resolvedSegment = [...stage.segments.values()][0];
assert.equal(resolvedSegment.asset.key, blueAsset.key);
assert.equal(
  fallbackSegment.backwall.destroyed,
  true,
  "the temporary plate is replaced cleanly when the requested biome card arrives",
);

stage.destroy();
textureKeys.delete(fallbackAsset.key);
textureKeys.delete(blueAsset.key);
materialField._drawBackdropMask(bounds, 94);
assert.equal(
  materialField.backdropMaskGraphics.fills.length,
  1,
  "the generic terrain fill remains a last resort when no scenic asset is renderable",
);
materialField.destroy();

console.log("Surface backdrop fallback contract passed.");
