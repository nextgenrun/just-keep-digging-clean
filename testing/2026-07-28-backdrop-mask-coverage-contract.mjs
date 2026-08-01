import assert from "node:assert/strict";
import { WORLD_VISUAL_DEPTH_BACKDROPS } from "../values/worldVisualDepthBackdrops.js";
import { WorldVisualDepthBackdropRegionView } from
  "../world/rendering/scenic-world/WorldVisualDepthBackdropRegionView.js";

class FakeMaskImage {
  constructor(x, y, key, frame = null) {
    this.x = x;
    this.y = y;
    this.key = key;
    this.frame = frame;
    this.scaleX = 1;
    this.scaleY = 1;
  }

  setOrigin(x, y = x) {
    this.originX = x;
    this.originY = y;
    return this;
  }

  setCrop(x, y, width, height) {
    this.crop = { x, y, width, height };
    return this;
  }

  setDisplayOrigin(x, y = x) {
    this.displayOriginX = x;
    this.displayOriginY = y;
    return this;
  }

  setScale(x, y = x) {
    this.scaleX = x;
    this.scaleY = y;
    return this;
  }

  setDisplaySize(width, height) {
    this.displayWidth = width;
    this.displayHeight = height;
    this.scaleX = width / (this.frame?.width || width);
    this.scaleY = height / (this.frame?.height || height);
    return this;
  }

  createBitmapMask() {
    return {
      source: this,
      destroy() { this.destroyed = true; },
    };
  }

  destroy() {
    this.destroyed = true;
  }
}

class FakeCardImage extends FakeMaskImage {
  setDepth(value) {
    this.depth = value;
    return this;
  }

  setMask(value) {
    this.mask = value;
    return this;
  }

  setBlendMode(value) {
    this.blendMode = value;
    return this;
  }

  destroy() {
    this.destroyed = true;
  }
}

const created = [];
const textureFrames = new Map();
const canvasTextures = new Map();
const blendTexture = {
  has: frameName => textureFrames.has(frameName),
  add(frameName, sourceIndex, x, y, width, height) {
    const frame = {
      name: frameName,
      sourceIndex,
      x: 0,
      y: 0,
      cutX: x,
      cutY: y,
      width,
      height,
      realWidth: width,
      realHeight: height,
    };
    textureFrames.set(frameName, frame);
    return frame;
  },
  getSourceImage: () => ({ width: 1536, height: 1024 }),
};
const scene = {
  config: { tileSize: 64 },
  time: { now: 0 },
  textures: {
    exists: key => (
      key === view?.blendMaskAsset?.key
      || key?.startsWith("world-visual-biome-")
      || canvasTextures.has(key)
    ),
    get: () => blendTexture,
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
        context,
        getContext: () => context,
        refresh() { this.refreshed = true; return this; },
      };
      canvasTextures.set(key, texture);
      return texture;
    },
  },
  add: {
    image: (x, y, key) => new FakeCardImage(x, y, key),
  },
  make: {
    image: ({ x, y, key, frame }) => {
      const source = canvasTextures.get(key);
      const image = new FakeMaskImage(
        x,
        y,
        key,
        frame
          ? textureFrames.get(frame)
          : { width: source?.width, height: source?.height }
      );
      created.push(image);
      return image;
    },
  },
};
const region = WORLD_VISUAL_DEPTH_BACKDROPS.regions[0];
const view = new WorldVisualDepthBackdropRegionView(
  scene,
  region,
  WORLD_VISUAL_DEPTH_BACKDROPS
);
const blend = WORLD_VISUAL_DEPTH_BACKDROPS.blend;
const bodyAssets = view.backwalls.filter(asset => (
  !asset.path?.includes("-handoff-")
));
const firstAreaBodySequence = Array.from(
  { length: 6 },
  (_unused, column) => view._resolveSegmentAsset(column, 0)
);
assert.deepEqual(
  firstAreaBodySequence,
  [bodyAssets[0], bodyAssets[1], bodyAssets[2], bodyAssets[0], bodyAssets[1], bodyAssets[2]],
  "the first authored area repeats its three-card backdrop motif"
);
assert.equal(
  view._resolveSegmentAsset(6, 0),
  bodyAssets[3],
  "the next horizontal area advances to the next authored motif"
);
assert.equal(
  view._resolveSegmentAsset(0, 1),
  view._resolveSegmentAsset(0, 0),
  "neighboring backdrop rows retain the same authored card"
);
assert.equal(
  view._resolveSegmentAsset(0, 2),
  bodyAssets[1],
  "the backdrop advances after the configured two-row repeat"
);

