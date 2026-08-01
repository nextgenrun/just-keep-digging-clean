// Verifies static landmark rendering, nearby-prop suppression, preload wiring, and teardown behavior.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ASSET_KEYS } from "../values/assetKeys.js";
import {
  WORLD_VISUAL_PROP_ASSET_BY_ID_V3,
  WORLD_VISUAL_SURFACE_PROP_ASSETS_V3,
} from "../values/generated/worldVisualPropLibraryV3/index.js";
import { GAME_CONFIG } from "../values/gameConfig.js";
import { HUD_LAYOUT } from "../values/hudLayout.js";
import {
  WORLD_VISUAL_SURFACE_HERO_LANDMARK_ASSETS,
  resolveWorldVisualSurfaceHeroLandmarkSuppression,
} from "../values/worldVisualSurfaceHeroLandmarks.js";
import { WORLD_VISUAL_SURFACE_PROP_ASSETS } from
  "../values/worldVisualSurfacePropAssets.js";
import { WORLD_VISUAL_SURFACE_PROP_COMPOSITION_V3 } from
  "../values/worldVisualSurfacePropCompositionV3.js";
import { WorldModel } from "../world/model/WorldModel.js";
import { WorldVisualSurfaceHeroLandmarkLayer } from
  "../world/rendering/scenic-world/WorldVisualSurfaceHeroLandmarkLayer.js";
import { WorldVisualSurfacePropExpansionLayer } from
  "../world/rendering/scenic-world/WorldVisualSurfacePropExpansionLayer.js";
import { WorldVisualSurfacePropLayer } from
  "../world/rendering/scenic-world/WorldVisualSurfacePropLayer.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const productionWorld = new WorldModel(GAME_CONFIG);
const suppression = resolveWorldVisualSurfaceHeroLandmarkSuppression();

function makeSprite(x, y, key, frame = null) {
  return {
    x,
    y,
    key,
    frame,
    transformWrites: 0,
    visualWrites: 0,
    destroyed: false,
    tintFill: false,
    setOrigin(originX, originY) {
      this.originX = originX;
      this.originY = originY;
      return this;
    },
    setDepth(value) { this.depth = value; return this; },
    setDisplaySize(width, height) {
      this.displayWidth = width;
      this.displayHeight = height;
      this.visualWrites += 1;
      return this;
    },
    setAlpha(value) {
      this.alpha = value;
      this.visualWrites += 1;
      return this;
    },
    setFlipX(value) { this.flipX = value; return this; },
    setScrollFactor(value) { this.scrollFactor = value; return this; },
    setData(name, value) { this[name] = value; return this; },
    setTint(value) {
      this.tintTopLeft = value;
      this.tintTopRight = value;
      this.tintBottomLeft = value;
      this.tintBottomRight = value;
      this.visualWrites += 1;
      return this;
    },
    setPosition(nextX, nextY) {
      this.x = nextX;
      this.y = nextY;
      this.transformWrites += 1;
      return this;
    },
    setRotation(value) {
      this.rotation = value;
      this.transformWrites += 1;
      return this;
    },
    destroy() { this.destroyed = true; },
  };
}

const landmarkSprites = [];
const landmarkScene = {
  config: GAME_CONFIG,
  time: { now: 1400 },
  textures: {
    get(key) {
      const item = Object.values(WORLD_VISUAL_SURFACE_HERO_LANDMARK_ASSETS)
        .find(asset => asset.key === key);
      return item ? { getSourceImage: () => item.expectedSource } : null;
    },
  },
  add: {
    image(x, y, key) {
      const sprite = makeSprite(x, y, key);
      landmarkSprites.push(sprite);
      return sprite;
    },
  },
};

