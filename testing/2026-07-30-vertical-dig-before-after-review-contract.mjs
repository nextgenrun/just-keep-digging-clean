import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reviewRoot = resolve(
  root,
  "testing/animation-sandbox/vertical-dig-before-after-v1",
);
const config = JSON.parse(readFileSync(
  resolve(root, "values/verticalDigBeforeAfterReview.json"),
  "utf8",
));
const metrics = JSON.parse(readFileSync(
  resolve(reviewRoot, config.outputs.metrics),
  "utf8",
));

assert.equal(config.schemaVersion, 1);
assert.equal(config.reviewOnly, true);
assert.equal(config.productionChanged, false);
assert.equal(config.scenarios.length, 4);
assert.deepEqual(
  config.scenarios.map(({ id }) => id),
  ["stationary-up", "stationary-down", "moving-up", "moving-down"],
);
assert.deepEqual(
  config.scenarios.map(({ contactSequenceIndex }) => contactSequenceIndex),
  [11, 14, 7, 6],
);
assert.equal(config.scenarios[1].previewContactFrame, 14);
assert.equal(config.geometry.tileSizePx, 94);
assert.equal(config.geometry.playerBodyWidthPx, 31);
assert.equal(config.geometry.playerBodyHeightPx, 75);
assert.equal(config.geometry.targetAnchorX, 128);
assert.equal(config.geometry.targetBottomY, 247);
assert.equal(
  config.geometry.targetBottomY,
  config.geometry.visualOriginY * config.geometry.frameHeight,
);
assert.equal(config.render.currentReleaseOffsetWeights.length, config.render.movingPostFrames);

assert.equal(metrics.version, config.version);
assert.equal(metrics.reviewOnly, true);
assert.equal(metrics.productionChanged, false);
assert.equal(metrics.scenarioCount, 4);

for (const scenario of config.scenarios) {
  const output = resolve(reviewRoot, scenario.output);
  assert.equal(existsSync(output), true, `${scenario.id} GIF is missing`);
  assert.ok(statSync(output).size > 300_000, `${scenario.id} GIF is too small`);
  const gif = readFileSync(output);
  assert.equal(gif.subarray(0, 6).toString("ascii"), "GIF89a");
  assert.equal(gif.readUInt16LE(6), config.render.canvasWidth);
  assert.equal(gif.readUInt16LE(8), config.render.laneHeight);

  const metric = metrics.scenarios[scenario.id];
  assert.ok(metric, `${scenario.id} metrics are missing`);
  assert.equal(metric.proposedSpriteOffsetPx.magnitude, 0);
  assert.equal(metric.proposedOpaqueTileIntrusionPixels, 0);
  assert.ok(
    metric.after.bottomDriftSourcePx <= config.candidate.bottomDriftLimitSourcePx,
    `${scenario.id} proposed baseline drifts`,
  );
  assert.equal(metric.inputDelayFrames, 0);
}

const stationaryUp = metrics.scenarios["stationary-up"];
assert.ok(
  stationaryUp.after.minimumVisibleHeightPx
    >= stationaryUp.before.minimumVisibleHeightPx + 5,
);
assert.equal(stationaryUp.currentSpriteOffsetPx.magnitude, 0);

const stationaryDown = metrics.scenarios["stationary-down"];
assert.equal(
  stationaryDown.currentSpriteOffsetPx.magnitude,
  config.geometry.currentMaxOffsetYPx,
);
assert.ok(stationaryDown.currentOpaqueTileIntrusionPixels > 1_000);
assert.ok(stationaryDown.before.medianVisibleHeightPx < 65);
assert.ok(stationaryDown.after.medianVisibleHeightPx >= 70);
assert.ok(stationaryDown.after.medianVisibleHeightPx <= 76);
assert.equal(stationaryDown.after.bottomDriftSourcePx, 0);

