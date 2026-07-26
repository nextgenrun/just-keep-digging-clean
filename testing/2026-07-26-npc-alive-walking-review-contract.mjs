import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const reviewRoot = `${root}visual-approval-previews/npc-alive-walking-v4/`;
const readJson = name => JSON.parse(readFileSync(`${reviewRoot}${name}`, "utf8"));
const readText = name => readFileSync(`${reviewRoot}${name}`, "utf8");

const spec = readJson("walking-spec.json");
const manifest = readJson("manifest.json");
const prompts = readJson("prompt-manifest.json");
const html = readText("index.html");
const productionSource = [
  "values/npcActivityConfig.js",
  "values/assetKeys.js",
  "systems/visual/NPCActivitySystem.js",
  "systems/visual/npcActivityVisuals.js",
  "world/playScene/NPCManager.js",
  "ui/scenes/BootScene.js",
].map(path => readFileSync(`${root}${path}`, "utf8")).join("\n");

assert.equal(spec.reviewOnly, true);
assert.equal(spec.productionChangedByThisMockup, false);
assert.equal(spec.status, "rejected");
assert.equal(spec.historicalArtifact, true);
assert.equal(spec.runtimeBaseline.walkingRemoved, true);
assert.deepEqual(spec.runtimeBaseline.rollback, ["?npcActivities=0"]);
assert.equal(manifest.reviewOnly, true);
assert.equal(manifest.productionChanged, false);
assert.equal(manifest.rejected, true);
assert.equal(manifest.runtimeAlreadyWired, false);
assert.equal(
  manifest.replacement,
  "visual-approval-previews/npc-planted-idles-v5/",
);
assert.deepEqual(manifest.runtimeFilesChangedByMockup, []);
assert.equal(prompts.reviewOnly, true);
assert.equal(prompts.rejected, true);
assert.equal(Object.keys(prompts.prompts).length, 2);

assert.equal(spec.npcs.length, 6);
for (const npc of spec.npcs) {
  const frames = manifest.frames[npc.slug];
  assert.equal(frames.length, 5);
  for (const frame of frames) {
    assert.ok(existsSync(`${root}${frame.path}`), `missing provenance ${frame.path}`);
  }
}

assert.match(html, /REJECTED/);
assert.match(html, /Walking removed from every merchant/);
assert.match(html, /npc-planted-idles-v5/);
assert.doesNotMatch(html, /<script[^>]+app\.js/);
assert.doesNotMatch(
  productionSource,
  /npc-alive-walking-v4|npcWalking|walkingEnabled|roamTiles|startNpcWalk|updateNpcWalk/,
  "rejected walking review must remain isolated from production",
);

console.log("Rejected NPC walking provenance contract passed");
