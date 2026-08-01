import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reviewRoot = resolve(
  root,
  "testing/animation-sandbox/held-dig-next-five-review-v1",
);
const config = JSON.parse(readFileSync(
  resolve(root, "values/heldDigNextFiveReview.json"),
  "utf8",
));
const metrics = JSON.parse(readFileSync(
  resolve(reviewRoot, config.outputs.metrics),
  "utf8",
));
const manifest = JSON.parse(readFileSync(
  resolve(root, config.sources.runtimeManifest),
  "utf8",
));

assert.equal(config.reviewOnly, true);
assert.equal(config.productionChanged, false);
assert.equal(config.productionDecision, "rejected-after-runtime-test");
assert.equal(config.schemaVersion, 2);
assert.equal(config.scenarios.length, 5);
assert.deepEqual(config.scenarios.map(({ rank }) => rank), [1, 2, 3, 4, 5]);
assert.equal(new Set(config.scenarios.map(({ id }) => id)).size, 5);
assert.equal(config.build.effectiveCooldownMs, 750);
assert.equal(config.build.playerBodyWidthPx, 31);
assert.equal(config.build.playerBodyHeightPx, 75);
assert.equal(config.build.tileSizePx, 94);
assert.equal(config.build.currentAttackDisplaySizePx, 109);
assert.equal(config.build.proposedAttackDisplaySizePx, 123);
assert.ok(config.build.currentMovingUpperScale < 0.9);
assert.equal(config.build.proposedMovingUpperScale, 1);

assert.equal(metrics.version, config.version);
assert.equal(metrics.reviewOnly, true);
assert.equal(metrics.productionChanged, false);
assert.equal(metrics.scenarios.length, 5);

for (const scenario of config.scenarios) {
  const output = resolve(reviewRoot, scenario.output);
  assert.equal(existsSync(output), true, `${scenario.id} GIF is missing`);
  assert.ok(statSync(output).size > 500_000, `${scenario.id} GIF is too small`);
  const gif = readFileSync(output);
  assert.equal(gif.subarray(0, 6).toString("ascii"), "GIF89a");
  assert.equal(gif.readUInt16LE(6), config.build.canvasWidth);
  assert.equal(gif.readUInt16LE(8), config.build.panelHeight);
}

const contactSheet = readFileSync(resolve(reviewRoot, config.outputs.contactSheet));
assert.deepEqual(
  [...contactSheet.subarray(0, 8)],
  [137, 80, 78, 71, 13, 10, 26, 10],
);
assert.equal(contactSheet.readUInt32BE(16), config.build.canvasWidth);
assert.equal(
  contactSheet.readUInt32BE(20),
  (config.build.panelHeight + 52) * config.scenarios.length,
);

const byId = Object.fromEntries(metrics.scenarios.map((entry) => [entry.id, entry]));
for (const metric of metrics.scenarios) {
  assert.deepEqual(
    metric.contactFramesAfter,
    metric.contactFramesBefore,
    `${metric.id} changes contact timing`,
  );
}

const moving = byId["moving-hold-scale-lock"];
assert.equal(moving.proposedApparentScale, 1);
assert.equal(moving.sizePulsePercentAfter, 0);
assert.ok(moving.sizePulsePercentBefore > 11);
assert.ok(moving.proposedTorsoLengthSourcePx > moving.currentTorsoLengthSourcePx);
assert.ok(moving.bottomDriftPxAfter <= 1);
assert.ok(moving.pelvisAlignmentErrorPxAfter <= 1);

for (const id of ["jog-jab-size-lock", "jog-cross-size-lock"]) {
  const attack = byId[id];
  assert.equal(attack.displaySizePxBefore, 109);
  assert.equal(attack.displaySizePxAfter, 123);
  assert.equal(attack.sizePulsePercentAfter, 0);
  assert.ok(attack.contactVisualOffsetPxAfter < attack.contactVisualOffsetPxBefore);
}

const moveStart = byId["move-during-strike-scale-lock"];
assert.equal(moveStart.sizePulsePercentAfter, 0);
assert.equal(moveStart.standingFootTravelFramesAfter, 0);

const heldChain = byId["held-chain-scale-lock"];
assert.equal(heldChain.sizePulsePercentAfter, 0);
assert.equal(heldChain.afterJogFlashFrames, 0);

assert.equal(manifest.moving_side_dig_pipeline.version, 5);
assert.equal("action_scale" in manifest.moving_side_dig_pipeline, false);
assert.equal(manifest.moving_side_dig_pipeline.contact_visual_alignment_enabled, false);
assert.equal(manifest.moving_side_dig_pipeline.contact_envelope_right_source_px, 194);
assert.equal(manifest.moving_side_dig_pipeline.moving_quickslash.contact_sequence_index, 4);
for (const action of ["moving-side-dig-jab", "moving-side-dig-cross"]) {
  assert.equal(manifest.actions[action].frame_count, 22);
  assert.equal("action_scale" in manifest.actions[action].composition, false);
}

for (const file of [
  "build_mockups.py",
  "held_dig_output.py",
  "held_dig_renderer.py",
  "held_dig_scale_lock.py",
  "held_dig_sequence_core.py",
  "held_dig_sequences.py",
  "held_dig_stationary_scale_sequences.py",
  "held_dig_speed_sequence.py",
]) {
  const source = readFileSync(resolve(reviewRoot, file), "utf8");
  assert.ok(source.split(/\r?\n/).length <= 300, `${file} exceeds 300 lines`);
}

const reviewScript = readFileSync(resolve(reviewRoot, "review.js"), "utf8");
assert.match(reviewScript, /__HELD_DIG_NEXT_FIVE_REVIEW__/);
assert.match(reviewScript, /reviewOnly:\s*true/);
assert.doesNotMatch(reviewScript, /PlayScene|CaveActionAnimationRuntime/);

for (const productionFile of [
  "world/playScene/PlaySceneGameplay.js",
  "world/playScene/CaveActionAnimationRuntime.js",
  "systems/visual/UalNativeLocomotionTransitionSelector.js",
  "values/survivalUalPlayerAssetProfile.js",
]) {
  assert.doesNotMatch(
    readFileSync(resolve(root, productionFile), "utf8"),
    /heldDigNextFiveReview|held-dig-next-five-review/,
    `${productionFile} imports the review sandbox`,
  );
}

console.log("HELD_DIG_SCALE_ANCHOR_REVIEW_CONTRACT_OK", {
  scenarios: config.scenarios.length,
  cadenceMs: config.build.effectiveCooldownMs,
  sizePulsePercentBefore: moving.sizePulsePercentBefore,
  sizePulsePercentAfter: moving.sizePulsePercentAfter,
  contactTimingPreserved: true,
  productionChanged: false,
});
