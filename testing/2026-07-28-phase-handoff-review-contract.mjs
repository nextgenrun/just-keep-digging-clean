import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reviewRoot = resolve(root, "testing/animation-sandbox/phase-handoff-review-v1");
const config = JSON.parse(readFileSync(resolve(root, "values/phaseHandoffReview.json"), "utf8"));
const metrics = JSON.parse(readFileSync(
  resolve(reviewRoot, config.outputs.metrics),
  "utf8",
));

assert.equal(config.reviewOnly, true);
assert.equal(config.productionChanged, false);
assert.equal(config.defaultScenarioId, "moving-dig");
assert.equal(config.build.actionBlendFrames, 2);
assert.equal(config.build.pivotBridgeFrames, 2);
assert.equal(config.scenarios.length, 2);
assert.equal(metrics.reviewOnly, true);
assert.equal(metrics.productionChanged, false);

for (const scenario of config.scenarios) {
  const output = resolve(reviewRoot, scenario.output);
  assert.equal(existsSync(output), true, `${scenario.id} GIF is missing`);
  assert.ok(statSync(output).size > 100_000, `${scenario.id} GIF is unexpectedly small`);
  assert.equal(readFileSync(output).subarray(0, 6).toString("ascii"), "GIF89a");
}

const keyframes = resolve(reviewRoot, config.outputs.keyframes);
assert.equal(existsSync(keyframes), true);
assert.ok(statSync(keyframes).size > 100_000);
assert.equal(readFileSync(keyframes).subarray(1, 4).toString("ascii"), "PNG");

const moving = metrics.scenarios["moving-dig"];
assert.equal(moving.actionFrames, 14);
assert.equal(moving.contactFrame, 4);
assert.equal(moving.blendFrames, 2);
assert.equal(moving.inputDelayFrames, 0);
assert.deepEqual(
  [moving.entry.outgoingPhase, moving.entry.currentPhase, moving.entry.proposedPhase],
  [23, 9, 24],
);
assert.ok(moving.entry.currentFootDeltaLivePx > 40);
assert.ok(moving.entry.proposedFootDeltaLivePx < 1);
assert.ok(moving.release.currentFootDeltaLivePx > 35);
assert.ok(moving.release.proposedFootDeltaLivePx < 1.1);

const turn = metrics.scenarios["instant-turn"];
assert.equal(turn.pivotFrames, 2);
assert.equal(turn.inputDelayFrames, 0);
assert.deepEqual(turn.pivotPhases, [20, 21]);
assert.ok(turn.currentFootDeltaLivePx > 40);
assert.ok(turn.proposedFootDeltaLivePx < 2);

for (const file of [
  "build_mockups.py",
  "phase_handoff_geometry.py",
  "phase_handoff_renderer.py",
]) {
  const source = readFileSync(resolve(reviewRoot, file), "utf8");
  assert.ok(source.split(/\r?\n/).length <= 300, `${file} exceeds 300 lines`);
}

const builder = readFileSync(resolve(reviewRoot, "build_mockups.py"), "utf8");
assert.match(builder, /moving_side_dig_compositor/);
assert.match(builder, /build_candidate_frames/);
const reviewScript = readFileSync(resolve(reviewRoot, "review.js"), "utf8");
assert.match(reviewScript, /phaseHandoffReview\.json/);
assert.doesNotMatch(reviewScript, /PlayScene|UalNativeLocomotionTransitionSelector/);

for (const productionFile of [
  "systems/visual/UalNativeLocomotionTransitionSelector.js",
  "world/playScene/PlaySceneGameplay.js",
  "world/playScene/CaveActionAnimationRuntime.js",
  "values/survivalUalPlayerAssetProfile.js",
]) {
  assert.doesNotMatch(
    readFileSync(resolve(root, productionFile), "utf8"),
    /phaseHandoffReview/,
    `${productionFile} imports the review lab`,
  );
}

console.log("PHASE_HANDOFF_REVIEW_CONTRACT_OK", {
  scenarios: config.scenarios.length,
  movingEntryLivePx: {
    current: moving.entry.currentFootDeltaLivePx,
    proposed: moving.entry.proposedFootDeltaLivePx,
  },
  turnLivePx: {
    current: turn.currentFootDeltaLivePx,
    proposed: turn.proposedFootDeltaLivePx,
  },
});
