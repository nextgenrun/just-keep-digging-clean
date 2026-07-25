import assert from "node:assert/strict";
import fs from "node:fs";
import {
  WORLD_VISUAL_SURFACE_PACKS,
  resolveWorldVisualSurfacePack,
} from "../values/worldVisualSurfacePacks.js";
import {
  WORLD_VISUAL_RUNTIME,
  getWorldVisualPreloadAssets,
} from "../values/worldVisualRuntime.js";

const pack = resolveWorldVisualSurfacePack(WORLD_VISUAL_SURFACE_PACKS, "");
assert.equal(pack.id, "town-benchmark-v1");
assert.equal(resolveWorldVisualSurfacePack(WORLD_VISUAL_SURFACE_PACKS, "?surfacePack=current-v2"), null);
assert.equal(
  resolveWorldVisualSurfacePack(WORLD_VISUAL_SURFACE_PACKS, "?surfacePack=benchmark")?.id,
  "town-benchmark-v1"
);

const sourcePixelsPerWorldPixel = pack.beauty.expectedSource.width
  / (pack.worldAnchor.widthTiles * 94);
assert.ok(sourcePixelsPerWorldPixel >= pack.beauty.minSourcePixelsPerWorldPixel);
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
  "the authored mirrored final tile must be reserved for the edge crossfade",
);
assert.ok(
  Number.isInteger(pack.transition?.strips) && pack.transition.strips >= 8,
  "the final tile needs enough alpha steps to avoid a visible vertical hard edge",
);
assert.ok(
  pack.transition.strips <= pack.ground.sourceCellPx,
  "transition strips may not outnumber source pixels in the one-tile ground crop",
);
const opaqueWorldTiles = pack.worldAnchor.widthTiles - pack.transition.fadeTiles;
const exactBenchmarkSourceWidth = Math.floor(
  pack.beauty.expectedSource.width * opaqueWorldTiles / pack.worldAnchor.widthTiles,
);
assert.equal(
  exactBenchmarkSourceWidth,
  1672,
  "the opaque crop must preserve the exact approved v1 benchmark width",
);

for (const configuredAsset of [pack.beauty.asset, pack.ground.asset]) {
  const path = configuredAsset.path.split("?")[0];
  assert.equal(fs.existsSync(new URL(`../${path}`, import.meta.url)), true, path);
}

const benchmarkPreloadKeys = getWorldVisualPreloadAssets(WORLD_VISUAL_RUNTIME, "")
  .map(asset => asset.key);
assert.ok(benchmarkPreloadKeys.includes(pack.beauty.asset.key));
assert.ok(benchmarkPreloadKeys.includes(pack.ground.asset.key));
assert.ok(!benchmarkPreloadKeys.includes(WORLD_VISUAL_RUNTIME.assets.town.key));

const rollbackPreloadKeys = getWorldVisualPreloadAssets(
  WORLD_VISUAL_RUNTIME,
  "?surfacePack=current-v2"
).map(asset => asset.key);
assert.ok(rollbackPreloadKeys.includes(WORLD_VISUAL_RUNTIME.assets.town.key));
assert.ok(!rollbackPreloadKeys.includes(pack.beauty.asset.key));

const stageSource = fs.readFileSync(
  new URL("../world/rendering/scenic-world/WorldVisualSurfaceStage.js", import.meta.url),
  "utf8"
);
const packViewSource = fs.readFileSync(
  new URL("../world/rendering/scenic-world/WorldVisualSurfacePackView.js", import.meta.url),
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
assert.match(runtimeSource, /bindTerrainMask\(this\.materialField\.geometryMask\)/);
assert.match(lightingSource, /lightningFlashAmount/);
assert.match(lightingSource, /surfaceWetness/);
assert.match(lightingSource, /fogAmount/);

console.log("Scenic surface benchmark pack contract passed");
