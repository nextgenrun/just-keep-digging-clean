import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { GAME_CONFIG } from "../values/gameConfig.js";
import { WORLD_DEPTH_CONFIG } from "../values/worldDepthConfig.js";
import { TILED_WORLD_OVERRIDE } from "../values/tiledWorldOverrideData.js";
import { V11_POLISHED_SURFACE_RUNTIME_MANIFEST } from "../values/v11PolishedSurfaceRuntimeManifest.js";
import { V11_DEPTH_BACKGROUND_RUNTIME_MANIFEST } from "../values/v11DepthBackgroundRuntimeManifest.js";
import {
  WORLD_BACKGROUND_MASTER_TEST,
  resolveWorldBackgroundMasterEnabled,
} from "../values/worldBackgroundMasterTest.js";

const EXPECTED_SOURCE = "exports/dig-game-world-edit-v-11-08-07-2026-;1-img-test-saved-before-runtime-wire.tmx";
const { width, height, crop } = TILED_WORLD_OVERRIDE;

assert.equal(TILED_WORLD_OVERRIDE.enabled, true);
assert.equal(TILED_WORLD_OVERRIDE.source, EXPECTED_SOURCE);
assert.deepEqual(crop, { x: 40, y: 40, width: 280, height: 2000 });
assert.equal(GAME_CONFIG.worldWidthTiles, width);
assert.equal(height, WORLD_DEPTH_CONFIG.levelOneRuntimeDepthTiles);
assert.equal(GAME_CONFIG.worldDepthTiles, WORLD_DEPTH_CONFIG.worldDepthTiles);
assert.ok(GAME_CONFIG.worldDepthTiles >= height);
assert.equal(GAME_CONFIG.worldWidthPx, width * GAME_CONFIG.tileSize);
assert.equal(GAME_CONFIG.worldDepthPx, WORLD_DEPTH_CONFIG.worldDepthTiles * GAME_CONFIG.tileSize);

const runtimeCrop = (manifest) => ({
  left: manifest.runtimeCrop.sourceLeftTile + manifest.xOffsetTiles,
  top: manifest.runtimeCrop.sourceTopTile + manifest.yOffsetTiles,
  right: manifest.runtimeCrop.sourceRightTileExclusive + manifest.xOffsetTiles,
  bottom: manifest.runtimeCrop.sourceBottomTileExclusive + manifest.yOffsetTiles,
});
const expectedRuntimeCrop = { left: 0, top: 0, right: width, bottom: height };
assert.deepEqual(runtimeCrop(V11_POLISHED_SURFACE_RUNTIME_MANIFEST), expectedRuntimeCrop);
assert.deepEqual(runtimeCrop(V11_DEPTH_BACKGROUND_RUNTIME_MANIFEST), expectedRuntimeCrop);
assert.equal(V11_POLISHED_SURFACE_RUNTIME_MANIFEST.sourceMap, EXPECTED_SOURCE);
assert.equal(
  V11_POLISHED_SURFACE_RUNTIME_MANIFEST.sourceTmxSha256,
  TILED_WORLD_OVERRIDE.sourceSha256,
  "surface art and runtime tiles must come from the same saved TMX revision",
);

assert.equal(V11_DEPTH_BACKGROUND_RUNTIME_MANIFEST.futureLevel2Active, false);
assert.equal(WORLD_BACKGROUND_MASTER_TEST.enabled, true);
assert.equal(WORLD_BACKGROUND_MASTER_TEST.depthEnabled, true);
assert.equal(WORLD_BACKGROUND_MASTER_TEST.universeSkyEnabled, true);
assert.equal(WORLD_BACKGROUND_MASTER_TEST.runtimeCropFill.enabled, true);
assert.equal(WORLD_BACKGROUND_MASTER_TEST.suppressLegacyAuthoredObjectsWhenEnabled, true);
assert.equal(resolveWorldBackgroundMasterEnabled(WORLD_BACKGROUND_MASTER_TEST, ""), true);
assert.equal(resolveWorldBackgroundMasterEnabled(WORLD_BACKGROUND_MASTER_TEST, "?worldMaster=0"), false);

const covered = new Uint8Array(width * height);
const activeDepthObjects = V11_DEPTH_BACKGROUND_RUNTIME_MANIFEST.objects.filter((entry) => entry.active !== false);
assert.deepEqual(
  [...new Set(activeDepthObjects.map((entry) => entry.level))].sort(),
  ["level1", "level2"],
  "only the two new levels may own active depth art",
);
for (const entry of activeDepthObjects) {
  const left = Math.max(0, entry.xTile + V11_DEPTH_BACKGROUND_RUNTIME_MANIFEST.xOffsetTiles);
  const top = Math.max(0, entry.yTile + V11_DEPTH_BACKGROUND_RUNTIME_MANIFEST.yOffsetTiles);
  const right = Math.min(width, left + entry.widthTiles);
  const bottom = Math.min(height, top + entry.heightTiles);
  for (let y = top; y < bottom; y += 1) {
    covered.fill(1, y * width + left, y * width + right);
  }
}

for (let y = GAME_CONFIG.topAirRows; y < height; y += 1) {
  for (let x = 1; x < width; x += 1) {
    assert.equal(covered[y * width + x], 1, `missing detailed depth art at runtime tile ${x},${y}`);
  }
}

const setupSource = await readFile(new URL("../world/playScene/PlaySceneSetup.js", import.meta.url), "utf8");
assert.match(setupSource, /v11 master active; skipped legacy v7 background objects/);
assert.match(setupSource, /suppressLegacyAuthoredObjectsWhenEnabled/);

console.log(
  `v11 two-level world coverage passed: ${width}x${height}, `
  + `${activeDepthObjects.length} active Level 1/Level 2 depth chunks, no legacy v7 mix`,
);
