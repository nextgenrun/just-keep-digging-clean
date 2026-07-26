import assert from "node:assert/strict";
import fs from "node:fs";
import { ASSET_KEYS, getSurfacePropPreloadAssets } from "../values/assetKeys.js";
import { GAME_CONFIG } from "../values/gameConfig.js";
import { UAL_NATIVE_PLAYER_ASSET_PROFILE } from "../values/ualNativePlayerAssetProfile.js";
import { WORLD_VISUAL_SURFACE_PROP_ASSETS } from "../values/worldVisualSurfacePropAssets.js";
import { WORLD_VISUAL_SURFACE_PROP_LAYOUT } from "../values/worldVisualSurfacePropLayout.js";
import {
  WORLD_VISUAL_SURFACE_PROPS,
  resolveWorldVisualSurfacePropsEnabled,
} from "../values/worldVisualSurfaceProps.js";
import { WORLD_VISUAL_SURFACE_PACKS } from "../values/worldVisualSurfacePacks.js";
import { WorldModel } from "../world/model/WorldModel.js";
import { WorldVisualSurfacePropLayer } from "../world/rendering/scenic-world/WorldVisualSurfacePropLayer.js";
import {
  auditSurfacePropCoverage,
  resolveSurfacePropDisplayGeometry,
  resolveSurfacePropGroundContact,
} from "../world/rendering/scenic-world/surfacePropGeometry.js";

function readVp8xMetadata(fileUrl) {
  const buffer = fs.readFileSync(fileUrl);
  assert.equal(buffer.toString("ascii", 0, 4), "RIFF");
  assert.equal(buffer.toString("ascii", 8, 12), "WEBP");
  let offset = 12;
  let metadata = null;
  let hasAlphaChunk = false;
  while (offset + 8 <= buffer.length) {
    const type = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const payload = offset + 8;
    if (type === "VP8X") {
      metadata = {
        encoding: "VP8X",
        hasAlphaFlag: Boolean(buffer[payload] & 0x10),
        width: 1 + buffer.readUIntLE(payload + 4, 3),
        height: 1 + buffer.readUIntLE(payload + 7, 3),
      };
    }
    if (type === "VP8L") {
      assert.equal(buffer[payload], 0x2f, `${fileUrl.pathname} lossless signature`);
      const bits = buffer.readUInt32LE(payload + 1);
      metadata = {
        encoding: "VP8L",
        hasAlphaFlag: Boolean(bits & (1 << 28)),
        width: 1 + (bits & 0x3fff),
        height: 1 + ((bits >>> 14) & 0x3fff),
      };
    }
    if (type === "ALPH") hasAlphaChunk = true;
    offset = payload + size + (size % 2);
  }
  assert.ok(metadata, `${fileUrl.pathname} must use a supported WebP canvas`);
  return { ...metadata, hasAlphaChunk };
}

function createSceneStub() {
  const sprites = [];
  const dimensionsByKey = new Map(
    Object.entries(WORLD_VISUAL_SURFACE_PROP_ASSETS).flatMap(([level, assets]) => (
      Object.entries(assets).map(([assetId, definition]) => [
        ASSET_KEYS.environment.surfaceProps[level][assetId].key,
        definition.expectedSource,
      ])
    )),
  );
  const makeSprite = (x, y, key) => {
    const sprite = {
      x,
      y,
      key,
      destroyed: false,
      setOrigin() { return this; },
      setDepth(value) { this.depth = value; return this; },
      setDisplaySize(width, height) { this.displayWidth = width; this.displayHeight = height; return this; },
      setAlpha(value) { this.alpha = value; return this; },
      setFlipX(value) { this.flipX = value; return this; },
      setScrollFactor(value) { this.scrollFactor = value; return this; },
      setData(name, value) { this[name] = value; return this; },
      setTint(value) { this.tint = value; return this; },
      destroy() { this.destroyed = true; },
    };
    sprites.push(sprite);
    return sprite;
  };
  return {
    config: GAME_CONFIG,
    time: { now: 1234 },
    textures: {
      get(key) {
        const size = dimensionsByKey.get(key);
        return size ? { getSourceImage: () => size } : null;
      },
    },
    add: { image: makeSprite },
    sprites,
  };
}

const preloadAssets = getSurfacePropPreloadAssets();
assert.equal(preloadAssets.length, 18);
assert.equal(new Set(preloadAssets.map(asset => asset.key)).size, 18);
assert.equal(new Set(preloadAssets.map(asset => asset.path)).size, 18);

