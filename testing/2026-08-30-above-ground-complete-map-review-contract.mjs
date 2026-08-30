import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ASSET_KEYS } from "../values/assetKeys.js";
import { V11_POLISHED_SURFACE_RUNTIME_MANIFEST as BACKGROUNDS } from
  "../values/v11PolishedSurfaceRuntimeManifest.js";
import { WORLD_VISUAL_ABOVE_GROUND_COMPLETE_MAP_REVIEW as REVIEW } from
  "../values/worldVisualAboveGroundCompleteMapReview.js";
import {
  resolveWorldVisualSkyCells,
  WORLD_VISUAL_SKY_COHESION,
} from "../values/worldVisualSkyCohesion.js";
import {
  WORLD_VISUAL_PROP_ATLASES_V3,
  WORLD_VISUAL_SKY_PROP_ASSETS_V3,
  WORLD_VISUAL_SKY_PROP_PLACEMENTS_V3,
  WORLD_VISUAL_SURFACE_PROP_ASSETS_V3,
  WORLD_VISUAL_SURFACE_PROP_PLACEMENTS_V3,
} from "../values/generated/worldVisualPropLibraryV3/index.js";
import { WORLD_VISUAL_SURFACE_PROP_ASSETS } from
  "../values/worldVisualSurfacePropAssets.js";
import { WORLD_VISUAL_SURFACE_PROP_LAYOUT } from
  "../values/worldVisualSurfacePropLayout.js";
import {
  WORLD_VISUAL_SURFACE_HERO_LANDMARK_ASSETS,
  WORLD_VISUAL_SURFACE_HERO_LANDMARKS,
} from "../values/worldVisualSurfaceHeroLandmarks.js";
import {
  resolveWorldVisualSurfaceMotion,
  resolveWorldVisualSurfacePack,
  WORLD_VISUAL_SURFACE_PACKS,
} from "../values/worldVisualSurfacePacks.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const exists = async path => access(join(root, path.replace(/\?.*$/, "")));

assert.equal(REVIEW.reviewOnly, true);
assert.equal(REVIEW.productionChanged, false);
assert.equal(REVIEW.assetPolicy, "checked-in-runtime-assets-only");
assert.equal(
  REVIEW.backgroundPolicy,
  "production-scenic-surface-plus-sky-cohesion-and-v11-terrain",
);
assert.equal(REVIEW.surfaceFarDepth, -5.5);
assert.equal(REVIEW.skyFeatureDepth, -5.4);
assert.equal(REVIEW.skySurfaceBandAlpha, 0.86);
assert.equal(REVIEW.townVideoPolicy, "preserve-production-town-air-byte-for-byte");
assert.equal(REVIEW.map.leftTile, -40);
assert.equal(REVIEW.map.rightTileExclusive, 308);

assert.equal(BACKGROUNDS.objects.length, 90);
assert.equal(new Set(BACKGROUNDS.objects.map(item => item.id)).size, 90);
assert.equal(new Set(BACKGROUNDS.objects.map(item => item.path)).size, 90);
await Promise.all(BACKGROUNDS.objects.map(item => exists(item.path)));
for (const item of BACKGROUNDS.objects) {
  const left = (item.xPx + BACKGROUNDS.xOffsetPx) / REVIEW.tileSize;
  const right = left + item.widthPx / REVIEW.tileSize;
  assert(right > REVIEW.map.leftTile && left < REVIEW.map.rightTileExclusive);
}

const skyAssets = Object.values(WORLD_VISUAL_SKY_COHESION.assets);
const skyCells = resolveWorldVisualSkyCells(
  280,
  REVIEW.surfaceTileY,
  REVIEW.tileSize,
  WORLD_VISUAL_SKY_COHESION,
  "?skyComposition=ordered",
);
assert.equal(skyAssets.length, 20);
assert.equal(new Set(skyCells.map(cell => cell.asset.id)).size, 20);
await exists(WORLD_VISUAL_SKY_COHESION.foundation.asset.path);
await Promise.all(skyAssets.map(asset => exists(asset.path)));

