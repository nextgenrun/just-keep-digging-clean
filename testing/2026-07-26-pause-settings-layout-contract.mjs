import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  PAUSE_MENU_LAYOUT,
  SETTINGS_PANEL_LAYOUT,
  UI_MODAL_LAYOUT,
} from "../values/uiLayout.js";
import { RETENTION_CONFIG } from "../values/retentionConfig.js";
import { resolveFloatingTextPreference } from "../systems/UserSettings.js";
import { fitUiModal } from "../ui/UiModalShell.js";
import {
  getSettingsPanelLayoutMetrics,
} from "../ui/overlays/SettingsPanelContent.js";

const floatingText = RETENTION_CONFIG.floatingText;
assert.equal(RETENTION_CONFIG.settings.starPopupsDefaultEnabled, true);
assert.match(RETENTION_CONFIG.settings.starPopupHint, /three-second|rate-limited/i);
assert.equal(floatingText.defaultMode, "reduced");
assert.deepEqual(floatingText.modes.full.hiddenCategories, []);
assert.deepEqual(floatingText.modes.reduced.hiddenCategories, ["damage", "resource"]);
assert.deepEqual(
  resolveFloatingTextPreference({ floatingTextMode: "reduced" }),
  {
    mode: "reduced",
    preferenceVersion: floatingText.preferenceVersion,
  },
  "legacy saves must migrate to the uncluttered REDUCED default",
);
assert.equal(
  resolveFloatingTextPreference({ floatingTextMode: "off" }).mode,
  "off",
  "an explicit legacy opt-out must remain respected",
);
assert.equal(
  resolveFloatingTextPreference({
    floatingTextMode: "full",
    floatingTextPreferenceVersion: floatingText.preferenceVersion,
  }).mode,
  "full",
  "a deliberate current-version FULL selection must persist",
);

const fittedPause = fitUiModal(
  { scale: { width: 1280, height: 720 } },
  PAUSE_MENU_LAYOUT.maxWidth,
  PAUSE_MENU_LAYOUT.maxHeight,
);
assert.equal(fittedPause.width, PAUSE_MENU_LAYOUT.maxWidth);
assert.equal(fittedPause.height, 672);
const pauseContentTop = (
  -fittedPause.height / 2
  + UI_MODAL_LAYOUT.headerHeight
  + 14
);
const pauseContentBottom = fittedPause.height / 2 - UI_MODAL_LAYOUT.footerHeight;
const pauseSettingsHeight = (
  pauseContentBottom
  - (pauseContentTop + PAUSE_MENU_LAYOUT.bodyTopOffset)
);
assert.equal(pauseSettingsHeight, 466);

const fittedCompactPause = fitUiModal(
  { scale: { width: 900, height: 600 } },
  PAUSE_MENU_LAYOUT.maxWidth,
  PAUSE_MENU_LAYOUT.maxHeight,
);
const compactPauseContentTop = (
  -fittedCompactPause.height / 2
  + UI_MODAL_LAYOUT.headerHeight
  + 14
);
const compactPauseContentBottom = (
  fittedCompactPause.height / 2 - UI_MODAL_LAYOUT.footerHeight
);
const compactPauseSettingsHeight = (
  compactPauseContentBottom
  - (compactPauseContentTop + PAUSE_MENU_LAYOUT.bodyTopOffset)
);
assert.equal(compactPauseSettingsHeight, 346);

for (const [width, height, compact] of [
  [fittedPause.width - UI_MODAL_LAYOUT.contentPadding * 2, pauseSettingsHeight, false],
  [760, 430, false],
  [620, 380, true],
  [420, 380, true],
]) {
  const metrics = getSettingsPanelLayoutMetrics(width, height, compact);
  const tabSpan = metrics.tabButtonWidth + metrics.tabSpacing * 3;
  const tabBottom = metrics.tabY + SETTINGS_PANEL_LAYOUT.tabButtonHeight / 2;

  assert.ok(tabSpan <= width, `settings tabs must fit inside ${width}px`);
  assert.ok(
    metrics.tabSpacing - metrics.tabButtonWidth >= SETTINGS_PANEL_LAYOUT.tabGap,
    "settings tab hitboxes must never overlap",
  );
  assert.ok(metrics.contentTop > tabBottom, "tab content must begin below the tab hitboxes");
  assert.ok(metrics.contentBottom < metrics.panelBottom, "content must remain above the panel edge");
}

