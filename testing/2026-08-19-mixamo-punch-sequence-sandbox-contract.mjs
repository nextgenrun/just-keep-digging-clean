import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { MIXAMO_PUNCH_SEQUENCE_REVIEW as review } from
  "../values/mixamoPunchSequenceReview.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const renderConfig = JSON.parse(readFileSync(resolve(
  root,
  "values/mixamoPunchSequenceSandbox.json",
), "utf8"));
const expansionConfig = JSON.parse(readFileSync(resolve(
  root,
  "values/mixamoCombatExpansionClips.json",
), "utf8"));
renderConfig.version = expansionConfig.version;
renderConfig.clips = { ...renderConfig.clips, ...expansionConfig.clips };
const candidateRoot = resolve(root, renderConfig.candidateRoot);
const manifest = JSON.parse(readFileSync(resolve(candidateRoot, "manifest.json"), "utf8"));
const renderReport = JSON.parse(readFileSync(resolve(
  root,
  renderConfig.renderRoot,
  "render-report.json",
), "utf8"));
const clipIds = Object.keys(renderConfig.clips);

assert.equal(renderConfig.reviewOnly, true);
assert.equal(renderConfig.productionChanged, false);
assert.equal(review.reviewOnly, true);
assert.equal(review.productionChanged, false);
assert.equal(manifest.productionChanged, false);
assert.equal(manifest.runtimeWired, false);
assert.equal(clipIds.length, 24);
assert.equal(review.motions.length, 24);
assert.equal(review.recipes.length, 14);
assert.deepEqual(new Set(review.recipes.map(({ mode }) => mode)), new Set(["side", "up", "down"]));
assert.deepEqual(
  new Set(review.motions.map(({ category }) => category)),
  new Set(["Punch", "Boxing", "Elbow", "Kick", "Knee"]),
);

const motionIds = new Set(review.motions.map(({ id }) => id));
for (const recipe of review.recipes) {
  for (const segment of recipe.candidate) {
    assert.ok(motionIds.has(segment.clip), `${recipe.id} uses unknown ${segment.clip}`);
    assert.ok(segment.from <= segment.to);
  }
  assert.ok(recipe.baseline.length > 0);
}

for (const clipId of clipIds) {
  const clip = renderConfig.clips[clipId];
  const packed = manifest.clips[clipId];
  const source = resolve(root, renderConfig.sourceRoot, clip.source);
  const sheet = resolve(candidateRoot, clip.file);
  assert.equal(existsSync(source), true, `${clip.source} is missing`);
  assert.equal(existsSync(sheet), true, `${clip.file} is missing`);
  assert.equal(existsSync(resolve(candidateRoot, packed.preview)), true);
  assert.equal(existsSync(resolve(candidateRoot, packed.contactSheet)), true);
  assert.equal(packed.frames, clip.frames);
  assert.equal(packed.sourceRenderSizePx, 1024);
  assert.equal(packed.packedFrameSizePx, 256);
  assert.equal(packed.downsamplePasses, 1);
  assert.ok(packed.minimumRawEdgeMarginPx >= renderConfig.gates.minimumRawEdgeMarginPx);
  assert.ok(packed.baselineRangePx <= renderConfig.gates.maximumGroundedBaselineRangePx);
  assert.equal(packed.maximumSuspiciousGreenPixels, 0);
  assert.equal(
    createHash("sha256").update(readFileSync(sheet)).digest("hex"),
    packed.sheetSha256,
  );
  assert.ok(
    renderReport.clips[clipId].alignmentResidualWorld
      <= renderConfig.gates.maximumRetargetResidualWorld,
  );
}

const sandboxRoot = resolve(
  root,
  "testing/animation-sandbox/mixamo-punch-sequence-review-v1",
);
for (const file of ["index.html", "review.css", "review.js", "readme.md"]) {
  assert.equal(existsSync(resolve(sandboxRoot, file)), true, `${file} is missing`);
}
const reviewScript = readFileSync(resolve(sandboxRoot, "review.js"), "utf8");
assert.doesNotMatch(reviewScript, /playerAssetProfiles|survivalUalPlayerAssetProfile|PlayScene/);

for (const productionFile of [
  "index.html",
  "main.js",
  "values/survivalUalPlayerAssetProfile.js",
  "player/UalNativePlayerAnimations.js",
  "world/playScene/PlaySceneGameplay.js",
]) {
  assert.doesNotMatch(
    readFileSync(resolve(root, productionFile), "utf8"),
    /mixamo-punch-sequence|survival-mixamo-punch-v1/,
    `${productionFile} wires a review-only punch candidate`,
  );
}

console.log("MIXAMO_PUNCH_SEQUENCE_SANDBOX_CONTRACT_OK", {
  clips: clipIds.length,
  recipes: review.recipes.length,
  runtimeWired: false,
});
