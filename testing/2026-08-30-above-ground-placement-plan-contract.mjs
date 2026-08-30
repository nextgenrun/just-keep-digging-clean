import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAboveGroundPlacementPlanData } from
  "./2026-08-30-above-ground-placement-plan-data.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = buildAboveGroundPlacementPlanData();
const { plan, records, summary } = data;

assert.equal(plan.reviewOnly, true);
assert.equal(plan.productionChanged, false);
assert.equal(plan.worldSpan.leftTile, 0);
assert.equal(plan.worldSpan.rightTileExclusive, 280);
assert.equal(plan.slices.length, 7);
assert.equal(plan.slices[0].id, "town-lock");
assert.equal(plan.slices[0].townLocked, true);
assert.equal(plan.slices[0].rightTileExclusive, 23.05);
assert.equal(plan.townVideo.policy, "locked-byte-for-byte-and-excluded-from-visual-merge");

for (let index = 0; index < plan.slices.length; index += 1) {
  const slice = plan.slices[index];
  assert(slice.rightTileExclusive > slice.leftTile);
  if (index > 0) {
    assert.equal(slice.leftTile, plan.slices[index - 1].rightTileExclusive);
  }
}
assert.equal(plan.slices.at(-1).rightTileExclusive, 280);

assert.equal(records.length, 500);
assert.equal(new Set(records.map(entry => entry.id)).size, records.length);
assert.equal(summary.backgrounds, 247);
assert.equal(summary.props, 253);
assert.equal(summary.excludedBackgrounds, 33);
assert.equal(summary.suppressedBackgrounds, 28);
assert.deepEqual(summary.familyCounts, {
  "generated-sky-prop": 60,
  "generated-surface-prop": 140,
  "ground-variation-repeat": 23,
  "hero-landmark": 7,
  "retained-authored-prop": 46,
  "sky-cohesion-card": 56,
  "sky-foundation": 1,
  "sky-island-far-repeat": 28,
  "surface-edge-repeat": 17,
  "surface-far-repeat": 28,
  "town-pack": 4,
  "v11-obsolete-sky": 33,
  "v11-terrain-card": 57,
});

const props = records.filter(entry => entry.kind === "prop");
assert(props.every(entry => entry.phaseId !== "stream-buffer"));
assert(props.every(entry => Number.isFinite(entry.anchorX) && Number.isFinite(entry.anchorY)));
assert.equal(summary.phases.reduce((total, phase) => total + phase.propCount, 0), 253);
assert.equal(summary.phases.find(phase => phase.id === "town-lock").propCount, 0);

const townVideo = records.find(entry => entry.id === "background:town-air-video");
assert(townVideo);
assert.equal(townVideo.status, "locked");
assert.equal(townVideo.path, plan.townVideo.path);
const videoBytes = await readFile(join(root, townVideo.path));
const videoSha256 = createHash("sha256").update(videoBytes).digest("hex");
assert.equal(videoSha256, plan.townVideo.sha256);

console.log(JSON.stringify({
  ok: true,
  records: summary.totalRecords,
  backgrounds: summary.backgrounds,
  props: summary.props,
  mergeSlices: plan.slices.length,
  townVideo: {
    policy: plan.townVideo.policy,
    sha256: videoSha256,
  },
}, null, 2));
