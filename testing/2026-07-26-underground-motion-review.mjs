import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { UNDERGROUND_BIOME_MOTION_REVIEW } from
  "../values/undergroundBiomeMotionReview.js";
import { WORLD_VISUAL_DEPTH_BACKDROPS } from
  "../values/worldVisualDepthBackdrops.js";
import { WORLD_VISUAL_MATERIALS } from "../values/worldVisualMaterials.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const sourceRoot = resolve(
  root,
  "visual-approval-previews",
  "underground-biome-motion-mockups-v1"
);
const rejectedRoot = resolve(
  root,
  "visual-approval-previews",
  "underground-biome-baked-motion-v2"
);
const cards = UNDERGROUND_BIOME_MOTION_REVIEW.cards;
const regions = new Map(
  WORLD_VISUAL_DEPTH_BACKDROPS.regions.map(region => [region.id, region])
);

assert.equal(UNDERGROUND_BIOME_MOTION_REVIEW.reviewOnly, true);
assert.equal(UNDERGROUND_BIOME_MOTION_REVIEW.productionChanged, false);
assert.equal(UNDERGROUND_BIOME_MOTION_REVIEW.status, "rejected");
assert.match(UNDERGROUND_BIOME_MOTION_REVIEW.rejectionReason, /Choppy optical-flow/);
assert.deepEqual(UNDERGROUND_BIOME_MOTION_REVIEW.staticPromotion, {
  status: "approved",
  productionChanged: true,
});
assert.deepEqual(UNDERGROUND_BIOME_MOTION_REVIEW.frame, { width: 1536, height: 1024 });
assert.equal(cards.length, 10);

for (const card of cards) {
  const region = regions.get(card.regionId);
  assert.ok(region, `${card.id} maps to a live depth region`);
  assert.ok(WORLD_VISUAL_MATERIALS[card.materialId], `${card.id} uses a live material`);
  assert.equal(region.variantBackwalls.length, 7);
  assert.ok(region.variantBackwalls.slice(0, 6).every(asset => asset.type === "image"));
  assert.equal(region.variantBackwalls[5].path, card.approvedStatic);
  assert.match(card.approvedStatic, /\/biome-variation-v2\/.+-motion-v1\.webp$/);
  assert.equal(region.variantBackwalls[6].type, "video");
  assert.match(region.variantBackwalls[6].path, /\/biome-motion-v3\/.+-loop-v3\.mp4$/);
  assert.match(card.art, /^\.\/2026-07-26-[a-z0-9-]+\.png$/);
  assert.match(card.rejectedVideo, /^sprites\/.+-loop-v2\.webm$/);

  const artName = card.art.replace(/^\.\//, "");
  const evidencePaths = [
    resolve(sourceRoot, artName),
    resolve(rejectedRoot, artName.replace(/\.png$/, "-keyframe-b-v2.png")),
    resolve(root, card.rejectedVideo),
  ];
  for (const path of evidencePaths) {
    const fileStat = await stat(path);
    assert.ok(fileStat.size > 180_000, `${card.id} review evidence is unexpectedly small`);
  }
  const staticStat = await stat(resolve(root, card.approvedStatic));
  assert.ok(staticStat.size > 100_000, `${card.id} approved static is unexpectedly small`);
}

const galleryHtml = await readFile(resolve(rejectedRoot, "index.html"), "utf8");
const gallerySource = await readFile(resolve(rejectedRoot, "baked-motion-gallery.js"), "utf8");
const productionSource = await readFile(
  resolve(root, "values", "worldVisualDepthBackdrops.js"),
  "utf8"
);

assert.match(galleryHtml, /REJECTED · review only/);
assert.match(galleryHtml, /<video id="motion-video"/);
assert.doesNotMatch(galleryHtml, /<canvas/);
assert.match(gallerySource, /undergroundBiomeMotionReview\.js/);
assert.match(gallerySource, /card\.rejectedVideo/);
assert.doesNotMatch(gallerySource, /worldVisualDepthBackdrops|asset\.type === "video"/);
assert.match(gallerySource, /video\.play\(\)/);
assert.doesNotMatch(gallerySource, /Canvas|requestAnimationFrame|fillCircle|lineStyle/);
assert.doesNotMatch(productionSource, /biome-motion-v2|\.webm/);
assert.match(productionSource, /biome-motion-v3|\.mp4/);

console.log("rejected underground optical-flow gallery is isolated from production");
