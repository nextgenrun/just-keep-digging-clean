import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const reviewRoot = `${root}visual-approval-previews/npc-planted-idles-v5/`;
const readJson = (name) => JSON.parse(
  readFileSync(`${reviewRoot}${name}`, "utf8"),
);
const readText = (name) => readFileSync(`${reviewRoot}${name}`, "utf8");

const spec = readJson("activity-spec.json");
const manifest = readJson("manifest.json");
const prompts = readJson("prompt-manifest.json");
const rejected = readJson("rejected-quiet-states-v11.json");
const html = readText("index.html");
const app = readText("app.js");
const motion = readText("motion.css");
const style = readText("style.css");
const runtimeManifest = JSON.parse(readFileSync(
  `${root}sprites/npc/npc-v13-piskel-polished-activities/manifest.json`,
  "utf8",
));
const baselineManifest = JSON.parse(readFileSync(
  `${root}sprites/npc/npc-v13-polished-baselines/manifest.json`,
  "utf8",
));
const archivedManifest = JSON.parse(readFileSync(
  `${root}sprites/npc/npc-v11-piskel-motion-idles/manifest.json`,
  "utf8",
));

const rejectedLabels = [
  "Quiet ready",
  "Heavy rest",
  "Friendly wait",
  "Guard the coin",
  "Grounded charge",
  "Balanced guard",
];
const activeReviewText = `${JSON.stringify(spec)}\n${html}\n${app}`;

assert.equal(spec.npcs.length, 6);
assert.equal(spec.activityIds.length, 7);
assert.equal(new Set(spec.activityIds).size, 7);
assert.equal("quietLoop" in spec, false);
assert.equal(spec.baselinePolicy.label, "Original calm idle");
assert.equal(manifest.productionChanged, true);
assert.equal(manifest.runtimeLoadedFromPreview, false);
assert.equal(manifest.poseCount, 42);
assert.equal(manifest.piskelNormalized, true);
assert.equal(manifest.rejectedQuietConceptsExcluded, true);
assert.equal(prompts.mode, "built-in image_gen");
assert.equal(prompts.prompts.length, 2);
assert.equal(rejected.reviewOnly, true);
assert.equal(rejected.productionChanged, false);
assert.equal(rejected.runtimeApproved, false);
assert.deepEqual(
  rejected.states.map((state) => state.label),
  rejectedLabels,
);
assert.equal(runtimeManifest.walkingRemoved, true);
assert.equal(runtimeManifest.piskelRoundTripped, true);
assert.equal(runtimeManifest.silhouetteMatched, true);
assert.equal(runtimeManifest.chromaLeakRemoved, true);
assert.equal(runtimeManifest.rejectedQuietConceptsExcluded, true);
assert.equal(runtimeManifest.frameCount, 42);
assert.equal(Object.keys(runtimeManifest.merchants).length, 6);
assert.equal(archivedManifest.runtimeApproved, false);
assert.equal(archivedManifest.reviewOnly, true);
assert.equal(baselineManifest.chromaLeakRemoved, true);
assert.equal(spec.townRhythm.maxSimultaneousActivities, 1);
assert.ok(spec.townRhythm.quietShare >= 0.88);
assert.ok(spec.townRhythm.normalEventGapMs[0] >= 22000);

for (const label of rejectedLabels) {
  assert.doesNotMatch(activeReviewText, new RegExp(label, "i"));
}

