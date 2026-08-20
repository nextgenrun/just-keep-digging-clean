import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  FULL_WORLD_MATERIAL_CONFIG,
  isFullWorldMaterialReviewEnabled,
  resolveFullWorldMaterialDepthBlend,
} from "../values/fullWorldMaterialConfig.js";

const read = relativePath => readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");

assert.equal(isFullWorldMaterialReviewEnabled(""), false, "production default must stay off");
assert.equal(isFullWorldMaterialReviewEnabled("?fullWorldMaterials=0"), false);
assert.equal(isFullWorldMaterialReviewEnabled("?fullWorldMaterials=1"), true);

const surface = resolveFullWorldMaterialDepthBlend(0);
const shallow = resolveFullWorldMaterialDepthBlend(140);
const deep = resolveFullWorldMaterialDepthBlend(700);
assert.deepEqual(surface, { shallow: 0, deep: 0 });
assert.ok(shallow.shallow > 0 && shallow.shallow < 1);
assert.ok(deep.shallow === 1 && deep.deep > 0 && deep.deep < 1);
assert.ok(FULL_WORLD_MATERIAL_CONFIG.profiles.deep.sharpness
  > FULL_WORLD_MATERIAL_CONFIG.profiles.surface.sharpness);
assert.ok(FULL_WORLD_MATERIAL_CONFIG.relief.ceiling <= 0.1, "relief must remain bounded");
assert.ok(FULL_WORLD_MATERIAL_CONFIG.tone.highlightCompression <= 0.03);

const [pipeline, shader, system, setup, lifecycle, comparison] = await Promise.all([
  read("systems/visual/FullWorldMaterialPipeline.js"),
  read("systems/visual/fullWorldMaterialShader.js"),
  read("systems/visual/FullWorldMaterialSystem.js"),
  read("world/playScene/PlaySceneSetup.js"),
  read("world/playScene/PlaySceneLifecycle.js"),
  read("values/carriedLightLiveComparison.js"),
]);

assert.match(pipeline, /extends Phaser\.Renderer\.WebGL\.Pipelines\.PostFXPipeline/);
assert.match(shader, /uniform sampler2D uMainSampler/);
assert.match(shader, /center - localAverage/);
assert.match(shader, /uHighlightCompression/);
assert.match(system, /isFullWorldMaterialReviewEnabled/);
assert.match(system, /disableBelowFps/);
assert.match(system, /removePostPipeline/);
assert.match(setup, /new FullWorldMaterialSystem\(this\)/);
assert.match(lifecycle, /"fullWorldMaterialSystem"/);
assert.match(comparison, /fullWorldMaterials: "0"/);
assert.match(comparison, /fullWorldMaterials: "1"/);
assert.doesNotMatch(comparison, /surfaceRelief: "1"/, "A/B must keep original source textures");

console.log("FULL_WORLD_MATERIAL_CONTRACT_OK");
