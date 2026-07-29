import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DEPTH_MILESTONES } from "../values/depthMilestones.js";
import { MILESTONE_PILLAR_REVIEW } from "../values/milestonePillarReview.js";
import { MILESTONE_PILLAR_UI } from "../values/milestonePillarUi.js";
import { TOWN_SQUARE_CONFIG } from "../values/townSquareConfig.js";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const REVIEW_ROOT = path.join(
  ROOT,
  "visual-approval-previews",
  "milestone-pillar-concepts-v1",
);

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function inspectPng(filePath) {
  const data = fs.readFileSync(filePath);
  assert.equal(
    data.subarray(0, 8).toString("hex"),
    "89504e470d0a1a0a",
    `${path.basename(filePath)} must be a PNG`,
  );
  return {
    width: data.readUInt32BE(16),
    height: data.readUInt32BE(20),
    colorType: data[25],
  };
}

assert.equal(MILESTONE_PILLAR_REVIEW.reviewOnly, true);
assert.equal(MILESTONE_PILLAR_REVIEW.productionChanged, false);
assert.equal(MILESTONE_PILLAR_REVIEW.options.length, 5);
assert.deepEqual(MILESTONE_PILLAR_REVIEW.stageDepths, [0, 400, 800, 1200, 1600]);

const manifest = JSON.parse(
  fs.readFileSync(path.join(REVIEW_ROOT, "stage-manifest.json"), "utf8"),
);
assert.equal(manifest.reviewOnly, true);
assert.equal(manifest.productionChanged, false);
assert.equal(manifest.options.length, 5);
assert.deepEqual(manifest.stageDepths, MILESTONE_PILLAR_REVIEW.stageDepths);

for (const option of manifest.options) {
  assert.equal(option.stages.length, 5, `${option.id} needs five depth states`);
  assert.ok(
    MILESTONE_PILLAR_REVIEW.options.some(candidate => candidate.id === option.id),
    `${option.id} must exist in review values`,
  );

  const sheetInfo = inspectPng(path.join(REVIEW_ROOT, option.sheet));
  assert.equal(sheetInfo.colorType, 6, `${option.sheet} must retain RGBA transparency`);
  assert.ok(
    fs.existsSync(path.join(REVIEW_ROOT, option.sheet.replace(".png", "-chroma.png"))),
    `${option.id} must retain its original chroma source`,
  );

  let previousHeight = 0;
  option.stages.forEach((stage, index) => {
    assert.equal(stage.stage, index + 1);
    assert.equal(stage.depth, manifest.stageDepths[index]);
    assert.ok(stage.height > previousHeight, `${option.id} must grow at every depth`);
    previousHeight = stage.height;

    const info = inspectPng(path.join(REVIEW_ROOT, stage.path));
    assert.deepEqual(
      [info.width, info.height],
      [stage.width, stage.height],
      `${stage.path} dimensions must match its manifest`,
    );
    assert.equal(info.colorType, 6, `${stage.path} must retain RGBA transparency`);
  });

  assert.ok(
    fs.existsSync(path.join(REVIEW_ROOT, `runtime-option-${option.id}-stage5.png`)),
    `${option.id} needs an in-engine runtime capture`,
  );
}

assert.ok(
  fs.existsSync(path.join(REVIEW_ROOT, "milestone-pillar-five-option-runtime-contact-sheet.png")),
  "five-option in-engine contact sheet is required",
);
assert.ok(
  fs.existsSync(path.join(REVIEW_ROOT, "runtime-production-milestone-ui.png")),
  "production modal runtime capture is required",
);

const physicalRatio = MILESTONE_PILLAR_REVIEW.worldPreview.worldMaxPillarHeight
  / MILESTONE_PILLAR_REVIEW.worldPreview.playerHeightPx;
assert.ok(
  Math.abs(physicalRatio - (2.2 / 1.75)) < 0.02,
  "world-scale preview must compare a roughly 2.2 m pillar with a 1.75 m player",
);

const reviewScene = read(
  "visual-approval-previews/milestone-pillar-concepts-v1/MilestonePillarReviewScene.js",
);
assert.match(reviewScene, /openMilestonePillarModal/);
assert.match(reviewScene, /worldMaxPillarHeight\s*\/\s*maxHeight/);
assert.match(reviewScene, /playerHeightPx/);