for (const [width, height, edges] of [
  [
    WORLD_VISUAL_DEPTH_BACKDROPS.segment.logicalWidthPx,
    WORLD_VISUAL_DEPTH_BACKDROPS.segment.logicalHeightPx,
    { left: false, right: true, top: false, bottom: true },
  ],
  [
    704,
    448,
    { left: true, right: false, top: true, bottom: false },
  ],
]) {
  const result = view._createBlendMask(128, 256, width, height, edges);
  assert.ok(result?.bitmapMask, "a bitmap mask is created");
  const bits = (
    (edges.left ? blend.edgeBits.left : 0)
    | (edges.right ? blend.edgeBits.right : 0)
    | (edges.top ? blend.edgeBits.top : 0)
    | (edges.bottom ? blend.edgeBits.bottom : 0)
  );
  assert.equal(result.blendBits, bits);
  assert.match(
    result.maskImage.key,
    new RegExp(`^${blend.textureKeyPrefix}-${bits}-`),
    "the generated mask key is stable for the requested edge combination"
  );
  assert.equal(
    result.maskImage.displayWidth,
    width,
    "registered mask frame scales to the complete card width"
  );
  assert.equal(
    result.maskImage.displayHeight,
    height,
    "registered mask frame scales to the complete card height"
  );
  assert.deepEqual(
    [result.maskImage.x, result.maskImage.y],
    [128, 256],
    "the real mask frame begins exactly at the card origin"
  );
}

assert.equal(created.length, 2);

const outgoingHorizontal = view._createBlendMask(
  0,
  0,
  WORLD_VISUAL_DEPTH_BACKDROPS.segment.logicalWidthPx,
  WORLD_VISUAL_DEPTH_BACKDROPS.segment.logicalHeightPx,
  { right: true }
);
const incomingHorizontal = view._createBlendMask(
  WORLD_VISUAL_DEPTH_BACKDROPS.segment.strideXPx,
  0,
  WORLD_VISUAL_DEPTH_BACKDROPS.segment.logicalWidthPx,
  WORLD_VISUAL_DEPTH_BACKDROPS.segment.logicalHeightPx,
  { left: true }
);
const outgoingTexture = canvasTextures.get(outgoingHorizontal.maskImage.key);
const incomingTexture = canvasTextures.get(incomingHorizontal.maskImage.key);
const featherTexturePx = Math.round(
  blend.featherXPx * outgoingTexture.width
    / WORLD_VISUAL_DEPTH_BACKDROPS.segment.logicalWidthPx
);
const sampleY = Math.floor(outgoingTexture.height / 2);
for (let offset = 0; offset < featherTexturePx; offset += 1) {
  const outgoingX = outgoingTexture.width - featherTexturePx + offset;
  const outgoingAlpha = outgoingTexture.context.imageData.data[
    (sampleY * outgoingTexture.width + outgoingX) * 4 + 3
  ];
  const incomingAlpha = incomingTexture.context.imageData.data[
    (sampleY * incomingTexture.width + offset) * 4 + 3
  ];
  assert.ok(
    Math.abs(outgoingAlpha + incomingAlpha - 255) <= 1,
    `normalized horizontal weights sum to one at ${offset}`
  );
}

