import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { MINING_CONFIG } from "../values/miningConfig.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { WORLD_VISUAL_RUNTIME, getWorldVisualPreloadAssets, resolveWorldVisualSurfaceEdgeEnabled } from "../values/worldVisualRuntime.js";
import { WORLD_VISUAL_SEMANTIC_ASSETS } from "../values/worldVisualSemanticAssets.js";
import { DigSystem } from "../systems/mining/DigSystem.js";
import { setupGameplayMethods } from "../world/playScene/PlaySceneGameplay.js";
import { WorldVisualBedrockMaterialLayer } from "../world/rendering/scenic-world/WorldVisualBedrockMaterialLayer.js";
import { WorldVisualSurfaceStage } from "../world/rendering/scenic-world/WorldVisualSurfaceStage.js";

function readPngDimensions(asset) {
  const cleanPath = asset.path.split(/[?#]/, 1)[0].replace(/\\/g, "/");
  const path = fileURLToPath(new URL(`../${cleanPath}`, import.meta.url));
  assert.ok(fs.existsSync(path), `required scenic source is missing: ${cleanPath}`);
  const bytes = fs.readFileSync(path);
  assert.ok(
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    `scenic source must be a real PNG: ${cleanPath}`,
  );
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

class ImageStub {
  constructor(x, y, textureKey) {
    this.x = x;
    this.y = y;
    this.textureKey = textureKey;
    this.destroyed = false;
  }

  setOrigin(...value) { this.origin = value; return this; }
  setDepth(value) { this.depth = value; return this; }
  setDisplaySize(width, height) { this.displayWidth = width; this.displayHeight = height; return this; }
  setFlipX(value) { this.flipX = value; return this; }
  setAlpha(value) { this.alpha = value; return this; }
  setBlendMode(value) { this.blendMode = value; return this; }
  setMask(value) { this.mask = value; return this; }
  setTint(value) { this.tint = value; return this; }
  setX(value) { this.x = value; return this; }
  destroy() { this.destroyed = true; return this; }
}

function createGraphicsStub() {
  const geometryMask = {
    destroyed: false,
    destroy() { this.destroyed = true; },
  };
  const target = {
    calls: [],
    destroyed: false,
    createGeometryMask() {
      this.calls.push(["createGeometryMask"]);
      return geometryMask;
    },
    destroy() {
      this.destroyed = true;
      this.calls.push(["destroy"]);
      return proxy;
    },
  };
  let proxy = null;
  proxy = new Proxy(target, {
    get(object, method) {
      if (method in object) {
        const value = object[method];
        return typeof value === "function" ? value.bind(object) : value;
      }
      return (...args) => {
        object.calls.push([method, ...args]);
        return proxy;
      };
    },
  });
  return proxy;
}

function createSurfaceScene(sourceSizes) {
  const images = [];
  return {
    config: { tileSize: 94, worldWidthPx: 280 * 94, topAirRows: 65 },
    images,
    textures: {
      exists: key => sourceSizes.has(key),
      get: key => ({ getSourceImage: () => sourceSizes.get(key) }),
    },
    add: {
      image(x, y, key) {
        const image = new ImageStub(x, y, key);
        images.push(image);
        return image;
      },
    },
  };
}

const farSource = readPngDimensions(WORLD_VISUAL_RUNTIME.assets.far);
const sourceSizes = new Map([
  [WORLD_VISUAL_RUNTIME.assets.far.key, farSource],
  [WORLD_VISUAL_RUNTIME.assets.town.key, { width: 1672, height: 941 }],
  [WORLD_VISUAL_RUNTIME.assets.surfaceEdge.key, { width: 1672, height: 941 }],
]);
const currentSurfaceSearch = "?surfacePack=current-v2";
const currentSurfaceEdgeSearch = "?surfacePack=current-v2&surfaceEdge=1";
const originalLocation = Object.getOwnPropertyDescriptor(globalThis, "location");
const originalPhaser = Object.getOwnPropertyDescriptor(globalThis, "Phaser");
Object.defineProperty(globalThis, "Phaser", {
  configurable: true,
  value: { BlendModes: { SCREEN: "SCREEN" } },
});

try {
  assert.equal(WORLD_VISUAL_RUNTIME.surface.farMaxSourceScale, 1);
  assert.ok(
    WORLD_VISUAL_RUNTIME.surface.farSegmentWidthTiles * 94
      + WORLD_VISUAL_RUNTIME.surface.farSegmentOverlapPx > farSource.width,
    "the contract fixture must exercise the far-image downscale clamp",
  );

  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: { search: currentSurfaceSearch },
  });
  const defaultPreloads = getWorldVisualPreloadAssets(WORLD_VISUAL_RUNTIME, currentSurfaceSearch);
  assert.equal(resolveWorldVisualSurfaceEdgeEnabled(WORLD_VISUAL_RUNTIME, currentSurfaceSearch), false);
  assert.equal(
    defaultPreloads.some(asset => asset.key === WORLD_VISUAL_RUNTIME.assets.surfaceEdge.key),
    false,
    "the duplicate town-surface-edge floor must not preload by default",
  );

  const defaultScene = createSurfaceScene(sourceSizes);
  const defaultStage = new WorldVisualSurfaceStage(defaultScene);
  defaultStage.create();
  assert.ok(defaultStage.far.length > 1, "the far background must cover the complete world width with segments");
  assert.ok(
    defaultStage.far.every(image => image.displayWidth <= farSource.width),
    "far segments must never display wider than their source when farMaxSourceScale is 1",
  );
  assert.ok(
    defaultStage.far.every(image => image.displayWidth === farSource.width),
    "an oversized requested segment must clamp exactly to the source width",
  );
  assert.equal(defaultStage.surfaceEdges.length, 0, "the default scenic stage must omit the duplicate floor");
  assert.equal(
    defaultScene.images.some(image => image.textureKey === WORLD_VISUAL_RUNTIME.assets.surfaceEdge.key),
    false,
    "the duplicate floor texture must never be instantiated during default gameplay",
  );
  defaultStage.destroy();

  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: { search: currentSurfaceEdgeSearch },
  });
  const rollbackPreloads = getWorldVisualPreloadAssets(WORLD_VISUAL_RUNTIME, currentSurfaceEdgeSearch);
  assert.equal(resolveWorldVisualSurfaceEdgeEnabled(WORLD_VISUAL_RUNTIME, currentSurfaceEdgeSearch), true);
  assert.equal(
    rollbackPreloads.some(asset => asset.key === WORLD_VISUAL_RUNTIME.assets.surfaceEdge.key),
    true,
    "?surfaceEdge=1 must restore the legacy floor asset to preload",
  );
  const rollbackScene = createSurfaceScene(sourceSizes);
  const rollbackStage = new WorldVisualSurfaceStage(rollbackScene);
  rollbackStage.create();
  assert.ok(rollbackStage.surfaceEdges.length > 0, "?surfaceEdge=1 must restore legacy floor instances");
  assert.ok(
    rollbackStage.surfaceEdges.every(image => image.textureKey === WORLD_VISUAL_RUNTIME.assets.surfaceEdge.key),
  );
  rollbackStage.destroy();
} finally {
  if (originalLocation) Object.defineProperty(globalThis, "location", originalLocation);
  else delete globalThis.location;
  if (originalPhaser) Object.defineProperty(globalThis, "Phaser", originalPhaser);
  else delete globalThis.Phaser;
}

