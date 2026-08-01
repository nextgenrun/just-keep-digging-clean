import assert from "node:assert/strict";

import { LIGHT_CONFIG } from "../values/lightConfig.js";
import {
  STAR_IDENTITY_LIBRARY_CONFIG,
} from "../values/starIdentityLibrary.js";
import { getStarIdentity } from "../values/starIdentityLibraryMath.js";
import { SkySteadyLightRenderer } from "../systems/lighting/SkySteadyLightRenderer.js";

globalThis.Phaser = {
  BlendModes: {
    ADD: 1,
  },
};

const framesByTexture = new Map();
for (const atlas of [
  ...STAR_IDENTITY_LIBRARY_CONFIG.atlases,
  ...STAR_IDENTITY_LIBRARY_CONFIG.lightAtlases,
]) {
  framesByTexture.set(atlas.key, new Set());
}
const steady = LIGHT_CONFIG.skyTileLights.steadyAura;
for (const asset of steady.rarityAssets) {
  framesByTexture.set(asset.key, new Set());
}

const images = [];
const scene = {
  textures: {
    exists: key => framesByTexture.has(key),
    get: key => ({
      has: frame => framesByTexture.get(key)?.has(frame) === true,
      add: frame => framesByTexture.get(key)?.add(frame),
    }),
  },
  add: {
    image: (x, y, key) => {
      const image = {
        x,
        y,
        key,
        active: true,
        setOrigin() { return this; },
        setDepth(value) { this.depth = value; return this; },
        setBlendMode(value) { this.blendMode = value; return this; },
        setAlpha(value) { this.alpha = value; return this; },
        setVisible(value) { this.visible = value; return this; },
        setTexture(nextKey, frame) {
          this.key = nextKey;
          this.frame = frame;
          return this;
        },
        setPosition(nextX, nextY) {
          this.x = nextX;
          this.y = nextY;
          return this;
        },
        setDisplaySize(width, height) {
          this.displayWidth = width;
          this.displayHeight = height;
          return this;
        },
        setRotation(value) { this.rotation = value; return this; },
        destroy() { this.active = false; },
      };
      images.push(image);
      return image;
    },
  },
};

const identity = getStarIdentity(244);
assert.equal(identity.rarityIndex, 5);
const renderer = new SkySteadyLightRenderer(scene, steady);
renderer.beginFrame();
assert.equal(renderer.draw({
  worldX: 470,
  worldY: 940,
  tileSize: 94,
  verticalScale: 0.88,
  radiusTiles: 1.55,
  rarity: identity.rarityIndex,
  identity: identity.index,
  intensity: 1,
  time: 12345,
  tx: 5,
  ty: 10,
}), true);

const visible = images.find(image => image.visible);
assert.ok(visible);
assert.equal(visible.key, identity.lightAtlasKey);
assert.equal(visible.frame, identity.lightFrameName);
assert.ok(visible.alpha > 0);
assert.ok(visible.displayWidth > 0);
assert.ok(visible.displayHeight > 0);
assert.ok(Number.isFinite(visible.rotation));
assert.equal(framesByTexture.get(identity.lightAtlasKey).size, 20);

renderer.destroy();
assert.ok(images.every(image => image.active === false));
console.log("star identity light smoke: PASS (dedicated light frame, colour, motion, pool cleanup)");
