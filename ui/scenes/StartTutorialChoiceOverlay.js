import { ASSET_KEYS } from "../../values/assetKeys.js";
import {
  RETENTION_CONFIG,
  TOWN_TUTORIAL_CHOICES,
} from "../../values/retentionConfig.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { createButton } from "../PhaserUiKit.js";

export class StartTutorialChoiceOverlay {
  constructor(scene) {
    this.scene = scene;
    this.config = RETENTION_CONFIG.tutorial;
    this.selectedChoice = TOWN_TUTORIAL_CHOICES.YES;
    this.root = null;
    this.buttons = new Map();
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
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const frameKey = ASSET_KEYS.ui.hardcore.oathPanel;
    if (!this.scene.textures.exists(frameKey)) {
      throw new Error("[StartTutorialChoiceOverlay] Approved tutorial UI art is missing.");
    }

    this.root = this.scene.add.container(width / 2, height / 2)
      .setDepth(ui.choiceDepth)
      .setVisible(false);
    const shade = this.scene.add.rectangle(
      0,
      0,
      width,
      height,
      0x020104,
      ui.choiceBackdropAlpha,
    ).setInteractive();
    const frame = this.scene.add.image(0, 0, frameKey)
      .setDisplaySize(ui.choicePanelWidthPx, ui.choicePanelHeightPx);
    const title = this.scene.add.text(0, ui.choiceTitleYPx, this.config.choice.title, {
      fontFamily: UI_FONTS.display,
      fontSize: ui.choiceTitleFontSize,
      fontStyle: "bold",
      color: UI_COLORS.title,
      stroke: "#050913",
      strokeThickness: 4,
      align: "center",
    }).setOrigin(0.5);
    const body = this.scene.add.text(0, ui.choiceBodyYPx, this.config.choice.body, {
      fontFamily: UI_FONTS.body,
      fontSize: ui.choiceBodyFontSize,
      color: UI_COLORS.body,
      align: "center",
      lineSpacing: 4,
    }).setOrigin(0.5);
    const footer = this.scene.add.text(0, ui.choiceFooterYPx, this.config.choice.footer, {
      fontFamily: UI_FONTS.mono,
      fontSize: ui.choiceFooterFontSize,
      fontStyle: "bold",
      color: UI_COLORS.body,
      stroke: "#050913",
      strokeThickness: 2,
    }).setOrigin(0.5);
    this.root.add([shade, frame, title, body, footer]);

    this._addButton(
      TOWN_TUTORIAL_CHOICES.YES,
      -ui.choiceButtonGapPx / 2,
      this.config.choice.yesLabel,
      UI_COLORS.success,
    );
    this._addButton(
      TOWN_TUTORIAL_CHOICES.NO,
      ui.choiceButtonGapPx / 2,
      this.config.choice.noLabel,
      UI_COLORS.info,
    );
  }

  _addButton(choice, x, label, accent) {
    const ui = this.config.ui;
    const button = createButton(this.scene, {
      x,
      y: ui.choiceButtonYPx,
      width: ui.choiceButtonWidthPx,
      height: ui.choiceButtonHeightPx,
      label,
      accent,
      parent: this.root,
      depth: ui.choiceDepth + 1,
      autoIcon: false,
      onFocus: () => this._select(choice),
      onClick: () => this._commit(choice, false),
    });
    this.buttons.set(choice, button);
  }

  show({ onChoose, onCancel } = {}) {
    if (this.isVisible) return false;
    this.onChoose = typeof onChoose === "function" ? onChoose : null;
    this.onCancel = typeof onCancel === "function" ? onCancel : null;
    this.selectedChoice = TOWN_TUTORIAL_CHOICES.YES;
    this._refresh();
    this.root.setVisible(true).setAlpha(0);
    this.scene.tweens.add({
      targets: this.root,
      alpha: 1,
      duration: this.config.ui.choiceEnterDurationMs,
      ease: "Power2.out",
    });
    // The key that committed the mode picker must not also commit this second
    // new-save decision while Phaser is still dispatching the same event.
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
    if (key === "arrowleft" || key === "a" || key === "y") {
      this._select(TOWN_TUTORIAL_CHOICES.YES);
      return;
    }
    if (key === "arrowright" || key === "d" || key === "n") {
      this._select(TOWN_TUTORIAL_CHOICES.NO);
      return;
    }
    if (key === "enter" || key === " ") {
      this._commit(this.selectedChoice, true);
    }
  }

  _select(choice) {
    if (choice === this.selectedChoice) return;
    this.selectedChoice = choice;
    this.scene.soundSystem?.playUiSelect?.();
    this._refresh();
  }

  _refresh() {
    for (const [choice, button] of this.buttons) {
      const selected = choice === this.selectedChoice;
      button.setSelected(selected);
      button.setFocused(selected);
    }
  }

  _commit(choice, playSound) {
    if (!this.isVisible) return;
    const onChoose = this.onChoose;
    if (playSound) this.scene.soundSystem?.playUiConfirm?.();
    this.close(false);
    onChoose?.(choice);
  }

  destroy() {
    this._keyboardAttachTimer?.remove?.(false);
    this._keyboardAttachTimer = null;
    this.scene?.input?.keyboard?.off?.("keydown", this._keyHandler);
    this.root?.destroy(true);
    this.root = null;
    this.buttons.clear();
    this.scene = null;
  }
}
