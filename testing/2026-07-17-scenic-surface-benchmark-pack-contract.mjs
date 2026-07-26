import assert from "node:assert/strict";
import fs from "node:fs";
import {
  WORLD_VISUAL_SURFACE_PACKS,
  resolveWorldVisualSurfacePack,
} from "../values/worldVisualSurfacePacks.js";
import { UAL_NATIVE_PLAYER_ASSET_PROFILE } from "../values/ualNativePlayerAssetProfile.js";
import {
  WORLD_VISUAL_RUNTIME,
  getWorldVisualPreloadAssets,
} from "../values/worldVisualRuntime.js";
import { WORLD_VISUAL_SEMANTIC_ASSETS } from "../values/worldVisualSemanticAssets.js";
import {
  resolveSurfacePackBeautyGeometry,
} from "../world/rendering/scenic-world/WorldVisualSurfacePackView.js";
import {
  resolveTownFloorGeometry,
} from "../world/rendering/scenic-world/WorldVisualTownFloorView.js";

const pack = resolveWorldVisualSurfacePack(WORLD_VISUAL_SURFACE_PACKS, "");
assert.equal(pack.id, "town-benchmark-v1");
assert.equal(resolveWorldVisualSurfacePack(WORLD_VISUAL_SURFACE_PACKS, "?surfacePack=current-v2"), null);
assert.equal(
  resolveWorldVisualSurfacePack(WORLD_VISUAL_SURFACE_PACKS, "?surfacePack=benchmark")?.id,
  "town-benchmark-v1"
);

const tileSize = 94;
const beautyGeometry = resolveSurfacePackBeautyGeometry(
  pack,
  tileSize,
  UAL_NATIVE_PLAYER_ASSET_PROFILE,
);
assert.equal(UAL_NATIVE_PLAYER_ASSET_PROFILE.physicalHeightMeters, 1.75);
assert.equal(pack.beauty.scaleReference.targetDoorHeightMeters, 2.1);
assert.equal(pack.beauty.scaleReference.sourceDoorHeightPx, 75);
assert.ok(
  Math.abs(
    beautyGeometry.targetDoorHeightWorldPx
      - UAL_NATIVE_PLAYER_ASSET_PROFILE.targetVisibleHeightTiles
        * tileSize
        * pack.beauty.scaleReference.targetDoorHeightMeters
        / UAL_NATIVE_PLAYER_ASSET_PROFILE.physicalHeightMeters
  ) < 1e-9,
  "the rendered door height must derive from the shared 1.75 m player reference",
);
assert.ok(
  beautyGeometry.sourcePixelsPerWorldPixel >= pack.beauty.minSourcePixelsPerWorldPixel,
);
assert.ok(
  beautyGeometry.widthTiles > pack.worldAnchor.widthTiles,
  "physical door calibration must widen the baked village uniformly instead of distorting it",
);
assert.ok(
  beautyGeometry.sourcePixelsPerWorldPixel > 0.83
    && beautyGeometry.sourcePixelsPerWorldPixel < 0.832,
  "door-correct scaling must stay within the bounded 20.3% source enlargement",
);
assert.ok(
  beautyGeometry.widthTiles > 23 && beautyGeometry.widthTiles < 23.1,
  "the calibrated village should span roughly 23.05 world tiles",
);
const floorGeometry = resolveTownFloorGeometry(pack, beautyGeometry, tileSize, 65);
assert.equal(floorGeometry.width, beautyGeometry.width);
assert.ok(
  Math.abs(
    floorGeometry.sourcePixelsPerWorldPixel - beautyGeometry.sourcePixelsPerWorldPixel
  ) < 1e-9,
  "the exact floor and approved town must use the same uniform source scale",
);
assert.ok(
  floorGeometry.height / tileSize > 1.7 && floorGeometry.height / tileSize < 1.8,
  "the exact three-course facade must retain the approved mockup proportions",
);
assert.equal(pack.floor.expectedSource.width, pack.beauty.expectedSource.width);
assert.equal(pack.floor.expectedSource.height, 139);
assert.equal(pack.floor.sourceRect.width, pack.floor.expectedSource.width);
assert.equal(pack.floor.sourceRect.height, pack.floor.expectedSource.height);
assert.equal(pack.floor.approvedCoreSourceWidthPx, 1672);
assert.equal(pack.floor.handoffSourceWidthPx, 129);
assert.equal(
  pack.floor.approvedCoreSourceWidthPx + pack.floor.handoffSourceWidthPx,
  pack.floor.expectedSource.width,
);
assert.ok(pack.floor.depth > WORLD_VISUAL_SEMANTIC_ASSETS.render.specialBeautyDepth);
assert.ok(
  pack.floor.depth + pack.floor.effectDepthStep * 2
    < WORLD_VISUAL_RUNTIME.render.feedbackDepth,
  "the approved facade must hide overlapping terrain semantics but stay below damage feedback",
);
assert.equal(pack.beauty.sourceGroundY, 534);
assert.equal(pack.beauty.verticalReveal.topFeatherTiles, 0.75);
assert.ok(pack.beauty.verticalReveal.fullAlphaEdgeViewportFraction >= 0);
assert.ok(
  pack.beauty.verticalReveal.zeroAlphaEdgeViewportFraction
    > pack.beauty.verticalReveal.fullAlphaEdgeViewportFraction,
);
assert.equal(pack.ground.sourceCellPx, 94);
assert.equal(pack.ground.columns, pack.worldAnchor.widthTiles);
assert.equal(
  pack.transition?.fadeTiles,
  1,
  "the ground facade must retain its one-tile handoff",
);
assert.equal(pack.transition?.beautyFadeSourceWidthPx, 129);
assert.ok(
  Number.isInteger(pack.transition?.strips) && pack.transition.strips >= 8,
  "the final tile needs enough alpha steps to avoid a visible vertical hard edge",
);
assert.ok(
  pack.transition.strips <= pack.ground.sourceCellPx,
  "transition strips may not outnumber source pixels in the one-tile ground crop",
);
const exactBenchmarkSourceWidth = pack.beauty.expectedSource.width
  - pack.transition.beautyFadeSourceWidthPx;
