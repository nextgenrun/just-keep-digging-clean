import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { NPC_ACTIVITY_CONFIG } from "../values/npcActivityConfig.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const reviewRoot = `${root}visual-approval-previews/npc-alive-walking-v4/`;
const readJson = name => JSON.parse(readFileSync(`${reviewRoot}${name}`, "utf8"));
const readText = name => readFileSync(`${reviewRoot}${name}`, "utf8");

const spec = readJson("walking-spec.json");
const manifest = readJson("manifest.json");
const prompts = readJson("prompt-manifest.json");
const html = readText("index.html");
const app = readText("app.js");
const bootSource = readFileSync(`${root}ui/scenes/BootScene.js`, "utf8");
const npcSource = readFileSync(`${root}world/playScene/NPCManager.js`, "utf8");

assert.equal(spec.reviewOnly, true);
assert.equal(spec.productionChangedByThisMockup, false);
assert.equal(spec.runtimeBaseline.alreadyWired, true);
assert.deepEqual(
  spec.runtimeBaseline.rollback,
  ["?npcActivities=0", "?npcWalking=0"],
);
assert.equal(manifest.reviewOnly, true);
assert.equal(manifest.productionChanged, false);
assert.equal(manifest.runtimeAlreadyWired, true);
assert.deepEqual(manifest.runtimeFilesChangedByMockup, []);
assert.equal(prompts.reviewOnly, true);
assert.equal(Object.keys(prompts.prompts).length, 2);

assert.equal(spec.npcs.length, 6);
assert.equal(new Set(spec.npcs.map(npc => npc.slug)).size, spec.npcs.length);
for (const npc of spec.npcs) {
  assert.equal(npc.frameDurationsMs.length, 5);
  assert.equal(npc.offsetTiles.length, 5);
  assert.equal(npc.offsetTiles[0], 0);
  assert.equal(npc.offsetTiles[4], 0);
  assert.ok(
    Math.max(...npc.offsetTiles) <= spec.presentation.safeRadiusTiles,
    `${npc.slug} must stay inside the review safe radius`,
  );
  const productionMerchant = Object.values(NPC_ACTIVITY_CONFIG.merchants)
    .find(merchant => merchant.assetSlug === npc.slug);
  assert.ok(productionMerchant, `${npc.slug} needs a production identity`);
  assert.ok(
    productionMerchant.roamTiles <= spec.presentation.safeRadiusTiles,
    `${npc.slug} production pacing must stay inside the reviewed radius`,
  );

  const frames = manifest.frames[npc.slug];
  assert.equal(frames.length, 5);
  frames.forEach((frame, index) => {
    assert.ok(existsSync(`${root}${frame.path}`), `missing ${frame.path}`);
    assert.deepEqual(frame.dimensions, [512, 512]);
    assert.equal(frame.durationMs, npc.frameDurationsMs[index]);
    assert.equal(frame.offsetTiles, npc.offsetTiles[index]);
  });
}

for (const board of Object.values(manifest.boards)) {
  assert.ok(existsSync(`${root}${board.path}`), `missing ${board.path}`);
  assert.ok(board.dimensions[0] > board.dimensions[1]);
}
assert.match(html, /POST-WIRING REVIEW/);
assert.match(html, /REVIEW ONLY/);
assert.match(html, /SHOP ANCHORS UNCHANGED/);
assert.match(app, /requestAnimationFrame/);
assert.match(app, /frameDurationsMs/);
assert.doesNotMatch(
  `${bootSource}\n${npcSource}`,
  /npc-alive-walking-v4/,
  "review walk boards must not be imported by production runtime",
);

console.log("NPC alive walking review contract passed");
