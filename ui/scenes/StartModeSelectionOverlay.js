import { ASSET_KEYS } from "../../values/assetKeys.js";
import {
  HARDCORE_MODE_CONFIG,
  createHardcoreModeData,
} from "../../values/hardcoreMode.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { createSaveChoiceChrome } from "../components/SaveMenuPresentationView.js";

export class StartModeSelectionOverlay {
  constructor(scene, config = HARDCORE_MODE_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.root = null;
    this.choiceObjects = [];
    this.selectedMode = config.modes.casual;
    this.onChoose = null;
    this.onCancel = null;
    this._keyboardAttachTimer = null;
    this._keyHandler = event => this._handleKey(event);
    this._create();
  }

  get isVisible() {
    return this.root?.visible === true;
  }

  _create() {
    const ui = this.config.ui;
    const modeUi = ui.modeSelector;
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const panelKey = ASSET_KEYS.ui.hardcore.oathPanel;
    const crestKey = ASSET_KEYS.ui.hardcore.oathCrest;
    const casualKey = ASSET_KEYS.ui.approvedHud.playerCore;
    if (
      !this.scene.textures.exists(panelKey)
      || !this.scene.textures.exists(crestKey)
      || !this.scene.textures.exists(casualKey)
    ) {
      throw new Error("[StartModeSelectionOverlay] Approved mode UI art is missing.");
    }

    this.root = this.scene.add.container(width / 2, height / 2)
      .setDepth(ui.depth)
      .setVisible(false);
    const shade = this.scene.add.rectangle(0, 0, width, height, 0x020104, 0.9)
      .setInteractive();
    const panel = this.scene.add.image(0, 0, panelKey)
      .setDisplaySize(ui.panelWidth, ui.panelHeight);
    const title = this.scene.add.text(0, modeUi.headerTitleY, modeUi.title, {
      fontFamily: UI_FONTS.display,
      fontSize: `${ui.font.titlePx}px`,
      fontStyle: "bold",
      color: UI_COLORS.title,
      stroke: "#080204",
      strokeThickness: 5,
    }).setOrigin(0.5);
    const subtitle = this.scene.add.text(0, modeUi.headerSubtitleY, modeUi.subtitle, {
      fontFamily: UI_FONTS.mono,
      fontSize: `${ui.font.subtitlePx}px`,
      fontStyle: "bold",
      color: UI_COLORS.danger,
    }).setOrigin(0.5);
    const footer = this.scene.add.text(
      0,
      ui.footerY,
      "A / D OR ARROWS  CHOOSE     ENTER  CONFIRM     ESC  CANCEL",
      {
        fontFamily: UI_FONTS.mono,
        fontSize: `${ui.font.footerPx}px`,
        color: UI_COLORS.hint,
      },
    ).setOrigin(0.5);
    this.root.add([shade, panel, title, subtitle, footer]);

    this._createChoice({
      mode: this.config.modes.casual,
      x: -modeUi.choiceGap / 2,
      iconKey: casualKey,
      iconWidth: modeUi.casualIconWidthPx,
      iconHeight: modeUi.casualIconHeightPx,
      iconMaskRadius: 0,
      title: this.config.copy.casualName,
      body: this.config.copy.casualSummary,
      accent: modeUi.casualAccent,
    });
    this._createChoice({
      mode: this.config.modes.hardcore,
      x: modeUi.choiceGap / 2,
      iconKey: crestKey,
      iconWidth: modeUi.hardcoreIconSizePx,
      iconHeight: modeUi.hardcoreIconSizePx,
      iconMaskRadius: modeUi.hardcoreIconMaskRadiusPx,
      title: this.config.copy.hardcoreName,
      body: this.config.copy.hardcoreSummary,
      accent: modeUi.hardcoreAccent,
    });
  }

