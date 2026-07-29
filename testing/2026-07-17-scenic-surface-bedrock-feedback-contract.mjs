import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { TILE_TYPES, isUnbreakableMiningSurface } from "../values/tileTypes.js";
import {
  WORLD_VISUAL_RUNTIME,
  getWorldVisualPreloadAssets,
  resolveWorldVisualSurfaceEdgeEnabled,
  resolveWorldVisualSurfaceGroundVariationEnabled,
} from "../values/worldVisualRuntime.js";
import {
  WORLD_VISUAL_DEPTH_BACKDROPS,
  resolveWorldVisualDepthBackdropBlendMask,
} from "../values/worldVisualDepthBackdrops.js";
import { WORLD_VISUAL_SEMANTIC_ASSETS } from "../values/worldVisualSemanticAssets.js";
import { DigSystem } from "../systems/mining/DigSystem.js";
import { setupGameplayMethods } from "../world/playScene/PlaySceneGameplay.js";
import {
  WorldVisualBedrockMaterialLayer,
  isWorldVisualBedrockMaterialTileType,
} from "../world/rendering/scenic-world/WorldVisualBedrockMaterialLayer.js";
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
  constructor(x, y, textureKey, frame = null) {
    this.x = x;
    this.y = y;
    this.textureKey = textureKey;
    this.frame = frame;
    this.destroyed = false;
  }

  setOrigin(...value) { this.origin = value; return this; }
  setDepth(value) { this.depth = value; return this; }
  setDisplaySize(width, height) { this.displayWidth = width; this.displayHeight = height; return this; }
  setFlipX(value) { this.flipX = value; return this; }
  setAlpha(value) { this.alpha = value; return this; }
  setBlendMode(value) { this.blendMode = value; return this; }
  setMask(value) { this.mask = value; return this; }
  clearMask() { this.mask = null; return this; }
  setTint(value) { this.tint = value; return this; }
  setX(value) { this.x = value; return this; }
  createBitmapMask() {
    return {
      source: this,
      destroy() { this.destroyed = true; },
    };
  }
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
  const maskImages = [];
  const textureFrames = new Map();
  const getTextureFrames = (key) => {
    if (!textureFrames.has(key)) textureFrames.set(key, new Map());
    return textureFrames.get(key);
  };
  return {
    config: { tileSize: 94, worldWidthPx: 280 * 94, topAirRows: 65 },
    images,
    maskImages,
    textures: {
      exists: key => sourceSizes.has(key),
      get: key => ({
        getSourceImage: () => sourceSizes.get(key),
        has: frameName => getTextureFrames(key).has(frameName),
        add(frameName, sourceIndex, x, y, width, height) {
          const frame = {
            name: frameName,
            sourceIndex,
            cutX: x,
            cutY: y,
            width,
            height,
            realWidth: width,
            realHeight: height,
          };
          getTextureFrames(key).set(frameName, frame);
          return frame;
        },
      }),
    },
    add: {
      image(x, y, key, frame = null) {
        const image = new ImageStub(x, y, key, frame);
        images.push(image);
        return image;
      },
    },
    make: {
      image({ x, y, key, frame }) {
        const image = new ImageStub(
          x,
          y,
          key,
          getTextureFrames(key).get(frame),
        );
        maskImages.push(image);
        return image;
      },
    },
  };
}

