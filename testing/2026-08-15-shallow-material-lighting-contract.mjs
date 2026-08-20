import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  WORLD_VISUAL_DEPTH_BACKDROPS,
  resolveWorldVisualDepthBackdropRegionAssets,
  resolveWorldVisualShallowMaterialLightingEnabled,
} from "../values/worldVisualDepthBackdrops.js";
import { FIRE_LIGHT_PRESENTATION_CONFIG } from "../values/fireLightPresentation.js";
import {
  SHADER_CONFIG,
  isDarknessLightEnabled,
} from "../values/shaderConfig.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const surfaceEntry = WORLD_VISUAL_DEPTH_BACKDROPS.regions.find(
  region => region.id === "surface-entry"
);

assert.equal(FIRE_LIGHT_PRESENTATION_CONFIG.defaultProfile, "natural");
assert.equal(SHADER_CONFIG.layers.materialResponse.enabled, false);
assert.equal(isDarknessLightEnabled("?darknessLight=0"), false);
assert.equal(isDarknessLightEnabled(""), true);
assert.equal(resolveWorldVisualShallowMaterialLightingEnabled(
  WORLD_VISUAL_DEPTH_BACKDROPS,
  "?shallowMaterialLighting=0"
), false);
assert.equal(resolveWorldVisualShallowMaterialLightingEnabled(
  WORLD_VISUAL_DEPTH_BACKDROPS,
  "?shallowMaterialLighting=1"
), true);

const beforeAssets = resolveWorldVisualDepthBackdropRegionAssets(
  surfaceEntry,
  WORLD_VISUAL_DEPTH_BACKDROPS,
  "?shallowMaterialLighting=0"
);
const afterAssets = resolveWorldVisualDepthBackdropRegionAssets(
  surfaceEntry,
  WORLD_VISUAL_DEPTH_BACKDROPS,
  "?shallowMaterialLighting=1"
);
assert.equal(beforeAssets.length, afterAssets.length);
assert.ok(beforeAssets.every(asset => !asset.path.includes("material-diffuse-v1")));
assert.deepEqual(
  afterAssets.map(asset => asset.path),
  beforeAssets.map(asset => asset.path),
  "The lighting toggle must not replace any diffuse texture"
);
const litAssets = afterAssets.filter(asset => asset.type === "image");
assert.equal(litAssets.length, 13);
assert.ok(litAssets.every(asset => !asset.path.includes("material-diffuse-v1")));
assert.ok(litAssets.every(asset => asset.normalMapPath?.includes("material-normal-v1")));
assert.equal(afterAssets.filter(asset => asset.type === "video").length, 1);

for (const asset of litAssets) {
  await access(path.join(root, asset.path.split("?")[0]));
  await access(path.join(root, asset.normalMapPath.split("?")[0]));
}

const assetCacheSource = await readFile(
  path.join(root, "world/rendering/scenic-world/WorldVisualAssetCache.js"),
  "utf8"
);
const regionViewSource = await readFile(
  path.join(root, "world/rendering/scenic-world/WorldVisualDepthBackdropRegionView.js"),
  "utf8"
);
const stageSource = await readFile(
  path.join(root, "world/rendering/scenic-world/WorldVisualDepthBackdropStage.js"),
  "utf8"
);
assert.match(assetCacheSource, /asset\.normalMapPath \? \[asset\.path, asset\.normalMapPath\]/);
assert.match(regionViewSource, /setPipeline\?\.\("Light2D"\)/);
assert.match(stageSource, /lights\.enable\(\)\.setAmbientColor/);
assert.match(stageSource, /warmPlayerLight/);
assert.match(stageSource, /coolFill/);

console.log("shallow material lighting contract: ok");
