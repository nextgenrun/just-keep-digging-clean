// Verifies landmark asset integrity, production scale, grounding, portal safety, and rollback resolution.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ASSET_KEYS,
  getSurfaceHeroLandmarkPreloadAssets,
} from "../values/assetKeys.js";
import { GAME_CONFIG } from "../values/gameConfig.js";
import { HUD_LAYOUT } from "../values/hudLayout.js";
import { UAL_NATIVE_PLAYER_ASSET_PROFILE } from
  "../values/ualNativePlayerAssetProfile.js";
import {
  WORLD_VISUAL_SURFACE_HERO_LANDMARK_ASSETS,
  WORLD_VISUAL_SURFACE_HERO_LANDMARKS,
  resolveWorldVisualSurfaceHeroLandmarkSuppression,
  resolveWorldVisualSurfaceHeroLandmarksEnabled,
} from "../values/worldVisualSurfaceHeroLandmarks.js";
import { WORLD_VISUAL_SURFACE_PROP_COMPOSITION_V3 } from
  "../values/worldVisualSurfacePropCompositionV3.js";
import { WORLD_VISUAL_SURFACE_PROP_LAYOUT } from
  "../values/worldVisualSurfacePropLayout.js";
import { WORLD_VISUAL_SURFACE_PROPS } from
  "../values/worldVisualSurfaceProps.js";
import { WorldModel } from "../world/model/WorldModel.js";
import {
  resolveSurfacePropDisplayGeometry,
  resolveSurfacePropGroundContact,
} from "../world/rendering/scenic-world/surfacePropGeometry.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST_PATH = path.join(
  ROOT,
  "sprites/environment/surface-hero-landmarks-v4/"
    + "2026-07-30-surface-hero-landmarks-v4-manifest.json",
);
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function readPngHeader(filePath) {
  const payload = fs.readFileSync(filePath);
  assert.deepEqual(
    [...payload.subarray(0, 8)],
    [137, 80, 78, 71, 13, 10, 26, 10],
    `${filePath} PNG signature`,
  );
  assert.equal(payload.subarray(12, 16).toString("ascii"), "IHDR");
  return {
    width: payload.readUInt32BE(16),
    height: payload.readUInt32BE(20),
    bitDepth: payload[24],
    colorType: payload[25],
  };
}

function geometryFor(assetId) {
  return resolveSurfacePropDisplayGeometry(
    WORLD_VISUAL_SURFACE_HERO_LANDMARK_ASSETS[assetId],
    GAME_CONFIG.tileSize,
    UAL_NATIVE_PLAYER_ASSET_PROFILE,
    1,
  );
}

function boundsFor(item) {
  const geometry = geometryFor(item.assetId);
  return {
    leftTile: item.tileX - geometry.widthTiles / 2,
    rightTile: item.tileX + geometry.widthTiles / 2,
  };
}

assert.equal(manifest.schema, "surface-hero-landmarks-v4-manifest@1");
assert.equal(manifest.staticTransforms, true);
assert.equal(manifest.runtimeMotion, false);
assert.equal(manifest.assets.length, 7);
assert.equal(Object.keys(WORLD_VISUAL_SURFACE_HERO_LANDMARK_ASSETS).length, 7);
assert.equal(WORLD_VISUAL_SURFACE_HERO_LANDMARKS.placements.length, 7);
assert.equal(
  new Set(WORLD_VISUAL_SURFACE_HERO_LANDMARKS.placements.map(item => item.chapterId)).size,
  7,
  "each Level 2 chapter must retain exactly one hero landmark",
);

