import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  HEAVENBLOCKS_VISUAL_CONFIG,
  resolveHeavenblocksVisualsEnabled,
} from "../values/heavenblocksVisualConfig.js";
import { V11SkyIslandVisualSystem } from "../systems/environment/V11SkyIslandVisualSystem.js";
import { HeavenblocksPresentationSystem } from "../systems/visual/HeavenblocksPresentationSystem.js";

globalThis.Phaser = {
  BlendModes: {
    ADD: "ADD",
  },
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

const presentationObjects = [];
const tweenConfigs = [];
const graphics = {
  destroyed: false,
  circleCount: 0,
  setDepth() { return this; },
  clear() { return this; },
  lineStyle() { return this; },
  strokeCircle() {
    this.circleCount += 1;
    return this;
  },
  fillStyle() { return this; },
  fillCircle() { return this; },
  destroy() { this.destroyed = true; },
};
const promptText = {
  destroyed: false,
  visible: false,
  text: "",
  setOrigin() { return this; },
  setDepth() { return this; },
  setPosition(x, y) {
    this.x = x;
    this.y = y;
    return this;
  },
  setText(text) {
    this.text = text;
    return this;
  },
  setVisible(visible) {
    this.visible = visible;
    return this;
  },
  destroy() { this.destroyed = true; },
};
function createFxObject(x, y, key = "") {
  const object = {
    x,
    y,
    key,
    destroyed: false,
    setStrokeStyle() { return this; },
    setDepth() { return this; },
    setScale() { return this; },
    setAlpha() { return this; },
    setBlendMode() { return this; },
    destroy() { this.destroyed = true; },
  };
  presentationObjects.push(object);
  return object;
}

const presentationConfig = {
  presentation: {
    depth: 12,
    promptOffsetPx: 20,
    altarRadiusPx: 30,
    relicProjectionRadiusPx: 80,
    relicProjectionScale: 0.6,
  },
  surfaceGates: [
    { regionId: "sky", tx: 2, ty: 3, color: 0x99ddff },
  ],
  regions: [
    {
      id: "sky",
      color: 0x99ddff,
      componentAssetKey: "component-key",
      returnAltar: { tx: 4, ty: 5 },
      rewardShrine: { tx: 6, ty: 7 },
    },
  ],
};
const presentationScene = {
  add: {
    graphics: () => graphics,
    text: () => promptText,
    circle: (x, y) => createFxObject(x, y),
    image: (x, y, key) => createFxObject(x, y, key),
  },
  textures: {
    exists: () => true,
  },
  tweens: {
    add(config) {
      tweenConfigs.push(config);
      config.onComplete?.();
      return config;
    },
  },
};
const presentationWorld = {
  tileToWorld: (tx, ty) => ({ x: tx * 94 + 47, y: ty * 94 + 47 }),
};
const presentationProgression = {
  getSaveData: () => ({ unlockedRegionIds: ["sky"] }),
  isRegionUnlocked: regionId => regionId === "sky",
};
const presentation = new HeavenblocksPresentationSystem(
  presentationScene,
  presentationWorld,
  presentationConfig,
);
presentation.create();
assert.deepEqual(presentation.getHealthSnapshot(), {
  promptReady: true,
  altarGraphicsReady: true,
  activeFxCount: 0,
});
presentation.setPrompt({ tx: 2, ty: 3 }, "Enter Sky Island");
assert.equal(promptText.visible, true);
assert.match(promptText.text, /Enter Sky Island/);
presentation.redrawAltars(presentationProgression, true);
assert.equal(graphics.circleCount, 3);
presentation.playTransit({ x: 100, y: 200 }, 0x99ddff, true, 900);
presentation.playComponentClaim(presentationConfig.regions[0]);
presentation.playVault(presentationConfig.regions[0], true);
assert.ok(tweenConfigs.length >= 9);
assert.equal(presentation.getHealthSnapshot().activeFxCount, 0);
assert.equal(presentationObjects.every(object => object.destroyed), true);
presentation.hidePrompt();
assert.equal(promptText.visible, false);
presentation.destroy();
assert.equal(promptText.destroyed, true);
assert.equal(graphics.destroyed, true);
assert.deepEqual(presentation.getHealthSnapshot(), {
  promptReady: false,
  altarGraphicsReady: false,
  activeFxCount: 0,
});

console.log("heavenblocks visual layout contract passed");