const compactMetrics = getSettingsPanelLayoutMetrics(620, 380, true);
const display = SETTINGS_PANEL_LAYOUT.display;
const displayHeight = compactMetrics.contentBottom - compactMetrics.contentTop;
const displayScale = Math.max(0.82, Math.min(1, displayHeight / 314));
const y = offset => offset * displayScale;
const fullscreenTop = y(display.fullscreenOffsetY) - display.fullscreenButtonHeight / 2;
const fullscreenBottom = y(display.fullscreenOffsetY) + display.fullscreenButtonHeight / 2;
const hintsTop = y(display.controlHintsOffsetY) - 17;
const hintsBottom = y(display.controlHintsOffsetY) + 17;
const shakeTop = y(display.cameraShakeOffsetY) - 17;
const shakeBottom = y(display.cameraShakeOffsetY) + 17;
const sliderTop = y(display.intensityOffsetY) - 20.5;
const sliderBottom = y(display.intensityOffsetY) + 31;
const flashTop = y(display.flashOffsetY) - 17;
const flashBottom = y(display.flashOffsetY) + 17;
const groupHeaderTop = y(display.groupHeaderOffsetY) - 6;
const groupHeaderBottom = y(display.groupHeaderOffsetY) + 6;
const groupLabelTop = y(display.groupStartOffsetY) - 18;
const groupButtonBottom = (
  y(display.groupStartOffsetY)
  + 11
  + display.groupButtonHeight / 2
);
const resetTop = (
  displayHeight
  - display.resetBottomInsetY
  - display.resetButtonHeight / 2
);
const resetBottom = (
  displayHeight
  - display.resetBottomInsetY
  + display.resetButtonHeight / 2
);

assert.ok(fullscreenTop >= 10, "display header and fullscreen button must not overlap");
assert.ok(hintsTop >= fullscreenBottom, "fullscreen and control-hint hitboxes must not overlap");
assert.ok(shakeTop >= hintsBottom, "display toggle hitboxes must not overlap");
assert.ok(sliderTop >= shakeBottom, "camera-shake toggle and slider must not overlap");
assert.ok(flashTop >= sliderBottom, "slider and flash toggle must not overlap");
assert.ok(groupHeaderTop >= flashBottom, "event header must begin below the flash toggle");
assert.ok(groupLabelTop >= groupHeaderBottom, "event labels must begin below the event header");
assert.ok(resetTop >= groupButtonBottom, "event buttons and reset buttons must not overlap");
assert.ok(resetBottom <= displayHeight, "reset buttons must remain inside the settings content");

const shortMetrics = getSettingsPanelLayoutMetrics(808, compactPauseSettingsHeight, true);
const shortHeight = shortMetrics.contentBottom - shortMetrics.contentTop;
const shortFullscreenBottom = (
  display.shortFullscreenOffsetY + display.shortFullscreenButtonHeight / 2
);
const shortHintsTop = (
  display.shortControlHintsOffsetY - display.shortPrimaryButtonHeight / 2
);
const shortHintsBottom = (
  display.shortControlHintsOffsetY + display.shortPrimaryButtonHeight / 2
);
const shortShakeTop = (
  display.shortCameraShakeOffsetY - display.shortPrimaryButtonHeight / 2
);
const shortShakeBottom = (
  display.shortCameraShakeOffsetY + display.shortPrimaryButtonHeight / 2
);
const shortSliderTop = display.shortIntensityOffsetY - 20.5;
const shortSliderBottom = display.shortIntensityOffsetY + 31;
const shortFlashTop = (
  display.shortFlashOffsetY - display.shortPrimaryButtonHeight / 2
);
const shortFlashBottom = (
  display.shortFlashOffsetY + display.shortPrimaryButtonHeight / 2
);
const shortHeaderTop = display.shortGroupHeaderOffsetY - 6;
const shortHeaderBottom = display.shortGroupHeaderOffsetY + 6;
const shortGroupLabelTop = display.shortGroupStartOffsetY - 18;
const shortGroupButtonBottom = (
  display.shortGroupStartOffsetY
  + 11
  + display.shortGroupButtonHeight / 2
);
const shortResetTop = (
  shortHeight
  - display.shortResetBottomInsetY
  - display.shortResetButtonHeight / 2
);
const shortResetBottom = (
  shortHeight
  - display.shortResetBottomInsetY
  + display.shortResetButtonHeight / 2
);
assert.ok(shortHintsTop >= shortFullscreenBottom);
assert.ok(shortShakeTop >= shortHintsBottom);
assert.ok(shortSliderTop >= shortShakeBottom);
assert.ok(shortFlashTop >= shortSliderBottom);
assert.ok(shortHeaderTop >= shortFlashBottom);
assert.ok(shortGroupLabelTop >= shortHeaderBottom);
assert.ok(shortResetTop >= shortGroupButtonBottom);
assert.ok(shortResetBottom <= shortHeight);

