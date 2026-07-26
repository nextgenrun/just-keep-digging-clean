import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const reviewRoot = `${root}visual-approval-previews/npc-planted-idles-v5/`;
const readJson = name => JSON.parse(readFileSync(`${reviewRoot}${name}`, "utf8"));
const readText = name => readFileSync(`${reviewRoot}${name}`, "utf8");

const spec = readJson("activity-spec.json");
const manifest = readJson("manifest.json");
const prompts = readJson("prompt-manifest.json");
const motionPrompts = readJson("idle-loop-prompt-manifest-v11.json");
const html = readText("index.html");
const app = readText("app.js");
const motion = readText("motion.css");
const runtimeManifest = JSON.parse(readFileSync(
  `${root}sprites/npc/npc-v11-piskel-motion-idles/manifest.json`,
  "utf8",
));

assert.equal(spec.npcs.length, 6);
assert.equal(spec.activityIds.length, 8);
assert.equal(new Set(spec.activityIds).size, 8);
assert.equal(manifest.productionChanged, true);
assert.equal(manifest.runtimeLoadedFromPreview, false);
assert.equal(manifest.poseCount, 66);
assert.equal(manifest.quietLoopFrameCount, 24);
assert.equal(manifest.piskelNormalized, true);
assert.equal(prompts.mode, "built-in image_gen");
assert.equal(prompts.prompts.length, 2);
assert.equal(motionPrompts.mode, "built-in image_gen");
assert.equal(motionPrompts.prompts.length, 2);
assert.equal(runtimeManifest.walkingRemoved, true);
assert.equal(runtimeManifest.frameMotionRestored, true);
assert.equal(runtimeManifest.piskelRoundTripped, true);
assert.equal(runtimeManifest.frameCount, 66);
assert.equal(Object.keys(runtimeManifest.merchants).length, 6);
assert.equal(spec.townRhythm.maxSimultaneousActivities, 1);
assert.ok(spec.townRhythm.quietShare >= 0.85);
assert.ok(spec.townRhythm.normalEventGapMs[0] >= 10000);

for (const npc of spec.npcs) {
  assert.equal(npc.activities.length, 8);
  assert.deepEqual(npc.activities.map(activity => activity.id), spec.activityIds);
  for (const activity of npc.activities) {
    if (activity.id !== "quiet") assert.ok(activity.durationMs >= 5000);
    const pose = `${reviewRoot}poses/${npc.slug}-${activity.id}.webp`;
    assert.ok(existsSync(pose), `missing ${pose}`);
  }
  for (const frameId of spec.quietLoop.frameIds) {
    const pose = `${reviewRoot}poses/${npc.slug}-${frameId}.webp`;
    assert.ok(existsSync(pose), `missing ${pose}`);
  }
  const merchant = runtimeManifest.merchants[npc.slug];
  assert.equal(merchant.uniformScale, 1);
  assert.ok(merchant.drift.maxRootAnchorDriftPx <= 1);
  assert.equal(merchant.drift.maxBottomDriftPx, 0);
  const piskelPath = `${root}${merchant.sourcePiskel}`;
  assert.ok(existsSync(piskelPath), `missing ${piskelPath}`);
  const piskel = JSON.parse(readFileSync(piskelPath, "utf8")).piskel;
  assert.equal(piskel.width, 512);
  assert.equal(piskel.height, 512);
  assert.equal(JSON.parse(piskel.layers[0]).frameCount, 11);
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

assert.equal(Object.keys(manifest.quietLoopBoards).length, 2);
for (const board of Object.values(manifest.quietLoopBoards)) {
  assert.ok(existsSync(`${root}${board.path}`), `missing ${board.path}`);
  assert.equal(board.columns.length, 4);
  assert.equal(board.rows.length, 3);
}

assert.match(html, /NPC Planted Idle Library v5/);
assert.match(html, /0\.00 px transform drift/);
assert.match(html, /66 Piskel-locked frames/);
assert.match(html, /4-frame rooted quiet loops/);
assert.match(app, /CACHE_VERSION/);
assert.match(app, /poses\/\$\{npc\.slug\}-\$\{poseId\}/);
assert.match(app, /advanceQuietLoop/);
assert.match(app, /quietSequenceIndex/);
assert.doesNotMatch(motion, /translate[XY]?\s*\(/i);
assert.doesNotMatch(motion, /@keyframes|rotate\s*\(|scale\s*\(/i);
assert.doesNotMatch(app, /animation-delay/i);
assert.match(app, /setManualActivity/);
assert.match(motion, /transform:\s*none/i);
assert.match(readText("style.css"), /opacity 1\.2s/);
assert.match(readText("style.css"), /transition-duration:\s*\.52s/);
assert.doesNotMatch(
  `${app}\n${motion}`,
  /--walk-offset|offsetTiles|translate[XY]?\s*\(|rotate\s*\(|scale\s*\(/i,
);
assert.deepEqual(spec.quietLoop.sequence, [
  "quiet0",
  "quiet1",
  "quiet2",
  "quiet3",
  "quiet2",
  "quiet1",
]);
assert.ok(spec.quietLoop.frameDurationsMs.every(ms => ms >= 850));

const productionSource = [
  "ui/scenes/BootScene.js",
  "world/playScene/NPCManager.js",
].map(path => readFileSync(`${root}${path}`, "utf8")).join("\n");
assert.doesNotMatch(
  productionSource,
  /visual-approval-previews\/npc-planted-idles-v5/,
  "production must load versioned runtime derivatives, never preview sources",
);

console.log("NPC planted idle review contract passed");