for (const npc of spec.npcs) {
  assert.equal(npc.activities.length, 7);
  assert.deepEqual(
    npc.activities.map((activity) => activity.id),
    spec.activityIds,
  );
  assert.ok(["video", "image"].includes(npc.baseline.type));
  assert.match(npc.baseline.path, /npc-v13-polished-baselines/);
  const baselinePath = resolve(
    reviewRoot,
    npc.baseline.path.split("?")[0],
  );
  assert.ok(existsSync(baselinePath), `missing ${baselinePath}`);
  for (const activity of npc.activities) {
    assert.ok(activity.durationMs >= 5000);
    const pose = `${reviewRoot}poses/${npc.slug}-${activity.id}.webp`;
    assert.ok(existsSync(pose), `missing ${pose}`);
  }
  const merchant = runtimeManifest.merchants[npc.slug];
  assert.ok(merchant.uniformScale >= 0.85);
  assert.ok(merchant.uniformScale <= 1.25);
  assert.ok(merchant.silhouetteErrorPx <= 0.5);
  assert.ok(merchant.maxBaselineRootErrorPx <= 1);
  assert.ok(merchant.maxBaselineBottomErrorPx <= 0.5);
  assert.equal(merchant.largeGreenLeakPixelsAfter, 0);
  assert.ok(merchant.drift.maxRootAnchorDriftPx <= 1);
  assert.equal(merchant.drift.maxBottomDriftPx, 0);
  const piskelPath = `${root}${merchant.sourcePiskel}`;
  assert.ok(existsSync(piskelPath), `missing ${piskelPath}`);
  const piskel = JSON.parse(readFileSync(piskelPath, "utf8")).piskel;
  assert.equal(piskel.width, 512);
  assert.equal(piskel.height, 512);
  assert.equal(JSON.parse(piskel.layers[0]).frameCount, 7);
}

assert.equal(Object.keys(manifest.boards).length, 4);
for (const board of Object.values(manifest.boards)) {
  assert.ok(existsSync(`${root}${board.path}`), `missing ${board.path}`);
  assert.equal(board.columns.length, 4);
  assert.equal(board.rows.length, 3);
  for (let index = 0; index < board.columns.length - 1; index += 1) {
    assert.ok(board.columns[index + 1][0] - board.columns[index][1] >= 6);
  }
  for (let index = 0; index < board.rows.length - 1; index += 1) {
    assert.ok(board.rows[index + 1][0] - board.rows[index][1] >= 6);
  }
}

assert.equal(Object.keys(manifest.rejectedQuietLoopBoards).length, 2);
for (const board of Object.values(manifest.rejectedQuietLoopBoards)) {
  assert.ok(existsSync(`${root}${board.path}`), `missing ${board.path}`);
}

assert.match(html, /NPC Approved Activity Library v7/);
assert.match(html, /0\.00 px transform drift/);
assert.match(html, /0 green\/matte leakage/);
assert.match(html, /baseline-matched silhouettes/);
assert.match(html, /42 approved Piskel frames/);
assert.match(html, /6 rejected concepts excluded/);
assert.match(html, /original calm idle/i);
assert.match(app, /CACHE_VERSION/);
assert.match(app, /baselineMarkup/);
assert.match(app, /poses\/\$\{npc\.slug\}-\$\{poseId\}/);
assert.doesNotMatch(app, /advanceQuietLoop|quietSequenceIndex|quietFrameId/);
assert.doesNotMatch(motion, /translate[XY]?\s*\(/i);
assert.doesNotMatch(motion, /@keyframes|rotate\s*\(|scale\s*\(/i);
assert.doesNotMatch(app, /animation-delay/i);
assert.match(app, /setManualActivity/);
assert.match(motion, /transform:\s*none/i);
assert.match(style, /opacity 1\.65s/);
assert.match(style, /transition-duration:\s*1\.4s/);
assert.doesNotMatch(
  `${app}\n${motion}`,
  /--walk-offset|offsetTiles|translate[XY]?\s*\(|rotate\s*\(|scale\s*\(/i,
);

const productionSource = [
  "ui/scenes/BootScene.js",
  "world/playScene/NPCManager.js",
].map((path) => readFileSync(`${root}${path}`, "utf8")).join("\n");
assert.doesNotMatch(
  productionSource,
  /visual-approval-previews\/npc-planted-idles-v5/,
  "production must load versioned runtime derivatives, never preview sources",
);

console.log("NPC approved activity review contract passed");