const promptManifest = read(
  "visual-approval-previews/milestone-pillar-concepts-v1/2026-07-26-imagegen-prompt-manifest.md",
);
assert.match(promptManifest, /Generation mode: built-in ImageGen/);
for (const sourceId of [
  "call_VUs0E0Mxz0MYEaC0ghOfN6ek",
  "call_XIzwzRtqFkdnX5xobiy91k92",
  "call_vm5RGM2Ph0YvtVP2QSChAh4q",
  "call_CG6MmjI0JIq88Bvwg1NKKbQN",
  "call_0H8d6mCjUWN3jPEVFN2xp9Tr",
]) {
  assert.ok(promptManifest.includes(sourceId), `prompt provenance missing ${sourceId}`);
}

const uiValuesSource = read("values/milestonePillarUi.js");
for (const [, size] of uiValuesSource.matchAll(/"(\d+)px"/g)) {
  assert.ok(Number(size) >= 11, `production modal font ${size}px is too small`);
}
assert.equal(MILESTONE_PILLAR_UI.milestones.wideRows * 2, 8);
assert.ok(
  MILESTONE_PILLAR_UI.milestones.wideRows * 2 < DEPTH_MILESTONES.length,
  "milestones must be paginated instead of squeezed into one view",
);
assert.ok(MILESTONE_PILLAR_UI.modal.maxWidth <= 1080);
assert.ok(MILESTONE_PILLAR_UI.modal.maxHeight <= 690);
assert.ok(
  MILESTONE_PILLAR_UI.modal.depth >= 4000,
  "read-heavy modal must sit above earthquake, tutorial, and timing HUD layers",
);

const modalSource = read("systems/visual/MilestonePillarModal.js");
const milestoneViewSource = read("systems/visual/MilestonePillarMilestonesView.js");
const journalViewSource = read("systems/visual/MilestonePillarJournalView.js");
assert.match(modalSource, /MilestonePillarMilestonesView/);
assert.match(modalSource, /MilestonePillarJournalView/);
assert.match(milestoneViewSource, /pageSize\s*=\s*columns\s*\*\s*rows/);
assert.match(milestoneViewSource, /DEPTH_MILESTONES\.slice/);
assert.doesNotMatch(`${milestoneViewSource}\n${journalViewSource}`, /["'](?:8|9|10)px["']/);

const bootSource = read("ui/scenes/BootScene.js");
const boardSource = read("systems/visual/MilestoneBoardSystem.js");
for (const productionSource of [bootSource, boardSource]) {
  assert.doesNotMatch(productionSource, /milestone-pillar-concepts-v1/);
  assert.doesNotMatch(productionSource, /option-[a-e]-stage-[1-5]\.png/);
}

assert.equal(TOWN_SQUARE_CONFIG.milestonePillar.tileX, 3);
assert.equal(TOWN_SQUARE_CONFIG.milestonePillar.interactionRangeTiles, 2);
assert.match(boardSource, /allowOpen\s*=\s*options\.allowOpen\s*!==\s*false/);
assert.match(boardSource, /setVisible\(inRange\s*&&\s*\(allowOpen/);

const npcSource = read("world/playScene/NPCManager.js");
const updateSource = read("world/playScene/PlaySceneUpdate.js");
assert.match(npcSource, /updateInteractPrompts\(playerTile,\s*competingDistance/);
assert.match(npcSource, /dist\s*<=\s*competingDistance/);
assert.match(updateSource, /allowOpen:\s*!arcCoreConsumedInteraction/);
assert.match(
  updateSource,
  /milestoneDistance\s*<\s*Math\.min\(nearestNpcDistance,\s*titanStatueDistance,\s*specialTileDistance\)/,
);
assert.match(
  updateSource,
  /updateInteractPrompts\(\s*playerTile,\s*Math\.min\(milestoneDistance,\s*titanStatueDistance,\s*specialTileDistance\)/,
);
assert.match(updateSource, /specialTileDistance\s*<=\s*Math\.min\(/);
assert.match(updateSource, /&&\s*!specialTileHasPriority\s*\)\s*{\s*this\.npcManager\.checkNPCInteraction/);
assert.ok(
  updateSource.indexOf("specialTileSystem?.update")
    < updateSource.indexOf("milestoneBoardSystem?.update"),
  "special-tile proximity must be known before the Milestone Pillar can consume the keypress",
);
assert.ok(
  updateSource.indexOf("milestoneBoardSystem?.update")
    < updateSource.indexOf("npcManager.checkNPCInteraction"),
  "milestone arbitration must run before NPC interaction consumes the same keypress",
);

console.log(
  "Milestone Pillar review contract passed: 5 options, 25 growing RGBA stages, "
  + "bounded readable UI, review isolation, and nearest-target interaction.",
);