const groupColumns = 5;
const groupCellWidth = (
  compactMetrics.width - display.groupHorizontalInset * 2
) / groupColumns;
const groupButtonWidth = Math.max(
  display.groupButtonMinWidth,
  Math.min(
    display.groupButtonMaxWidth,
    (groupCellWidth - display.groupButtonGap - 8) / 2,
  ),
);
assert.ok(
  groupButtonWidth * 2 + display.groupButtonGap <= groupCellWidth,
  "stacked camera-event ON/OFF buttons must fit their grid cell",
);

const gameplay = SETTINGS_PANEL_LAYOUT.gameplay;
assert.ok(
  gameplay.modeButtonOffsetY - gameplay.modeButtonHeight / 2
    > gameplay.floatingLabelOffsetY + 12,
  "floating-text mode buttons must begin below their label",
);
assert.ok(
  gameplay.selectedSummaryOffsetY
    > gameplay.modeButtonOffsetY + gameplay.modeButtonHeight / 2,
  "selected-mode summary must begin below the mode buttons",
);
assert.ok(
  gameplay.feedbackStartOffsetY - 17 > gameplay.floatingHintOffsetY,
  "feedback toggles must begin below the floating-text explanation",
);
assert.ok(
  gameplay.shortModeButtonOffsetY - gameplay.shortModeButtonHeight / 2
    > gameplay.shortFloatingLabelOffsetY + 12,
  "compact mode buttons must begin below their label",
);
assert.ok(
  gameplay.shortFeedbackStartOffsetY - 17
    > gameplay.shortFloatingHintOffsetY,
  "compact feedback toggles must begin below the explanation",
);
assert.ok(
  gameplay.shortFeedbackStartOffsetY
    + gameplay.shortFeedbackRowGap * 2
    + 17
    < shortHeight - gameplay.shortFooterBottomInsetY,
  "all compact gameplay toggles must remain above the footer",
);

const [uiKitSource, settingsSource, pauseSource, floatingTextSource, userSettingsSource] = await Promise.all([
  readFile(new URL("../ui/PhaserUiKit.js", import.meta.url), "utf8"),
  readFile(new URL("../ui/overlays/SettingsPanelContent.js", import.meta.url), "utf8"),
  readFile(new URL("../world/playScene/PlaySceneUI.js", import.meta.url), "utf8"),
  readFile(new URL("../systems/visual/FloatingTextSystem.js", import.meta.url), "utf8"),
  readFile(new URL("../systems/UserSettings.js", import.meta.url), "utf8"),
]);
assert.match(uiKitSource, /setFocused\(value\)\s*\{\s*state\.focused = Boolean\(value\)/);
assert.match(settingsSource, /selected:\s*active/);
assert.match(settingsSource, /layout:\s*"stacked"/);
assert.match(settingsSource, /SELECTED:/);
assert.match(pauseSource, /maxHeight:\s*PAUSE_MENU_LAYOUT\.maxHeight/);
assert.match(pauseSource, /bodyHeight < SETTINGS_PANEL_LAYOUT\.compactHeight/);
assert.match(
  pauseSource,
  /openingFlightArtifactSystem\?\.view\?\.hideHud\?\.\(\)/,
  "the first-run HUD must not cover pause-menu controls",
);
assert.match(floatingTextSource, /USER_SETTINGS\.getDisplay\(\)\.floatingTextMode/);
assert.match(settingsSource, /showStarDiscoveryPopups/);
assert.match(settingsSource, /scene\.floatingTextSystem\?\.applyDisplaySettings/);
assert.match(userSettingsSource, /showStarDiscoveryPopups/);

console.log("pause settings contract: persistent feedback options, Star popup opt-out, unobscured controls, and non-overlapping layout passed");