for (const [level, assets] of Object.entries(WORLD_VISUAL_SURFACE_PROP_ASSETS)) {
  for (const [assetId, definition] of Object.entries(assets)) {
    const runtimeAsset = ASSET_KEYS.environment.surfaceProps[level][assetId];
    const fileUrl = new URL(`../${runtimeAsset.path}`, import.meta.url);
    assert.equal(fs.existsSync(fileUrl), true, runtimeAsset.path);
    const metadata = readVp8xMetadata(fileUrl);
    assert.deepEqual(
      { width: metadata.width, height: metadata.height },
      definition.expectedSource,
      `${runtimeAsset.path} dimensions`,
    );
    assert.equal(metadata.hasAlphaFlag, true, `${runtimeAsset.path} alpha flag`);
    assert.equal(
      metadata.encoding === "VP8L" || metadata.hasAlphaChunk,
      true,
      `${runtimeAsset.path} alpha encoding`,
    );
    const geometry = resolveSurfacePropDisplayGeometry(
      definition,
      GAME_CONFIG.tileSize,
      UAL_NATIVE_PLAYER_ASSET_PROFILE,
    );
    assert.ok(
      geometry.sourcePixelsPerWorldPixel
        >= WORLD_VISUAL_SURFACE_PROPS.scale.minimumSourcePixelsPerWorldPixel,
      `${runtimeAsset.path} must retain high-resolution source density`,
    );
  }
}

assert.equal(UAL_NATIVE_PLAYER_ASSET_PROFILE.physicalHeightMeters, 1.75);
assert.equal(UAL_NATIVE_PLAYER_ASSET_PROFILE.targetVisibleHeightTiles, 0.8);
assert.equal(
  WORLD_VISUAL_SURFACE_PACKS.packs[
    WORLD_VISUAL_SURFACE_PACKS.defaultPackId
  ].beauty.scaleReference.targetDoorHeightMeters,
  2.1,
  "the approved village door must remain theoretically enterable",
);
for (const assets of Object.values(WORLD_VISUAL_SURFACE_PROP_ASSETS)) {
  assert.ok(
    assets.pergola.clearOpeningMeters >= 2.2,
    "walk-through prop openings must clear the 1.75 m player",
  );
}

const placements = WORLD_VISUAL_SURFACE_PROP_LAYOUT.placements;
assert.equal(placements.length, 68);
assert.equal(new Set(placements.map(item => item.id)).size, placements.length);
for (const item of placements) {
  assert.ok(WORLD_VISUAL_SURFACE_PROP_ASSETS[item.level]?.[item.assetId], item.id);
  assert.ok(ASSET_KEYS.environment.surfaceProps[item.level]?.[item.assetId], item.id);
  assert.deepEqual(
    Object.keys(item).sort(),
    ["assetId", "flipX", "id", "lane", "level", "tileX"].sort(),
    `${item.id} may not carry an arbitrary scale override`,
  );
  const blocked = WORLD_VISUAL_SURFACE_PROP_LAYOUT.protectedClearZones.find(zone => (
    item.tileX >= zone.leftTile && item.tileX <= zone.rightTile
  ));
  assert.equal(blocked, undefined, `${item.id} must preserve interaction clearance`);
}

const coverage = auditSurfacePropCoverage(
  WORLD_VISUAL_SURFACE_PROP_LAYOUT,
  WORLD_VISUAL_SURFACE_PROP_ASSETS,
);
assert.equal(coverage.length, 2);
for (const report of coverage) {
  assert.ok(
    report.maximumGapTiles <= WORLD_VISUAL_SURFACE_PROPS.coverage.maximumUncoveredGapTiles,
    `${report.id} has a ${report.maximumGapTiles.toFixed(2)}-tile dead visual gap`,
  );
}

const productionWorld = new WorldModel(GAME_CONFIG);
const unsupportedProductionPlacements = placements.flatMap(item => {
  const geometry = resolveSurfacePropDisplayGeometry(
    WORLD_VISUAL_SURFACE_PROP_ASSETS[item.level][item.assetId],
    GAME_CONFIG.tileSize,
    UAL_NATIVE_PLAYER_ASSET_PROFILE,
  );
  const contact = resolveSurfacePropGroundContact(
    productionWorld,
    item.tileX,
    geometry.widthTiles,
    GAME_CONFIG.topAirRows,
    WORLD_VISUAL_SURFACE_PROPS.grounding,
  );
  return contact.valid ? [] : [`${item.id}:${contact.reason}`];
});
assert.deepEqual(
  unsupportedProductionPlacements,
  [],
  "every authored prop must have exact support in the deterministic production world",
);

