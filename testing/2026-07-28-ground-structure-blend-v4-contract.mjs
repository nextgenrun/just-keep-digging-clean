import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  WORLD_VISUAL_GROUND_STRUCTURES,
  getWorldVisualGroundStructureAssets,
  resolveWorldVisualGroundStructureBlendEnabled,
  resolveWorldVisualGroundStructureRegions,
} from "../values/worldVisualGroundStructures.js";
import { WorldVisualGroundStructureRegionView } from
  "../world/rendering/scenic-world/WorldVisualGroundStructureRegionView.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REVIEW_ROOT = path.join(
  ROOT,
  "visual-approval-previews",
  "underground-terrain-blend-v4"
);
const V3_ROOT = path.join(
  ROOT,
  "sprites",
  "backgrounds",
  "world-visual-v2",
  "depth",
  "biome-ground-structures-v3"
);
const V4_ROOT = path.join(
  ROOT,
  "sprites",
  "backgrounds",
  "world-visual-v2",
  "depth",
  "biome-ground-structures-v4"
);
const manifest = JSON.parse(fs.readFileSync(path.join(
  REVIEW_ROOT,
  "2026-07-28-ground-structure-blend-v4.json"
), "utf8"));

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

assert.equal(manifest.version, 4);
assert.equal(
  manifest.mode,
  "additive alpha-feathered derivatives; V3 files remain intact"
);
assert.deepEqual(manifest.counts, {
  sourceV3Structures: 50,
  runtimeV4Structures: 50,
});
assert.deepEqual(manifest.dimensions, [1536, 1024]);
assert.deepEqual(manifest.featherPx, [192, 128]);
assert.deepEqual(manifest.stridePx, [1344, 896]);
assert.equal(manifest.rollback, "?groundStructureBlend=0");
assert.equal(manifest.derivatives.length, 50);
assert.equal(new Set(
  manifest.derivatives.map(entry => entry.runtimeSha256)
).size, 50);
assert.equal(
  fs.readdirSync(V3_ROOT).filter(name => name.endsWith("-v3.webp")).length,
  50,
  "approved V3 runtime structures remain intact"
);
assert.equal(
  fs.readdirSync(V4_ROOT).filter(name => name.endsWith("-v4.webp")).length,
  50
);

let coverageReduced = 0;
for (const entry of manifest.derivatives) {
  const runtimePath = path.join(ROOT, entry.runtime);
  const payload = fs.readFileSync(runtimePath);
  assert.deepEqual(webpDimensions(payload), [1536, 1024]);
  assert.equal(payload.toString("ascii", 12, 16), "VP8X");
  assert.ok((payload[20] & 0x10) !== 0, `${entry.id} retains alpha`);
  assert.ok(fs.existsSync(path.join(ROOT, entry.v3Runtime)), entry.v3Runtime);
  assert.ok(fs.existsSync(path.join(ROOT, entry.v3AlphaSource)), entry.v3AlphaSource);
  assert.ok(entry.runtimeBytes > 4096);
  assert.ok(entry.opaqueCoverageAfter <= entry.opaqueCoverageBefore);
  if (entry.opaqueCoverageAfter < entry.opaqueCoverageBefore) coverageReduced += 1;
}
assert.ok(
  coverageReduced >= 40,
  "edge-touching derivatives have measurably reduced opaque coverage"
);
assert.ok(fs.existsSync(path.join(
  REVIEW_ROOT,
  "2026-07-28-ground-structure-blend-contact-sheet-v4.png"
)));

assert.equal(resolveWorldVisualGroundStructureBlendEnabled(undefined, ""), true);
assert.equal(
  resolveWorldVisualGroundStructureBlendEnabled(undefined, "?groundStructureBlend=0"),
  false
);
const currentAssets = getWorldVisualGroundStructureAssets();
const legacyAssets = getWorldVisualGroundStructureAssets(
  undefined,
  "?groundStructureBlend=0"
);
assert.equal(currentAssets.length, 50);
assert.equal(legacyAssets.length, 50);
assert.ok(currentAssets.every(asset => (
  asset.key.includes("-v4-") && asset.path.includes("/biome-ground-structures-v4/")
)));
assert.ok(legacyAssets.every(asset => (
  asset.key.includes("-v3-") && asset.path.includes("/biome-ground-structures-v3/")
)));
assert.notDeepEqual(
  currentAssets.map(asset => asset.key),
  legacyAssets.map(asset => asset.key)
);

class FakeImage {
  constructor(x, y, key) {
    this.x = x;
    this.y = y;
    this.key = key;
  }
  setOrigin() { return this; }
  setDepth(value) { this.depth = value; return this; }
  setAlpha(value) { this.alpha = value; return this; }
  setCrop(x, y, width, height) {
    this.crop = { x, y, width, height };
    return this;
  }
  setDisplaySize(width, height) {
    this.displayWidth = width;
    this.displayHeight = height;
    return this;
  }
  setMask(value) { this.mask = value; return this; }
  setTint(value) { this.tint = value; return this; }
  destroy() { this.destroyed = true; }
}

const region = resolveWorldVisualGroundStructureRegions(65, 90)[0];
const loaded = new Set(region.assets.map(asset => asset.key));
const scene = {
  config: { tileSize: 64 },
  textures: {
    exists: key => loaded.has(key),
    get: () => ({
      getSourceImage: () => ({ width: 1536, height: 1024 }),
    }),
  },
  add: {
    image: (x, y, key) => new FakeImage(x, y, key),
  },
};
const terrainMask = { id: "authoritative-solid-terrain-mask" };
const view = new WorldVisualGroundStructureRegionView(
  scene,
  region,
  WORLD_VISUAL_GROUND_STRUCTURES,
  terrainMask
);
assert.equal(view.sync(
  { left: 0, right: 50, top: 65, bottom: 90 },
  { terrainTint: 0xddeeff },
  true
), true);
const segments = [...view.segments.values()];
assert.ok(segments.length > 1);
assert.ok(segments.every(segment => segment.sprite.mask === terrainMask));
assert.ok(segments.every(segment => segment.sprite.key.includes("-v4-")));
const firstRowXs = segments
  .map(segment => segment.sprite)
  .filter(sprite => sprite.y === Math.min(...segments.map(item => item.sprite.y)))
  .map(sprite => sprite.x)
  .sort((a, b) => a - b);
assert.ok(firstRowXs.length > 1);
assert.equal(firstRowXs[1] - firstRowXs[0], 1344);
assert.ok(segments.every(segment => segment.sprite.crop.x === 0));
assert.ok(segments.every(segment => segment.sprite.crop.y === 0));
view.destroy();

const source = fs.readFileSync(path.join(
  ROOT,
  "world",
  "rendering",
  "scenic-world",
  "WorldVisualGroundStructureRegionView.js"
), "utf8");
assert.match(source, /strideXPx/);
assert.match(source, /\.setMask\(this\.terrainMask\)/);
assert.doesNotMatch(source, /setFlipX|setFlipY/);
assert.doesNotMatch(
  source,
  /add\.graphics|fillRect|fillCircle|lineStyle|tweens|document\.|innerHTML/
);
assert.doesNotMatch(
  source,
  /setTile|damageTile|digTile|createTilemap|save|collision/
);

console.log("Ground-structure blend V4 additive derivative contract passed");
