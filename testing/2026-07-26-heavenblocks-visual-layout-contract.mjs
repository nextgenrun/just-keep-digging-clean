import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  HEAVENBLOCKS_VISUAL_CONFIG,
  resolveHeavenblocksVisualsEnabled,
} from "../values/heavenblocksVisualConfig.js";
import { V11SkyIslandVisualSystem } from "../systems/environment/V11SkyIslandVisualSystem.js";

globalThis.Phaser = {
  Loader: {
    Events: {
      COMPLETE: "complete",
    },
  },
};

function createImage(x, y, key) {
  return {
    x,
    y,
    key,
    name: "",
    destroyed: false,
    setOrigin(originX, originY) {
      this.originX = originX;
      this.originY = originY;
      return this;
    },
    setDepth(depth) {
      this.depth = depth;
      return this;
    },
    setAlpha(alpha) {
      this.alpha = alpha;
      return this;
    },
    setDisplaySize(width, height) {
      this.displayWidth = width;
      this.displayHeight = height;
      return this;
    },
    destroy() {
      this.destroyed = true;
    },
  };
}

function createHarness() {
  const textureKeys = new Set();
  const queuedAssets = [];
  const images = [];
  let completeHandler = null;

  const scene = {
    config: { tileSize: 94 },
    textures: {
      exists(key) {
        return textureKeys.has(key);
      },
    },
    load: {
      image(key, path) {
        queuedAssets.push({ key, path });
      },
      once(event, handler) {
        assert.equal(event, "complete");
        completeHandler = handler;
      },
      off(event, handler) {
        if (event === "complete" && handler === completeHandler) completeHandler = null;
      },
      isLoading() {
        return false;
      },
      start() {
        for (const asset of queuedAssets) textureKeys.add(asset.key);
        completeHandler?.();
      },
    },
    add: {
      image(x, y, key) {
        const image = createImage(x, y, key);
        images.push(image);
        return image;
      },
    },
  };

  return { scene, images, queuedAssets };
}

assert.equal(resolveHeavenblocksVisualsEnabled(HEAVENBLOCKS_VISUAL_CONFIG, ""), true);
assert.equal(
  resolveHeavenblocksVisualsEnabled(HEAVENBLOCKS_VISUAL_CONFIG, "?heavenblocksVisuals=0"),
  false
);
assert.equal(
  resolveHeavenblocksVisualsEnabled(HEAVENBLOCKS_VISUAL_CONFIG, "?heavenblocksVisuals=1"),
  true
);

globalThis.location = { search: "?heavenblocksVisuals=0" };
const disabledHarness = createHarness();
const disabledSystem = new V11SkyIslandVisualSystem(
  disabledHarness.scene,
  { enabled: false, levels: [] },
  HEAVENBLOCKS_VISUAL_CONFIG
);
disabledSystem.create();
assert.equal(disabledHarness.queuedAssets.length, 0, "rollback must not load Heavenblock art");
assert.equal(disabledHarness.images.length, 0, "rollback must not render Heavenblock art");
delete globalThis.location;

assert.equal(HEAVENBLOCKS_VISUAL_CONFIG.visualOnly, false);
assert.equal(HEAVENBLOCKS_VISUAL_CONFIG.collisionWired, true);
assert.equal(HEAVENBLOCKS_VISUAL_CONFIG.accessWired, true);
assert.equal(HEAVENBLOCKS_VISUAL_CONFIG.craftingWired, true);
assert.equal(HEAVENBLOCKS_VISUAL_CONFIG.regions.length, 3);

const lane = HEAVENBLOCKS_VISUAL_CONFIG.reservedLane;
for (const region of HEAVENBLOCKS_VISUAL_CONFIG.regions) {
  const maxOverscan = Math.max(...region.layers.map((layer) => layer.overscan));
  const widthTiles = region.displayWidthPx * maxOverscan
    / HEAVENBLOCKS_VISUAL_CONFIG.tileSize;
  const heightTiles = region.displayHeightPx * maxOverscan
    / HEAVENBLOCKS_VISUAL_CONFIG.tileSize;
  const leftTile = region.leftTile
    - (region.displayWidthPx * maxOverscan - region.displayWidthPx)
      / 2 / HEAVENBLOCKS_VISUAL_CONFIG.tileSize;
  const topTile = region.topTile
    - (region.displayHeightPx * maxOverscan - region.displayHeightPx)
      / 2 / HEAVENBLOCKS_VISUAL_CONFIG.tileSize;
  assert.ok(leftTile >= lane.leftTile);
  assert.ok(leftTile + widthTiles <= lane.rightTileExclusive);
  assert.ok(topTile >= lane.topTile);
  assert.ok(topTile + heightTiles <= lane.bottomTileExclusive);
  assert.equal(region.layers.length, 2);

  for (const layer of region.layers) {
    const assetPath = fileURLToPath(new URL(`../${layer.path}`, import.meta.url));
    assert.equal(existsSync(assetPath), true, `missing visual asset ${layer.path}`);
  }
}

const sortedRegions = [...HEAVENBLOCKS_VISUAL_CONFIG.regions]
  .sort((left, right) => left.topTile - right.topTile);
for (let index = 1; index < sortedRegions.length; index += 1) {
  const previous = sortedRegions[index - 1];
  const previousBottom = previous.topTile
    + previous.displayHeightPx
      * Math.max(...previous.layers.map((layer) => layer.overscan))
      / HEAVENBLOCKS_VISUAL_CONFIG.tileSize;
  assert.ok(previousBottom < sortedRegions[index].topTile, "Heavenblock regions must not overlap");
}

const harness = createHarness();
const system = new V11SkyIslandVisualSystem(
  harness.scene,
  { enabled: false, levels: [] },
  HEAVENBLOCKS_VISUAL_CONFIG
);
system.create();

assert.equal(harness.queuedAssets.length, 6, "all backdrops and facades must be loaded");
assert.equal(harness.images.length, 6, "all backdrops and facades must be rendered");
assert.equal(system.heavenblockSprites.size, 3);

for (const region of HEAVENBLOCKS_VISUAL_CONFIG.regions) {
  const sprites = system.heavenblockSprites.get(region.id);
  assert.equal(sprites.length, 2);
  for (let index = 0; index < sprites.length; index += 1) {
    const sprite = sprites[index];
    const layer = region.layers[index];
    const displayWidth = region.displayWidthPx * layer.overscan;
    const displayHeight = region.displayHeightPx * layer.overscan;
    assert.equal(
      sprite.x,
      region.leftTile * harness.scene.config.tileSize
        + (region.displayWidthPx - displayWidth) / 2
    );
    assert.equal(
      sprite.y,
      region.topTile * harness.scene.config.tileSize
        + (region.displayHeightPx - displayHeight) / 2
    );
    assert.equal(sprite.originX, 0);
    assert.equal(sprite.originY, 0);
    assert.equal(sprite.displayWidth, displayWidth);
    assert.equal(sprite.displayHeight, displayHeight);
    assert.equal(sprite.depth, layer.depth);
  }
}

system.destroy();
assert.equal(harness.images.every((image) => image.destroyed), true);

console.log("heavenblocks visual layout contract passed");