for (const id of ["moving-up", "moving-down"]) {
  const moving = metrics.scenarios[id];
  assert.ok(moving.currentSpriteOffsetPx.magnitude > 22);
  assert.equal(moving.proposedSpriteOffsetPx.magnitude, 0);
}
const movingUp = metrics.scenarios["moving-up"];
assert.ok(
  movingUp.after.minimumVisibleHeightPx >= movingUp.before.minimumVisibleHeightPx + 5,
);
const movingDown = metrics.scenarios["moving-down"];
assert.ok(movingDown.currentOpaqueTileIntrusionPixels > 200);
assert.ok(
  movingDown.after.minimumVisibleHeightPx >= movingDown.before.minimumVisibleHeightPx + 9,
);

const png = readFileSync(resolve(reviewRoot, config.outputs.contactSheet));
assert.deepEqual(
  [...png.subarray(0, 8)],
  [137, 80, 78, 71, 13, 10, 26, 10],
);
assert.equal(png.readUInt32BE(16), config.render.canvasWidth);
assert.equal(png.readUInt32BE(20), config.render.laneHeight);

for (const output of [
  config.outputs.stationaryUpSheet,
  config.outputs.stationaryDownSheet,
  config.outputs.movingSheet,
]) {
  assert.equal(existsSync(resolve(reviewRoot, output)), true, `${output} is missing`);
  assert.ok(statSync(resolve(reviewRoot, output)).size > 100_000);
}

for (const file of [
  "build_mockups.py",
  "vertical_dig_candidates.py",
  "vertical_dig_renderer.py",
  "vertical_dig_sequences.py",
]) {
  const source = readFileSync(resolve(reviewRoot, file), "utf8");
  assert.ok(source.split(/\r?\n/).length <= 300, `${file} exceeds 300 lines`);
}

const candidates = readFileSync(
  resolve(reviewRoot, "vertical_dig_candidates.py"),
  "utf8",
);
assert.match(candidates, /player_animation_diagonal_compositor/);
assert.match(candidates, /player_animation_polish_compositor/);
assert.match(candidates, /build_diagonal_frames/);
assert.match(candidates, /_aligned_frame/);
assert.match(config.sources.blenderDigDown.file, /blender-v2-dig-down-sheet\.png$/);

const reviewScript = readFileSync(resolve(reviewRoot, "review.js"), "utf8");
assert.match(reviewScript, /__VERTICAL_DIG_BEFORE_AFTER_REVIEW__/);
assert.match(reviewScript, /reviewOnly:\s*true/);
assert.doesNotMatch(reviewScript, /PlayScene|CaveActionAnimationRuntime/);

for (const productionFile of [
  "world/playScene/PlaySceneGameplay.js",
  "world/playScene/CaveActionAnimationRuntime.js",
  "values/survivalUalPlayerAssetProfile.js",
  "values/playerAnimationPolishProduction.json",
]) {
  assert.doesNotMatch(
    readFileSync(resolve(root, productionFile), "utf8"),
    /verticalDigBeforeAfterReview|vertical-dig-before-after-v1/,
    `${productionFile} imports the review sandbox`,
  );
}

console.log("VERTICAL_DIG_BEFORE_AFTER_REVIEW_CONTRACT_OK", {
  scenarios: config.scenarios.length,
  stationaryDownIntrusionBefore: stationaryDown.currentOpaqueTileIntrusionPixels,
  stationaryDownIntrusionAfter: stationaryDown.proposedOpaqueTileIntrusionPixels,
  movingDownIntrusionBefore: movingDown.currentOpaqueTileIntrusionPixels,
  movingDownIntrusionAfter: movingDown.proposedOpaqueTileIntrusionPixels,
  movingSpriteOffsetBeforePx: movingDown.currentSpriteOffsetPx.magnitude,
  movingSpriteOffsetAfterPx: movingDown.proposedSpriteOffsetPx.magnitude,
  productionChanged: false,
});
