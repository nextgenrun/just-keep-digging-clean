import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import { HARDCORE_MODE_CONFIG } from "../values/hardcoreMode.js";
import {
  SAVE_MENU_PRESENTATION,
  getSaveMenuAssetEntries,
  resolveSaveMenuArtEnabled,
} from "../values/saveMenuPresentation.js";

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function readPng(path) {
  const bytes = fs.readFileSync(new URL(`../${path}`, import.meta.url));
  assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  return {
    bytes,
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    bitDepth: bytes[24],
    colorType: bytes[25],
  };
}

const manifest = JSON.parse(fs.readFileSync(
  new URL("../sprites/UI/save-menu-v1/manifest-v1.json", import.meta.url),
  "utf8",
));

assert.equal(resolveSaveMenuArtEnabled(""), true);
assert.equal(resolveSaveMenuArtEnabled("?saveMenuArt=1"), true);
assert.equal(resolveSaveMenuArtEnabled("?saveMenuArt=0"), false);
assert.equal(manifest.schema, "save-menu-v1@1");
assert.equal(manifest.displayContract.logicalDensity, 3);
assert.equal(manifest.displayContract.ultraBackingDensity, 2);
assert.ok(manifest.displayContract.sourcePixelsPerUltraPixel >= 1.5);

const slotLayout = SAVE_MENU_PRESENTATION.slot.textLayout;
assert.equal(SAVE_MENU_PRESENTATION.slot.displayWidthPx, 290);
assert.equal(SAVE_MENU_PRESENTATION.slot.displayHeightPx, 200);
assert.ok(slotLayout.horizontalSafeInsetPx >= 30);
assert.ok(slotLayout.headerOffsetYPx >= slotLayout.headerSafeTopOffsetYPx);
assert.ok(slotLayout.headerOffsetYPx + slotLayout.headerFontSizePx <= slotLayout.headerSafeBottomOffsetYPx);
assert.ok(slotLayout.dividerOffsetYPx > slotLayout.headerSafeBottomOffsetYPx);
assert.ok(100 + slotLayout.modeOffsetYPx > slotLayout.dividerOffsetYPx);
assert.ok(slotLayout.summaryFontSizePx >= 12);
assert.ok(slotLayout.summaryMinimumFontSizePx >= 10);
assert.ok(slotLayout.summaryMaxWidthPx <= 290 - slotLayout.horizontalSafeInsetPx * 2);

const modeLayout = HARDCORE_MODE_CONFIG.ui.modeSelector;
assert.equal(modeLayout.selectedScale, 1);
assert.ok(modeLayout.innerSafeInsetXPx >= 24);
assert.ok(modeLayout.iconY - modeLayout.hardcoreIconSizePx / 2 >= modeLayout.innerSafeTopY);
assert.ok(modeLayout.iconY + modeLayout.hardcoreIconSizePx / 2 < modeLayout.titleY);
assert.ok(modeLayout.titleMaxWidthPx <= modeLayout.choiceWidth - modeLayout.innerSafeInsetXPx * 2);
assert.ok(modeLayout.bodyMaxWidthPx <= modeLayout.choiceWidth - modeLayout.innerSafeInsetXPx * 2);
assert.ok(modeLayout.selectedY < modeLayout.innerSafeBottomY);
assert.ok(HARDCORE_MODE_CONFIG.ui.font.choiceBodyPx >= 12);

const configuredAssets = new Map(getSaveMenuAssetEntries());
const expected = {
  slotIdle: SAVE_MENU_PRESENTATION.slot.idleKey,
  slotSelected: SAVE_MENU_PRESENTATION.slot.selectedKey,
  modalConfirm: SAVE_MENU_PRESENTATION.modal.confirm.key,
  modalBackup: SAVE_MENU_PRESENTATION.modal.backup.key,
  modalImport: SAVE_MENU_PRESENTATION.modal.import.key,
  choiceIdle: SAVE_MENU_PRESENTATION.choice.idleKey,
  choiceSelected: SAVE_MENU_PRESENTATION.choice.selectedKey,
};

for (const [manifestKey, textureKey] of Object.entries(expected)) {
  const entry = manifest.assets[manifestKey];
  const path = configuredAssets.get(textureKey);
  assert.equal(path, entry.path, `${manifestKey} runtime path must match its manifest`);
  const png = readPng(path);
  assert.equal(png.width, entry.width);
  assert.equal(png.height, entry.height);
  assert.equal(png.bitDepth, 8);
  assert.equal(png.colorType, 6, `${manifestKey} must remain true RGBA`);
  assert.equal(sha256(png.bytes), entry.sha256);
  assert.deepEqual(entry.cornerAlpha, [0, 0, 0, 0]);
}

const sceneSource = fs.readFileSync(
  new URL("../ui/scenes/StartMenuScene.js", import.meta.url),
  "utf8",
);
const viewSource = fs.readFileSync(
  new URL("../ui/components/SaveMenuPresentationView.js", import.meta.url),
  "utf8",
);
const modeOverlaySource = fs.readFileSync(
  new URL("../ui/scenes/StartModeSelectionOverlay.js", import.meta.url),
  "utf8",
);

assert.match(sceneSource, /resolveSaveMenuArtEnabled\(\)/);
assert.match(sceneSource, /preloadSaveMenuArt\(this\)/);
assert.match(sceneSource, /createSaveSlotChrome/);
assert.match(sceneSource, /createSaveModalChrome/);
assert.match(sceneSource, /this\.add\.graphics\(\)/, "legacy Graphics rollback must remain");
assert.match(viewSource, /return createButton\(scene, options\)/, "button fallback must remain");
assert.match(viewSource, /visibleChrome:\s*false/);
assert.match(sceneSource, /fitTextToWidth\(summaryTxt/);
assert.match(sceneSource, /BEST DEPTH \$\{slot\.bestDepth\}m/);
assert.match(sceneSource, /\$\{slot\.stars\} STARS/);
assert.doesNotMatch(sceneSource, /DEPTH \$\{slot\.currentDepth\}m \/ BEST/);
assert.match(modeOverlaySource, /icon\.setMask\(iconMaskGeometry\.createGeometryMask\(\)\)/);
assert.match(modeOverlaySource, /choice\.icon\?\.clearMask\?\.\(true\)/);
assert.match(modeOverlaySource, /modeUi\.selectedY/);
assert.doesNotMatch(modeOverlaySource, /selectedText = this\.scene\.add\.text\(0, 117/);

for (const key of ["ONE", "TWO", "THREE", "SPACE", "DELETE", "B", "E", "I", "ESC"]) {
  assert.match(sceneSource, new RegExp(`keydown-${key}`), `${key} keyboard path must remain`);
}
assert.match(sceneSource, /this\.scene\.start\("WorldLoadScene"/);
assert.match(sceneSource, /store\.exportSave\(\)/);
assert.match(sceneSource, /await store\.importSave\(file\)/);
assert.match(sceneSource, /await store\.clearSave\(\)/);
assert.match(sceneSource, /store\.restoreFromBackup\(backupIndex\)/);

console.log("save-menu authored presentation contract: PASS");
