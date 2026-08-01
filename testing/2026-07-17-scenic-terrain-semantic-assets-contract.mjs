import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { RESOURCE_BY_TILE_TYPE } from "../values/resourceTypes.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { WORLD_VISUAL_FEEDBACK } from "../values/worldVisualFeedback.js";
import { WORLD_VISUAL_RUNTIME } from "../values/worldVisualRuntime.js";
import { WorldVisualFeedbackLayer } from "../world/rendering/scenic-world/WorldVisualFeedbackLayer.js";
import { WorldVisualGameplayEffectLayer } from "../world/rendering/scenic-world/WorldVisualGameplayEffectLayer.js";
const semanticConfigUrl = new URL("../values/worldVisualSemanticAssets.js", import.meta.url);
const semanticLayerUrl = new URL("../world/rendering/scenic-world/WorldVisualSemanticAssetLayer.js", import.meta.url);

assert.ok(fs.existsSync(fileURLToPath(semanticConfigUrl)),
  "scenic terrain semantics need a values/worldVisualSemanticAssets.js raster manifest");
assert.ok(fs.existsSync(fileURLToPath(semanticLayerUrl)),
  "scenic terrain semantics need a dedicated WorldVisualSemanticAssetLayer");
const semanticModule = await import(semanticConfigUrl);
const semanticLayerModule = await import(semanticLayerUrl);
const normalizeToken = value => String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");