  _createChoice({ mode, x, iconKey, iconWidth, iconHeight, iconMaskRadius, title, body, accent }) {
    const ui = this.config.ui;
    const modeUi = ui.modeSelector;
    const y = modeUi.choiceCenterY;
    const container = this.scene.add.container(x, y);
    const frame = this.scene._useAuthoredSaveMenuArt
      ? createSaveChoiceChrome(this.scene, {
          width: modeUi.choiceWidth,
          height: modeUi.choiceHeight,
        })
      : null;
    const hit = this.scene.add.rectangle(
      0,
      0,
      modeUi.choiceWidth,
      modeUi.choiceHeight,
      0x000000,
      0,
    ).setInteractive({ useHandCursor: true });
    const icon = this.scene.add.image(0, modeUi.iconY, iconKey)
      .setDisplaySize(iconWidth, iconHeight);
    let iconMaskGeometry = null;
    if (iconMaskRadius > 0) {
      const absoluteX = this.scene.scale.width / 2 + x;
      const absoluteY = this.scene.scale.height / 2 + y + modeUi.iconY;
      iconMaskGeometry = this.scene.make.graphics({ add: false });
      iconMaskGeometry.fillStyle(0xffffff, 1);
      iconMaskGeometry.fillCircle(absoluteX, absoluteY, iconMaskRadius);
      icon.setMask(iconMaskGeometry.createGeometryMask());
    }
    const titleText = this.scene.add.text(0, modeUi.titleY, title, {
      fontFamily: UI_FONTS.display,
      fontSize: `${ui.font.choiceTitlePx}px`,
      fontStyle: "bold",
      color: accent,
      stroke: "#070205",
      strokeThickness: 4,
      align: "center",
    }).setOrigin(0.5);
    const bodyText = this.scene.add.text(0, modeUi.bodyY, body, {
      fontFamily: UI_FONTS.body,
      fontSize: `${ui.font.choiceBodyPx}px`,
      color: UI_COLORS.body,
      align: "center",
      lineSpacing: modeUi.bodyLineSpacingPx,
      wordWrap: { width: modeUi.bodyMaxWidthPx, useAdvancedWrap: true },
    }).setOrigin(0.5, 0);
    const selectedText = this.scene.add.text(0, modeUi.selectedY, "SELECTED", {
      fontFamily: UI_FONTS.mono,
      fontSize: `${ui.font.typedPromptPx}px`,
      fontStyle: "bold",
      color: accent,
    }).setOrigin(0.5);
    container.add(frame
      ? [frame.root, hit, icon, titleText, bodyText, selectedText]
      : [hit, icon, titleText, bodyText, selectedText]);
    this.root.add(container);
    const choice = {
      mode,
      container,
      frame,
      hit,
      icon,
      iconMaskGeometry,
      titleText,
      bodyText,
      selectedText,
    };
    this.choiceObjects.push(choice);
    hit.on("pointerover", () => this._select(mode));
    hit.on("pointerdown", () => {
      this._select(mode);
      this._commit();
    });
  }

  show({ onChoose, onCancel } = {}) {
    if (this.isVisible) return false;
    this.selectedMode = this.config.modes.casual;
    this.onChoose = typeof onChoose === "function" ? onChoose : null;
    this.onCancel = typeof onCancel === "function" ? onCancel : null;
    this._refreshSelection();
    this.root.setVisible(true).setAlpha(0);
    this.scene.tweens.add({
      targets: this.root,
      alpha: 1,
      duration: 180,
      ease: "Power2.out",
    });
    // Attach on the next scene tick so the Space key that opened this overlay
    // cannot also accept the default choice in the same Phaser input dispatch.
    this._keyboardAttachTimer?.remove?.(false);
    this._keyboardAttachTimer = this.scene.time.delayedCall(0, () => {
      this._keyboardAttachTimer = null;
      if (this.isVisible) {
        this.scene.input.keyboard.on("keydown", this._keyHandler);
      }
    });
    return true;
  }

  close(cancelled = false) {
    if (!this.isVisible) return;
    const onCancel = this.onCancel;
    this._keyboardAttachTimer?.remove?.(false);
    this._keyboardAttachTimer = null;
    this.scene.input.keyboard.off("keydown", this._keyHandler);
    this.root.setVisible(false).setAlpha(1);
    this.onChoose = null;
    this.onCancel = null;
    if (cancelled) onCancel?.();
  }

  _handleKey(event) {
    if (!this.isVisible) return;
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const key = String(event?.key || "").toLowerCase();
    if (key === "escape") {
      this.close(true);
      return;
    }
    if (key === "arrowleft" || key === "a") {
      this._select(this.config.modes.casual);
      return;
    }
    if (key === "arrowright" || key === "d") {
      this._select(this.config.modes.hardcore);
      return;
    }
    if (key === "enter" || key === " ") this._commit();
  }

  _select(mode) {
    if (mode === this.selectedMode) return;
    this.selectedMode = mode;
    this.scene.soundSystem?.playUiSelect?.();
    this._refreshSelection();
  }

  _refreshSelection() {
    const ui = this.config.ui.modeSelector;
    for (const choice of this.choiceObjects) {
      const selected = choice.mode === this.selectedMode;
      choice.container.setAlpha(selected ? ui.selectedAlpha : ui.idleAlpha);
      choice.container.setScale(selected ? ui.selectedScale : 1);
      choice.frame?.setSelected(selected);
      choice.selectedText.setVisible(selected);
    }
  }

  _commit() {
    if (!this.isVisible) return;
    const choice = createHardcoreModeData(this.selectedMode);
    const onChoose = this.onChoose;
    this.scene.soundSystem?.playUiConfirm?.();
    this.close(false);
    onChoose?.(choice);
  }

  destroy() {
    this._keyboardAttachTimer?.remove?.(false);
    this._keyboardAttachTimer = null;
    this.scene?.input?.keyboard?.off?.("keydown", this._keyHandler);
    for (const choice of this.choiceObjects) {
      choice.icon?.clearMask?.(true);
      choice.iconMaskGeometry?.destroy?.();
    }
    this.root?.destroy(true);
    this.root = null;
    this.choiceObjects = [];
    this.scene = null;
  }
}