const farSource = readPngDimensions(WORLD_VISUAL_RUNTIME.assets.far);
const surfaceEdgeSource = readPngDimensions(WORLD_VISUAL_RUNTIME.assets.surfaceEdge);
const farBlendAsset = resolveWorldVisualDepthBackdropBlendMask(
  WORLD_VISUAL_DEPTH_BACKDROPS,
);
const sourceSizes = new Map([
  [WORLD_VISUAL_RUNTIME.assets.far.key, farSource],
  [WORLD_VISUAL_RUNTIME.assets.town.key, { width: 1672, height: 941 }],
  [WORLD_VISUAL_RUNTIME.assets.surfaceEdge.key, surfaceEdgeSource],
  [farBlendAsset.key, {
    width: WORLD_VISUAL_DEPTH_BACKDROPS.blend.columns
      * WORLD_VISUAL_DEPTH_BACKDROPS.blend.frameWidthPx,
    height: Math.ceil(16 / WORLD_VISUAL_DEPTH_BACKDROPS.blend.columns)
      * WORLD_VISUAL_DEPTH_BACKDROPS.blend.frameHeightPx,
  }],
  ...WORLD_VISUAL_RUNTIME.surface.surfaceGroundVariation.assets.map(asset => [
    asset.key,
    { width: 1536, height: 160 },
  ]),
]);
const currentSurfaceSearch = "?surfacePack=current-v2";
const surfaceEdgeRollbackSearch = "?surfacePack=current-v2&surfaceEdge=0";
const surfaceVariationRollbackSearch = (
  "?surfacePack=current-v2&surfaceGroundVariation=0"
);
const originalLocation = Object.getOwnPropertyDescriptor(globalThis, "location");
const originalPhaser = Object.getOwnPropertyDescriptor(globalThis, "Phaser");
Object.defineProperty(globalThis, "Phaser", {
  configurable: true,
  value: { BlendModes: { SCREEN: "SCREEN" } },
});

