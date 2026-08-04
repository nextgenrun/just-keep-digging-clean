import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REVIEW_REL = "testing/animation-sandbox/side-dig-transition-polish-review-v1";
const REVIEW = path.join(ROOT, REVIEW_REL);
const CONFIG_PATH = path.join(ROOT, "values/sideDigTransitionPolishReview.json");
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
const metrics = JSON.parse(fs.readFileSync(
  path.join(REVIEW, config.outputs.metrics),
  "utf8",
));
const layout = JSON.parse(fs.readFileSync(
  path.join(REVIEW, config.outputs.layout),
  "utf8",
));

function gifSize(filePath) {
  const buffer = fs.readFileSync(filePath);
  assert.match(buffer.subarray(0, 6).toString("ascii"), /^GIF8[79]a$/);
  return [buffer.readUInt16LE(6), buffer.readUInt16LE(8)];
}

function pngSize(filePath) {
  const buffer = fs.readFileSync(filePath);
  assert.equal(buffer.subarray(1, 4).toString("ascii"), "PNG");
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

function assertCompactSource(filePath) {
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/).length;
  assert.ok(lines <= 301, `${path.relative(ROOT, filePath)} has ${lines} lines`);
}

assert.equal(config.reviewOnly, true);
assert.equal(config.productionChanged, false);
assert.equal(config.runtimeWiring, false);
assert.equal(metrics.reviewOnly, true);
assert.equal(metrics.productionChanged, false);
assert.equal(metrics.runtimeWiring, false);
assert.equal(metrics.scenarioCount, 3);

assert.ok(metrics.standing.currentMaxFootMarkerTravelPx > 3);
assert.equal(metrics.standing.proposedFootMarkerTravelPx, 0);
assert.ok(metrics.standing.currentLowerAnchorTravelPx > 0.1);
assert.ok(metrics.standing.proposedLowerAnchorTravelPx < 0.1);
assert.ok(metrics.standing.proposedFinalToRecoveryHeightDeltaPx < 0.1);
assert.ok(metrics.standing.currentFinalToRecoveryChangedPixels > 1000);
assert.equal(metrics.standing.proposedFinalToRecoveryChangedPixels, 0);
assert.equal(metrics.standing.proposedEndpointChangedPixels, 0);

assert.equal(metrics.blocked.currentBodyRootExcursionPx, 21);
assert.equal(metrics.blocked.proposedBodyRootExcursionPx, 0);
assert.equal(metrics.blocked.authoredRunFramesInRightLane, 28);
assert.equal(metrics.blocked.completeRunCycleInRightLane, true);
assert.equal(metrics.blocked.runToPlantPhaseContinuous, true);
assert.equal(metrics.blocked.rightLaneRunSpritePixelMismatches, 0);
assert.ok(metrics.blocked.currentActionLowerAnchorTravelPx > 1);
assert.ok(metrics.blocked.proposedActionLowerAnchorTravelPx < 5);
assert.ok(metrics.blocked.proposedSettledLowerAnchorTravelPx < 0.1);
assert.ok(metrics.blocked.currentRootDirectionReversals >= 3);
assert.equal(metrics.blocked.proposedRootDirectionReversals, 0);
assert.ok(metrics.blocked.currentForwardReturnDistancePx >= 42);
assert.equal(metrics.blocked.proposedForwardReturnDistancePx, 0);
assert.ok(metrics.blocked.proposedApproachTravelPx < metrics.blocked.currentApproachTravelPx);

assert.ok(metrics.collision.currentSolidFrames.rightFacing.intrusionPixels > 0);
for (const facing of ["rightFacing", "leftFacing"]) {
  const collision = metrics.collision.proposedSolidFrames[facing];
  assert.equal(collision.intrusionPixels, 0);
  assert.equal(collision.upperIntrusionPixels, 0);
  assert.equal(collision.lowerIntrusionPixels, 0);
  assert.ok(collision.minimumClearancePx >= 1);
}
assert.equal(metrics.collision.proposedSolidFrames.mirroredParity, true);
for (const action of Object.values(metrics.collision.proposedActions)) {
  assert.equal(action.mirroredParity, true);
  assert.equal(action.rightFacing.intrusionPixels, 0);
  assert.equal(action.leftFacing.intrusionPixels, 0);
  assert.ok(action.rightFacing.minimumClearancePx >= 1);
}