const generatedAssets = [
  ...WORLD_VISUAL_SURFACE_PROP_ASSETS_V3,
  ...WORLD_VISUAL_SKY_PROP_ASSETS_V3,
];
const generatedPlacements = [
  ...WORLD_VISUAL_SURFACE_PROP_PLACEMENTS_V3,
  ...WORLD_VISUAL_SKY_PROP_PLACEMENTS_V3,
];
assert.equal(generatedAssets.length, 200);
assert.equal(generatedPlacements.length, 200);
assert.equal(new Set(generatedAssets.map(item => item.id)).size, 200);
assert.equal(new Set(generatedPlacements.map(item => item.assetId)).size, 200);
assert.deepEqual(
  new Set(generatedPlacements.map(item => item.assetId)),
  new Set(generatedAssets.map(item => item.id)),
);
assert.equal(WORLD_VISUAL_PROP_ATLASES_V3.length, 10);
await Promise.all(WORLD_VISUAL_PROP_ATLASES_V3.flatMap(atlas => [
  exists(atlas.path),
  exists(atlas.dataPath),
]));

assert.equal(WORLD_VISUAL_SURFACE_PROP_LAYOUT.placements.length, 46);
for (const item of WORLD_VISUAL_SURFACE_PROP_LAYOUT.placements) {
  assert(WORLD_VISUAL_SURFACE_PROP_ASSETS[item.level][item.assetId]);
  const runtime = ASSET_KEYS.environment.surfaceProps[item.level][item.assetId];
  assert(runtime);
  await exists(runtime.path);
}

assert.equal(WORLD_VISUAL_SURFACE_HERO_LANDMARKS.placements.length, 7);
for (const item of WORLD_VISUAL_SURFACE_HERO_LANDMARKS.placements) {
  const asset = WORLD_VISUAL_SURFACE_HERO_LANDMARK_ASSETS[item.assetId];
  assert(asset);
  await exists(asset.path);
}

const townPack = resolveWorldVisualSurfacePack(
  WORLD_VISUAL_SURFACE_PACKS,
  "?surfaceMotion=town-air",
);
const townMotion = resolveWorldVisualSurfaceMotion(townPack, "?surfaceMotion=town-air");
assert.equal(townPack.id, "town-benchmark-v1");
assert.equal(townMotion.id, "town-air");
assert.equal(
  townMotion.asset.path,
  "sprites/backgrounds/start-zone-scenic-v1/living-background-v1/surface-town-air-v1.mp4",
);
assert.deepEqual(townMotion.asset.dimensions, { width: 1800, height: 534 });
const videoPath = join(root, townMotion.asset.path);
const videoBytes = await readFile(videoPath);
const videoStat = await stat(videoPath);
const videoSha256 = createHash("sha256").update(videoBytes).digest("hex");

const harnessSource = await readFile(
  join(root, "testing/2026-08-30-above-ground-complete-map-runtime-mockup.js"),
  "utf8",
);
assert.match(harnessSource, /WorldBackgroundMasterSystem/);
assert.match(harnessSource, /WorldVisualSurfaceStage/);
assert.match(harnessSource, /WorldVisualSkyCohesionLayer/);
assert.match(harnessSource, /\?surfaceMotion=town-air/);
assert.doesNotMatch(harnessSource, /surface-soft-canopy|surface-layered-night|surface-natural-canopy/);

console.log(JSON.stringify({
  ok: true,
  backgrounds: BACKGROUNDS.objects.length,
  skyCohesionAssets: skyAssets.length,
  generatedSurfaceProps: WORLD_VISUAL_SURFACE_PROP_PLACEMENTS_V3.length,
  generatedSkyProps: WORLD_VISUAL_SKY_PROP_PLACEMENTS_V3.length,
  retainedPlacements: WORLD_VISUAL_SURFACE_PROP_LAYOUT.placements.length,
  heroLandmarks: WORLD_VISUAL_SURFACE_HERO_LANDMARKS.placements.length,
  townVideo: {
    id: townMotion.id,
    path: townMotion.asset.path,
    bytes: videoStat.size,
    sha256: videoSha256,
  },
}, null, 2));