function createBlockedDigResult(tileType) {
  const worldModel = {
    inBounds: () => true,
    isSolid: () => true,
    isDiggable: () => false,
    getTileType: () => tileType,
  };
  const digSystem = new DigSystem(worldModel, null, { tileSize: 94 });
  return digSystem.tryMine({ tx: 4, ty: 7 }, 1000, null, null, { ignoreCooldown: true });
}

for (const tileType of [TILE_TYPES.BEDROCK, TILE_TYPES.CAVE_WALL]) {
  const result = createBlockedDigResult(tileType);
  assert.equal(result.success, false);
  assert.equal(result.reason, "blocked");
  assert.equal(result.tileType, tileType);
  assert.equal(result.typeBeforeDamage, tileType);
  assert.equal(result.blockedByBedrock, true, `${tileType} must be identified as an unbreakable bedrock surface`);
}

assert.equal(MINING_CONFIG.blockedUi.bedrockMessage, "Cannot dig");
assert.ok(MINING_CONFIG.blockedUi.notificationKey.length > 0);
assert.ok(MINING_CONFIG.blockedUi.durationMs > 0);
const gameplay = {};
setupGameplayMethods(gameplay);
const warnings = [];
const gameplayScene = {
  _applyMineShake() {},
  uiNotifications: {
    warning(message, options) { warnings.push({ message, options }); },
  },
};
gameplay.applyMineFeedback.call(
  gameplayScene,
  createBlockedDigResult(TILE_TYPES.BEDROCK),
  { tx: 4, ty: 7 },
);
assert.deepEqual(warnings, [{
  message: MINING_CONFIG.blockedUi.bedrockMessage,
  options: {
    key: MINING_CONFIG.blockedUi.notificationKey,
    durationMs: MINING_CONFIG.blockedUi.durationMs,
  },
}], "PlayScene must route Cannot dig through the keyed warning notification API");
gameplay.applyMineFeedback.call(
  gameplayScene,
  { success: false, reason: "blocked", blockedByBedrock: false },
  { tx: 5, ty: 7 },
);
assert.equal(warnings.length, 1, "ordinary blocked attempts must not impersonate bedrock feedback");

