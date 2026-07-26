import {
  PAUSE_MENU_LAYOUT,
  SETTINGS_PANEL_LAYOUT,
} from "../values/uiLayout.js";
import { USER_SETTINGS } from "../systems/UserSettings.js";
import { createModalShell } from "../ui/UiModalShell.js";
import {
  createHintLegend,
  createTabBar,
} from "../ui/PhaserUiKit.js";
import {
  createSettingsPanelContent,
  getSettingsPanelLayoutMetrics,
} from "../ui/overlays/SettingsPanelContent.js";

const params = new URLSearchParams(window.location.search);
const reviewWidth = Phaser.Math.Clamp(Number(params.get("width")) || 1280, 640, 1600);
const reviewHeight = Phaser.Math.Clamp(Number(params.get("height")) || 720, 520, 1000);

class PauseSettingsReviewScene extends Phaser.Scene {
  constructor() {
    super("PauseSettingsReviewScene");
  }

  create() {
    this.soundSystem = {
      playUiConfirm() {},
      playUiSelect() {},
      applySettings() {},
    };
    this.playerController = { setControlsEnabled() {} };
    this.gameState = "paused";

    const shell = createModalShell(this, {
      title: "PAUSED",
      subtitle: "Run controls, progression, and settings",
      icon: "pause",
      maxWidth: PAUSE_MENU_LAYOUT.maxWidth,
      maxHeight: PAUSE_MENU_LAYOUT.maxHeight,
      depth: 2500,
      showClose: true,
      onClose() {},
    });
    const rect = shell.getContentRect();
    const bodyTop = rect.top + PAUSE_MENU_LAYOUT.bodyTopOffset;
    const bodyHeight = rect.bottom - bodyTop;
    const compact = (
      rect.width < SETTINGS_PANEL_LAYOUT.compactWidth
      || bodyHeight < SETTINGS_PANEL_LAYOUT.compactHeight
    );

    createTabBar(this, {
      x: rect.left + 235,
      y: rect.top + PAUSE_MENU_LAYOUT.tabRowOffsetY,
      tabs: [
        { label: "GENERAL", icon: "journal" },
        { label: "STATS", icon: "stats" },
        { label: "SETTINGS", icon: "settings" },
      ],
      activeIndex: 2,
      parent: shell.content,
    });

    const settings = createSettingsPanelContent(this, {
      x: 0,
      y: bodyTop + bodyHeight / 2,
      width: rect.width,
      height: bodyHeight,
      parent: shell.content,
      depth: 2503,
      manageFocus: false,
      compact,
    });
    settings.setTab("gameplay");

    createHintLegend(this, {
      x: 0,
      y: shell.height / 2 - 24,
      text: "WASD / Arrows: move    Enter / Space: select    ESC: resume",
      parent: shell.root,
    });

    shell.show();
    const metrics = getSettingsPanelLayoutMetrics(rect.width, bodyHeight, compact);
    const currentDisplay = USER_SETTINGS.getDisplay();
    globalThis.__pauseSettingsReview = {
      ready: true,
      shell,
      settings,
      metrics,
      setTab(tab) {
        settings.setTab(tab);
        return tab;
      },
      getDisplay() {
        return { ...USER_SETTINGS.getDisplay() };
      },
    };
    document.body.dataset.reviewReady = "true";
    document.body.dataset.floatingTextMode = currentDisplay.floatingTextMode;
    document.body.dataset.settingsWidth = String(rect.width);
    document.body.dataset.settingsHeight = String(bodyHeight);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "review-root",
  width: reviewWidth,
  height: reviewHeight,
  backgroundColor: "#030609",
  transparent: false,
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: true,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [PauseSettingsReviewScene],
});
