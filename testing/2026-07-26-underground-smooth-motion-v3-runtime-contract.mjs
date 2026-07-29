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
const allAssets = getWorldVisualDepthBackdropAllAssets();
const imageAssets = allAssets.filter(asset => asset.type === "image");
const conceptStaticAssets = imageAssets.filter(asset => asset.path.endsWith("-motion-v1.webp"));
const expansionStaticAssets = imageAssets.filter(asset => (
  asset.path.includes("/biome-expansion-v3/")
));
const expansionV5StaticAssets = imageAssets.filter(asset => (
  asset.path.includes("/biome-expansion-v5/")
));
const olderStaticAssets = imageAssets.filter(asset => (
  asset.path.includes("/biome-variation-v2/")
  && !asset.path.endsWith("-motion-v1.webp")
));
const videoAssets = allAssets.filter(asset => asset.type === "video");

function webpDimensions(buffer) {
  assert.equal(buffer.toString("ascii", 0, 4), "RIFF");
  assert.equal(buffer.toString("ascii", 8, 12), "WEBP");
  const chunk = buffer.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    return [buffer.readUIntLE(24, 3) + 1, buffer.readUIntLE(27, 3) + 1];
  }
  if (chunk === "VP8L") {
    const bits = buffer.readUInt32LE(21);
    return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1];
  }
  const signature = buffer.indexOf(Buffer.from([0x9d, 0x01, 0x2a]), 20);
  assert.ok(signature >= 0, `unsupported WebP chunk ${chunk}`);
  return [
    buffer.readUInt16LE(signature + 3) & 0x3fff,
    buffer.readUInt16LE(signature + 5) & 0x3fff,
  ];
}

assert.equal(manifest.version, "underground-biome-smooth-motion-v3");
assert.equal(manifest.reviewOnly, false);
assert.equal(manifest.productionChanged, true);
assert.equal(manifest.status, "approved");
assert.equal(manifest.motionSource, "subpixel-affine-whole-finished-image");
assert.equal(manifest.opticalFlow, false);
assert.equal(manifest.overlayGraphics, false);
assert.equal(manifest.loopCount, 10);
assert.equal(manifest.loops.length, 10);
assert.equal(allAssets.length, 170);
assert.equal(olderStaticAssets.length, 50);
assert.equal(expansionStaticAssets.length, 50);
assert.equal(expansionV5StaticAssets.length, 50);
assert.equal(conceptStaticAssets.length, 10);
assert.equal(videoAssets.length, 10);
assert.equal(WORLD_VISUAL_DEPTH_BACKDROPS.motion.smoothVideo.frameRate, 60);
assert.equal(WORLD_VISUAL_DEPTH_BACKDROPS.motion.smoothVideo.durationMs, 8000);
assert.equal(WORLD_VISUAL_DEPTH_BACKDROPS.motion.smoothVideo.codec, "h264");

const configuredPaths = new Set(videoAssets.map(asset => asset.path));
const conceptStaticPaths = new Set(conceptStaticAssets.map(asset => asset.path));
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

  const sourceName = loop.source.split("/").at(-1);
  const stem = sourceName.replace(/^2026-07-26-/, "").replace(/\.png$/, "");
  const conceptStatic = (
    `sprites/backgrounds/world-visual-v2/depth/biome-variation-v2/`
    + `${stem}-motion-v1.webp`
  );
  assert.ok(conceptStaticPaths.has(conceptStatic), `${loop.regionId} static concept mapping`);
  const staticPayload = fs.readFileSync(new URL(conceptStatic, root));
  assert.deepEqual(webpDimensions(staticPayload), [1536, 1024]);
}
assert.equal(hashes.size, 10);

console.log("approved underground smooth-motion V3 runtime contract passed");
