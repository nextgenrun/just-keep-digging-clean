import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REVIEW_REL = "testing/animation-sandbox/player-animation-optimization-500-review-v1";
const REVIEW = path.join(ROOT, REVIEW_REL);
const CONFIG_PATH = path.join(ROOT, "values/playerAnimationOptimization500Review.json");
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
const catalog = JSON.parse(fs.readFileSync(
  path.join(REVIEW, config.outputs.catalog),
  "utf8"
));
const metrics = JSON.parse(fs.readFileSync(
  path.join(REVIEW, config.outputs.metrics),
  "utf8"
));

function countBy(items, key) {
  return items.reduce((counts, item) => {
    counts.set(item[key], (counts.get(item[key]) || 0) + 1);
    return counts;
  }, new Map());
}

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

function assertCompactSource(filePath) {
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/).length;
  assert.ok(lines <= 301, `${path.relative(ROOT, filePath)} has ${lines} lines`);
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

assert.equal(config.reviewOnly, true);
assert.equal(config.productionChanged, false);
assert.equal(config.catalog.expectedFamilyCount, 20);
assert.equal(config.catalog.expectedLensCount, 25);
assert.equal(config.catalog.expectedPointCount, 500);
assert.equal(config.families.length, 20);
assert.equal(config.lenses.length, 25);
assert.equal(config.families.length * config.lenses.length, 500);
assert.equal(config.scenarios.length, 3);
assert.equal(new Set(config.families.map((item) => item.id)).size, 20);
assert.equal(new Set(config.lenses.map((item) => item.id)).size, 25);
assert.equal(new Set(config.hotspots).size, config.hotspots.length);

assert.equal(catalog.reviewOnly, true);
assert.equal(catalog.productionChanged, false);
assert.equal(catalog.familyCount, 20);
assert.equal(catalog.lensCount, 25);
assert.equal(catalog.pointCount, 500);
assert.equal(catalog.points.length, 500);
assert.equal(catalog.verifiedHotspotCount, config.hotspots.length);
assert.equal(new Set(catalog.points.map((point) => point.id)).size, 500);
assert.equal(
  new Set(catalog.points.map((point) => `${point.familyId}:${point.lensId}`)).size,
  500
);
catalog.points.forEach((point, index) => {
  assert.equal(point.id, `OPT-${String(index + 1).padStart(3, "0")}`);
  assert.ok(point.recommendation.length > 35);
  assert.ok(point.currentEvidence.length > 25);
  assert.ok(point.passRule.length > 20);
  assert.ok(["critical", "high", "medium", "watch"].includes(point.priority));
});
for (const count of countBy(catalog.points, "familyId").values()) assert.equal(count, 25);
for (const count of countBy(catalog.points, "lensId").values()) assert.equal(count, 20);
assert.equal(
  Object.values(catalog.priorityCounts).reduce((sum, value) => sum + value, 0),
  500
);

assert.equal(metrics.reviewOnly, true);
assert.equal(metrics.productionChanged, false);
assert.equal(metrics.scenarioCount, 3);
assert.equal(metrics.catalog.pointCount, 500);
assert.ok(metrics.stationaryRelease.currentContactOffsetPx > 16);
assert.equal(metrics.stationaryRelease.proposedContactOffsetPx, 0);
assert.ok(metrics.stationaryRelease.currentOpaqueTileIntrusionPixels >= 70);
assert.equal(metrics.stationaryRelease.proposedOpaqueTileIntrusionPixels, 0);
assert.ok(metrics.stationaryRelease.currentReleaseHeightJumpPx > 8);
assert.ok(metrics.stationaryRelease.proposedReleaseHeightJumpPx < 1);
assert.ok(metrics.landingFinish.currentFinalToIdleDeltaPx > 10);
assert.ok(metrics.landingFinish.proposedFinalToIdleDeltaPx < 1);
assert.ok(metrics.wallPush.currentLoopMedianHeightPx < 60);
assert.ok(metrics.wallPush.proposedLoopMedianHeightPx >= 73);
assert.ok(metrics.wallPush.currentEntryToLoopDeltaPx > 7);
assert.ok(metrics.wallPush.proposedEntryToLoopDeltaPx < 0.1);
assert.ok(metrics.wallPush.currentLoopToExitDeltaPx > 14);
assert.ok(metrics.wallPush.proposedLoopToExitDeltaPx < 1);

for (const scenario of config.scenarios) {
  const output = path.join(REVIEW, scenario.output);
  assert.ok(fs.statSync(output).size > 300_000, `${scenario.id} GIF is unexpectedly small`);
  assert.deepEqual(gifSize(output), [1280, 380]);
}
const candidatePath = path.join(REVIEW, config.outputs.candidateSheet);
const candidateHeader = fs.readFileSync(candidatePath).subarray(0, 12);
assert.equal(candidateHeader.subarray(0, 4).toString("ascii"), "RIFF");
assert.equal(candidateHeader.subarray(8, 12).toString("ascii"), "WEBP");
assert.ok(fs.statSync(candidatePath).size > 300_000);
assert.deepEqual(
  pngSize(path.join(REVIEW, config.outputs.contactSheet)),
  [1280, 570]
);

const sourceExtensions = new Set([".py", ".js", ".css", ".html"]);
for (const filePath of walk(REVIEW)) {
  if (sourceExtensions.has(path.extname(filePath))) assertCompactSource(filePath);
}
const candidateSource = fs.readFileSync(
  path.join(REVIEW, "optimization_candidates.py"),
  "utf8"
);
assert.match(candidateSource, /from moving_side_dig_compositor import/);
assert.match(candidateSource, /from player_animation_polish_compositor import/);
const reviewSource = fs.readFileSync(path.join(REVIEW, "review.js"), "utf8");
assert.match(reviewSource, /__PLAYER_ANIMATION_OPTIMIZATION_500_REVIEW__/);
assert.match(reviewSource, /catalog\.pointCount !== 500/);

const forbiddenToken = "playerAnimationOptimization500Review";
for (const productionDirectory of ["player", "systems", "world", "ui", "dynamic-systems"]) {
  for (const filePath of walk(path.join(ROOT, productionDirectory))) {
    if (![".js", ".json", ".ts"].includes(path.extname(filePath))) continue;
    assert.ok(
      !fs.readFileSync(filePath, "utf8").includes(forbiddenToken),
      `review config leaked into production source: ${path.relative(ROOT, filePath)}`
    );
  }
}

console.log(JSON.stringify({
  contract: "player-animation-optimization-500-review",
  status: "pass",
  reviewOnly: true,
  productionChanged: false,
  pointCount: catalog.pointCount,
  familyCount: catalog.familyCount,
  lensCount: catalog.lensCount,
  scenarioCount: config.scenarios.length,
  metrics: {
    sideContactOffset: [
      metrics.stationaryRelease.currentContactOffsetPx,
      metrics.stationaryRelease.proposedContactOffsetPx
    ],
    landingFinishDelta: [
      metrics.landingFinish.currentFinalToIdleDeltaPx,
      metrics.landingFinish.proposedFinalToIdleDeltaPx
    ],
    wallLoopHeight: [
      metrics.wallPush.currentLoopMedianHeightPx,
      metrics.wallPush.proposedLoopMedianHeightPx
    ]
  }
}, null, 2));