const nextRegion = WORLD_VISUAL_DEPTH_BACKDROPS.regions[1];
const nextRegionAssets = (
  nextRegion.wholeWorldVariantBackwalls
  || nextRegion.variantBackwalls
  || nextRegion.backwalls
);
const nextRegionView = new WorldVisualDepthBackdropRegionView(
  scene,
  nextRegion,
  WORLD_VISUAL_DEPTH_BACKDROPS,
  nextRegionAssets,
  false
);
const nextRegionSpanPx = (
  nextRegion.bottomTileExclusive - nextRegion.topTile
) * scene.config.tileSize + blend.crossBiomeOverlapYPx;
const nextRegionRows = nextRegionSpanPx <= (
  WORLD_VISUAL_DEPTH_BACKDROPS.segment.logicalHeightPx
)
  ? 1
  : Math.ceil((
    nextRegionSpanPx
      - WORLD_VISUAL_DEPTH_BACKDROPS.segment.logicalHeightPx
  ) / WORLD_VISUAL_DEPTH_BACKDROPS.segment.strideYPx) + 1;
assert.match(
  nextRegionView._resolveSegmentAsset(0, nextRegionRows - 1).path,
  /-handoff-/,
  "the authored biome handoff plate is reserved for the ground-side boundary"
);
assert.doesNotMatch(
  nextRegionView._resolveSegmentAsset(0, nextRegionRows - 2).path,
  /-handoff-/,
  "handoff art never appears at an unrelated underground height"
);
const transitionSegment = nextRegionView._createSegment(
  0,
  0,
  nextRegionAssets[0]
);
assert.equal(
  transitionSegment.baseY,
  nextRegion.topTile * scene.config.tileSize
    - WORLD_VISUAL_DEPTH_BACKDROPS.blend.crossBiomeOverlapYPx,
  "the next biome begins inside the previous raster art"
);
assert.equal(
  transitionSegment.blendBits,
  blend.edgeBits.right | blend.edgeBits.top | blend.edgeBits.bottom,
  "the first next-biome card blends with every real neighbor"
);
assert.equal(
  transitionSegment.blendMaskImage.displayWidth,
  transitionSegment.widthPx,
  "the irregular transition mask covers the complete cross-biome card"
);
assert.equal(
  transitionSegment.backwall.depth,
  WORLD_VISUAL_DEPTH_BACKDROPS.render.backwallDepth
    + WORLD_VISUAL_DEPTH_BACKDROPS.render.regionDepthStride,
  "the incoming biome is deterministically above the retained biome"
);
assert.equal(
  transitionSegment.backwall.displayOriginX,
  WORLD_VISUAL_DEPTH_BACKDROPS.segment.sourceCrop.xPx,
  "the safe crop is horizontally anchored to the world card"
);
assert.equal(
  transitionSegment.backwall.displayOriginY,
  WORLD_VISUAL_DEPTH_BACKDROPS.segment.sourceCrop.yPx,
  "the safe crop is vertically anchored to the world card"
);

const horizontalSegment = view._createSegment(1, 0, region.backwalls[0]);
assert.equal(
  horizontalSegment.blendBits,
  blend.edgeBits.left | blend.edgeBits.right | blend.edgeBits.bottom,
  "horizontal joins use complementary incoming and outgoing weights"
);
assert.equal(horizontalSegment.backwall.blendMode, blend.blendMode);
assert.equal(
  horizontalSegment.backwall.depth,
  WORLD_VISUAL_DEPTH_BACKDROPS.render.backwallDepth
    + WORLD_VISUAL_DEPTH_BACKDROPS.render.segmentDepthStep,
  "incoming horizontal cards have deterministic overlap ordering"
);
view._destroySegment(horizontalSegment);
nextRegionView.destroy();

console.log("Backdrop mask coverage contract passed.");
