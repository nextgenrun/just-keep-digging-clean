import { KEYBIND_ACTIONS } from "../../values/keybindActions.js";
import { CAMERA_SHAKE_SETTINGS_GROUPS } from "../../values/cameraShake.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { USER_SETTINGS, formatKey, normalizeKeyboardEvent } from "../../systems/UserSettings.js";
import {
  createButton,
  createFocusController,
  createKeybindRow,
  createSlider,
  createTabBar,
  createTogglePair,
} from "../PhaserUiKit.js";

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
  scene.levelUpPopup?.refreshKeybindHints?.();
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

  const root = scene.add.container(x, y);
  root.setDepth(depth);
  root.setScrollFactor(0);
  parent?.add?.(root);

  const tabs = createTabBar(scene, {
    x: 0,
    y: -height / 2 + 24,
    tabs: ["AUDIO", "CONTROLS", "DISPLAY"],
    activeIndex: 0,
    parent: root,
    depth,
    spacing: compact ? 104 : 128,
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
    const msg = scene.add.text(0, height / 2 - 22, message, {
      fontFamily: "Consolas, monospace",
      fontSize: "12px",
      color,
      align: "center",
    }).setOrigin(0.5);
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
    const startY = compact ? -118 : -128;
    const sliderWidth = compact ? 470 : 520;
    const rows = [
      ["Master", "masterVolume"],
      ["Music", "musicVolume"],
      ["SFX", "sfxVolume"],
      ["Voice", "voiceVolume"],
    ];

    rows.forEach(([label, key], index) => {
      const slider = createSlider(scene, {
        x: 0,
        y: startY + index * 48,
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

    const toggleY = startY + rows.length * 48 + 10;
    [
      ["Music Enabled", "musicEnabled"],
      ["SFX Enabled", "sfxEnabled"],
    ].forEach(([label, key], index) => {
      const toggle = createTogglePair(scene, {
        x: index === 0 ? -150 : 190,
        y: toggleY,
        label,
        value: audio[key],
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

    state.objects.push(addText(scene, root, 0, height / 2 - 52, "Audio settings save instantly.", {
      fontSize: "12px",
      color: UI_COLORS.hint,
      align: "center",
    }, [0.5, 0]));
  }

  function refreshRows() {
    for (const action of KEYBIND_ACTIONS) {
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
    const title = scene.add.text(0, -48, `Press a new key for ${action.label}`, {
      fontFamily: "Trebuchet MS, Segoe UI, sans-serif",
      fontSize: "18px",
      fontStyle: "bold",
      color: UI_COLORS.title,
      align: "center",
    }).setOrigin(0.5);
    const hint = scene.add.text(0, 8, "ESC cancels. Duplicate bindings are not accepted.", {
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
        row.flashStatus("Canceled.", UI_COLORS.hint);
        closeCapture();
        return;
      }

      const result = USER_SETTINGS.setKeybind(action.id, nextKey);
      if (!result.ok) {
        row.flashStatus(result.error);
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
    const cols = compact
      ? [{ x: -164, width: 300 }, { x: 164, width: 300 }]
      : [{ x: -180, width: 330 }, { x: 180, width: 330 }];
    const rowGap = compact ? 31 : 37;
    const startY = compact ? -116 : -124;

    state.objects.push(addText(scene, root, 0, startY - 26,
      "Click a binding, then press a new key. UI navigation stays on arrows/WASD, Enter/Space, and ESC.",
      { fontSize: compact ? "10px" : "11px", color: UI_COLORS.hint, align: "center" },
      [0.5, 0]
    ));

    KEYBIND_ACTIONS.forEach((action, index) => {
      const col = cols[index < Math.ceil(KEYBIND_ACTIONS.length / 2) ? 0 : 1];
      const rowIndex = index % Math.ceil(KEYBIND_ACTIONS.length / 2);
      const row = createKeybindRow(scene, {
        x: col.x,
        y: startY + rowIndex * rowGap,
        width: col.width,
        label: action.label,
        description: compact ? "" : action.description,
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
    const headerY = compact
      ? -Math.min(height / 2 - 20, 160)
      : -Math.min(height / 2 - 20, 140);
    const sectionGap = compact ? 44 : 50;
    const sliderWidth = compact ? Math.min(width - 120, 470) : Math.min(width - 90, 540);
    const masterY = headerY + sectionGap;
    const intensityY = masterY + (compact ? 50 : 56);
    const flashY = intensityY + (compact ? 42 : 48);
    const groupHeaderY = flashY + 36;
    const groupStartY = groupHeaderY + 14;
    const groupColumns = compact
      ? (width >= 700 ? 3 : (width >= 520 ? 2 : 1))
      : (width >= 760 ? 3 : (width >= 560 ? 2 : 1));
    const groupRows = Math.ceil(CAMERA_SHAKE_SETTINGS_GROUPS.length / groupColumns);
    const groupGap = compact ? 20 : 24;
    const maxOffsetByPanel = Math.max(0, Math.floor(width / 2 - 215));
    const groupOffset = groupColumns === 3
      ? Math.max(70, Math.min(maxOffsetByPanel, 150))
      : groupColumns === 2
        ? Math.max(64, Math.min(maxOffsetByPanel, 130))
        : 0;
    const groupX = groupColumns === 3 ? [-groupOffset, 0, groupOffset]
      : groupColumns === 2 ? [-groupOffset, groupOffset]
      : [0];
    const resetY = Math.min(height / 2 - 30, groupStartY + groupRows * groupGap + 18);

    state.objects.push(addText(scene, root, 0, headerY, "Display", {
      fontFamily: "Trebuchet MS, Segoe UI, sans-serif",
      fontSize: "18px",
      fontStyle: "bold",
      color: UI_COLORS.title,
    }));

    const fullscreenButton = createButton(scene, {
      x: 0,
      y: masterY - (compact ? 78 : 84),
      width: Math.min(width - 100, 420),
      height: 44,
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
      y: masterY - (compact ? 38 : 40),
      label: "Control Hints",
      value: display.showControlHints,
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
      y: masterY,
      label: "Camera Shake",
      value: display.cameraShakeEnabled,
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
      fontSize: compact ? "10px" : "11px",
      color: UI_COLORS.hint,
    }, [0.5, 0.5]));

    CAMERA_SHAKE_SETTINGS_GROUPS.forEach((group, index) => {
      const row = Math.floor(index / groupColumns);
      const col = index % groupColumns;
      const gy = groupStartY + row * groupGap;
      const toggle = createTogglePair(scene, {
        x: groupX[col],
        y: gy,
        label: group.label,
        value: Boolean(display.cameraShakeGroups?.[group.key]),
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
      x: -120,
      y: resetY,
      width: 240,
      height: 42,
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
      x: 150,
      y: resetY,
      width: 240,
      height: 42,
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

  function buildTab(index, preserveFocus = false) {
    clearContent();
    state.activeTab = index;
    tabs.setActive(index, true);
    if (index === 0) buildAudio();
    else if (index === 1) buildControls();
    else buildDisplay();
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
        ? { audio: 0, controls: 1, display: 2 }[index] ?? 0
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
