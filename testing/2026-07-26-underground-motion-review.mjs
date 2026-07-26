import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { UNDERGROUND_BIOME_MOTION_REVIEW } from "../values/undergroundBiomeMotionReview.js";
import { WORLD_VISUAL_DEPTH_BACKDROPS } from "../values/worldVisualDepthBackdrops.js";
import { WORLD_VISUAL_MATERIALS } from "../values/worldVisualMaterials.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const galleryRoot = resolve(
  root,
  "visual-approval-previews",
  "underground-biome-motion-mockups-v1"
);
const cards = UNDERGROUND_BIOME_MOTION_REVIEW.cards;
const regionIds = new Set(WORLD_VISUAL_DEPTH_BACKDROPS.regions.map(region => region.id));

assert.equal(UNDERGROUND_BIOME_MOTION_REVIEW.reviewOnly, true);
assert.equal(UNDERGROUND_BIOME_MOTION_REVIEW.productionChanged, false);
assert.deepEqual(UNDERGROUND_BIOME_MOTION_REVIEW.canvas, { width: 1536, height: 1024 });
assert.equal(cards.length, 10);
assert.equal(new Set(cards.map(card => card.id)).size, cards.length);
assert.equal(new Set(cards.map(card => card.regionId)).size, cards.length);
assert.equal(new Set(cards.map(card => card.motion.kind)).size, cards.length);

for (const card of cards) {
  assert.equal(regionIds.has(card.regionId), true, `${card.id} must map to a live depth region`);
  assert.ok(WORLD_VISUAL_MATERIALS[card.materialId], `${card.id} must use a live ground material`);
  assert.match(card.art, /^\.\/2026-07-26-[a-z0-9-]+\.png$/);

  const artPath = resolve(galleryRoot, card.art);
  const artStat = await stat(artPath);
  assert.ok(artStat.size > 500_000, `${card.id} source plate is unexpectedly small`);

  const header = await readFile(artPath);
  assert.equal(header.toString("ascii", 1, 4), "PNG");
  assert.equal(header.readUInt32BE(16), 1536, `${card.id} width`);
  assert.equal(header.readUInt32BE(20), 1024, `${card.id} height`);
}

const gallerySource = await readFile(resolve(galleryRoot, "motion-mockups.js"), "utf8");
const rendererSource = await readFile(resolve(galleryRoot, "BiomeMotionRenderer.js"), "utf8");
const productionSource = await readFile(
  resolve(root, "values", "worldVisualDepthBackdrops.js"),
  "utf8"
);

assert.match(gallerySource, /undergroundBiomeMotionReview\.js/);
assert.match(gallerySource, /worldVisualDepthBackdrops\.js/);
assert.match(rendererSource, /dataset\.motionTime/);
assert.doesNotMatch(productionSource, /undergroundBiomeMotionReview/);

console.log("underground motion review validation passed");