function mixColor(from, to, amount) {
  const t = Math.max(0, Math.min(1, Number(amount) || 0));
  const channel = shift => Math.round(((from >> shift) & 0xff) + ((((to >> shift) & 0xff) - ((from >> shift) & 0xff)) * t));
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

const bedrockConfig = WORLD_VISUAL_SEMANTIC_ASSETS.bedrock;
assert.equal(bedrockConfig.includesCaveWall, true);
assert.ok(bedrockConfig.lightingLift > 0, "generated bedrock needs a positive visibility lift");
assert.ok(bedrockConfig.coolTintStrength > 0, "generated bedrock needs a visible cool-color separation");
assert.notEqual(bedrockConfig.coolTint, 0xffffff);

const bedrockImages = [];
const bedrockGraphics = [];
const bedrockScene = {
  config: { tileSize: 94 },
  textures: {
    exists: key => key === bedrockConfig.material.key,
    get: () => ({ getSourceImage: () => ({ width: 512, height: 512 }) }),
  },
  add: {
    image(x, y, key) {
      const image = new ImageStub(x, y, key);
      bedrockImages.push(image);
      return image;
    },
  },
  make: {
    graphics() {
      const graphics = createGraphicsStub();
      bedrockGraphics.push(graphics);
      return graphics;
    },
  },
};
const bedrockWorld = {
  getTileType(tx, ty) {
    if (ty !== 0) return TILE_TYPES.AIR;
    return tx === 0 ? TILE_TYPES.BEDROCK : TILE_TYPES.CAVE_WALL;
  },
};
const bedrockLayer = new WorldVisualBedrockMaterialLayer(bedrockScene, bedrockWorld);
bedrockLayer.create();
const terrainTint = 0x20242a;
bedrockLayer.sync({ left: 0, right: 2, top: 0, bottom: 1 }, { terrainTint });
assert.ok(bedrockImages.length > 0, "visible bedrock must allocate the generated material plane");
assert.equal(
  bedrockGraphics[0].calls.filter(([method]) => method === "fillRect").length,
  2,
  "both BEDROCK and CAVE_WALL must reveal the generated bedrock material",
);
const liftedTint = mixColor(terrainTint, 0xffffff, bedrockConfig.lightingLift);
const expectedBedrockTint = mixColor(liftedTint, bedrockConfig.coolTint, bedrockConfig.coolTintStrength);
for (const image of bedrockImages) {
  assert.equal(image.tint, expectedBedrockTint, "runtime must apply the configured visibility lift and cool tint");
  assert.equal(image.alpha, bedrockConfig.alpha);
  assert.notEqual(image.tint, terrainTint, "bedrock must remain visibly separate from ordinary terrain");
}
const channelTotal = color => ((color >> 16) & 0xff) + ((color >> 8) & 0xff) + (color & 0xff);
assert.ok(
  channelTotal(expectedBedrockTint) > channelTotal(terrainTint),
  "bedrock tint must be brighter than the incoming terrain tint",
);
assert.ok(
  (expectedBedrockTint & 0xff) > ((expectedBedrockTint >> 16) & 0xff),
  "bedrock tint must retain a blue/cool bias",
);
bedrockLayer.destroy();

console.log(
  "Scenic surface and bedrock feedback contract passed: far art is source-scale capped, duplicate floor is opt-in, and visible bedrock returns keyed Cannot dig feedback",
);
