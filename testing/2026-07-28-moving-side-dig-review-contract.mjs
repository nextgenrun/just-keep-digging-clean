import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reviewDir = resolve(root, "testing/animation-sandbox/moving-side-dig-review-v1");
const config = JSON.parse(readFileSync(resolve(root, "values/movingSideDigReview.json"), "utf8"));
const metrics = JSON.parse(readFileSync(resolve(reviewDir, "generated/moving-side-dig-metrics.json"), "utf8"));
const script = readFileSync(resolve(reviewDir, "review.js"), "utf8");

assert.equal(config.reviewOnly, true);
assert.equal(config.productionChanged, false);
assert.equal(config.defaultCandidateId, "phase-locked-combo");
assert.equal(config.build.frameCount, 44);
assert.equal(config.build.framesPerAction, 22);
assert.equal(config.build.runPhaseAdvanceFrames, 14);
assert.deepEqual(config.build.contactFrames, [6, 28]);
assert.equal(config.candidates.length, 4);
assert.equal(config.candidates.filter(({ recommended }) => recommended).length, 1);
const recommended = config.candidates.find(({ id }) => id === config.defaultCandidateId);
assert.equal(recommended.contactBackoffPx, 8);
assert.equal(recommended.contactFaceClearancePx, 2);
assert.equal(recommended.contactEnvelopePolicy, "shared-visible-silhouette");
assert.deepEqual(recommended.entryActionBlendWeights, [0.12, 0.26, 0.4, 0.54, 0.68, 0.84, 1]);
assert.deepEqual(recommended.exitActionBlendWeights, [0.94, 0.8, 0.66, 0.52, 0.38, 0.24, 0.1]);
assert.equal(metrics.reviewOnly, true);
assert.equal(metrics.productionChanged, false);
assert.equal(metrics.recommendedCandidateId, config.defaultCandidateId);

for (const candidate of config.candidates) {
  const sheet = resolve(reviewDir, candidate.sheet);
  const preview = resolve(reviewDir, candidate.preview);
  assert.equal(existsSync(sheet), true, `${candidate.id} sheet missing`);
  assert.equal(existsSync(preview), true, `${candidate.id} preview missing`);
  assert.ok(statSync(sheet).size > 10_000, `${candidate.id} sheet is unexpectedly small`);
  assert.equal(readFileSync(preview).subarray(0, 6).toString("ascii"), "GIF89a");
  const measured = metrics.candidates.find(({ id }) => id === candidate.id);
  assert.ok(measured, `${candidate.id} metrics missing`);
  assert.equal(measured.frameCount, config.build.frameCount);
  assert.deepEqual(measured.contactFrames, config.build.contactFrames);
  if (candidate.mode === "layered") {
    assert.equal(measured.lowerBodyPolicy, "continuous-run");
    assert.ok(measured.maxPelvisAlignmentErrorPx <= 1);
    assert.ok(measured.bottomDriftPx <= 1);
  }
  if (candidate.id === config.defaultCandidateId) {
    assert.equal(measured.contactEnvelopeRightSourcePx, 194);
  }
}

assert.match(script, /__MOVING_SIDE_DIG_REVIEW__/);
assert.match(script, /reviewOnly/);
assert.match(script, /productionChanged/);
assert.doesNotMatch(script, /UalMiningComboSelector|startDigAnimation|SURVIVAL_UAL_PLAYER_ASSET_PROFILE/);

console.log("MOVING_SIDE_DIG_REVIEW_CONTRACT_OK", {
  candidates: config.candidates.length,
  recommended: config.defaultCandidateId,
  contactBackoffPx: recommended.contactBackoffPx,
  contactFrames: config.build.contactFrames,
});