for (const report of manifest.assets) {
  const definition = WORLD_VISUAL_SURFACE_HERO_LANDMARK_ASSETS[report.id];
  const runtimeAsset = ASSET_KEYS.environment.surfaceHeroLandmarksV4[report.id];
  assert.ok(definition, report.id);
  assert.equal(runtimeAsset, definition, `${report.id} must reuse the asset SSOT`);
  assert.equal(runtimeAsset.path, report.runtimePath);
  assert.deepEqual(definition.expectedSource, {
    width: report.width,
    height: report.height,
  });
  const filePath = path.join(ROOT, runtimeAsset.path);
  assert.equal(fs.existsSync(filePath), true, runtimeAsset.path);
  assert.equal(sha256(filePath), report.sha256);
  assert.deepEqual(readPngHeader(filePath), {
    width: report.width,
    height: report.height,
    bitDepth: 8,
    colorType: 6,
  });
  assert.equal(report.bottomTransparentPaddingPx, 2);
  const residualKey = report.keyColor === "magenta"
    ? "magentaResidualPixels"
    : "greenResidualPixels";
  assert.equal(report.alpha[residualKey], 0);
  assert.ok(report.alpha.transparentPixels > 0);
  assert.ok(report.alpha.partialAlphaPixels > 0);

  const geometry = geometryFor(report.id);
  assert.ok(
    geometry.sourcePixelsPerWorldPixel
      >= WORLD_VISUAL_SURFACE_HERO_LANDMARKS.scale.minimumSourcePixelsPerWorldPixel,
    `${report.id} must remain high resolution at production scale`,
  );
  assert.ok(
    definition.heightMeters
      >= UAL_NATIVE_PLAYER_ASSET_PROFILE.physicalHeightMeters * 3,
    `${report.id} must read as a real landmark`,
  );
  assert.ok(
    definition.heightMeters
      <= UAL_NATIVE_PLAYER_ASSET_PROFILE.physicalHeightMeters * 5,
    `${report.id} must not recreate the undersized-player mockup ratio`,
  );
  assert.ok(geometry.height / GAME_CONFIG.tileSize <= 4);
}

const starwellReport = manifest.assets.find(item => item.id === "starwellPortalFrame");
assert.equal(starwellReport.portalOpening.centerAlpha, 0);
assert.equal(starwellReport.portalOpening.transparentRatio, 1);

assert.deepEqual(
  resolveWorldVisualSurfaceHeroLandmarksEnabled(undefined, ""),
  {
    all: true,
    arrivalForgeShelter: true,
    caravanWaystation: true,
    starwellPortalFrame: true,
    timberwrightYard: true,
    observatoryTelescope: true,
    frontierSurveyPavilion: true,
    threeKingsOverlook: true,
  },
);
assert.deepEqual(
  resolveWorldVisualSurfaceHeroLandmarksEnabled(
    undefined,
    "?surfaceHeroLandmarksV4=0",
  ),
  {
    all: false,
    arrivalForgeShelter: false,
    caravanWaystation: false,
    starwellPortalFrame: false,
    timberwrightYard: false,
    observatoryTelescope: false,
    frontierSurveyPavilion: false,
    threeKingsOverlook: false,
  },
);
assert.equal(getSurfaceHeroLandmarkPreloadAssets().length, 7);
assert.equal(
  getSurfaceHeroLandmarkPreloadAssets(
    ASSET_KEYS,
    "?surfaceHeroLandmarksV4=0",
  ).length,
  0,
);
assert.equal(
  getSurfaceHeroLandmarkPreloadAssets(
    ASSET_KEYS,
    "?observatoryLandmarkV4=0",
  ).length,
  6,
);

const defaultSuppression = resolveWorldVisualSurfaceHeroLandmarkSuppression();
assert.deepEqual(defaultSuppression.retained, [
  "l2-155-forge",
  "l2-167-camp-kitchen",
  "l2-172-wagon",
  "l2-208-timber-gantry",
  "l2-230-observatory",
  "l2-248-survey",
  "l2-261-supplies",
  "l2-264-wagon",
]);
assert.deepEqual(defaultSuppression.expansion, [
  "surface-v3-authored-forge-scorched-brace",
  "surface-v3-authored-forge-cooling-trough",
  "surface-v3-authored-caravan-saddle-rack",
  "surface-v3-authored-caravan-cooking-tripod",
  "surface-v3-authored-caravan-water-keg",
  "surface-v3-authored-timber-workbench",
  "surface-v3-authored-timber-rope-spool",
  "surface-v3-authored-observatory-weather-vane",
  "surface-v3-authored-observatory-chart-table",
  "surface-v3-authored-observatory-weights",
  "surface-v3-authored-observatory-star-dial",
  "surface-v3-authored-frontier-irrigation",
  "surface-v3-authored-frontier-tripod",
  "surface-v3-authored-frontier-samples",
  "surface-v3-authored-far-east-map-cases",
  "surface-v3-authored-far-east-climbing-crate",
]);
assert.deepEqual(
  resolveWorldVisualSurfaceHeroLandmarkSuppression(
    undefined,
    "?surfaceHeroLandmarksV4=0",
  ),
  { retained: [], expansion: [] },
  "global rollback must restore every earlier prop placement",
);
assert.deepEqual(
  resolveWorldVisualSurfaceHeroLandmarkSuppression(
    undefined,
    "?observatoryLandmarkV4=0",
  ).retained,
  [
    "l2-155-forge",
    "l2-167-camp-kitchen",
    "l2-172-wagon",
    "l2-208-timber-gantry",
    "l2-248-survey",
    "l2-261-supplies",
    "l2-264-wagon",
  ],
);

