import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { APPROVED_HUD_SKIN } from "../values/approvedHudSkin.js";
import { HUD_QUICK_CONTROLS } from "../values/hudQuickControls.js";
import { HARDCORE_MODE_CONFIG } from "../values/hardcoreMode.js";
import { LEVEL_UP_PRESENTATION } from "../values/levelUpPresentation.js";
import { MAIN_MENU_PRESENTATION } from "../values/mainMenuPresentation.js";
import { NEW_RUN_SETUP_CONFIG } from "../values/newRunSetup.js";
import { UI_CONTROL_GEOMETRY } from "../values/uiLayout.js";
import { UI_ICON_FRAMES } from "../values/uiIcons.js";

const controls = UI_CONTROL_GEOMETRY;

// Accent strips must remain inside even the shortest shared control shell.
const smallestButton = { width: 28, height: 22 };
const accentLeft = -smallestButton.width / 2 + controls.buttonAccent.insetX;
const accentTop = -smallestButton.height / 2 + controls.buttonAccent.insetY;
assert.ok(accentLeft >= -smallestButton.width / 2);
assert.ok(accentLeft + controls.buttonAccent.width <= smallestButton.width / 2);
assert.ok(accentTop >= -smallestButton.height / 2);
assert.ok(
  accentTop + smallestButton.height - controls.buttonAccent.insetY * 2
    <= smallestButton.height / 2,
);

// Slider thumbs must never protrude beyond either endpoint.
for (const width of [180, 360, 540]) {
  const left = -width / 2;
  const right = width / 2;
  const thumbCenterAtZero = left + controls.slider.thumbWidth / 2;
  const thumbCenterAtOne = left + controls.slider.thumbWidth / 2
    + width - controls.slider.thumbWidth;
  const thumbLeftAtZero = thumbCenterAtZero - controls.slider.thumbWidth / 2;
  const thumbRightAtOne = thumbCenterAtOne + controls.slider.thumbWidth / 2;
  assert.equal(thumbLeftAtZero, left);
  assert.equal(thumbRightAtOne, right);
  assert.ok(controls.slider.thumbWidth <= width);
}

// Keybind and reset controls retain a visible, exact gap.
const rowWidth = 540;
const resetCenter = rowWidth / 2 - controls.keybind.resetWidth / 2;
const bindingCenter = rowWidth / 2
  - controls.keybind.resetWidth
  - controls.keybind.buttonGap
  - controls.keybind.bindingWidth / 2;
const bindingRight = bindingCenter + controls.keybind.bindingWidth / 2;
const resetLeft = resetCenter - controls.keybind.resetWidth / 2;
assert.equal(resetLeft - bindingRight, controls.keybind.buttonGap);

// The keyboard selection marker is contained by the main-menu button.
const menu = MAIN_MENU_PRESENTATION;
const cursorLeft = -menu.button.widthPx / 2
  + menu.cursor.insetXPx
  - menu.cursor.widthPx / 2;
const cursorRight = cursorLeft + menu.cursor.widthPx;
assert.ok(cursorLeft >= -menu.button.widthPx / 2);
assert.ok(cursorRight <= menu.button.widthPx / 2);
assert.ok(menu.cursor.heightPx <= menu.button.heightPx);

// New-run cards share one inset grid and one repaired alpha-atlas treatment.
const cards = NEW_RUN_SETUP_CONFIG.cards;
for (const iconName of [
  cards.casualIconName,
  cards.hardcoreIconName,
  cards.guidedIconName,
  cards.skipIconName,
]) {
  assert.ok(Number.isInteger(UI_ICON_FRAMES[iconName]));
}
assert.ok(cards.iconSize <= cards.height);
assert.ok(Math.abs(cards.titleX - cards.bodyX) <= 1);
assert.ok(cards.selectedY < cards.height / 2);
assert.match(NEW_RUN_SETUP_CONFIG.assets.foundation, /new-expedition-foundation-v2\.png$/);
assert.match(NEW_RUN_SETUP_CONFIG.assets.selection, /new-expedition-selection-v2\.png$/);
assert.match(HARDCORE_MODE_CONFIG.assets.crest.path, /hardcore-oath-crest-alpha-v2\.png$/);
assert.ok(LEVEL_UP_PRESENTATION.iconX < -LEVEL_UP_PRESENTATION.width / 3);
assert.ok(LEVEL_UP_PRESENTATION.rewardY < LEVEL_UP_PRESENTATION.height / 4);

