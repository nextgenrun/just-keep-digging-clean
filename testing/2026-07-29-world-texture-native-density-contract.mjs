import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CAVE_LEVEL_CONFIG } from "../values/caveLevelConfig.js";
import { DEEP_WORLD_LIVING_BACKDROP } from "../values/deepWorldLivingBackdrop.js";
import { GAME_CONFIG } from "../values/gameConfig.js";
import { HEAVENBLOCKS_VISUAL_CONFIG } from "../values/heavenblocksVisualConfig.js";
import { LEVEL_ONE_LIVING_BACKDROP } from "../values/levelOneLivingBackdrop.js";
import { SKYLINE_WEATHER_VFX } from "../values/skylineWeatherVfx.js";
import {
  TITAN_DISCOVERY_CONFIG,
  resolveTitanChamberAsset,
} from "../values/titanDiscoveries.js";
import { UAL_NATIVE_PLAYER_ASSET_PROFILE } from "../values/ualNativePlayerAssetProfile.js";
import { WORLD_VISUAL_RUNTIME } from "../values/worldVisualRuntime.js";
import {
  WORLD_VISUAL_SURFACE_PACKS,
  resolveWorldVisualSurfacePack,
} from "../values/worldVisualSurfacePacks.js";
import {
  WORLD_VISUAL_UNDERGROUND_DETAILS,
} from "../values/worldVisualUndergroundDetails.js";
import {
  resolveNativeCaveBackdropLayout,
} from "../systems/visual/CaveLevelBackdropView.js";
import { fitTitanChamberScale } from "../systems/visual/titanChamberGeometry.js";
import {
  resolveSurfacePackBeautyGeometry,
} from "../world/rendering/scenic-world/WorldVisualSurfacePackView.js";
import { readWebpMetadata } from "./2026-07-28-webp-test-utils.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function assetPath(asset) {
  return path.join(ROOT, asset.path.split("?")[0]);
}

