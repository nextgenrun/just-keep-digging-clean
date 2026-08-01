// Guards the authored loading screen, dual meters, minigame, and rollback.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  getLoadingMiningMinigamePreloadAssets,
  LOADING_MINING_MINIGAME_CONFIG,
  resolveLoadingMiningMinigameEnabled,
} from "../values/loadingMiningMinigame.js";
import {
  getLoadingScreenPresentationAssets,
  LOADING_SCREEN_PRESENTATION,
} from "../values/loadingScreenPresentation.js";
import { LoadingMiningMinigameState } from
  "../systems/mining/LoadingMiningMinigameState.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const minigame = LOADING_MINING_MINIGAME_CONFIG;
const screen = LOADING_SCREEN_PRESENTATION;
const minigameAssets = getLoadingMiningMinigamePreloadAssets(minigame, "");
const screenAssets = getLoadingScreenPresentationAssets(screen);
const source = file => fs.readFileSync(path.join(ROOT, file), "utf8");
const runtimePath = assetPath => path.join(ROOT, assetPath.split("?")[0]);

assert.equal(minigame.enabled, true);
assert.equal(resolveLoadingMiningMinigameEnabled(""), true);
for (const disabled of ["0", "false", "off"]) {
  assert.equal(
    resolveLoadingMiningMinigameEnabled(`?loadingMine=${disabled}`),
    false,
  );
}
assert.deepEqual(
  getLoadingMiningMinigamePreloadAssets(minigame, "?loadingMine=0"),
  [],
);

assert.equal(
  minigame.revision,
  "loading-mining-authored-console-v6-20260731",
);
assert.equal(screen.revision, "loading-screen-imagegen-v1-20260731");
assert.equal(minigameAssets.length, 26);
assert.equal(screenAssets.length, 4);
assert.equal(
  new Set([...minigameAssets, ...screenAssets].map(asset => asset.key)).size,
  minigameAssets.length + screenAssets.length,
);
assert.equal(minigame.assets.materials.length, 13);
assert.equal(minigame.assets.pickaxeTiers.length, 7);
assert.equal(
  minigame.assets.materials.filter(material =>
    material.path.includes("resource-tiles-imagegen-v3")).length,
  10,
);
assert.equal(
  minigame.assets.materials.filter(material =>
    material.path.includes("dynamic-soil/bases")).length,
  3,
);
assert.ok(minigame.assets.materials.every(material =>
  !("overlayKey" in material)
  && !/^gp\d+$/i.test(material.id)
  && !material.id.includes("star")
  && !material.path.includes("special-tiles-imagegen")
  && !material.path.includes("star-block")));
assert.equal(
  minigameAssets.filter(asset =>
    asset.path.includes("pickaxe-icons-v1")).length,
  7,
);
assert.ok(minigame.assets.boardFrame.path.includes("thunderstrike-chain-v1"));
assert.ok(minigame.assets.target.path.includes("mining-target-v1"));
assert.ok(minigame.assets.hitFracture.path.includes("earthquake-feedback-v2"));
assert.ok(minigame.assets.breakDebris.path.includes("earthquake-feedback-v2"));
assert.ok(minigame.assets.breakBurst.path.includes("earthquake-feedback-v2"));
assert.ok(screenAssets.every(asset =>
  asset.path.includes("sprites/UI/loading-screen-v1/")));
assert.ok(screen.assets.foundation.path.endsWith(".webp"));
assert.ok(screen.assets.overallFill.path.endsWith(".webp"));
assert.ok(screen.assets.phaseFill.path.endsWith(".webp"));
assert.ok(screen.assets.retryPlate.path.endsWith(".webp"));

const runtimeAssets = [...minigameAssets, ...screenAssets];
assert.ok(runtimeAssets.every(asset =>
  !/(^|\/)(preview|mockup|source|visual-approval-previews)(\/|$)/i
    .test(asset.path)));
let minigameBytes = 0;
let screenBytes = 0;
for (const asset of runtimeAssets) {
  const filePath = runtimePath(asset.path);
  assert.equal(fs.existsSync(filePath), true, asset.path);
  const bytes = fs.statSync(filePath).size;
  assert.ok(bytes > 1024, `${asset.key} is unexpectedly small`);
  if (screenAssets.includes(asset)) screenBytes += bytes;
  else minigameBytes += bytes;
}
assert.ok(minigameBytes <= minigame.assetBudgetBytes, {
  minigameBytes,
  budget: minigame.assetBudgetBytes,
});
assert.ok(screenBytes <= screen.assetBudgetBytes, {
  screenBytes,
  budget: screen.assetBudgetBytes,
});

const board = minigame.layout.board;
const meters = screen.layout.meters;
assert.equal(screen.layout.referenceWidth, minigame.layout.referenceWidth);
assert.equal(screen.layout.referenceHeight, minigame.layout.referenceHeight);
assert.equal(board.centerX, 845);
assert.equal(board.centerY, 300);
assert.equal(board.presentationScale, 1);
assert.equal(board.columns, 8);
assert.equal(board.rows, 4);
assert.equal(board.toolSlotOffsetsX.length, 7);
assert.equal(board.pickaxeRestVisible, false);
assert.ok(board.pickaxeOriginX > 0.75);
assert.ok(board.pickaxeOriginY > 0.75);
assert.ok(
  minigame.timing.pickaxeWindupAngleDeg
    > minigame.timing.pickaxeStrikeAngleDeg,
);

const gridWidth = board.columns * board.cellSize
  + (board.columns - 1) * board.cellGap;
