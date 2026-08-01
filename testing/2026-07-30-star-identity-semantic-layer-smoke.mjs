import assert from "node:assert/strict";

import {
  STAR_IDENTITY_LIBRARY_CONFIG,
} from "../values/starIdentityLibrary.js";
import { getStarIdentity } from "../values/starIdentityLibraryMath.js";
import {
  WORLD_VISUAL_SEMANTIC_ASSETS,
} from "../values/worldVisualSemanticAssets.js";
import {
  WorldVisualSemanticAssetLayer,
} from "../world/rendering/scenic-world/WorldVisualSemanticAssetLayer.js";

const images = [];
const scene = {
  config: {
    tileSize: 94,
    topAirRows: 65,
  },
  textures: {
    exists: () => true,
  },
  add: {
    image(x, y, key) {
      const image = {
        x,
        y,
        key,
        visible: false,
        setDepth(value) { this.depth = value; return this; },
        setMask(value) { this.mask = value; return this; },
        setVisible(value) { this.visible = value; return this; },
        setBlendMode(value) { this.blendMode = value; return this; },
        setPosition(nextX, nextY) {
          this.x = nextX;
          this.y = nextY;
          return this;
        },
        setTexture(nextKey, frame) {
          this.key = nextKey;
          this.frame = frame;
          return this;
        },
        setDisplaySize(width, height) {
          this.displayWidth = width;
          this.displayHeight = height;
          return this;
        },
        setRotation(value) { this.rotation = value; return this; },
        setAlpha(value) { this.alpha = value; return this; },
        setTint(value) { this.tint = value; return this; },
      };
      images.push(image);
      return image;
    },
  },
};
const identity = getStarIdentity(244);
const worldModel = {
  getSkyTileRarity: () => identity.rarityIndex,
  getSkyTileIdentity: () => identity.index,
};
const layer = new WorldVisualSemanticAssetLayer(
  scene,
  worldModel,
  { id: "solid-mask" },
  WORLD_VISUAL_SEMANTIC_ASSETS,
);
layer.townFloorOcclusion = null;
layer.identityFramesReady = true;
layer._showStar(0, 5, 10, scene.config.tileSize, {
  terrainTint: 0x8899aa,
});

assert.equal(images.length, 2);
const [beauty, emissive] = images;
assert.equal(beauty.key, identity.atlasKey);
assert.equal(beauty.frame, identity.frameName);
assert.equal(emissive.key, identity.lightAtlasKey);
assert.equal(emissive.frame, identity.lightFrameName);
assert.notEqual(beauty.key, emissive.key);
assert.ok(emissive.displayWidth > beauty.displayWidth);
assert.ok(emissive.alpha < WORLD_VISUAL_SEMANTIC_ASSETS.skyTile.emissiveAlpha);
assert.equal(emissive.blendMode, WORLD_VISUAL_SEMANTIC_ASSETS.render.emissiveBlendMode);
assert.equal(Object.hasOwn(emissive, "tint"), false);
assert.equal(layer.activeStars[0].identity.id, identity.id);
assert.equal(
  layer.activeStars[0].lightAlphaScale,
  STAR_IDENTITY_LIBRARY_CONFIG.visual.worldLightAlphaScale,
);

layer.update(12345);
assert.ok(emissive.alpha > 0);
assert.ok(Number.isFinite(emissive.alpha));
console.log(
  "star identity semantic layer smoke: PASS "
  + "(crisp beauty + larger dedicated emissive frame)",
);