// The DOM fullscreen control clears both the authored top HUD and right-side action rail.
const viewport = APPROVED_HUD_SKIN.referenceViewport;
const fullscreen = { height: 32, top: viewport.height / 2 - 16, bottom: viewport.height / 2 + 16 };
const topHudBottom = APPROVED_HUD_SKIN.layout.buffs.y
  + APPROVED_HUD_SKIN.layout.buffs.height;
const inventoryTop = viewport.height
  - HUD_QUICK_CONTROLS.inventory.bottom
  - HUD_QUICK_CONTROLS.inventory.height;
const pauseTop = inventoryTop
  - HUD_QUICK_CONTROLS.pause.gapAboveInventory
  - HUD_QUICK_CONTROLS.pause.height;
const mapTop = pauseTop
  - HUD_QUICK_CONTROLS.map.gapAbovePause
  - HUD_QUICK_CONTROLS.map.height;
assert.ok(fullscreen.top > topHudBottom);
assert.ok(fullscreen.bottom < mapTop);

const [styleSource, overlaySource, hardcoreStatusSource, hardcoreOverlaySource, levelUpSource, manifestSource] = await Promise.all([
  readFile(new URL("../css/style.css", import.meta.url), "utf8"),
  readFile(new URL("../ui/scenes/NewRunSetupOverlay.js", import.meta.url), "utf8"),
  readFile(new URL("../systems/visual/HardcoreStatusHud.js", import.meta.url), "utf8"),
  readFile(new URL("../systems/visual/HardcorePanicOverlay.js", import.meta.url), "utf8"),
  readFile(new URL("../systems/visual/LevelUpRewardPresentation.js", import.meta.url), "utf8"),
  readFile(new URL("../sprites/UI/dynamic-feedback-v2/manifest-v2.json", import.meta.url), "utf8"),
]);
const fullscreenRule = styleSource.match(/#fs-btn\s*\{([\s\S]*?)\}/)?.[1] || "";
assert.match(styleSource, /#game-root\s*\{[\s\S]*?display:\s*flex/);
assert.match(fullscreenRule, /top:\s*50%/);
assert.match(fullscreenRule, /transform:\s*translateY\(-50%\)/);
assert.doesNotMatch(fullscreenRule, /bottom:/);
assert.match(overlaySource, /createUiIcon\(this\.scene, options\.iconName/);
assert.doesNotMatch(overlaySource, /ASSET_KEYS\.ui\.hardcore\.oathCrest/);
assert.doesNotMatch(overlaySource, /openingFlightV2\.shaftMarker/);
assert.match(overlaySource, /ASSET_KEYS\.ui\.newRunSetup\.selection/);
assert.match(overlaySource, /root\.add\(\[icon, selection, title, body, selected, hit\]\)/);
assert.doesNotMatch(overlaySource, /createSaveChoiceChrome|createSaveMenuButton/);
assert.doesNotMatch(overlaySource, /approvedHud\.playerCore/);
assert.match(hardcoreStatusSource, /approvedHud\.hardcoreStatusShell/);
assert.match(hardcoreOverlaySource, /approvedHud\.hardcoreStatusShell/);
assert.doesNotMatch(hardcoreOverlaySource, /approvedHud\.notification/);
assert.match(levelUpSource, /approvedHud\.levelUpShell/);
assert.match(levelUpSource, /xpGathering\.levelUp/);
const dynamicManifest = JSON.parse(manifestSource);
assert.equal(dynamicManifest.noBakedText, true);
assert.equal(dynamicManifest.noBakedRuntimeIcons, true);
for (const assetId of [
  "newExpeditionSelection",
  "hardcoreStatusShell",
  "levelUpShell",
  "hardcoreCrest",
]) {
  assert.deepEqual(dynamicManifest.assets[assetId].cornerAlpha, [0, 0, 0, 0]);
}

console.log("UI_ALIGNMENT_PASS_CONTRACT_OK");