const landmarkLayer = new WorldVisualSurfaceHeroLandmarkLayer(
  landmarkScene,
  productionWorld,
);
assert.equal(landmarkLayer.create(""), true);
assert.equal(
  landmarkLayer.sync(
    { left: 150, right: 280, top: 58, bottom: 70 },
    { terrainTint: 0xddeeff, farTint: 0xaaccee },
  ),
  true,
);
assert.equal(landmarkLayer.active.size, 7);
assert.deepEqual(landmarkLayer.getSnapshot().invalidPlacements, []);
for (const sprite of landmarkSprites) {
  assert.equal(sprite.originX, 0.5);
  assert.equal(sprite.originY, 1);
  assert.equal(sprite.scrollFactor, 1);
  assert.equal(sprite.surfaceHeroLandmarkStaticTransform, true);
  assert.ok(sprite.depth < HUD_LAYOUT.playerDepth);
}
const visualWrites = landmarkSprites.map(sprite => sprite.visualWrites);
landmarkLayer.update(999999, { terrainTint: 0xddeeff, farTint: 0xaaccee });
assert.ok(landmarkSprites.every(sprite => sprite.transformWrites === 0));
assert.deepEqual(
  landmarkSprites.map(sprite => sprite.visualWrites),
  visualWrites,
  "landmarks must not pulse, resize, or retint with unchanged light",
);
landmarkLayer.destroy();
assert.equal(globalThis.__jkdSurfaceHeroLandmarksV4, undefined);

const retainedScene = {
  ...landmarkScene,
  textures: {
    get(key) {
      for (const [level, definitions] of Object.entries(
        WORLD_VISUAL_SURFACE_PROP_ASSETS,
      )) {
        for (const [assetId, definition] of Object.entries(definitions)) {
          if (ASSET_KEYS.environment.surfaceProps[level][assetId].key === key) {
            return { getSourceImage: () => definition.expectedSource };
          }
        }
      }
      return null;
    },
  },
};
const retainedLayer = new WorldVisualSurfacePropLayer(retainedScene, productionWorld);
assert.equal(retainedLayer.create("", {
  suppressedPlacementIds: suppression.retained,
}), true);
assert.ok(
  retainedLayer.placements.every(item => !suppression.retained.includes(item.id)),
);
retainedLayer.destroy();

const frameByKey = new Map(WORLD_VISUAL_SURFACE_PROP_ASSETS_V3.map(asset => [
  `${asset.atlasKey}:${asset.frame}`,
  asset.expectedSource,
]));
const expansionScene = {
  ...landmarkScene,
  textures: {
    getFrame(key, frame) {
      const size = frameByKey.get(`${key}:${frame}`);
      return size ? { width: size.width, height: size.height } : null;
    },
  },
};
const expansionLayer = new WorldVisualSurfacePropExpansionLayer(
  expansionScene,
  productionWorld,
);
assert.equal(expansionLayer.create("", {
  suppressedPlacementIds: suppression.expansion,
}), true);
assert.ok(
  expansionLayer.placements.every(
    item => !suppression.expansion.includes(item.id),
  ),
);
assert.equal(
  expansionLayer.placements.length,
  WORLD_VISUAL_SURFACE_PROP_COMPOSITION_V3.placements.length
    - suppression.expansion.length,
);
assert.ok(
  expansionLayer.placements.every(
    item => WORLD_VISUAL_PROP_ASSET_BY_ID_V3[item.assetId],
  ),
);
expansionLayer.destroy();

const source = relativePath => fs.readFileSync(path.join(ROOT, relativePath), "utf8");
const layerSource = source(
  "world/rendering/scenic-world/WorldVisualSurfaceHeroLandmarkLayer.js",
);
const runtimeSource = source("world/rendering/scenic-world/WorldVisualRuntime.js");
const bootSource = source("ui/scenes/BootScene.js");
assert.doesNotMatch(
  layerSource,
  /tweens\.add|Math\.(?:sin|cos)|setPosition\(|setRotation\(|setScale\(/,
);
assert.match(runtimeSource, /new WorldVisualSurfaceHeroLandmarkLayer/);
assert.match(runtimeSource, /resolveWorldVisualSurfaceHeroLandmarkSuppression/);
assert.match(runtimeSource, /surfaceHeroLandmarkLayer\?\.sync/);
assert.match(runtimeSource, /surfaceHeroLandmarkLayer\?\.destroy/);
assert.match(bootSource, /\.\.\.getSurfaceHeroLandmarkPreloadAssets\(\)/);

console.log(
  "Surface hero landmarks V4 static rendering, suppression, and wiring passed",
);