function readPngSize(filePath) {
  const bytes = fs.readFileSync(filePath);
  assert.equal(bytes.toString("ascii", 1, 4), "PNG", filePath);
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

function readImageSize(filePath) {
  return filePath.toLowerCase().endsWith(".webp")
    ? readWebpMetadata(filePath)
    : readPngSize(filePath);
}

const tileSize = GAME_CONFIG.tileSize;
const caveBackground = CAVE_LEVEL_CONFIG.presentation.background;
for (const pack of Object.values(CAVE_LEVEL_CONFIG.visualPacks)) {
  const size = readPngSize(path.join(ROOT, pack.assetPath));
  assert.deepEqual(
    [size.width, size.height],
    [caveBackground.expectedSourceWidthPx, caveBackground.expectedSourceHeightPx],
  );
}
const caveLayout = resolveNativeCaveBackdropLayout(
  CAVE_LEVEL_CONFIG.grid.widthTiles * tileSize,
  CAVE_LEVEL_CONFIG.grid.heightTiles * tileSize,
  caveBackground.expectedSourceWidthPx,
  caveBackground.expectedSourceHeightPx,
  caveBackground,
);
assert.ok(caveLayout.scale <= 1);
assert.equal(caveLayout.horizontal.positions[0], 0);
assert.equal(
  caveLayout.horizontal.positions.at(-1) + caveLayout.mainWidth,
  CAVE_LEVEL_CONFIG.grid.widthTiles * tileSize,
);
assert.ok(caveLayout.canopy.span >= caveLayout.mainTop);

for (const [asset, expected] of [
  [WORLD_VISUAL_RUNTIME.assets.far, [1672, 941]],
  [WORLD_VISUAL_RUNTIME.assets.town, [1672, 941]],
  [WORLD_VISUAL_RUNTIME.assets.surfaceEdge, [1672, 48]],
]) {
  const size = readImageSize(assetPath(asset));
  assert.deepEqual([size.width, size.height], expected, asset.path);
}
assert.equal(WORLD_VISUAL_RUNTIME.surface.farMaxSourceScale, 1);
assert.equal(WORLD_VISUAL_RUNTIME.surface.townMaxSourceScale, 1);
assert.equal(WORLD_VISUAL_RUNTIME.surface.edgeMaxSourceScale, 1);
const surfaceVariation = WORLD_VISUAL_RUNTIME.surface.surfaceGroundVariation;
assert.equal(surfaceVariation.maxSourceScale, 1);
assert.equal(
  surfaceVariation.stridePx,
  surfaceVariation.expectedSourceWidthPx - surfaceVariation.overlapPx,
);
for (const asset of surfaceVariation.assets) {
  const size = readImageSize(assetPath(asset));
  assert.deepEqual(
    [size.width, size.height],
    [surfaceVariation.expectedSourceWidthPx, surfaceVariation.expectedSourceHeightPx],
    asset.path,
  );
}

const surfacePack = resolveWorldVisualSurfacePack(WORLD_VISUAL_SURFACE_PACKS, "");
const surfaceGeometry = resolveSurfacePackBeautyGeometry(
  surfacePack,
  tileSize,
  UAL_NATIVE_PLAYER_ASSET_PROFILE,
);
assert.equal(surfaceGeometry.sourcePixelsPerWorldPixel, 1);
assert.equal(surfaceGeometry.width, surfacePack.beauty.expectedSource.width);
assert.equal(surfacePack.floor.minSourcePixelsPerWorldPixel, 1);

assert.equal(WORLD_VISUAL_UNDERGROUND_DETAILS.atlas.frameWidthPx, 320);
assert.equal(WORLD_VISUAL_UNDERGROUND_DETAILS.atlas.frameHeightPx, 256);
for (const value of [
  WORLD_VISUAL_UNDERGROUND_DETAILS.textures.maxSourceScale,
  WORLD_VISUAL_UNDERGROUND_DETAILS.props.maxSourceScale,
  WORLD_VISUAL_UNDERGROUND_DETAILS.props.largeMaxSourceScale,
]) {
  assert.ok(value <= 1, "underground atlas frame scale exceeds native density");
}

assert.equal(HEAVENBLOCKS_VISUAL_CONFIG.maxSourceScale, 1);
for (const region of HEAVENBLOCKS_VISUAL_CONFIG.regions) {
  for (const layer of region.layers) {
    const size = readPngSize(path.join(ROOT, layer.path));
    assert.deepEqual(
      [size.width, size.height],
      [region.sourceWidthPx, region.sourceHeightPx],
    );
    const scale = Math.min(
      region.displayWidthPx * layer.overscan / size.width,
      region.displayHeightPx * layer.overscan / size.height,
      HEAVENBLOCKS_VISUAL_CONFIG.maxSourceScale,
    );
    assert.ok(scale <= 1);
  }
}

assert.equal(TITAN_DISCOVERY_CONFIG.density.maxSourceScale, 1);
for (const definition of TITAN_DISCOVERY_CONFIG.definitions) {
  const chamber = readWebpMetadata(
    path.join(ROOT, resolveTitanChamberAsset(definition).path),
  );
  const stance = readWebpMetadata(path.join(ROOT, definition.surfaceAsset.path));
  const chamberScale = fitTitanChamberScale(
    chamber,
    definition.zoneWidthTiles * tileSize * TITAN_DISCOVERY_CONFIG.backdrop.fitFraction,
    definition.zoneHeightTiles * tileSize * TITAN_DISCOVERY_CONFIG.backdrop.fitFraction,
    TITAN_DISCOVERY_CONFIG.density.maxSourceScale,
  );
  const stanceScale = fitTitanChamberScale(
    stance,
    definition.zoneWidthTiles * tileSize * TITAN_DISCOVERY_CONFIG.underground.titanFitFraction,
    definition.zoneHeightTiles * tileSize * TITAN_DISCOVERY_CONFIG.underground.titanFitFraction,
    TITAN_DISCOVERY_CONFIG.density.maxSourceScale,
  );
  assert.ok(chamberScale <= 1, `${definition.id} chamber enlarged`);
  assert.ok(stanceScale <= 1, `${definition.id} stance enlarged`);
}

for (const [file, expected] of [
  ["level1-platform.webp", [1504, 564]],
  ["level1-eclipse-gate.webp", [188, 188]],
  ["level2-platform.webp", [1504, 564]],
  ["level2-eclipse-gate.webp", [188, 188]],
]) {
  const size = readWebpMetadata(path.join(
    ROOT,
    "sprites/backgrounds/world-v11-sky-islands-v1",
    file,
  ));
  assert.deepEqual([size.width, size.height], expected, file);
}

const atmosphere = readWebpMetadata(path.join(
  ROOT,
  SKYLINE_WEATHER_VFX.assetBasePath,
  SKYLINE_WEATHER_VFX.sheets.atmosphere.file,
));
const atmosphereFrameWidth = Math.floor(atmosphere.width / 4);
const atmosphereFrameHeight = Math.floor(atmosphere.height / 3);
for (const config of [LEVEL_ONE_LIVING_BACKDROP, DEEP_WORLD_LIVING_BACKDROP]) {
  for (const layer of Object.values(config.layers)) {
    const maximumWidth = layer.widthTiles.max * tileSize * (1 + layer.scalePulse);
    const maximumHeight = layer.heightTiles.max * tileSize / (1 - layer.scalePulse);
    assert.ok(maximumWidth <= atmosphereFrameWidth, "living backdrop width enlarged");
    assert.ok(maximumHeight <= atmosphereFrameHeight, "living backdrop height enlarged");
  }
}

console.log("world texture native-density contract passed");
