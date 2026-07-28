import assert from "node:assert/strict";
import {
  existsSync,
  readFileSync,
  statSync,
} from "node:fs";

import { SkyBeaconPulseRenderer } from "../systems/lighting/SkyBeaconPulseRenderer.js";
import {
  LIGHT_CONFIG,
  getStarBlockPulsePreloadAssets,
} from "../values/lightConfig.js";

globalThis.Phaser = {
  BlendModes: { ADD: 1 },
};

const visuals = LIGHT_CONFIG.skyTileLights.beaconPulse.visuals;
const assets = getStarBlockPulsePreloadAssets();
const projectRoot = new URL("../", import.meta.url);

assert.equal(visuals.artSource, "ImageGen", "pulse artwork must be ImageGen-authored");
assert.equal(assets.length, 6, "all six production Star Block colours need pulse art");
assert.equal(
  new Set(assets.map(asset => asset.key)).size,
  assets.length,
  "every rarity colour must own a unique texture key"
);

for (const asset of assets) {
  const cleanPath = asset.path.split("?")[0];
  const fileUrl = new URL(cleanPath, projectRoot);
  assert.equal(existsSync(fileUrl), true, `missing ImageGen pulse sprite: ${cleanPath}`);
  assert.ok(
    statSync(fileUrl).size > 900_000,
    `pulse sprite must retain its high-resolution ImageGen source detail: ${cleanPath}`
  );

  const header = readFileSync(fileUrl).subarray(0, 26);
  assert.equal(
    header.subarray(1, 4).toString("ascii"),
    "PNG",
    `pulse sprite must remain a lossless PNG: ${cleanPath}`
  );
  assert.equal(header.readUInt32BE(16), 1254, `unexpected pulse width: ${cleanPath}`);
  assert.equal(header.readUInt32BE(20), 1254, `unexpected pulse height: ${cleanPath}`);
}

const rendererSource = readFileSync(
  new URL("../systems/lighting/SkyBeaconPulseRenderer.js", import.meta.url),
  "utf8"
);
assert.doesNotMatch(
  rendererSource,
  /createCanvas|add\.graphics|strokeEllipse|fillCircle|lineTo|setTint/,
  "the pulse renderer must not replace or recolour ImageGen art with procedural Phaser visuals"
);

const imageRecords = [];
function createImageRecord(x, y, key) {
  const image = {
    key,
    x,
    y,
    width: 0,
    height: 0,
    alpha: 1,
    visible: true,
    blendMode: null,
    destroyed: false,
    setOrigin() {
      return this;
    },
    setDepth() {
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
    setTexture(nextKey) {
      this.key = nextKey;
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

const knownTextureKeys = new Set(assets.map(asset => asset.key));
const scene = {
  textures: {
    exists(key) {
      return knownTextureKeys.has(key);
    },
    createCanvas() {
      assert.fail("ImageGen pulse art must never be replaced with a generated canvas");
    },
  },
  add: {
    image(x, y, key) {
      return createImageRecord(x, y, key);
    },
    graphics() {
      assert.fail("ImageGen pulse art must never be replaced with Phaser graphics");
    },
  },
};

const renderer = new SkyBeaconPulseRenderer(scene, visuals);
assert.equal(imageRecords.length, 1, "the runtime must pool exactly one pulse sprite");

const tileSize = 94;
for (let rarity = 0; rarity < assets.length; rarity += 1) {
  renderer.beginFrame();
  const rendered = renderer.draw({
    worldX: 800,
    worldY: 470,
    tileSize,
    verticalScale: 0.88,
    pulseRadiusTiles: 8,
    pulse: {
      progress: 0.6,
      waveStrength: 0.55,
    },
    rarity,
  });
  assert.equal(rendered, true, `rarity ${rarity} pulse must render`);
  assert.equal(
    imageRecords[0].key,
    assets[rarity].key,
    `rarity ${rarity} must use its matching authored Star Block colour`
  );
}

const ring = imageRecords[0];
assert.equal(ring.blendMode, Phaser.BlendModes.ADD, "black-backed art must blend additively");
assert.ok(ring.width > tileSize * 16, "the authored wave must retain its long-distance span");
assert.ok(ring.height < ring.width, "the wave must retain its softly flattened world silhouette");
assert.ok(ring.alpha < visuals.ringOpacity, "the sprite must fade as the pulse travels outward");

renderer.beginFrame();
assert.equal(ring.visible, false, "quiet frames must hide the pooled ImageGen sprite");
assert.equal(ring.alpha, 0, "quiet frames must fully clear residual pulse alpha");

renderer.destroy();
assert.equal(ring.destroyed, true, "destroy must release the pooled ImageGen pulse sprite");

console.log("Star Block pulse quality contract passed: six ImageGen colour sprites with no procedural pulse drawing");