assert.equal(
  exactBenchmarkSourceWidth,
  1672,
  "the beauty handoff must preserve the exact approved v1 benchmark before fading its mirror",
);

for (const configuredAsset of [pack.beauty.asset, pack.floor.asset, pack.ground.asset]) {
  const path = configuredAsset.path.split("?")[0];
  assert.equal(fs.existsSync(new URL(`../${path}`, import.meta.url)), true, path);
}

const benchmarkPreloadKeys = getWorldVisualPreloadAssets(WORLD_VISUAL_RUNTIME, "")
  .map(asset => asset.key);
assert.ok(benchmarkPreloadKeys.includes(pack.beauty.asset.key));
assert.ok(benchmarkPreloadKeys.includes(pack.floor.asset.key));
assert.ok(benchmarkPreloadKeys.includes(pack.ground.asset.key));
assert.ok(!benchmarkPreloadKeys.includes(WORLD_VISUAL_RUNTIME.assets.town.key));

const rollbackPreloadKeys = getWorldVisualPreloadAssets(
  WORLD_VISUAL_RUNTIME,
  "?surfacePack=current-v2"
).map(asset => asset.key);
assert.ok(rollbackPreloadKeys.includes(WORLD_VISUAL_RUNTIME.assets.town.key));
assert.ok(!rollbackPreloadKeys.includes(pack.beauty.asset.key));
assert.ok(!rollbackPreloadKeys.includes(pack.floor.asset.key));

const stageSource = fs.readFileSync(
  new URL("../world/rendering/scenic-world/WorldVisualSurfaceStage.js", import.meta.url),
  "utf8"
);
const packViewSource = fs.readFileSync(
  new URL("../world/rendering/scenic-world/WorldVisualSurfacePackView.js", import.meta.url),
  "utf8"
);
const floorViewSource = fs.readFileSync(
  new URL("../world/rendering/scenic-world/WorldVisualTownFloorView.js", import.meta.url),
  "utf8"
);
const runtimeSource = fs.readFileSync(
  new URL("../world/rendering/scenic-world/WorldVisualRuntime.js", import.meta.url),
  "utf8"
);
const lightingSource = fs.readFileSync(
  new URL("../world/rendering/scenic-world/WorldVisualLightingBridge.js", import.meta.url),
  "utf8"
);
assert.match(stageSource, /WorldVisualSurfacePackView/);
assert.doesNotMatch(stageSource, /_createCloudVeils|cloudVeil/);
assert.match(packViewSource, /setMask\(terrainMask\)/);
assert.match(packViewSource, /sourcePixelsPerWorldPixel/);
assert.match(packViewSource, /WorldVisualTownFloorView/);
assert.match(floorViewSource, /setMask\(terrainMask\)/);
assert.doesNotMatch(floorViewSource, /setTile|damageTile|setHp|save/);
assert.match(runtimeSource, /bindTerrainMask\(this\.materialField\.geometryMask\)/);
assert.match(lightingSource, /lightningFlashAmount/);
assert.match(lightingSource, /surfaceWetness/);
assert.match(lightingSource, /fogAmount/);

console.log("Scenic surface benchmark pack contract passed");
