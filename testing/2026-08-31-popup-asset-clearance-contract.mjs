import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { HARDCORE_MODE_CONFIG } from "../values/hardcoreMode.js";
import { INVENTORY_CODEX_CONFIG } from "../values/inventoryCodex.js";
import { NEW_RUN_SETUP_CONFIG } from "../values/newRunSetup.js";
import { RANDOM_WORLD_EVENT_CONFIG } from "../values/randomWorldEvents.js";
import { STAR_SANCTUARY_CONFIG } from "../values/starSanctuary.js";
import { STARLIGHT_TALENT_TREE_CONFIG } from "../values/starlightTalentTree.js";

const typed = HARDCORE_MODE_CONFIG.ui;
const warningLineCount = STAR_SANCTUARY_CONFIG.consumption.acknowledgement.body
  .split("\n").length;
const estimatedBodyBottom = typed.bodyY + warningLineCount * (
  typed.font.bodyPx + typed.bodyLineSpacingPx + 3
);
const promptTop = typed.typedPromptY - typed.font.typedPromptPx / 2;
const panelContentTop = -typed.panelHeight / 2 + typed.panelTopSafeInset;
assert.ok(typed.titleY - typed.font.titlePx / 2 >= panelContentTop);
assert.ok(typed.subtitleY > typed.titleY);
assert.ok(promptTop - estimatedBodyBottom >= 12);
assert.ok(typed.typedValueY < typed.footerY);
const modeSelector = typed.modeSelector;
const modeChoiceTop = modeSelector.choiceCenterY - modeSelector.choiceHeight / 2;
assert.ok(modeChoiceTop - modeSelector.headerSubtitleY >= 60);

const setup = NEW_RUN_SETUP_CONFIG;
const sectionLabelHeight = 11;
const subtitleBottom = setup.subtitle.y + setup.subtitle.fontSize / 2;
const modeLabelTop = setup.sectionLabels.mode.y - sectionLabelHeight / 2;
assert.ok(modeLabelTop - subtitleBottom >= 12);
const modeLabelBottom = setup.sectionLabels.mode.y + sectionLabelHeight / 2;
const modeCardTop = setup.cards.modeY - setup.cards.height / 2;
assert.ok(modeCardTop - modeLabelBottom >= 4);
const modeCardBottom = setup.cards.modeY + setup.cards.height / 2;
const tutorialLabelTop = setup.sectionLabels.tutorial.y - sectionLabelHeight / 2;
assert.ok(tutorialLabelTop - modeCardBottom >= 8);
const tutorialLabelBottom = setup.sectionLabels.tutorial.y + sectionLabelHeight / 2;
const tutorialCardTop = setup.cards.tutorialY - setup.cards.height / 2;
assert.ok(tutorialCardTop - tutorialLabelBottom >= 8);
const tutorialCardBottom = setup.cards.tutorialY + setup.cards.height / 2;
const statusTop = setup.status.y - setup.status.fontSize / 2;
assert.ok(statusTop - tutorialCardBottom >= 8);
const statusBottom = setup.status.y + setup.status.fontSize / 2;
const startTop = setup.start.y - setup.start.height / 2;
assert.ok(startTop - statusBottom >= 8);
assert.equal(setup.footer.rightX, -setup.footer.leftX);
assert.ok(Math.abs(setup.footer.leftX) - setup.start.width / 2 >= 60);
assert.ok(Math.abs(setup.footer.y - setup.start.y) <= setup.start.height / 2);
assert.ok(
  setup.footer.y + setup.footer.fontSize / 2
    <= setup.panel.height / 2 - 30,
);

const jackpot = RANDOM_WORLD_EVENT_CONFIG.visuals.modal;
assert.ok(jackpot.titleY <= -290);
assert.ok(jackpot.subtitleY <= -260);
assert.ok(jackpot.subtitleY - jackpot.titleY >= 24);

const tree = STARLIGHT_TALENT_TREE_CONFIG.layout;
const tabBottom = tree.pageTabYOffsetPx + tree.pageTabHeightPx / 2;
const nodeArtTop = tree.nodeRowOffsetYPx
  + tree.nodeArtOffsetYPx
  - tree.nodeArtMaxHeightPx / 2;
const nodeHaloTop = tree.nodeRowOffsetYPx - tree.nodeSelectionHaloPx / 2;
assert.ok(nodeArtTop - tabBottom >= 12);
assert.ok(nodeHaloTop - tabBottom >= 12);
assert.ok(tree.detailProgressOffsetYPx + tree.detailMetaFontSizePx <= tree.referenceHeightPx - 30);
assert.ok(tree.detailHeartOffsetYPx + tree.detailHeartSizePx / 2 <= tree.referenceHeightPx - 40);
assert.equal(tree.engineArtMaxPx, tree.nodeArtMaxHeightPx);
assert.equal(tree.engineSelectionHaloPx, tree.nodeSelectionHaloPx);

const codex = INVENTORY_CODEX_CONFIG.layout;
assert.ok((codex.selectorHitHeightPx - codex.selectorPortraitSizePx) / 2 >= 8);
assert.ok(codex.selectorStatusOffsetYPx - codex.selectorNameOffsetYPx <= 20);

const modalFactorySource = await readFile(
  new URL("../ui/overlays/HardcoreModalViewFactory.js", import.meta.url),
  "utf8",
);
assert.match(modalFactorySource, /lineSpacing: ui\.bodyLineSpacingPx/);
const modeSelectorSource = await readFile(
  new URL("../ui/scenes/StartModeSelectionOverlay.js", import.meta.url),
  "utf8",
);
assert.match(modeSelectorSource, /modeUi\.headerTitleY/);
assert.match(modeSelectorSource, /modeUi\.headerSubtitleY/);

console.log("POPUP_ASSET_CLEARANCE_CONTRACT_OK");
