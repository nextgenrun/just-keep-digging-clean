import { KEYBIND_ACTIONS } from "../../values/keybindActions.js";
import { CAMERA_SHAKE_SETTINGS_GROUPS } from "../../values/cameraShake.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { SETTINGS_PANEL_LAYOUT } from "../../values/uiLayout.js";
import { RETENTION_CONFIG } from "../../values/retentionConfig.js";
import { USER_SETTINGS, formatKey, normalizeKeyboardEvent } from "../../systems/UserSettings.js";
import {
  createButton,
  createFocusController,
  createKeybindRow,
  createSlider,
  createTabBar,
  createTogglePair,
} from "../PhaserUiKit.js";

const REBINDABLE_KEYBIND_ACTIONS = Object.freeze(
  KEYBIND_ACTIONS.filter(action => action.rebindable !== false)
);

export function getSettingsPanelLayoutMetrics(width = 700, height = 380, compact = false) {
  const layout = SETTINGS_PANEL_LAYOUT;
  const safeWidth = Math.max(1, Number(width) || 700);
  const safeHeight = Math.max(1, Number(height) || 380);
  const isCompact = Boolean(compact)
    || safeWidth < layout.compactWidth
    || safeHeight < layout.compactHeight;
  const tabCount = 4;
  const targetTabWidth = isCompact
    ? layout.compactTabButtonWidth
    : layout.tabButtonWidth;
  const maxTabWidth = Math.floor(
    (
      safeWidth
      - layout.tabHorizontalInset * 2
      - layout.tabGap * (tabCount - 1)
    ) / tabCount
  );
  const tabButtonWidth = Math.max(48, Math.min(targetTabWidth, maxTabWidth));
  const panelTop = -safeHeight / 2;
  const panelBottom = safeHeight / 2;

  return Object.freeze({
    width: safeWidth,
    height: safeHeight,
    compact: isCompact,
    panelTop,
    panelBottom,
    tabY: panelTop + layout.tabCenterInsetY,
    tabButtonWidth,
    tabSpacing: tabButtonWidth + layout.tabGap,
    contentTop: panelTop + layout.contentTopInsetY,
    contentBottom: panelBottom - layout.contentBottomInsetY,
  });
}

function addText(scene, parent, x, y, text, style = {}, origin = [0, 0]) {
  const obj = scene.add.text(x, y, text, {
    fontFamily: style.fontFamily || "Consolas, monospace",
    fontSize: style.fontSize || "12px",
    fontStyle: style.fontStyle || "normal",
    color: style.color || UI_COLORS.body,
    align: style.align || "left",
    lineSpacing: style.lineSpacing || 0,
  }).setOrigin(origin[0], origin[1]);
  parent.add(obj);
  return obj;
}

function applyAudio(scene, soundSystem, uiMuteToggle) {
  USER_SETTINGS.applyAudioTo(soundSystem || scene.soundSystem);
  const audio = USER_SETTINGS.getAudio();
  uiMuteToggle?.syncMusicState?.(audio.musicEnabled);
  uiMuteToggle?.syncSfxState?.(audio.sfxEnabled);
}

function refreshInputBindings(scene, inputHandler) {
  inputHandler?.refreshKeybinds?.();
  scene.inputHandler?.refreshKeybinds?.();
  scene.uiInventoryPopup?.refreshKeybinds?.();
  scene.campfireSystem?.refreshKeybinds?.();
  scene.milestoneBoardSystem?.refreshKeybinds?.();
  scene.hudSystem?.refreshKeybindHints?.();
  scene.lightSystem?.refreshKeybinds?.();
  scene.shopOverlay?.refreshKeybindHints?.();
  scene.npcManager?.refreshInteractPromptLabels?.();
  scene.specialTileSystem?.refreshPromptText?.();
  scene.starPillarSystem?.refreshInteractPromptLabels?.();
  scene.overlayManager?.refreshOverlayCopy?.();
}