const retainedIds = new Set(WORLD_VISUAL_SURFACE_PROP_LAYOUT.placements.map(item => item.id));
const expansionIds = new Set(
  WORLD_VISUAL_SURFACE_PROP_COMPOSITION_V3.placements.map(item => item.id),
);
assert.ok(defaultSuppression.retained.every(id => retainedIds.has(id)));
assert.ok(defaultSuppression.expansion.every(id => expansionIds.has(id)));

for (const item of WORLD_VISUAL_SURFACE_HERO_LANDMARKS.placements) {
  const asset = WORLD_VISUAL_SURFACE_HERO_LANDMARK_ASSETS[item.assetId];
  const profile = WORLD_VISUAL_SURFACE_HERO_LANDMARKS
    .distanceProfiles[item.distanceProfile];
  const bounds = boundsFor(item);
  assert.ok(profile.depth < HUD_LAYOUT.playerDepth);
  assert.equal(Math.round((1 - profile.alpha) * 100), profile.fadePercent);
  for (const zone of WORLD_VISUAL_SURFACE_PROP_LAYOUT.protectedClearZones) {
    if (zone.levels && !zone.levels.includes(item.level)) continue;
    if (bounds.rightTile <= zone.leftTile || bounds.leftTile >= zone.rightTile) continue;
    assert.equal(item.allowedProtectedZoneId, zone.id);
  }
  for (const zone of WORLD_VISUAL_SURFACE_PROP_LAYOUT.lowProfileZones) {
    if (zone.levels && !zone.levels.includes(item.level)) continue;
    if (bounds.rightTile <= zone.leftTile || bounds.leftTile >= zone.rightTile) continue;
    if (asset.heightMeters <= zone.maximumRenderedHeightMeters) continue;
    assert.equal(item.allowedLowProfileZoneId, zone.id);
    assert.ok(profile.depth < 6, "flight-lane landmark must remain behind rear props");
  }
}

const portalContract = WORLD_VISUAL_SURFACE_HERO_LANDMARKS.portalSafety;
const portalFrame = WORLD_VISUAL_SURFACE_HERO_LANDMARKS.placements
  .find(item => item.id === portalContract.landmarkId);
const portalBounds = boundsFor(portalFrame);
const portalProfile = WORLD_VISUAL_SURFACE_HERO_LANDMARKS
  .distanceProfiles[portalFrame.distanceProfile];
assert.equal(portalFrame.tileX, portalContract.centerTileX);
assert.ok(portalBounds.leftTile < portalContract.livePortalLeftTile);
assert.ok(portalBounds.rightTile > portalContract.livePortalRightTile);
assert.ok(portalProfile.depth < portalContract.livePortalRenderDepth);

const productionWorld = new WorldModel(GAME_CONFIG);
for (const item of WORLD_VISUAL_SURFACE_HERO_LANDMARKS.placements) {
  const contact = resolveSurfacePropGroundContact(
    productionWorld,
    item.tileX,
    geometryFor(item.assetId).widthTiles,
    GAME_CONFIG.topAirRows,
    WORLD_VISUAL_SURFACE_PROPS.grounding,
  );
  assert.equal(contact.valid, true, `${item.id}:${contact.reason || "unsupported"}`);
}

console.log(
  "Surface hero landmarks V4 assets, scale, grounding, portal safety, and rollback passed",
);
