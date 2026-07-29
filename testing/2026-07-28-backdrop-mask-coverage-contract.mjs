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

  destroy() {
    this.destroyed = true;
  }
}

const created = [];
const textureFrames = new Map();
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
    exists: () => true,
    get: () => blendTexture,
  },
  add: {
    image: (x, y, key) => new FakeCardImage(x, y, key),
  },
  make: {
    image: ({ x, y, key, frame }) => {
      const image = new FakeMaskImage(x, y, key, textureFrames.get(frame));
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
  assert.deepEqual(
    [result.maskImage.frame.width, result.maskImage.frame.height],
    [blend.frameWidthPx, blend.frameHeightPx],
    "exactly one mask-atlas cell is registered as a real Phaser frame"
  );
  assert.equal(
    result.maskImage.frame.name,
    `${view.blendMaskAsset.key}-blend-${bits}`,
    "the mask frame name is stable for the requested edge combination"
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
  assert.equal(
    result.maskImage.frame.cutX,
    (bits % blend.columns) * blend.frameWidthPx,
    "the registered frame selects the requested atlas column"
  );
  assert.equal(
    result.maskImage.frame.cutY,
    Math.floor(bits / blend.columns) * blend.frameHeightPx,
    "the registered frame selects the requested atlas row"
  );
  assert.deepEqual(
    [result.maskImage.x, result.maskImage.y],
    [128, 256],
    "the real mask frame begins exactly at the card origin"
  );
}

assert.equal(created.length, 2);

const nextRegion = WORLD_VISUAL_DEPTH_BACKDROPS.regions[1];
const nextRegionView = new WorldVisualDepthBackdropRegionView(
  scene,
  nextRegion,
  WORLD_VISUAL_DEPTH_BACKDROPS,
  nextRegion.backwalls,
  false
);
const transitionSegment = nextRegionView._createSegment(
  0,
  0,
  nextRegion.backwalls[0]
);
assert.equal(
  transitionSegment.baseY,
  nextRegion.topTile * scene.config.tileSize
    - WORLD_VISUAL_DEPTH_BACKDROPS.blend.crossBiomeOverlapYPx,
  "the next biome begins inside the previous raster art"
);
assert.equal(
  transitionSegment.blendMaskImage.frame.cutY,
  blend.frameHeightPx,
  "the first next-biome card uses only the incoming top-feather bit"
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

const horizontalSegment = view._createSegment(1, 0, region.backwalls[0]);
assert.equal(
  horizontalSegment.blendMaskImage.frame.name,
  `${view.blendMaskAsset.key}-blend-${blend.edgeBits.left}`,
  "horizontal joins feather only the incoming card's left edge"
);
assert.equal(
  horizontalSegment.backwall.depth,
  WORLD_VISUAL_DEPTH_BACKDROPS.render.backwallDepth
    + WORLD_VISUAL_DEPTH_BACKDROPS.render.segmentDepthStep,
  "incoming horizontal cards have deterministic overlap ordering"
);
view._destroySegment(horizontalSegment);
nextRegionView.destroy();

console.log("Backdrop mask coverage contract passed.");