function destroyObjects(objects) {
  objects.forEach(obj => {
    try {
      obj?.destroy?.();
    } catch (_) {}
  });
  objects.length = 0;
}

export function createSettingsPanelContent(scene, options = {}) {
  const {
    x = 0,
    y = 0,
    width = 700,
    height = 380,
    parent = null,
    depth = 2600,
    soundSystem = scene.soundSystem,
    inputHandler = scene.inputHandler,
    uiMuteToggle = scene.uiMuteToggle,
    manageFocus = true,
    compact = false,
  } = options;
  const metrics = getSettingsPanelLayoutMetrics(width, height, compact);
  const isCompact = metrics.compact;

  const root = scene.add.container(x, y);
  root.setDepth(depth);
  root.setScrollFactor(0);
  parent?.add?.(root);

  const tabs = createTabBar(scene, {
    x: 0,
    y: metrics.tabY,
    tabs: ["AUDIO", "CONTROLS", "DISPLAY", "GAMEPLAY"],
    activeIndex: 0,
    parent: root,
    depth,
    spacing: metrics.tabSpacing,
    buttonWidth: metrics.tabButtonWidth,
    buttonHeight: SETTINGS_PANEL_LAYOUT.tabButtonHeight,
    fontSize: isCompact ? "10px" : "12px",
    onChange: index => buildTab(index),
  });

  const state = {
    activeTab: 0,
    objects: [],
    controls: [],
    focus: null,
    rows: new Map(),
  };

  function setFocusItems(startIndex = 0) {
    const allControls = [...tabs.buttons, ...state.controls];
    state.focus?.setItems?.(allControls, Math.min(startIndex, Math.max(0, allControls.length - 1)));
  }

  function clearContent() {
    state.rows.clear();
    destroyObjects(state.controls);
    destroyObjects(state.objects);
  }

  function flashMessage(message, color = UI_COLORS.danger) {
    const msg = scene.add.text(
      0,
      metrics.contentBottom - SETTINGS_PANEL_LAYOUT.flashBottomInsetY,
      message,
      {
      fontFamily: "Consolas, monospace",
      fontSize: "12px",
      color,
      align: "center",
      }
    ).setOrigin(0.5);
    root.add(msg);
    state.objects.push(msg);
    scene.tweens.add({
      targets: msg,
      alpha: 0,
      delay: 1300,
      duration: 450,
      ease: "Power1.in",
      onComplete: () => msg.destroy(),
    });
  }

  function buildAudio() {
    const audio = USER_SETTINGS.getAudio();
    const audioLayout = SETTINGS_PANEL_LAYOUT.audio;
    const startY = metrics.contentTop + (
      isCompact
        ? audioLayout.compactFirstRowOffsetY
        : audioLayout.firstRowOffsetY
    );
    const rowGap = isCompact ? audioLayout.compactRowGap : audioLayout.rowGap;
    const sliderMaxWidth = isCompact
      ? audioLayout.compactSliderMaxWidth
      : audioLayout.sliderMaxWidth;
    const sliderWidth = Math.max(180, Math.min(metrics.width - 80, sliderMaxWidth));
    const rows = [
      ["Master", "masterVolume"],
      ["Music", "musicVolume"],
      ["SFX", "sfxVolume"],
      ["Voice", "voiceVolume"],
    ];

    rows.forEach(([label, key], index) => {
      const slider = createSlider(scene, {
        x: 0,
        y: startY + index * rowGap,
        width: sliderWidth,
        label,
        value: audio[key],
        parent: root,
        depth,
        onChange: value => {
          USER_SETTINGS.updateAudio({ [key]: value });
          applyAudio(scene, soundSystem, uiMuteToggle);
        },
      });
      state.controls.push(slider);
    });

    const toggleY = startY + rows.length * rowGap + audioLayout.toggleGapY;
    const toggleOffsetX = Math.max(82, Math.min(155, metrics.width / 4));
    [
      ["Music Enabled", "musicEnabled"],
      ["SFX Enabled", "sfxEnabled"],
    ].forEach(([label, key], index) => {
      const toggle = createTogglePair(scene, {
        x: index === 0 ? -toggleOffsetX : toggleOffsetX,
        y: toggleY,
        label,
        value: audio[key],
        layout: "stacked",
        buttonWidth: isCompact ? 58 : 66,
        buttonHeight: isCompact ? 26 : 28,
        buttonGap: 8,
        parent: root,
        depth,
        onChange: value => {
          USER_SETTINGS.updateAudio({ [key]: value });
          applyAudio(scene, soundSystem, uiMuteToggle);
        },
      });
      state.objects.push(toggle.root);
      state.controls.push(toggle.onBtn, toggle.offBtn);
    });

    state.objects.push(addText(
      scene,
      root,
      0,
      metrics.contentBottom - audioLayout.footerBottomInsetY,
      "Audio settings save instantly.",
      {
      fontSize: "12px",
      color: UI_COLORS.hint,
      align: "center",
      },
      [0.5, 0]
    ));
  }

  function refreshRows() {
    for (const action of REBINDABLE_KEYBIND_ACTIONS) {
      state.rows.get(action.id)?.setLabel(USER_SETTINGS.getKeyLabel(action.id));
    }
  }

  function openKeyCapture(action, row) {
    if (scene._settingsKeyCaptureActive) return;
    scene._settingsKeyCaptureActive = true;

    const W = scene.scale.width;
    const H = scene.scale.height;
    const cx = W / 2;
    const cy = H / 2;
    const captureRoot = scene.add.container(cx, cy).setDepth(depth + 400).setScrollFactor(0);
    const shade = scene.add.rectangle(0, 0, W, H, 0x000000, 0.72).setInteractive();
    const bg = scene.add.rectangle(0, 0, 520, 170, UI_COLORS.bg, 0.98).setStrokeStyle(2, UI_COLORS.borderSel);
    const title = scene.add.text(0, -48, `Press a new key for ${action.label} (ESC to cancel)`, {
      fontFamily: "Trebuchet MS, Segoe UI, sans-serif",
      fontSize: "18px",
      fontStyle: "bold",
      color: UI_COLORS.title,
      align: "center",
    }).setOrigin(0.5);
    const hint = scene.add.text(0, 8, "Press a valid key to replace this binding. ESC cancels capture.", {
      fontFamily: "Consolas, monospace",
      fontSize: "12px",
      color: UI_COLORS.hint,
      align: "center",
    }).setOrigin(0.5);
    captureRoot.add([shade, bg, title, hint]);

    const restoreControls = scene.gameState === "playing" && scene.playerController;
    if (restoreControls) scene.playerController.setControlsEnabled(false);

    const closeCapture = () => {
      scene.input.keyboard.off("keydown", keyHandler);
      captureRoot.destroy(true);
      scene._settingsKeyCaptureActive = false;
      if (restoreControls) scene.playerController.setControlsEnabled(true);
    };

    const keyHandler = event => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      const nextKey = normalizeKeyboardEvent(event);
      if (!nextKey || nextKey === "ESC") {
        row.flashStatus("Binding capture canceled.", UI_COLORS.hint);
        closeCapture();
        return;
      }

      const result = USER_SETTINGS.setKeybind(action.id, nextKey);
      if (!result.ok) {
        row.flashStatus(`Cannot bind "${formatKey(nextKey)}": ${result.error}`);
        closeCapture();
        return;
      }

      row.flashStatus(`Bound to ${formatKey(nextKey)}.`, UI_COLORS.success);
      refreshRows();
      refreshInputBindings(scene, inputHandler);
      closeCapture();
    };

    scene.input.keyboard.on("keydown", keyHandler);
  }

  function buildControls() {
    const controlsLayout = SETTINGS_PANEL_LAYOUT.controls;
    const startY = metrics.contentTop + controlsLayout.firstRowOffsetY;
    const availableRowsHeight = Math.max(
      1,
      metrics.contentBottom - startY - (isCompact ? 16 : 20)
    );
    const twoColumnRows = Math.ceil(REBINDABLE_KEYBIND_ACTIONS.length / 2);
    const twoColumnGap = availableRowsHeight / Math.max(1, twoColumnRows - 1);
    const columnCount = (
      twoColumnGap < controlsLayout.minRowGap
      && metrics.width >= controlsLayout.threeColumnMinWidth
    ) ? 3 : 2;
    const rowsPerColumn = Math.ceil(REBINDABLE_KEYBIND_ACTIONS.length / columnCount);
    const targetRowGap = isCompact
      ? controlsLayout.compactRowGap
      : controlsLayout.rowGap;
    const rowGap = Math.min(
      targetRowGap,
      availableRowsHeight / Math.max(1, rowsPerColumn - 1)
    );
    const maxColumnWidth = isCompact ? 300 : 330;
    const usableWidth = Math.min(
      metrics.width - 36,
      columnCount * maxColumnWidth + (columnCount - 1) * controlsLayout.columnGutter
    );
    const columnWidth = (
      usableWidth - (columnCount - 1) * controlsLayout.columnGutter
    ) / columnCount;
    const firstColumnX = -usableWidth / 2 + columnWidth / 2;
    const cols = Array.from({ length: columnCount }, (_, index) => ({
      x: firstColumnX + index * (columnWidth + controlsLayout.columnGutter),
      width: columnWidth,
    }));

    const fullscreenKey = USER_SETTINGS.getKeyLabel("fullscreen");
    state.objects.push(addText(scene, root, 0, metrics.contentTop + controlsLayout.instructionOffsetY,
      `${fullscreenKey} is reserved for fullscreen. Click a binding, then press a new key. ESC exits binding mode.`,
      { fontSize: isCompact ? "10px" : "11px", color: UI_COLORS.hint, align: "center" },
      [0.5, 0]
    ));

    REBINDABLE_KEYBIND_ACTIONS.forEach((action, index) => {
      const col = cols[Math.floor(index / rowsPerColumn)];
      const rowIndex = index % rowsPerColumn;
      const row = createKeybindRow(scene, {
        x: col.x,
        y: startY + rowIndex * rowGap,
        width: col.width,
        label: action.label,
        description: isCompact ? "" : action.description,
        compact: isCompact,
        keyLabel: USER_SETTINGS.getKeyLabel(action.id),
        parent: root,
        depth,
        onCapture: () => openKeyCapture(action, row),
        onReset: () => {
          const result = USER_SETTINGS.setKeybind(action.id, action.defaultKey);
          if (!result.ok) {
            row.flashStatus(result.error);
            return;
          }
          row.flashStatus("Default restored.", UI_COLORS.success);
          refreshRows();
          refreshInputBindings(scene, inputHandler);
        },
      });
      state.rows.set(action.id, row);
      state.controls.push(row);
    });
  }

  function buildDisplay() {
    const display = USER_SETTINGS.getDisplay();
    const displayLayout = SETTINGS_PANEL_LAYOUT.display;
    const availableHeight = metrics.contentBottom - metrics.contentTop;
    const useShortLayout = availableHeight < displayLayout.compactReferenceHeight;
    const atOffset = offset => metrics.contentTop + offset;
    const headerY = atOffset(displayLayout.headerOffsetY);
    const fullscreenY = atOffset(
      useShortLayout ? displayLayout.shortFullscreenOffsetY : displayLayout.fullscreenOffsetY
    );
    const controlHintsY = atOffset(
      useShortLayout ? displayLayout.shortControlHintsOffsetY : displayLayout.controlHintsOffsetY
    );
    const cameraShakeY = atOffset(
      useShortLayout ? displayLayout.shortCameraShakeOffsetY : displayLayout.cameraShakeOffsetY
    );
    const intensityY = atOffset(
      useShortLayout ? displayLayout.shortIntensityOffsetY : displayLayout.intensityOffsetY
    );
    const flashY = atOffset(
      useShortLayout ? displayLayout.shortFlashOffsetY : displayLayout.flashOffsetY
    );
    const groupHeaderY = atOffset(
      useShortLayout ? displayLayout.shortGroupHeaderOffsetY : displayLayout.groupHeaderOffsetY
    );
    const groupStartY = atOffset(
      useShortLayout ? displayLayout.shortGroupStartOffsetY : displayLayout.groupStartOffsetY
    );
    const fullscreenButtonHeight = useShortLayout
      ? displayLayout.shortFullscreenButtonHeight
      : displayLayout.fullscreenButtonHeight;
    const primaryButtonHeight = useShortLayout
      ? displayLayout.shortPrimaryButtonHeight
      : 34;
    const groupButtonHeight = useShortLayout
      ? displayLayout.shortGroupButtonHeight
      : displayLayout.groupButtonHeight;
    const resetButtonHeight = useShortLayout
      ? displayLayout.shortResetButtonHeight
      : displayLayout.resetButtonHeight;
    const resetBottomInsetY = useShortLayout
      ? displayLayout.shortResetBottomInsetY
      : displayLayout.resetBottomInsetY;
    const sliderWidth = Math.max(
      180,
      Math.min(metrics.width - 90, isCompact ? 470 : 540)
    );
    const groupColumns = metrics.width >= displayLayout.fiveColumnMinWidth
      ? 5
      : metrics.width >= displayLayout.threeColumnMinWidth
        ? 3
        : 2;
    const groupGap = displayLayout.groupRowGap;
    const groupUsableWidth = metrics.width - displayLayout.groupHorizontalInset * 2;
    const groupCellWidth = groupUsableWidth / groupColumns;
    const groupFirstX = -groupUsableWidth / 2 + groupCellWidth / 2;
    const groupButtonWidth = Math.max(
      displayLayout.groupButtonMinWidth,
      Math.min(
        displayLayout.groupButtonMaxWidth,
        (groupCellWidth - displayLayout.groupButtonGap - 8) / 2
      )
    );
    const resetY = metrics.contentBottom - resetBottomInsetY;
    const resetButtonWidth = Math.max(
      100,
      Math.min(
        displayLayout.resetButtonMaxWidth,
        (
          metrics.width
          - displayLayout.resetButtonGap
          - displayLayout.groupHorizontalInset * 2
        ) / 2
      )
    );
    const resetOffsetX = (resetButtonWidth + displayLayout.resetButtonGap) / 2;

    state.objects.push(addText(scene, root, 0, headerY, "Display", {
      fontFamily: "Trebuchet MS, Segoe UI, sans-serif",
      fontSize: "18px",
      fontStyle: "bold",
      color: UI_COLORS.title,
      align: "center",
    }, [0.5, 0.5]));

    const fullscreenButton = createButton(scene, {
      x: 0,
      y: fullscreenY,
      width: Math.min(metrics.width - 80, 420),
      height: fullscreenButtonHeight,
      label: "TOGGLE FULLSCREEN",
      hint: USER_SETTINGS.getKeyLabel("fullscreen"),
      parent: root,
      depth,
      accent: UI_COLORS.borderSel,
      onClick: () => {
        if (typeof window !== "undefined" && window.__toggleGameFullscreen) {
          window.__toggleGameFullscreen().catch(() => flashMessage("Fullscreen request was blocked."));
        } else {
          flashMessage("Fullscreen is unavailable in this browser.");
        }
      },
    });
    state.controls.push(fullscreenButton);

    const hints = createTogglePair(scene, {
      x: 40,
      y: controlHintsY,
      label: "Control Hints",
      value: display.showControlHints,
      buttonHeight: primaryButtonHeight,
      parent: root,
      depth,
      onChange: value => {
        USER_SETTINGS.updateDisplay({ showControlHints: value });
        refreshInputBindings(scene, inputHandler);
      },
    });
    state.objects.push(hints.root);
    state.controls.push(hints.onBtn, hints.offBtn);

    const cameraShakeMaster = createTogglePair(scene, {
      x: 40,
      y: cameraShakeY,
      label: "Camera Shake",
      value: display.cameraShakeEnabled,
      buttonHeight: primaryButtonHeight,
      parent: root,
      depth,
      onChange: value => {
        USER_SETTINGS.updateDisplay({ cameraShakeEnabled: value });
      },
    });
    state.objects.push(cameraShakeMaster.root);
    state.controls.push(cameraShakeMaster.onBtn, cameraShakeMaster.offBtn);

    const camShakeIntensity = createSlider(scene, {
      x: 0,
      y: intensityY,
      width: sliderWidth,
      label: "Camera Shake Intensity",
      value: display.cameraShakeIntensity,
      parent: root,
      depth,
      onChange: value => {
        USER_SETTINGS.updateDisplay({ cameraShakeIntensity: value });
      },
    });
    state.controls.push(camShakeIntensity);

    const camFlashToggle = createTogglePair(scene, {
      x: 40,
      y: flashY,
      label: "Shake Flash",
      value: display.cameraShakeFlashEnabled !== false,
      buttonHeight: primaryButtonHeight,
      parent: root,
      depth,
      onChange: value => {
        USER_SETTINGS.updateDisplay({ cameraShakeFlashEnabled: value });
      },
    });
    state.objects.push(camFlashToggle.root);
    state.controls.push(camFlashToggle.onBtn, camFlashToggle.offBtn);

    state.objects.push(addText(scene, root, 0, groupHeaderY, "Camera Shake Events", {
      fontFamily: "Consolas, monospace",
      fontSize: isCompact ? "10px" : "11px",
      color: UI_COLORS.hint,
    }, [0.5, 0.5]));

    CAMERA_SHAKE_SETTINGS_GROUPS.forEach((group, index) => {
      const row = Math.floor(index / groupColumns);
      const col = index % groupColumns;
      const gy = groupStartY + row * groupGap;
      const toggle = createTogglePair(scene, {
        x: groupFirstX + col * groupCellWidth,
        y: gy,
        label: group.label,
        value: Boolean(display.cameraShakeGroups?.[group.key]),
        layout: "stacked",
        labelFontSize: groupColumns === 5 ? "10px" : "11px",
        buttonWidth: groupButtonWidth,
        buttonHeight: groupButtonHeight,
        buttonGap: displayLayout.groupButtonGap,
        parent: root,
        depth,
        onChange: value => {
          USER_SETTINGS.updateDisplay({ cameraShakeGroups: { [group.key]: value } });
        },
      });
      state.objects.push(toggle.root);
      state.controls.push(toggle.onBtn, toggle.offBtn);
    });

    const resetControls = createButton(scene, {
      x: -resetOffsetX,
      y: resetY,
      width: resetButtonWidth,
      height: resetButtonHeight,
      label: "RESET KEYBINDS",
      parent: root,
      depth,
      accent: UI_COLORS.borderBad,
      onClick: () => {
        USER_SETTINGS.resetKeybinds();
        refreshInputBindings(scene, inputHandler);
        flashMessage("Keybinds reset.", UI_COLORS.success);
      },
    });
    const resetAll = createButton(scene, {
      x: resetOffsetX,
      y: resetY,
      width: resetButtonWidth,
      height: resetButtonHeight,
      label: "RESET SETTINGS",
      parent: root,
      depth,
      accent: UI_COLORS.borderBad,
      onClick: () => {
        USER_SETTINGS.resetAll();
        applyAudio(scene, soundSystem, uiMuteToggle);
        refreshInputBindings(scene, inputHandler);
        buildTab(state.activeTab, true);
        flashMessage("Settings reset.", UI_COLORS.success);
      },
    });
    state.controls.push(resetControls, resetAll);
  }

  function buildGameplay() {
    const display = USER_SETTINGS.getDisplay();
    const copy = RETENTION_CONFIG.settings;
    const floatingTextConfig = RETENTION_CONFIG.floatingText;
    const gameplayLayout = SETTINGS_PANEL_LAYOUT.gameplay;
    const availableHeight = metrics.contentBottom - metrics.contentTop;
    const useShortLayout = availableHeight < gameplayLayout.compactReferenceHeight;
    const atOffset = offset => metrics.contentTop + offset;
    const floatingLabelOffsetY = useShortLayout
      ? gameplayLayout.shortFloatingLabelOffsetY
      : gameplayLayout.floatingLabelOffsetY;
    const modeButtonOffsetY = useShortLayout
      ? gameplayLayout.shortModeButtonOffsetY
      : gameplayLayout.modeButtonOffsetY;
    const modeButtonHeight = useShortLayout
      ? gameplayLayout.shortModeButtonHeight
      : gameplayLayout.modeButtonHeight;
    const selectedSummaryOffsetY = useShortLayout
      ? gameplayLayout.shortSelectedSummaryOffsetY
      : gameplayLayout.selectedSummaryOffsetY;
    const floatingHintOffsetY = useShortLayout
      ? gameplayLayout.shortFloatingHintOffsetY
      : gameplayLayout.floatingHintOffsetY;
    const feedbackStartOffsetY = useShortLayout
      ? gameplayLayout.shortFeedbackStartOffsetY
      : gameplayLayout.feedbackStartOffsetY;
    const feedbackRowGap = useShortLayout
      ? gameplayLayout.shortFeedbackRowGap
      : gameplayLayout.feedbackRowGap;
    const rows = [
      {
        key: "showSessionObjective",
        label: copy.objectiveLabel,
        hint: copy.objectiveHint,
      },
    ];

    state.objects.push(addText(scene, root, 0, atOffset(gameplayLayout.headerOffsetY), "Gameplay Feedback", {
      fontFamily: "Trebuchet MS, Segoe UI, sans-serif",
      fontSize: "18px",
      fontStyle: "bold",
      color: UI_COLORS.title,
    }, [0.5, 0.5]));

    state.objects.push(addText(scene, root, 0, atOffset(floatingLabelOffsetY), copy.floatingTextLabel, {
      fontSize: "12px",
      fontStyle: "bold",
      color: UI_COLORS.body,
      align: "center",
    }, [0.5, 0]));

    const modeEntries = Object.entries(floatingTextConfig.modes);
    const modeButtonWidth = Math.max(
      64,
      Math.min(
        gameplayLayout.modeButtonMaxWidth,
        Math.floor(
          (
            metrics.width
            - gameplayLayout.modeHorizontalInset * 2
            - gameplayLayout.modeButtonGap * (modeEntries.length - 1)
          ) / modeEntries.length
        )
      )
    );
    const modeSpacing = modeButtonWidth + gameplayLayout.modeButtonGap;
    modeEntries.forEach(([mode, modeConfig], index) => {
      const active = display.floatingTextMode === mode;
      const button = createButton(scene, {
        x: (index - (modeEntries.length - 1) / 2) * modeSpacing,
        y: atOffset(modeButtonOffsetY),
        width: modeButtonWidth,
        height: modeButtonHeight,
        label: active
          ? `${modeConfig.label}  ${isCompact ? "ACTIVE" : "SELECTED"}`
          : modeConfig.label,
        fontSize: isCompact ? "10px" : "12px",
        selected: active,
        selectedFill: UI_COLORS.cardSel,
        labelColor: active ? UI_COLORS.gold : UI_COLORS.white,
        parent: root,
        depth,
        accent: active ? UI_COLORS.borderSel : UI_COLORS.borderDim,
        onClick: () => {
          USER_SETTINGS.updateDisplay({ floatingTextMode: mode });
          scene.floatingTextSystem?.applyDisplaySettings?.();
          buildTab(state.activeTab, true);
        },
      });
      state.controls.push(button);
    });

    const activeMode = floatingTextConfig.modes[display.floatingTextMode]
      || floatingTextConfig.modes[floatingTextConfig.defaultMode];
    const selectedSummary = addText(
      scene,
      root,
      0,
      atOffset(selectedSummaryOffsetY),
      `SELECTED: ${activeMode.label} — ${activeMode.summary}`,
      {
        fontSize: isCompact ? "9px" : "10px",
        fontStyle: "bold",
        color: UI_COLORS.gold,
        align: "center",
      },
      [0.5, 0]
    );
    selectedSummary.setWordWrapWidth(Math.max(180, metrics.width - 70));
    state.objects.push(selectedSummary);

    const floatingTextHint = addText(
      scene,
      root,
      0,
      atOffset(floatingHintOffsetY),
      copy.floatingTextHint,
      {
      fontSize: "10px",
      color: UI_COLORS.hint,
      align: "center",
      },
      [0.5, 0]
    );
    floatingTextHint.setWordWrapWidth(Math.max(180, metrics.width - 70));
    state.objects.push(floatingTextHint);

    rows.forEach((row, index) => {
      const rowY = atOffset(
        feedbackStartOffsetY + index * feedbackRowGap
      );
      const toggle = createTogglePair(scene, {
        x: 55,
        y: rowY,
        label: row.label,
        value: display[row.key] !== false,
        parent: root,
        depth,
        onChange: value => {
          USER_SETTINGS.updateDisplay({ [row.key]: value });
          if (row.refreshFloatingText) {
            scene.floatingTextSystem?.applyDisplaySettings?.();
          }
        },
      });
      state.objects.push(toggle.root);
      if (!useShortLayout) {
        const hint = addText(scene, root, 0, rowY + gameplayLayout.feedbackHintOffsetY, row.hint, {
          fontSize: "10px",
          color: UI_COLORS.hint,
          align: "center",
        }, [0.5, 0]);
        hint.setWordWrapWidth(Math.max(180, metrics.width - 70));
        state.objects.push(hint);
      }
      state.controls.push(toggle.onBtn, toggle.offBtn);
    });

    state.objects.push(addText(
      scene,
      root,
      0,
      metrics.contentBottom - (
        useShortLayout
          ? gameplayLayout.shortFooterBottomInsetY
          : gameplayLayout.footerBottomInsetY
      ),
      "These options hide presentation only. Progress and rewards remain unchanged.",
      { fontSize: "11px", color: UI_COLORS.hint, align: "center" },
      [0.5, 0]
    ));
  }

  function buildTab(index, preserveFocus = false) {
    clearContent();
    state.activeTab = index;
    tabs.setActive(index, true);
    if (index === 0) buildAudio();
    else if (index === 1) buildControls();
    else if (index === 2) buildDisplay();
    else buildGameplay();
    setFocusItems(preserveFocus ? tabs.buttons.length : index);
  }

  if (manageFocus) {
    state.focus = createFocusController(scene, {
      items: [],
      enabled: () => root.visible && !scene._settingsKeyCaptureActive,
      onCancel: () => options.onCancel?.(),
    });
  }

  buildTab(0);

  return {
    root,
    tabs,
    getControls() {
      return [...tabs.buttons, ...state.controls];
    },
    setTab(index) {
      const nextIndex = typeof index === "string"
        ? { audio: 0, controls: 1, display: 2, gameplay: 3 }[index] ?? 0
        : index;
      buildTab(nextIndex, true);
    },
    capture(actionId) {
      const row = state.rows.get(actionId);
      return row?.activate?.() ?? false;
    },
    setVisible(value) {
      root.setVisible(value);
    },
    destroy() {
      state.focus?.destroy?.();
      clearContent();
      tabs.destroy();
      root.destroy(true);
    },
  };
}