function collectRasterDescriptors(value, trail = [], result = [], seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return result;
  seen.add(value);
  if (typeof value.key === "string" && typeof value.path === "string" && /\.(?:png|webp)(?:[?#]|$)/i.test(value.path)) {
    result.push({ descriptor: value, trail });
  }
  for (const [key, child] of Object.entries(value)) collectRasterDescriptors(child, [...trail, key], result, seen);
  return result;
}
function findFeatureSwitch(value, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return null;
  seen.add(value);
  if (typeof value.enabled === "boolean" && typeof value.queryParam === "string") return value;
  for (const child of Object.values(value)) {
    const found = findFeatureSwitch(child, seen);
    if (found) return found;
  }
  return null;
}
function declaresSemantic(value, semantic, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return false;
  seen.add(value);
  if (Number(value.tileType) === semantic.tileType) return true;
  for (const [key, child] of Object.entries(value)) {
    if (String(key) === String(semantic.tileType)) return true;
    if (semantic.aliases.some(alias => normalizeToken(key) === normalizeToken(alias))) return true;
    if (declaresSemantic(child, semantic, seen)) return true;
  }
  return false;
}
function readRasterDimensions(bytes) {
  const isPng = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (isPng && bytes.length >= 24) {
    return { format: "png", width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  const isWebp = bytes.subarray(0, 4).toString("ascii") === "RIFF"
    && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  if (!isWebp || bytes.length < 30) return null;
  const chunk = bytes.subarray(12, 16).toString("ascii");
  if (chunk === "VP8X") return { format: "webp", width: 1 + bytes.readUIntLE(24, 3), height: 1 + bytes.readUIntLE(27, 3) };
  if (chunk === "VP8L" && bytes[20] === 0x2f) return {
    format: "webp",
    width: 1 + (bytes[21] | ((bytes[22] & 0x3f) << 8)),
    height: 1 + ((bytes[22] >> 6) | (bytes[23] << 2) | ((bytes[24] & 0x0f) << 10)),
  };
  const signature = bytes.indexOf(Buffer.from([0x9d, 0x01, 0x2a]), 20);
  if (chunk === "VP8 " && signature >= 0 && signature + 7 <= bytes.length) return {
    format: "webp",
    width: bytes.readUInt16LE(signature + 3) & 0x3fff,
    height: bytes.readUInt16LE(signature + 5) & 0x3fff,
  };
  return null;
}

const configEntries = Object.entries(semanticModule)
  .filter(([, value]) => value && typeof value === "object")
  .map(([name, value]) => ({ name, value, rasters: collectRasterDescriptors(value) }))
  .sort((a, b) => b.rasters.length - a.rasters.length);
const semanticConfigEntry = configEntries[0];
assert.ok(semanticConfigEntry?.rasters.length, "semantic values must export generated raster descriptors");
const semanticConfig = semanticConfigEntry.value;
const rasterDescriptors = semanticConfigEntry.rasters;
const tileTypeByResource = Object.fromEntries(
  Object.entries(RESOURCE_BY_TILE_TYPE).map(([tileType, resourceKey]) => [resourceKey, Number(tileType)])
);
const expectedSemantics = [
  { label: "skyTile", tileType: TILE_TYPES.SKY_TILE, aliases: ["skyTile", "starTile", "star"] },
  { label: "bedrock", tileType: TILE_TYPES.BEDROCK, aliases: ["bedrock"] },
  ...Object.keys(WORLD_VISUAL_FEEDBACK.resourceMarkers)
    .map(label => ({ label, tileType: tileTypeByResource[label], aliases: [label] })),
];
function descriptorsForSemantic(semantic) {
  const aliases = semantic.aliases.map(normalizeToken);
  const direct = rasterDescriptors.filter(({ descriptor, trail }) => {
    if (Number(descriptor.tileType) === semantic.tileType) return true;
    if (trail.some(part => String(part) === String(semantic.tileType))) return true;
    const identity = normalizeToken([...trail, descriptor.id, descriptor.key, descriptor.path,
      descriptor.semantic, descriptor.resourceKey].join(" "));
    return aliases.some(alias => identity.includes(alias));
  });
  if (direct.length) return direct;
  if (!declaresSemantic(semanticConfig, semantic)) return [];
  const category = semantic.label === "skyTile" ? /sky|star/
    : semantic.label === "bedrock" ? /bedrock/
      : /resource|ore|mineral/;
  return rasterDescriptors.filter(({ descriptor, trail }) => (
    category.test(normalizeToken([...trail, descriptor.key, descriptor.path].join(" ")))
  ));
}
for (const semantic of expectedSemantics) {
  assert.ok(Number.isInteger(semantic.tileType), `${semantic.label} must still map to an authoritative tile type`);
  const matches = descriptorsForSemantic(semantic);
  assert.ok(matches.length > 0, `${semantic.label} needs a generated terrain-native raster descriptor`);
  for (const { descriptor } of matches) {
    const cleanPath = descriptor.path.split(/[?#]/, 1)[0].replace(/\\/g, "/");
    const expectedPackagePattern = semantic.label === "bedrock"
      ? /^(?:sprites\/backgrounds\/world-visual-v2\/semantic-decals-v1\/bedrock-seamless-v1\.webp|sprites\/tiles\/approved-world\/bedrock-megalith-lock-v1\.png)$/
      : /^sprites\/backgrounds\/world-visual-v2\/semantic-decals-v1\//;
    assert.match(
      cleanPath,
      expectedPackagePattern,
      `${semantic.label} must use its approved generated terrain package`
    );
    assert.doesNotMatch(
      `${descriptor.key} ${cleanPath}`,
      /recognition-atlas|feedback-atlas/i,
      `${semantic.label} must not fall back to the low-quality emblem atlas`
    );
    const assetUrl = new URL(`../${cleanPath}`, import.meta.url);
    assert.ok(fs.existsSync(fileURLToPath(assetUrl)), `${semantic.label} raster is missing: ${cleanPath}`);
    const bytes = fs.readFileSync(fileURLToPath(assetUrl));
    const dimensions = readRasterDimensions(bytes);
    assert.ok(dimensions, `${semantic.label} must resolve to a real PNG/WebP file`);
    assert.ok(
      dimensions.width >= 188 && dimensions.height >= 188,
      `${semantic.label} needs at least 2x the 94px gameplay resolution, got ${dimensions.width}x${dimensions.height}`
    );
  }
}

const featureSwitch = findFeatureSwitch(semanticConfig);
assert.ok(featureSwitch, "generated semantic assets need an explicit reversible feature switch");
assert.equal(featureSwitch.enabled, true, "generated semantic assets must be the production default");
const enabledResolver = Object.entries(semanticModule).find(
  ([name, value]) => typeof value === "function" && /resolve.*semantic.*enabled/i.test(name)
)?.[1];
assert.equal(typeof enabledResolver, "function", "semantic values must export their enable/rollback resolver");
assert.equal(enabledResolver(undefined, ""), true, "default runtime must use generated terrain semantics");
const disableValue = featureSwitch.queryDisableValues?.[0] ?? "0";
assert.equal(
  enabledResolver(undefined, `?${featureSwitch.queryParam}=${disableValue}`),
  false,
  "the old procedural/emblem path may remain only as an explicit rollback"
);

const preloadResolver = Object.entries(semanticModule).find(
  ([name, value]) => typeof value === "function" && /semantic.*preload.*assets/i.test(name)
)?.[1];
assert.equal(typeof preloadResolver, "function", "semantic values must expose raster preload assets");
const preloadKeys = new Set(preloadResolver().map(asset => asset.key));
for (const { descriptor } of rasterDescriptors) {
  assert.ok(preloadKeys.has(descriptor.key), `semantic raster is not preloaded: ${descriptor.key}`);
}

const semanticSource = fs.readFileSync(fileURLToPath(semanticLayerUrl), "utf8");
const runtimeSource = fs.readFileSync(
  new URL("../world/rendering/scenic-world/WorldVisualRuntime.js", import.meta.url),
  "utf8"
);
const bootSource = fs.readFileSync(new URL("../ui/scenes/BootScene.js", import.meta.url), "utf8");
assert.equal(
  typeof semanticLayerModule.WorldVisualSemanticAssetLayer,
  "function",
  "semantic runtime must export WorldVisualSemanticAssetLayer"
);
assert.match(semanticSource, /getTileType\s*\(/, "semantic layer must scan the authoritative WorldModel");
assert.match(semanticSource, /RESOURCE_BY_TILE_TYPE/, "semantic layer must recognize resource tile identity");
assert.match(semanticSource, /TILE_TYPES\.SKY_TILE/, "semantic layer must recognize star/sky tiles");
assert.match(
  semanticSource,
  /isUnbreakableMiningSurface/,
  "semantic layer must recognize the shared bedrock, cave-wall, and town-floor contract",
);
assert.match(semanticSource, /\.add\.(?:image|sprite)\s*\(/, "semantic identity must render with raster images");
assert.match(semanticSource, /\.setMask\s*\(/, "semantic images must remain clipped to solid terrain");
assert.match(semanticSource, /\.set(?:DisplaySize|Scale)\s*\(/, "high-resolution semantics must be fitted to gameplay cells");
assert.doesNotMatch(
  semanticSource,
  /\.add\.graphics\s*\(|fill(?:Circle|Triangle|Rect)|lineTo\s*\(|innerHTML|createElement\s*\(/,
  "semantic identity cannot be rebuilt as Phaser primitives or HTML overlays"
);
assert.doesNotMatch(
  semanticSource,
  /\.(?:setTileType|setTileHp|damageTile|applyDugTileKeys|setDugTile)\s*\(/,
  "semantic raster rendering must never mutate authoritative gameplay tiles"
);
for (const method of ["create", "sync", "invalidateCell", "destroy"]) {
  assert.equal(
    typeof semanticLayerModule.WorldVisualSemanticAssetLayer.prototype[method],
    "function",
    `semantic layer must implement ${method} lifecycle behavior`
  );
}
assert.match(runtimeSource, /WorldVisualSemanticAssetLayer/);
assert.match(runtimeSource, /new WorldVisualSemanticAssetLayer\s*\(/);
for (const method of ["create", "sync", "invalidateCell", "destroy"]) {
  assert.match(runtimeSource, new RegExp(`semanticAssetLayer(?:\\?\\.|\\.)${method}\\s*\\(`));
}
assert.match(bootSource, /getWorldVisualSemanticPreloadAssets/);

function createGraphicsStub() {
  const target = { calls: [] };
  let proxy = null;
  proxy = new Proxy(target, { get(object, method) {
    if (method in object) return object[method];
    return (...args) => { object.calls.push([method, ...args]); return proxy; };
  } });
  return proxy;
}

class ImageStub {
  constructor() { this.visible = true; }
  setDepth() { return this; }
  setMask() { return this; }
  setVisible(value) { this.visible = value; return this; }
  setPosition() { return this; }
  setTexture() { return this; }
  setDisplaySize() { return this; }
  setAlpha() { return this; }
  destroy() { this.destroyed = true; }
}

const graphics = [];
const frames = new Set();
const scene = {
  config: { tileSize: 94 },
  time: { now: 2200 },
  textures: {
    exists: () => true,
    get: () => ({ has: name => frames.has(name), add: name => frames.add(name) }),
  },
  add: {
    graphics: () => {
      const item = createGraphicsStub();
      graphics.push(item);
      return item;
    },
    image: () => new ImageStub(),
  },
};

const markedTileTypes = Object.keys(WORLD_VISUAL_FEEDBACK.resourceMarkers)
  .map(resourceKey => tileTypeByResource[resourceKey]);
const feedbackWorld = {
  getTileType: tx => markedTileTypes[tx] ?? TILE_TYPES.AIR,
  getSkyTileOriginalType: () => TILE_TYPES.COPPER,
  getTileHp: () => 100,
  getTileMaxHp: () => 100,
};
const feedbackLayer = new WorldVisualFeedbackLayer(
  scene,
  feedbackWorld,
  { id: "solid-mask" },
  WORLD_VISUAL_RUNTIME,
  WORLD_VISUAL_FEEDBACK
);
feedbackLayer.create();
feedbackLayer.sync({ left: 0, right: markedTileTypes.length, top: 0, bottom: 1 });
const feedbackPrimitiveMethods = new Set([
  "fillCircle", "fillTriangle", "fillEllipse", "lineTo", "strokePath", "strokeCircle",
]);
assert.equal(
  feedbackLayer.decals.calls.some(([method]) => feedbackPrimitiveMethods.has(method)),
  false,
  "generated semantics must suppress default procedural resource veins/nodules"
);
assert.equal(
  feedbackLayer.markerPool.some(image => image.visible),
  false,
  "generated semantics must suppress default resource emblem markers"
);

const skyWorld = {
  treasureRoomZones: [],
  hiddenCaveZones: [],
  glowCrystalZones: [],
  getTileType: () => TILE_TYPES.SKY_TILE,
  getSkyTileRarity: () => 3,
  getSkyTileOriginalType: () => TILE_TYPES.GOLD,
  getRootOverlayType: () => 0,
};
const effectLayer = new WorldVisualGameplayEffectLayer(scene, skyWorld, { id: "solid-mask" });
effectLayer.create();
effectLayer.sync({ left: 0, right: 1, top: 0, bottom: 1 });
effectLayer.updateSkyTileGlow({ tx: 0, ty: 0 }, 20);
assert.equal(effectLayer.skyTiles.length, 1, "star/sky tiles must remain discoverable in scenic mode");
assert.equal(
  effectLayer.skyGraphics.calls.some(([method]) => ["fillTriangle", "lineTo", "strokePath"].includes(method)),
  false,
  "the generated star tile must replace the primitive Phaser diamond"
);

feedbackLayer.destroy();
effectLayer.destroy();
console.log("Scenic terrain semantic assets contract passed: generated star, bedrock, and resources are raster-native; primitive fallbacks are rollback-only");
