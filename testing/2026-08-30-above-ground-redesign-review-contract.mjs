import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  WORLD_VISUAL_ABOVE_GROUND_REDESIGN_REVIEW as REVIEW,
} from "../values/worldVisualAboveGroundRedesignReview.js";
import { WORLD_VISUAL_SURFACE_HERO_LANDMARK_ASSETS as HERO_ASSETS } from
  "../values/worldVisualSurfaceHeroLandmarks.js";
import {
  WORLD_VISUAL_PROP_ASSET_BY_ID_V3 as PROP_ASSET_BY_ID,
  WORLD_VISUAL_PROP_ATLASES_V3 as PROP_ATLASES,
} from "../values/generated/worldVisualPropLibraryV3/index.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const atlasByKey = new Map(PROP_ATLASES.map(atlas => [atlas.key, atlas]));
const allowedChapterIds = [
  "town",
  "arrival-forge",
  "starwell",
  "observatory",
  "frontier",
  "far-east",
];

assert.equal(REVIEW.reviewOnly, true);
assert.equal(REVIEW.productionChanged, false);
assert.equal(REVIEW.assetPolicy, "checked-in-runtime-assets-only");
assert.deepEqual(REVIEW.chapters.map(chapter => chapter.id), allowedChapterIds);

let heroCount = 0;
let propCount = 0;
for (const chapter of REVIEW.chapters) {
  assert.equal(existsSync(resolve(root, chapter.basePath)), true, `${chapter.id} base missing`);
  assert.ok(chapter.overlays.length >= 3, `${chapter.id} needs a meaningful redesign layer`);
  for (const overlay of chapter.overlays) {
    if (overlay.kind === "hero") {
      const asset = HERO_ASSETS[overlay.assetId];
      assert.ok(asset, `${chapter.id} unknown hero ${overlay.assetId}`);
      assert.equal(existsSync(resolve(root, asset.path)), true, `${asset.path} missing`);
      assert.ok(overlay.distanceScale > 0 && overlay.distanceScale <= 1);
      heroCount += 1;
      continue;
    }
    const asset = PROP_ASSET_BY_ID[overlay.assetId];
    assert.ok(asset, `${chapter.id} unknown prop ${overlay.assetId}`);
    const atlas = atlasByKey.get(asset.atlasKey);
    assert.ok(atlas, `${asset.atlasKey} atlas missing`);
    assert.equal(existsSync(resolve(root, atlas.path)), true, `${atlas.path} missing`);
    assert.equal(existsSync(resolve(root, atlas.dataPath)), true, `${atlas.dataPath} missing`);
    propCount += 1;
  }
}

assert.ok(heroCount >= REVIEW.chapters.length);
assert.ok(propCount >= REVIEW.chapters.length * 2);
console.log("ABOVE_GROUND_REDESIGN_REVIEW_OK", {
  chapters: REVIEW.chapters.length,
  heroInstances: heroCount,
  propInstances: propCount,
  productionChanged: REVIEW.productionChanged,
  assetPolicy: REVIEW.assetPolicy,
});
