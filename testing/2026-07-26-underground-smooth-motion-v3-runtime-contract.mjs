import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";

import {
  WORLD_VISUAL_DEPTH_BACKDROPS,
  getWorldVisualDepthBackdropAllAssets,
} from "../values/worldVisualDepthBackdrops.js";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(fs.readFileSync(new URL(
  "sprites/backgrounds/world-visual-v2/depth/biome-motion-v3/"
    + "2026-07-26-smooth-motion-runtime-manifest-v3.json",
  root
), "utf8"));
const videoAssets = getWorldVisualDepthBackdropAllAssets()
  .filter(asset => asset.type === "video");

assert.equal(manifest.version, "underground-biome-smooth-motion-v3");
assert.equal(manifest.reviewOnly, false);
assert.equal(manifest.productionChanged, true);
assert.equal(manifest.status, "approved");
assert.equal(manifest.motionSource, "subpixel-affine-whole-finished-image");
assert.equal(manifest.opticalFlow, false);
assert.equal(manifest.overlayGraphics, false);
assert.equal(manifest.loopCount, 10);
assert.equal(manifest.loops.length, 10);
assert.equal(videoAssets.length, 10);
assert.equal(WORLD_VISUAL_DEPTH_BACKDROPS.motion.smoothVideo.frameRate, 60);
assert.equal(WORLD_VISUAL_DEPTH_BACKDROPS.motion.smoothVideo.durationMs, 8000);
assert.equal(WORLD_VISUAL_DEPTH_BACKDROPS.motion.smoothVideo.codec, "h264");

const configuredPaths = new Set(videoAssets.map(asset => asset.path));
const hashes = new Set();
for (const loop of manifest.loops) {
  assert.ok(configuredPaths.has(loop.output), `${loop.regionId} is registered in production`);
  assert.equal(loop.motionSource, "subpixel-affine-whole-finished-image");
  assert.equal(loop.opticalFlow, false);
  assert.equal(loop.overlayGraphics, false);
  assert.equal(loop.codec, "h264");
  assert.equal(loop.width, 1536);
  assert.equal(loop.height, 1024);
  assert.equal(loop.frameRate, "60/1");
  assert.equal(loop.frames, 480);
  assert.equal(loop.durationSeconds, 8);
  assert.ok(loop.maxFrameStepPx < 0.08);

  const output = fs.readFileSync(new URL(loop.output, root));
  assert.equal(output.toString("ascii", 4, 8), "ftyp");
  assert.equal(output.length, loop.bytes);
  const digest = createHash("sha256").update(output).digest("hex");
  assert.equal(digest, loop.sha256, `${loop.regionId} production hash`);
  hashes.add(digest);

  const source = fs.readFileSync(new URL(loop.source, root));
  assert.equal(source.toString("ascii", 1, 4), "PNG");
  assert.equal(source.readUInt32BE(16), 1536);
  assert.equal(source.readUInt32BE(20), 1024);
}
assert.equal(hashes.size, 10);

console.log("approved underground smooth-motion V3 runtime contract passed");