assert.deepEqual(
  resolveWorldVisualSurfacePropsEnabled(WORLD_VISUAL_SURFACE_PROPS, ""),
  { all: true, level1: true, level2: true },
);
assert.deepEqual(
  resolveWorldVisualSurfacePropsEnabled(WORLD_VISUAL_SURFACE_PROPS, "?surfaceProps=0"),
  { all: false, level1: false, level2: false },
);
assert.deepEqual(
  resolveWorldVisualSurfacePropsEnabled(WORLD_VISUAL_SURFACE_PROPS, "?surfacePropsL1=0"),
  { all: true, level1: false, level2: true },
);
assert.deepEqual(
  resolveWorldVisualSurfacePropsEnabled(WORLD_VISUAL_SURFACE_PROPS, "?surfacePropsL2=0"),
  { all: true, level1: true, level2: false },
);

const flatWorld = {
  tileSize: GAME_CONFIG.tileSize,
  isSolid: (_tx, ty) => ty >= GAME_CONFIG.topAirRows,
};
const sampleGeometry = resolveSurfacePropDisplayGeometry(
  WORLD_VISUAL_SURFACE_PROP_ASSETS.level1.wagon,
  GAME_CONFIG.tileSize,
  UAL_NATIVE_PLAYER_ASSET_PROFILE,
);
const flatContact = resolveSurfacePropGroundContact(
  flatWorld,
  58.1,
  sampleGeometry.widthTiles,
  GAME_CONFIG.topAirRows,
  WORLD_VISUAL_SURFACE_PROPS.grounding,
);
assert.deepEqual(flatContact, {
  valid: true,
  y: GAME_CONFIG.topAirRows * GAME_CONFIG.tileSize
    + WORLD_VISUAL_SURFACE_PROPS.grounding.groundSinkWorldPx,
});

const splitWorld = {
  tileSize: GAME_CONFIG.tileSize,
  isSolid: (tx, ty) => ty >= GAME_CONFIG.topAirRows + (tx >= 10 ? 1 : 0),
};
assert.equal(
  resolveSurfacePropGroundContact(
    splitWorld,
    10,
    2,
    GAME_CONFIG.topAirRows,
    WORLD_VISUAL_SURFACE_PROPS.grounding,
  ).reason,
  "uneven-support",
);

const scene = createSceneStub();
const layer = new WorldVisualSurfacePropLayer(scene, flatWorld);
assert.equal(layer.create(""), true);
assert.equal(layer.sync({ left: 22, right: 44, top: 58, bottom: 70 }, { terrainTint: 0xbadbee }), true);
assert.ok(layer.active.size > 0);
for (const sprite of layer.active.values()) {
  assert.equal(sprite.y, flatContact.y);
  assert.equal(sprite.tint, 0xbadbee);
  assert.equal(sprite.scrollFactor, 1);
  assert.equal(sprite.destroyed, false);
}
assert.equal(layer.sync({ left: 22, right: 44, top: 80, bottom: 100 }, { terrainTint: 0xffffff }), false);
assert.equal(layer.active.size, 0, "surface props must be removed while the camera is underground");
layer.destroy();
assert.equal(globalThis.__jkdSurfaceProps, undefined);

const layerSource = fs.readFileSync(
  new URL("../world/rendering/scenic-world/WorldVisualSurfacePropLayer.js", import.meta.url),
  "utf8",
);
const runtimeSource = fs.readFileSync(
  new URL("../world/rendering/scenic-world/WorldVisualRuntime.js", import.meta.url),
  "utf8",
);
const bootSource = fs.readFileSync(
  new URL("../ui/scenes/BootScene.js", import.meta.url),
  "utf8",
);
const e2eSource = fs.readFileSync(
  new URL("./JkdE2EHarness.js", import.meta.url),
  "utf8",
);
assert.doesNotMatch(layerSource, /Math\.random|setScale|setInteractive|physics|save|localStorage/);
assert.match(layerSource, /setOrigin\(0\.5, 1\)/);
assert.match(layerSource, /resolveSurfacePropGroundContact/);
assert.match(runtimeSource, /this\.surfacePropLayer = new WorldVisualSurfacePropLayer/);
assert.match(runtimeSource, /this\.surfacePropLayer\?\.sync/);
assert.match(runtimeSource, /this\.surfacePropLayer\?\.destroy/);
assert.match(bootSource, /\.\.\.getSurfacePropPreloadAssets\(\)/);
assert.match(e2eSource, /SURFACE_PROP_PREVIEW_TILES/);
assert.match(e2eSource, /event\.ctrlKey && event\.altKey/);

console.log("Surface props scale, modularity, grounding, coverage, and rollback contract passed");
