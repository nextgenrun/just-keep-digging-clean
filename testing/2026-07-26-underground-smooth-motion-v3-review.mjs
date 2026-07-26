import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";

const root = new URL("../", import.meta.url);
const reviewRoot = new URL(
  "visual-approval-previews/underground-biome-smooth-motion-v3/",
  root
);
const manifest = JSON.parse(fs.readFileSync(
  new URL("2026-07-26-smooth-motion-v3-manifest.json", reviewRoot),
  "utf8"
));

assert.equal(manifest.version, "underground-biome-smooth-motion-v3");
assert.equal(manifest.reviewOnly, true);
assert.equal(manifest.productionChanged, false);
assert.equal(manifest.status, "approved");
assert.equal(manifest.scope, "one-biome-temporal-quality-gate");
assert.equal(manifest.motionSource, "subpixel-affine-whole-finished-image");
assert.equal(manifest.opticalFlow, false);
assert.equal(manifest.overlayGraphics, false);
assert.equal(manifest.codec, "h264");
assert.equal(manifest.width, 1536);
assert.equal(manifest.height, 1024);
assert.equal(manifest.frameRate, "60/1");
assert.equal(manifest.frames, 480);
assert.equal(manifest.durationSeconds, 8);
assert.ok(manifest.maxFrameStepPx < 0.08);

const output = fs.readFileSync(new URL(manifest.output, root));
assert.equal(output.toString("ascii", 4, 8), "ftyp");
assert.equal(createHash("sha256").update(output).digest("hex"), manifest.sha256);
assert.equal(output.length, manifest.bytes);
assert.ok(output.length > 1_000_000, "the candidate is not a placeholder encode");

const source = fs.readFileSync(new URL(manifest.source, root));
assert.equal(source.toString("ascii", 1, 4), "PNG");
assert.equal(source.readUInt32BE(16), 1536);
assert.equal(source.readUInt32BE(20), 1024);

const html = fs.readFileSync(new URL("index.html", reviewRoot), "utf8");
const css = fs.readFileSync(new URL("styles.css", reviewRoot), "utf8");
const builder = fs.readFileSync(
  new URL("ai-tools/2026-07-26-build-underground-biome-smooth-motion-v3.py", root),
  "utf8"
);
const productionValues = fs.readFileSync(
  new URL("values/worldVisualDepthBackdrops.js", root),
  "utf8"
);

assert.match(html, /APPROVED REFERENCE/);
assert.match(html, /60 fps/);
assert.match(html, /<video/);
assert.doesNotMatch(html, /<canvas|requestAnimationFrame/);
assert.doesNotMatch(css, /@keyframes|^\s*(animation|transform)\s*:/m);
assert.match(builder, /Image\.Transform\.AFFINE/);
assert.match(builder, /FRAME_RATE = 60/);
assert.doesNotMatch(builder, /minterpolate|FLOW_FILTER/);
assert.match(builder, /"opticalFlow": False/);
assert.match(productionValues, /biome-motion-v3|\.mp4/);
assert.doesNotMatch(productionValues, /biome-motion-v2|\.webm/);

console.log("underground smooth-motion V3 approval reference remains intact");
