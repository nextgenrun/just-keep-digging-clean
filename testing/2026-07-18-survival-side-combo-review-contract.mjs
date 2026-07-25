import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { SURVIVAL_SIDE_COMBO_REVIEW as review } from "../values/survivalSideComboReview.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sandboxPath = resolve(root, "testing/animation-sandbox/survival-side-combo-review-v1");
const source = (file) => readFileSync(resolve(sandboxPath, file), "utf8");

assert.equal(review.productionChanged, false);
assert.equal(review.candidates.length, 4);
assert.equal(new Set(review.candidates.map((candidate) => candidate.id)).size, review.candidates.length);
assert.equal(review.stage.tileSizePx, 94);
assert.equal(review.stage.displaySizePx, 109);
assert.ok(review.stage.zoomOptions.includes(1));
assert.ok(Object.values(review.assets).every((asset) => asset.frameWidth === 256));
assert.ok(Object.values(review.assets).every((asset) => existsSync(resolve(sandboxPath, asset.file))));
assert.doesNotMatch(JSON.stringify(review), /pickaxe|sword|kick|hook/i);
review.candidates.forEach((candidate) => {
  assert.ok(candidate.sequence.length >= 3);
  assert.ok(candidate.sequence.every((entry) => review.assets[entry.assetId]));
});

const page = source("index.html");
const script = source("review.js");
assert.match(page, /fist-only/i);
assert.match(script, /productionChanged/);
assert.doesNotMatch(script, /UalMiningComboSelector|localStorage\.setItem\([^,]+,\s*"promoted"/);
assert.ok(script.split("\n").length <= 300);
assert.ok(source("review.css").split("\n").length <= 300);
assert.ok(source("readme.md").includes("Review-only"));

console.log("Survivor side-combo review contract OK", {
  candidates: review.candidates.length,
  productionChanged: review.productionChanged,
});
