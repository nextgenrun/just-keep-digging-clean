import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs";

import {
  WORLD_VISUAL_DEPTH_BACKDROPS,
  getWorldVisualDepthBackdropAllAssets,
} from "../values/worldVisualDepthBackdrops.js";
import {
  WORLD_VISUAL_GROUND_STRUCTURES,
  getWorldVisualGroundStructureAssets,
  resolveWorldVisualGroundStructureBlendEnabled,
  resolveWorldVisualGroundStructureRegions,
  resolveWorldVisualGroundStructuresEnabled,
} from "../values/worldVisualGroundStructures.js";
import { WORLD_VISUAL_RUNTIME } from "../values/worldVisualRuntime.js";
import { WorldVisualGroundStructureLayer } from
  "../world/rendering/scenic-world/WorldVisualGroundStructureLayer.js";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(fs.readFileSync(new URL(
  "visual-approval-previews/underground-visual-expansion-v3/"
    + "2026-07-28-underground-visual-expansion-v3.json",
  root
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

assert.deepEqual(manifest.counts, {
  backgrounds: 50,
  groundStructures: 50,
  totalRuntimeAssets: 100,
});
assert.equal(manifest.generatedWith, "built-in ImageGen");
assert.deepEqual(manifest.dimensions, [1536, 1024]);

const backdropAssets = getWorldVisualDepthBackdropAllAssets(
  undefined,
  "?biomeBackdropExpansionV5=0"
);
const previousBackdropAssets = getWorldVisualDepthBackdropAllAssets(
  undefined,
  "?biomeBackdropExpansion=0&biomeBackdropExpansionV5=0"
);
assert.equal(backdropAssets.length, 120);
assert.equal(previousBackdropAssets.length, 70);
assert.equal(
  backdropAssets.filter(asset => asset.path.includes("/biome-expansion-v3/")).length,
  50
);
assert.ok(WORLD_VISUAL_DEPTH_BACKDROPS.regions.every(region => (
  region.variantBackwalls.length === 12
  && region.baseVariantBackwalls.length === 7
)));

const groundAssets = getWorldVisualGroundStructureAssets();
const legacyGroundAssets = getWorldVisualGroundStructureAssets(
  undefined,
  "?groundStructureBlend=0"
);
assert.equal(groundAssets.length, 50);
assert.equal(new Set(groundAssets.map(asset => asset.key)).size, 50);
assert.equal(new Set(groundAssets.map(asset => asset.path)).size, 50);
assert.ok(groundAssets.every(asset => (
  asset.path.includes("/biome-ground-structures-v4/")
)));
assert.equal(legacyGroundAssets.length, 50);
assert.ok(legacyGroundAssets.every(asset => (
  asset.path.includes("/biome-ground-structures-v3/")
)));
assert.equal(WORLD_VISUAL_GROUND_STRUCTURES.regions.length, 10);
assert.ok(WORLD_VISUAL_GROUND_STRUCTURES.regions.every(region => (
  region.assets.length === 5
  && region.baseAssets.length === 5
  && region.blendAssets.length === 5
)));
assert.equal(resolveWorldVisualGroundStructuresEnabled(undefined, ""), true);
assert.equal(
  resolveWorldVisualGroundStructuresEnabled(undefined, "?undergroundGroundStructures=0"),
  false
);
assert.equal(resolveWorldVisualGroundStructureBlendEnabled(undefined, ""), true);
assert.equal(
  resolveWorldVisualGroundStructureBlendEnabled(undefined, "?groundStructureBlend=0"),
  false
);
assert.deepEqual(
  resolveWorldVisualGroundStructureRegions(519, 521).map(region => region.id),
  ["level1-blue", "level1-amber"]
);
assert.ok(
  WORLD_VISUAL_GROUND_STRUCTURES.render.depth > WORLD_VISUAL_RUNTIME.render.terrainDepth
);
assert.ok(
  WORLD_VISUAL_GROUND_STRUCTURES.render.depth < WORLD_VISUAL_RUNTIME.render.rootOverlayDepth
);

for (const entry of manifest.backgrounds) {
  const payload = fs.readFileSync(new URL(entry.runtime, root));
  assert.deepEqual(webpDimensions(payload), [1536, 1024]);
  assert.ok(payload.length > 4096);
}
for (const entry of manifest.groundStructures) {
  const payload = fs.readFileSync(new URL(entry.runtime, root));
  assert.deepEqual(webpDimensions(payload), [1536, 1024]);
  assert.equal(payload.toString("ascii", 12, 16), "VP8X");
  assert.ok((payload[20] & 0x10) !== 0, `${entry.id} retains WebP alpha`);
  assert.ok(entry.opaqueCoverage >= 0.05 && entry.opaqueCoverage <= 0.72);
  const alphaSource = fs.readFileSync(new URL(entry.alphaSource, root));
  assert.deepEqual([...alphaSource.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(alphaSource.readUInt32BE(16), 1536);
  assert.equal(alphaSource.readUInt32BE(20), 1024);
  assert.equal(alphaSource[25], 6, `${entry.id} review source is RGBA`);
}

class FakeImage {
  setOrigin() { return this; }
  setDepth(value) { this.depth = value; return this; }
  setAlpha(value) { this.alpha = value; return this; }
  setCrop(x, y, width, height) { this.crop = { x, y, width, height }; return this; }
  setDisplaySize(width, height) { this.displayWidth = width; this.displayHeight = height; return this; }
  setFlipX(value) { this.flipX = value; return this; }
  setFlipY(value) { this.flipY = value; return this; }
  setMask(value) { this.mask = value; return this; }
  setTint(value) { this.tint = value; return this; }
  destroy() { this.destroyed = true; }
}

const loader = new EventEmitter();
loader.isLoading = () => false;
loader.image = () => {};
loader.start = () => {};
const loadedKeys = new Set(WORLD_VISUAL_GROUND_STRUCTURES.regions[0].assets.map(
  asset => asset.key
));
const terrainMask = { id: "authoritative-solid-terrain-mask" };
const scene = {
  config: { tileSize: 94 },
  load: loader,
  textures: {
    exists: key => loadedKeys.has(key),
    get: () => ({ getSourceImage: () => ({ width: 1536, height: 1024 }) }),
    remove: key => loadedKeys.delete(key),
  },
  add: { image: () => new FakeImage() },
};
const layer = new WorldVisualGroundStructureLayer(
  scene,
  terrainMask,
  WORLD_VISUAL_GROUND_STRUCTURES,
  "?undergroundSeamBlend=0"
);
assert.equal(layer.create(), true);
assert.equal(layer.sync(
  { left: 0, right: 30, top: 65, bottom: 80 },
  { terrainTint: 0xddeeff },
  true
), true);
const sprites = [...layer.regionViews.values()].flatMap(view => (
  [...view.segments.values()].map(segment => segment.sprite)
));
assert.ok(sprites.length > 0);
assert.ok(sprites.every(sprite => sprite.mask === terrainMask));
assert.ok(sprites.every(sprite => (
  sprite.depth === WORLD_VISUAL_GROUND_STRUCTURES.render.depth
)));
assert.ok(sprites.every(sprite => sprite.tint === 0xddeeff));
layer.destroy();

const layerSource = fs.readFileSync(new URL(
  "world/rendering/scenic-world/WorldVisualGroundStructureRegionView.js",
  root
), "utf8");
const runtimeSource = fs.readFileSync(new URL(
  "world/rendering/scenic-world/WorldVisualRuntime.js",
  root
), "utf8");
assert.match(layerSource, /\.setMask\(this\.terrainMask\)/);
assert.match(layerSource, /strideXPx/);
assert.doesNotMatch(layerSource, /setFlipX|setFlipY/);
assert.doesNotMatch(
  layerSource,
  /add\.graphics|fillRect|fillCircle|lineStyle|tweens|document\.|innerHTML/
);
assert.doesNotMatch(
  layerSource,
  /setTile|damageTile|digTile|createTilemap|save|collision/
);
assert.match(runtimeSource, /WorldVisualGroundStructureLayer/);
assert.match(
  runtimeSource,
  /materialField\.sync[\s\S]{0,140}groundStructureLayer\?\.sync[\s\S]{0,140}semanticAssetLayer\?\.sync/
);

console.log("underground visual expansion V3 100-asset contract passed");