const gridHeight = board.rows * board.cellSize
  + (board.rows - 1) * board.cellGap;
const gridLeft = board.centerX - gridWidth / 2;
const gridRight = board.centerX + gridWidth / 2;
const gridTop = board.centerY + board.gridTopY;
const gridBottom = gridTop + gridHeight;
const counterBottom = board.centerY + board.counterY
  + board.counterHeight / 2;
const toolLeft = board.centerX + Math.min(...board.toolSlotOffsetsX)
  - board.toolIconSize * board.toolActiveScale / 2;
const toolRight = board.centerX + Math.max(...board.toolSlotOffsetsX)
  + board.toolIconSize * board.toolActiveScale / 2;
const leftPanelRight = meters.left + meters.width;
assert.ok(gridLeft > leftPanelRight + 150);
assert.ok(toolLeft > leftPanelRight + 120);
assert.ok(toolRight < screen.layout.referenceWidth - 44);
assert.ok(counterBottom < gridTop);
assert.ok(gridBottom < screen.layout.minigame.instructionY);
assert.ok(
  board.centerY + board.toolRailY - board.toolIconSize / 2
    > screen.layout.minigame.optionalY,
);
assert.ok(
  meters.overall.statusY
    < meters.phase.headingY - Number.parseInt(screen.typography.statusSize),
);
assert.ok(meters.overall.fillY < meters.overall.statusY);
assert.ok(meters.phase.fillY < meters.phase.statusY);
assert.equal(screen.phases[0].start, 0);
assert.equal(screen.phases.at(-1).end, 1);
for (let index = 1; index < screen.phases.length; index += 1) {
  assert.equal(screen.phases[index - 1].end, screen.phases[index].start);
}

const state = new LoadingMiningMinigameState({
  config: minigame,
  random: () => 0,
});
const openingIds = new Set(state.board.flat().map(cell => cell.material.id));
assert.equal(openingIds.size, minigame.assets.materials.length);
for (const material of minigame.assets.materials) {
  assert.equal(openingIds.has(material.id), true, material.id);
}

let now = 0;
while (state.bestChain < 3) {
  const cell = state.getCell(3, 0);
  for (let hit = 0; hit < cell.hp; hit += 1) {
    now += 100;
    state.mine(3, 0, now);
  }
}
assert.equal(state.blocksMined, 3);
assert.equal(state.currentChain, 3);
assert.equal(state.getPickaxeTierIndex(), 1);
now += minigame.timing.chainWindowMs + 1;
const lapseCell = state.getSelectedCell();
let lapseEvent = null;
for (let hit = 0; hit < lapseCell.hp; hit += 1) {
  lapseEvent = state.mineSelected(now + hit);
}
assert.equal(lapseEvent.kind, "break");
assert.equal(lapseEvent.currentChain, 1);

const stateSource = source("systems/mining/LoadingMiningMinigameState.js");
assert.doesNotMatch(
  stateSource,
  /(localStorage|SaveManager|saveSlot|playerData|loaderProgress|setProgress)/,
);

const screenSource = source("ui/components/AuthoredLoadingScreenView.js");
const metersSource = source(
  "ui/components/AuthoredLoadingProgressMeters.js",
);
const boardSource = source("ui/components/AuthoredLoadingMiningBoard.js");
const controllerSource = source(
  "ui/components/AuthoredLoadingMiningMinigame.js",
);
const fxSource = source("ui/components/LoadingMiningMinigameFx.js");
const pickaxeSource = source("ui/components/LoadingMiningPickaxeFx.js");
const routerSource = source("ui/components/LoadingScreenView.js");
for (const authoredSource of [screenSource, metersSource, boardSource]) {
  assert.match(authoredSource, /scene\.add\.image/);
  assert.doesNotMatch(
    authoredSource,
    /scene\.add\.(graphics|rectangle|circle|polygon)/,
  );
}
assert.match(screenSource, /visibleUiSource: "authored-bitmaps"/);
assert.match(screenSource, /meterCount: 2/);
assert.match(metersSource, /setCrop/);
assert.match(metersSource, /overallFill/);
assert.match(metersSource, /phaseFill/);
assert.match(boardSource, /toolIcons/);
assert.match(boardSource, /toolSlotOffsetsX/);
assert.match(controllerSource, /keydown-SPACE/);
assert.match(controllerSource, /pointerHeld/);
assert.match(controllerSource, /visibleToolIcons/);
assert.match(pickaxeSource, /pickaxeRestVisible/);
assert.match(pickaxeSource, /restTimer/);
assert.match(pickaxeSource, /onContact/);
assert.match(fxSource, /showBreakBurst/);
assert.match(routerSource, /hasAuthoredLoadingScreenAssets/);
assert.match(routerSource, /options = \{ \.\.\.options, minigame: false \}/);

const bootSource = source("ui/scenes/BootScene.js");
assert.match(bootSource, /getLoadingScreenPresentationAssets/);
assert.match(bootSource, /getLoadingMiningMinigamePreloadAssets/);
const worldLoadSource = source("ui/scenes/WorldLoadScene.js");
assert.match(worldLoadSource, /createMenuLoadingScreen/);
assert.match(worldLoadSource, /loadingUi\?\.fadeOut/);

console.log(JSON.stringify({
  status: "pass",
  minigameAssets: minigameAssets.length,
  minigameBytes,
  screenAssets: screenAssets.length,
  screenBytes,
  materials: minigame.assets.materials.length,
  pickaxeTiers: minigame.assets.pickaxeTiers.length,
  meters: 2,
  rollback: "?loadingMine=0",
}));
