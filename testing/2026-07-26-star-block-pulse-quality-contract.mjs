import assert from "node:assert/strict";

import { SkyBeaconPulseRenderer } from "../systems/lighting/SkyBeaconPulseRenderer.js";
import { LIGHT_CONFIG } from "../values/lightConfig.js";

globalThis.Phaser = {
  BlendModes: { ADD: 1 },
  Textures: { FilterMode: { LINEAR: 0 } },
};

const textureRecords = [];
const textureKeys = new Set();
const imageRecords = [];

function createTextureRecord(key, width, height) {
  const record = {
    key,
    width,
    height,
    gradientStops: [],
    filter: null,
    refreshed: false,
  };
  textureRecords.push(record);
  textureKeys.add(key);

  const context = {
    fillStyle: null,
    createRadialGradient() {
      return {
        addColorStop(position, color) {
          record.gradientStops.push({ position, color });
        },
      };
    },
    clearRect() {},
    fillRect() {},
  };

  return {
    getContext() {
      return context;
    },
    refresh() {
      record.refreshed = true;
    },
    setFilter(filter) {
      record.filter = filter;
    },
  };
}

function createImageRecord(x, y, key) {
  const image = {
    key,
    x,
    y,
    width: 0,
    height: 0,
    alpha: 1,
    visible: true,
    depth: 0,
    blendMode: null,
    destroyed: false,
    setOrigin() {
      return this;
    },
    setDepth(depth) {
      this.depth = depth;
      return this;
    },
    setBlendMode(blendMode) {
      this.blendMode = blendMode;
      return this;
    },
    setAlpha(alpha) {
      this.alpha = alpha;
      return this;
    },
    setVisible(visible) {
      this.visible = visible;
      return this;
    },
    setPosition(nextX, nextY) {
      this.x = nextX;
      this.y = nextY;
      return this;
    },
    setDisplaySize(width, height) {
      this.width = width;
      this.height = height;
      return this;
    },
    destroy() {
      this.destroyed = true;
    },
  };
  imageRecords.push(image);
  return image;
}

const scene = {
  textures: {
    exists(key) {
      return textureKeys.has(key);
    },
    createCanvas(key, width, height) {
      return createTextureRecord(key, width, height);
    },
  },
  add: {
    image(x, y, key) {
      return createImageRecord(x, y, key);
    },
  },
};

const visuals = LIGHT_CONFIG.skyTileLights.beaconPulse.visuals;
const renderer = new SkyBeaconPulseRenderer(scene, visuals);

assert.equal(
  textureRecords.length,
  2,
  "the quality renderer must generate one ring texture and one soft-node texture"
);
assert.equal(
  textureRecords[0].width,
  visuals.ringTextureSizePx,
  "the ring canvas must use the configured high-resolution source size"
);
assert.equal(
  textureRecords[0].filter,
  Phaser.Textures.FilterMode.LINEAR,
  "the ring texture must use linear filtering when scaled across the world"
);
assert.equal(
  textureRecords[0].gradientStops.length,
  visuals.ringGradientStops.length,
  "every configured bloom and filament band must reach the generated ring texture"
);
assert.equal(
  textureRecords.every(record => record.refreshed),
  true,
  "both generated textures must be uploaded after their gradients are drawn"
);
assert.equal(
  imageRecords.length,
  visuals.nodeCount + 1,
  "the runtime must allocate one ring image plus the configured soft nodes"
);
assert.equal(
  imageRecords.every(image => image.blendMode === Phaser.BlendModes.ADD),
  true,
  "every wave layer must use restrained additive compositing"
);

const tileSize = 94;
const rendered = renderer.draw({
  worldX: 800,
  worldY: 470,
  tileSize,
  verticalScale: 0.88,
  pulseRadiusTiles: 6,
  pulse: {
    progress: 0.55,
    waveStrength: 1,
  },
  angleOffset: 0.4,
});

assert.equal(rendered, true, "a peak pulse must render");
const ring = imageRecords[0];
assert.equal(ring.visible, true, "the filtered ring image must be visible at peak");
assert.ok(
  ring.width > tileSize * 10,
  "the high-quality textured ring must retain the long-distance span"
);
assert.ok(
  ring.height < ring.width,
  "the ring must retain the softly flattened world-light silhouette"
);
assert.ok(
  ring.alpha <= 0.2,
  "the smoother texture must not make the rare pulse overpowering"
);

const nodes = imageRecords.slice(1);
assert.equal(
  nodes.every(node => node.visible),
  true,
  "all configured constellation nodes must travel on the peak wave"
);
assert.equal(
  nodes.every(node => node.width === visuals.nodeSizePx),
  true,
  "nodes must remain small, soft texture details instead of scaling into hard circles"
);

renderer.beginFrame();
assert.equal(
  imageRecords.every(image => image.visible === false && image.alpha === 0),
  true,
  "the pooled wave images must hide cleanly during quiet frames"
);
assert.equal(
  renderer.draw({
    worldX: 800,
    worldY: 470,
    tileSize,
    verticalScale: 0.88,
    pulseRadiusTiles: 6,
    pulse: {
      progress: 0.001,
      waveStrength: 0.001,
    },
    angleOffset: 0.4,
  }),
  false,
  "near-zero envelope strength must remain fully quiet without a visible pop"
);

renderer.destroy();
assert.equal(
  imageRecords.every(image => image.destroyed),
  true,
  "destroy must release the ring and every pooled node image"
);

console.log("Star Block pulse quality contract passed: filtered feathered ring plus soft pooled nodes");