try {
  assert.equal(WORLD_VISUAL_RUNTIME.surface.farMaxSourceScale, 1);
  assert.deepEqual(
    surfaceEdgeSource,
    { width: 1672, height: 48 },
    "the approved ground cap must contain only the thin surface strip",
  );
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
  assert.equal(resolveWorldVisualSurfaceEdgeEnabled(WORLD_VISUAL_RUNTIME, currentSurfaceSearch), true);
  assert.equal(
    resolveWorldVisualSurfaceGroundVariationEnabled(
      WORLD_VISUAL_RUNTIME,
      currentSurfaceSearch,
    ),
    true,
    "approved V5 top-soil variation is additive and enabled by default",
  );
  assert.equal(
    WORLD_VISUAL_RUNTIME.assets.surfaceEdge.path,
    "sprites/backgrounds/world-visual-v2/surface/town-surface-edge-thin-v2.png",
  );
  assert.equal(
    defaultPreloads.some(asset => (
      WORLD_VISUAL_RUNTIME.surface.surfaceGroundVariation.assets.some(
        variation => variation.key === asset.key,
      )
    )),
    true,
    "approved top-soil variants preload beside the retained Town Square slate",
  );
  assert.equal(
    defaultPreloads.some(asset => asset.key === WORLD_VISUAL_RUNTIME.assets.surfaceEdge.key),
    true,
    "the continuous approved surface edge must preload by default",
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
  assert.equal(
    defaultStage.farBlendMasks.length,
    defaultStage.far.length,
    "every repeated far-background image receives a raster feather mask",
  );
  for (const mask of defaultStage.farBlendMasks) {
    const expectedBits = mask.image.x < 0
      ? 0
      : WORLD_VISUAL_DEPTH_BACKDROPS.blend.edgeBits.left;
    assert.equal(
      mask.image.frame.name,
      `${farBlendAsset.key}-blend-${expectedBits}`,
      "surface far joins keep the retained card opaque and feather only the incoming left edge",
    );
  }
  assert.ok(
    WORLD_VISUAL_RUNTIME.surface.farSegmentOverlapPx >= 256,
    "far-background cards retain a broad overlap instead of a hairline join",
  );
  assert.ok(defaultStage.surfaceEdges.length > 0, "the default scenic stage must span the full surface");
  const variationSurfaceEdges = defaultStage.surfaceEdges.filter(image => (
    WORLD_VISUAL_RUNTIME.surface.surfaceGroundVariation.assets.some(
      asset => asset.key === image.textureKey,
    )
  ));
  const orderedSurfaceEdges = defaultStage.surfaceEdges
    .filter(image => image.textureKey === WORLD_VISUAL_RUNTIME.assets.surfaceEdge.key)
    .sort((left, right) => left.x - right.x);
  assert.equal(
    variationSurfaceEdges.length > 0,
    true,
    "V5 top-soil cards render in addition to the exact Town Square slate",
  );
  assert.equal(orderedSurfaceEdges[0].x, 0, "surface coverage must start at world column zero");
  for (let index = 1; index < orderedSurfaceEdges.length; index += 1) {
    const previous = orderedSurfaceEdges[index - 1];
    const current = orderedSurfaceEdges[index];
    assert.ok(
      current.x <= previous.x + previous.displayWidth,
      `surface edge ${index} must meet or overlap its predecessor`,
    );
  }
  assert.ok(
    orderedSurfaceEdges.at(-1).x + orderedSurfaceEdges.at(-1).displayWidth
      >= defaultScene.config.worldWidthPx,
    "the approved strip must cover every surface column through the eastern world edge",
  );
  assert.ok(
    orderedSurfaceEdges.every(image => image.displayHeight < defaultScene.config.tileSize * 0.65),
    "the visual cap must remain thinner than one tile and leave the first underground row readable",
  );
  const authoritativeTerrainMask = { id: "production-solid-terrain" };
  assert.equal(defaultStage.bindTerrainMask(authoritativeTerrainMask), true);
  assert.ok(
    defaultStage.surfaceEdges.every(image => image.mask === authoritativeTerrainMask),
    "the retained Town Square surface art is clipped to the production ground mask",
  );
  assert.equal(
    defaultScene.images.some(image => image.textureKey === WORLD_VISUAL_RUNTIME.assets.surfaceEdge.key),
    true,
    "the continuous legacy ground edge remains in the additive composition",
  );
  const defaultFarMasks = [...defaultStage.farBlendMasks];
  defaultStage.destroy();
  assert.ok(
    defaultFarMasks.every(mask => mask.image.destroyed && mask.bitmap.destroyed),
    "far-background raster masks are released with their cards",
  );

  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: { search: surfaceVariationRollbackSearch },
  });
  const variationRollbackPreloads = getWorldVisualPreloadAssets(
    WORLD_VISUAL_RUNTIME,
    surfaceVariationRollbackSearch,
  );
  assert.equal(
    resolveWorldVisualSurfaceGroundVariationEnabled(
      WORLD_VISUAL_RUNTIME,
      surfaceVariationRollbackSearch,
    ),
    false,
  );
  assert.ok(
    WORLD_VISUAL_RUNTIME.surface.surfaceGroundVariation.assets.every(
      asset => !variationRollbackPreloads.includes(asset),
    ),
    "?surfaceGroundVariation=0 removes only the additive V5 top-soil cards",
  );
  const variationRollbackScene = createSurfaceScene(sourceSizes);
  const variationRollbackStage = new WorldVisualSurfaceStage(
    variationRollbackScene,
  );
  variationRollbackStage.create();
  assert.ok(
    variationRollbackStage.surfaceEdges.every(image => (
      !WORLD_VISUAL_RUNTIME.surface.surfaceGroundVariation.assets.some(
        asset => asset.key === image.textureKey,
      )
    )),
    "the surface-variation rollback retains the legacy surface composition",
  );
  variationRollbackStage.destroy();

  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: { search: surfaceEdgeRollbackSearch },
  });
  const rollbackPreloads = getWorldVisualPreloadAssets(WORLD_VISUAL_RUNTIME, surfaceEdgeRollbackSearch);
  assert.equal(resolveWorldVisualSurfaceEdgeEnabled(WORLD_VISUAL_RUNTIME, surfaceEdgeRollbackSearch), false);
  assert.equal(
    rollbackPreloads.some(asset => asset.key === WORLD_VISUAL_RUNTIME.assets.surfaceEdge.key),
    false,
    "?surfaceEdge=0 must remove the continuous strip from preload",
  );
  const rollbackScene = createSurfaceScene(sourceSizes);
  const rollbackStage = new WorldVisualSurfaceStage(rollbackScene);
  rollbackStage.create();
  assert.equal(rollbackStage.surfaceEdges.length, 0, "?surfaceEdge=0 must restore tile-only surface rendering");
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

const unbreakableMiningSurfaces = [
  TILE_TYPES.BEDROCK,
  TILE_TYPES.CAVE_WALL,
  TILE_TYPES.FLOOR_TOWN_1,
  TILE_TYPES.FLOOR_TOWN_2,
];
for (const tileType of unbreakableMiningSurfaces) {
  const result = createBlockedDigResult(tileType);
  assert.equal(result.success, false);
  assert.equal(result.reason, "blocked");
  assert.equal(result.tileType, tileType);
  assert.equal(result.typeBeforeDamage, tileType);
  assert.equal(result.damage, 0);
  assert.equal(result.blockedByBedrock, true, `${tileType} must be identified as an unbreakable bedrock surface`);
  assert.equal(isUnbreakableMiningSurface(tileType), true);
}