assert.ok(metrics.running.currentEntryResidualPixels > 0);
assert.equal(metrics.running.proposedEntryResidualPixels, 0);
assert.ok(metrics.running.currentExitResidualPixels > 0);
assert.equal(metrics.running.proposedExitResidualPixels, 0);
assert.equal(metrics.running.currentWorldRootTravelPx, metrics.running.proposedWorldRootTravelPx);

assert.equal(metrics.candidate.standingJabFrames, 27);
assert.equal(metrics.candidate.standingCrossFrames, 31);
assert.equal(metrics.candidate.movingJabFrames, 22);
assert.equal(metrics.candidate.movingCrossFrames, 22);
assert.ok(metrics.candidate.maxMovingPelvisAlignmentErrorPx <= 1);
assert.equal(metrics.piskel.frameCount, 102);
assert.equal(metrics.piskel.width, 256);
assert.equal(metrics.piskel.height, 256);
assert.equal(metrics.piskel.fps, 30);
assert.equal(metrics.piskel.roundTripIdentity, true);
assert.equal(layout.frameCount, 102);
assert.deepEqual(Object.fromEntries(
  Object.entries(layout.layout).map(([key, frames]) => [key, frames.length]),
), { standingJab: 27, standingCross: 31, movingJab: 22, movingCross: 22 });

for (const key of ["standingGif", "blockedGif", "runningGif"]) {
  const output = path.join(REVIEW, config.outputs[key]);
  assert.ok(fs.statSync(output).size > 250_000, `${key} is unexpectedly small`);
  assert.deepEqual(gifSize(output), [1280, 420]);
}
assert.deepEqual(
  pngSize(path.join(REVIEW, config.outputs.contactSheet)),
  [1280, 1260],
);
assert.deepEqual(
  pngSize(path.join(REVIEW, config.outputs.keyframeSheet)),
  [1920, 1260],
);
const sheet = fs.readFileSync(path.join(REVIEW, config.outputs.candidateSheet));
assert.equal(sheet.subarray(0, 4).toString("ascii"), "RIFF");
assert.equal(sheet.subarray(8, 12).toString("ascii"), "WEBP");
assert.ok(fs.statSync(path.join(REVIEW, config.outputs.piskel)).size > 500_000);

for (const filePath of walk(REVIEW)) {
  if ([".py", ".js", ".mjs"].includes(path.extname(filePath))) {
    assertCompactSource(filePath);
  }
}

const forbiddenToken = "sideDigTransitionPolishReview";
for (const directory of ["player", "systems", "world", "ui", "animations", "dynamic-systems"]) {
  const target = path.join(ROOT, directory);
  if (!fs.existsSync(target)) continue;
  for (const filePath of walk(target)) {
    if (![".js", ".json", ".ts"].includes(path.extname(filePath))) continue;
    assert.ok(
      !fs.readFileSync(filePath, "utf8").includes(forbiddenToken),
      `review config leaked into production: ${path.relative(ROOT, filePath)}`,
    );
  }
}

console.log(JSON.stringify({
  contract: "side-dig-transition-polish-review",
  status: "pass",
  reviewOnly: true,
  productionChanged: false,
  runtimeWiring: false,
  metrics: {
    standingFootTravelPx: [
      metrics.standing.currentMaxFootMarkerTravelPx,
      metrics.standing.proposedFootMarkerTravelPx,
    ],
    blockedRootExcursionPx: [
      metrics.blocked.currentBodyRootExcursionPx,
      metrics.blocked.proposedBodyRootExcursionPx,
    ],
    rightLaneAuthoredRunFrames: metrics.blocked.authoredRunFramesInRightLane,
    solidTileIntrusionPixels: [
      metrics.collision.currentSolidFrames.rightFacing.intrusionPixels,
      metrics.collision.proposedSolidFrames.rightFacing.intrusionPixels,
    ],
    proposedMinimumTileClearancePx:
      metrics.collision.proposedSolidFrames.rightFacing.minimumClearancePx,
    runningEdgeResidualPixels: [
      metrics.running.currentEntryResidualPixels + metrics.running.currentExitResidualPixels,
      metrics.running.proposedEntryResidualPixels + metrics.running.proposedExitResidualPixels,
    ],
  },
}, null, 2));
