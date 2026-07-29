import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";

import { UNDERGROUND_BIOME_MOTION_REVIEW } from
  "../values/undergroundBiomeMotionReview.js";
import {
  WORLD_VISUAL_DEPTH_BACKDROPS,
  getWorldVisualDepthBackdropAllAssets,
} from "../values/worldVisualDepthBackdrops.js";

const root = new URL("../", import.meta.url);
const manifestUrl = new URL(
  "sprites/backgrounds/world-visual-v2/depth/biome-motion-v2/"
    + "2026-07-26-baked-motion-runtime-manifest-v2.json",
  root
);
const manifest = JSON.parse(fs.readFileSync(manifestUrl, "utf8"));
const productionAssets = getWorldVisualDepthBackdropAllAssets();
const previousPoolAssets = getWorldVisualDepthBackdropAllAssets(
  undefined,
  "?biomeBackdropExpansion=0"
);

assert.equal(productionAssets.length, 120, "production exposes 110 static and ten smooth V3 cards");
assert.equal(productionAssets.filter(entry => entry.type === "image").length, 110);
assert.equal(productionAssets.filter(entry => entry.type === "video").length, 10);
assert.equal(previousPoolAssets.length, 70, "expansion rollback restores the approved 70-card pool");
assert.ok(WORLD_VISUAL_DEPTH_BACKDROPS.regions.every(region => (
  region.variantBackwalls.length === 12
  && region.variantBackwalls.slice(0, 10).every(asset => asset.type === "image")
  && region.variantBackwalls.filter(asset => (
    asset.path.includes("/biome-expansion-v3/")
  )).length === 5
  && region.variantBackwalls[10].path.endsWith("-motion-v1.webp")
  && region.variantBackwalls[11].type === "video"
  && region.variantBackwalls[11].path.includes("/biome-motion-v3/")
)), "every biome includes its concept static and V3 video while excluding rejected optical flow");

assert.equal(UNDERGROUND_BIOME_MOTION_REVIEW.reviewOnly, true);
assert.equal(UNDERGROUND_BIOME_MOTION_REVIEW.productionChanged, false);
assert.equal(UNDERGROUND_BIOME_MOTION_REVIEW.status, "rejected");
assert.equal(manifest.reviewOnly, true);
assert.equal(manifest.productionChanged, false);
assert.equal(manifest.status, "rejected");
assert.match(manifest.rejectionReason, /Choppy optical-flow/);
assert.equal(manifest.motionSource, "painted-keyframe-optical-flow");
assert.equal(manifest.loops.length, 10);

const retainedHashes = new Set();
for (const loop of manifest.loops) {
  const payload = fs.readFileSync(new URL(loop.runtime, root));
  assert.deepEqual([...payload.subarray(0, 4)], [0x1a, 0x45, 0xdf, 0xa3]);
  const digest = createHash("sha256").update(payload).digest("hex");
  assert.equal(digest, loop.sha256, `${loop.stem} rejected-evidence hash`);
  retainedHashes.add(digest);
}
assert.equal(retainedHashes.size, 10, "all rejected files remain immutable review evidence");

const valuesSource = fs.readFileSync(
  new URL("values/worldVisualDepthBackdrops.js", root),
  "utf8"
);
const stageSource = fs.readFileSync(
  new URL("world/rendering/scenic-world/WorldVisualDepthBackdropStage.js", root),
  "utf8"
);
const viewSource = fs.readFileSync(
  new URL("world/rendering/scenic-world/WorldVisualDepthBackdropRegionView.js", root),
  "utf8"
);
const builderSource = fs.readFileSync(
  new URL("ai-tools/2026-07-26-build-underground-biome-baked-motion-v2.py", root),
  "utf8"
);

assert.doesNotMatch(valuesSource, /biome-motion-v2|biomeMotionAsset|\.webm/);
assert.match(valuesSource, /biome-motion-v3|\.mp4/);
assert.doesNotMatch(stageSource, /bakedVideo|biome-motion-v2/);
assert.doesNotMatch(viewSource, /bakedVideo|biome-motion-v2|opticalFlow|minterpolate/);
assert.match(viewSource, /add\.video|setPaused|\.play\(/);
assert.match(builderSource, /"reviewOnly": True/);
assert.match(builderSource, /"productionChanged": False/);
assert.match(builderSource, /"status": "rejected"/);
assert.doesNotMatch(`${stageSource}\n${viewSource}`, /fillCircle|lineStyle|segment\.mist|segment\.emissive/);
assert.doesNotMatch(`${stageSource}\n${viewSource}`, /WorldModel|setTile|damageTile|digTile|createTilemap/);

console.log("rejected underground optical flow is excluded while approved V3 stays wired");