const gameplay = {};
setupGameplayMethods(gameplay);
const warnings = [];
const floatingTexts = [];
const gameplayScene = {
  config: { tileSize: 94 },
  _applyMineShake() {},
  uiNotifications: {
    warning(message, options) { warnings.push({ message, options }); },
  },
  floatingTextSystem: {
    showFloatingText(...args) { floatingTexts.push(args); },
  },
};
gameplay.applyMineFeedback.call(
  gameplayScene,
  createBlockedDigResult(TILE_TYPES.BEDROCK),
  { tx: 4, ty: 7 },
);
assert.deepEqual(
  warnings,
  [],
  "blocked terrain must not restore the removed low-quality warning indicator",
);
assert.deepEqual(
  floatingTexts,
  [],
  "PlayScene must not duplicate the queued warning with floating text",
);
gameplay.applyMineFeedback.call(
  gameplayScene,
  { success: false, reason: "blocked", blockedByBedrock: false },
  { tx: 5, ty: 7 },
);
assert.equal(warnings.length, 0, "ordinary blocked attempts must remain indicator-free");
assert.equal(floatingTexts.length, 0, "ordinary blocked attempts must not create floating popup text");

function mixColor(from, to, amount) {
  const t = Math.max(0, Math.min(1, Number(amount) || 0));
  const channel = shift => Math.round(((from >> shift) & 0xff) + ((((to >> shift) & 0xff) - ((from >> shift) & 0xff)) * t));
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

const bedrockConfig = WORLD_VISUAL_SEMANTIC_ASSETS.bedrock;
assert.equal(bedrockConfig.includesCaveWall, true);
assert.equal(bedrockConfig.includesTownFloors, false);
assert.ok(bedrockConfig.lightingLift > 0, "generated bedrock needs a positive visibility lift");
assert.ok(bedrockConfig.coolTintStrength > 0, "generated bedrock needs a visible cool-color separation");
assert.notEqual(bedrockConfig.coolTint, 0xffffff);

const bedrockImages = [];
const bedrockGraphics = [];
const bedrockScene = {
  config: { tileSize: 94 },
  textures: {
    exists: key => (
      key === bedrockConfig.seamMaterial.key
      || key === bedrockConfig.material.key
    ),
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
    return unbreakableMiningSurfaces[tx] ?? TILE_TYPES.AIR;
  },
};
const bedrockLayer = new WorldVisualBedrockMaterialLayer(bedrockScene, bedrockWorld);
bedrockLayer.create();
const terrainTint = 0x20242a;
bedrockLayer.sync({ left: 0, right: 4, top: 0, bottom: 1 }, { terrainTint });
assert.ok(
  bedrockImages.some(image => image.textureKey === bedrockConfig.seamMaterial.key),
  "visible bedrock keeps the seamless shale base",
);
assert.ok(
  bedrockImages.some(image => image.textureKey === bedrockConfig.material.key),
  "the prior megalith material remains as an additive accent",
);
assert.equal(
  bedrockGraphics[0].calls.filter(([method]) => method === "fillRect").length,
  2,
  "only bedrock and cave walls may reveal the generated bedrock material",
);
assert.equal(isWorldVisualBedrockMaterialTileType(TILE_TYPES.FLOOR_TOWN_1), false);
assert.equal(isWorldVisualBedrockMaterialTileType(TILE_TYPES.FLOOR_TOWN_2), false);
const liftedTint = mixColor(terrainTint, 0xffffff, bedrockConfig.lightingLift);
const expectedBedrockTint = mixColor(liftedTint, bedrockConfig.coolTint, bedrockConfig.coolTintStrength);
for (const image of bedrockImages) {
  assert.equal(image.tint, expectedBedrockTint, "runtime must apply the configured visibility lift and cool tint");
  assert.equal(
    image.alpha,
    image.textureKey === bedrockConfig.seamMaterial.key
      ? bedrockConfig.seamAlpha
      : bedrockConfig.alpha,
  );
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
  "Scenic surface and bedrock feedback contract passed: additive top soil and feathered far cards retain authoritative ground",
);
