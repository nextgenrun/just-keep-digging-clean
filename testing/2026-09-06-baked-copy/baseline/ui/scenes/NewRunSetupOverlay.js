import { ASSET_KEYS } from "../../values/assetKeys.js";
import {
  HARDCORE_MODE_CONFIG,
  createHardcoreModeData,
  resolveHardcoreModeFromSearch,
} from "../../values/hardcoreMode.js";
import { NEW_RUN_SETUP_CONFIG } from "../../values/newRunSetup.js";
import {
  TOWN_TUTORIAL_CHOICES,
} from "../../values/retentionConfig.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { createUiIcon } from "../UiIconAtlas.js";
import { NewRunSetupInputController } from "./NewRunSetupInputController.js";
import { NEW_RUN_COPY } from "../../values/playerFacingCopy.js";

export class NewRunSetupOverlay {
  constructor(scene, config = NEW_RUN_SETUP_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.copy = NEW_RUN_COPY;
    this.root = null;
    this.cards = new Map();
    this.mode = HARDCORE_MODE_CONFIG.modes.hardcore;
    this.tutorialChoice = TOWN_TUTORIAL_CHOICES.YES;
    this.focusRow = "mode";
    this.skipConfirmation = "";
    this.hiddenSequence = "";
    this.onChoose = null;
    this.onCancel = null;
    this.inputController = new NewRunSetupInputController(this);
    this._create();
  }

  get isVisible() {
    return this.root?.visible === true;
  }

  _create() {
    const cfg = this.config;
    const copy = this.copy;
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const panelKey = ASSET_KEYS.ui.newRunSetup.foundation;
    const selectionKey = ASSET_KEYS.ui.newRunSetup.selection;
    if (
      !this.scene.textures.exists(panelKey)
      || !this.scene.textures.exists(selectionKey)
    ) {
      throw new Error("[NewRunSetupOverlay] Regenerated expedition art is missing.");
    }
    this.root = this.scene.add.container(width / 2, height / 2)
      .setDepth(cfg.depth)
      .setVisible(false);
    const inputShield = this.scene.add.zone(0, 0, width, height).setInteractive();
    this.panel = this.scene.add.image(0, 0, panelKey)
      .setDisplaySize(cfg.panel.width, cfg.panel.height);
    const title = this.scene.add.text(0, cfg.title.y, copy.title, {
      fontFamily: UI_FONTS.display,
      fontSize: `${cfg.title.fontSize}px`,
      fontStyle: "bold",
      color: UI_COLORS.title,
      stroke: "#050913",
      strokeThickness: 4,
    }).setOrigin(0.5);
    const subtitle = this.scene.add.text(0, cfg.subtitle.y, copy.subtitle, {
      fontFamily: UI_FONTS.mono,
      fontSize: `${cfg.subtitle.fontSize}px`,
      fontStyle: "bold",
      color: UI_COLORS.body,
      stroke: "#050913",
      strokeThickness: 2,
    }).setOrigin(0.5);
    this.root.add([inputShield, this.panel, title, subtitle]);
    Object.entries(cfg.sectionLabels).forEach(([sectionId, section]) => {
      const sectionText = copy[`${sectionId}Section`] || section.text;
      this.root.add(this.scene.add.text(section.x, section.y, sectionText, {
        fontFamily: UI_FONTS.mono,
        fontSize: "11px",
        fontStyle: "bold",
        color: UI_COLORS.gold,
        stroke: "#050913",
        strokeThickness: 2,
      }).setOrigin(0.5));
    });

    const cards = cfg.cards;
    this._addCard("casual", {
      x: -cards.xOffset,
      y: cards.modeY,
      iconName: cards.casualIconName,
      title: copy.casualTitle,
      body: copy.casualBody,
      activate: () => this._setMode(HARDCORE_MODE_CONFIG.modes.casual),
    });
    this._addCard("hardcore", {
      x: cards.xOffset,
      y: cards.modeY,
      iconName: cards.hardcoreIconName,
      title: copy.hardcoreTitle,
      body: copy.hardcoreBody,
      activate: () => this._setMode(HARDCORE_MODE_CONFIG.modes.hardcore),
    });
    this._addCard("guided", {
      x: -cards.xOffset,
      y: cards.tutorialY,
      iconName: cards.guidedIconName,
      title: copy.guidedTitle,
      body: copy.guidedBody,
      activate: () => this._setTutorial(TOWN_TUTORIAL_CHOICES.YES),
    });
    this._addCard("skip", {
      x: cards.xOffset,
      y: cards.tutorialY,
      iconName: cards.skipIconName,
      title: copy.skipTitle,
      body: copy.skipBody,
      activate: () => this._setTutorial(TOWN_TUTORIAL_CHOICES.NO),
    });

    this.status = this.scene.add.text(0, cfg.status.y, "", {
      fontFamily: UI_FONTS.mono,
      fontSize: `${cfg.status.fontSize}px`,
      fontStyle: "bold",
      color: UI_COLORS.success,
    }).setOrigin(0.5);
    this.startButton = this._createEmbeddedStartControl(copy.startLabel);
    const footerStyle = {
      fontFamily: UI_FONTS.mono,
      fontSize: `${cfg.footer.fontSize}px`,
      fontStyle: "bold",
      color: UI_COLORS.body,
      stroke: "#02060a",
      strokeThickness: 2,
    };
    const footerLeft = this.scene.add.text(
      cfg.footer.leftX,
      cfg.footer.y,
      copy.footerLeft,
      footerStyle,
    ).setOrigin(0.5);
    const footerRight = this.scene.add.text(
      cfg.footer.rightX,
      cfg.footer.y,
      copy.footerRight,
      footerStyle,
    ).setOrigin(0.5);
    this.root.add([this.status, footerLeft, footerRight]);
  }

  _addCard(id, options) {
    const layout = this.config.cards;
    const root = this.scene.add.container(options.x, options.y);
    const selection = this.scene.add.image(
      0,
      0,
      ASSET_KEYS.ui.newRunSetup.selection,
    ).setDisplaySize(layout.width, layout.height).setAlpha(0);
    const chrome = Object.freeze({
      root: selection,
      setSelected: isSelected => selection.setAlpha(isSelected ? 1 : 0),
    });
    const hit = this.scene.add.zone(0, 0, layout.width, layout.height)
      .setInteractive({ useHandCursor: true });
    const icon = createUiIcon(this.scene, options.iconName, {
      x: layout.iconX,
      y: layout.iconY,
      size: layout.iconSize,
    });
    if (!icon) throw new Error("[NewRunSetupOverlay] Approved card icon is missing.");
    const title = this.scene.add.text(layout.titleX, layout.titleY, options.title, {
      fontFamily: UI_FONTS.display,
      fontSize: `${layout.titleFontSize}px`,
      fontStyle: "bold",
      color: UI_COLORS.title,
      stroke: "#050913",
      strokeThickness: 3,
      align: "center",
    }).setOrigin(0.5);
    const body = this.scene.add.text(layout.bodyX, layout.bodyY, options.body, {
      fontFamily: UI_FONTS.body,
      fontSize: `${layout.bodyFontSize}px`,
      color: UI_COLORS.body,
      align: "center",
      lineSpacing: 3,
      wordWrap: { width: layout.bodyWidth, useAdvancedWrap: true },
    }).setOrigin(0.5, 0);
    const selected = this.scene.add.text(
      layout.titleX,
      layout.selectedY,
      this.copy.selected,
      {
        fontFamily: UI_FONTS.mono,
        fontSize: `${layout.selectedFontSize}px`,
        fontStyle: "bold",
        color: UI_COLORS.success,
      },
    ).setOrigin(0.5);
    root.add([icon, selection, title, body, selected, hit]);
    this.root.add(root);
    hit.on("pointerover", () => root.setAlpha(1));
    hit.on("pointerout", () => this._refresh());
    hit.on("pointerdown", () => {
      options.activate();
      this.scene.soundSystem?.playUiSelect?.();
    });
    this.cards.set(id, { root, chrome, icon, title, body, selected });
  }

  _createEmbeddedStartControl(labelText) {
    const layout = this.config.start;
    const root = this.scene.add.container(0, layout.y);
    const label = this.scene.add.text(0, 0, labelText, {
      fontFamily: UI_FONTS.display,
      fontSize: `${layout.fontSize}px`,
      fontStyle: "bold",
      color: UI_COLORS.title,
      stroke: "#050913",
      strokeThickness: 3,
    }).setOrigin(0.5);
    const hit = this.scene.add.zone(0, 0, layout.width, layout.height)
      .setInteractive({ useHandCursor: true });
    root.add([label, hit]);
    this.root.add(root);
    hit.on("pointerover", () => {
      label.setColor(UI_COLORS.success);
      root.setScale(1.02);
    });
    hit.on("pointerout", () => {
      label.setColor(UI_COLORS.title);
      root.setScale(1);
    });
    hit.on("pointerdown", () => this._confirm());
    return Object.freeze({ root, label, hit });
  }

  show({ onChoose, onCancel } = {}) {
    if (this.isVisible) return false;
    this.mode = resolveHardcoreModeFromSearch(globalThis.location?.search || "")
      || HARDCORE_MODE_CONFIG.modes.hardcore;
    this.tutorialChoice = TOWN_TUTORIAL_CHOICES.YES;
    this.focusRow = "mode";
    this.skipConfirmation = "";
    this.hiddenSequence = "";
    this.onChoose = typeof onChoose === "function" ? onChoose : null;
    this.onCancel = typeof onCancel === "function" ? onCancel : null;
    this.root.setVisible(true).setAlpha(0);
    this._refresh();
    this.scene.tweens.add({
      targets: this.root,
      alpha: 1,
      duration: 180,
      ease: "Power2.out",
    });
    this.inputController.attach();
    return true;
  }

  close(cancelled = false) {
    if (!this.isVisible) return;
    const onCancel = this.onCancel;
    this.inputController.detach();
    this.root.setVisible(false).setAlpha(1);
    this.onChoose = null;
    this.onCancel = null;
    if (cancelled) onCancel?.();
  }

  _setMode(mode) {
    this.mode = mode;
    this.focusRow = "mode";
    this.hiddenSequence = "";
    this._refresh();
  }

  _setTutorial(choice) {
    this.tutorialChoice = choice;
    this.focusRow = "tutorial";
    this.skipConfirmation = "";
    this.hiddenSequence = "";
    this._refresh();
  }

  _confirm() {
    if (
      this.tutorialChoice === TOWN_TUTORIAL_CHOICES.NO
      && this.skipConfirmation !== this.copy.skipConfirmation
    ) {
      this._refresh();
      return false;
    }
    const onChoose = this.onChoose;
    const selection = {
      hardcoreModeData: createHardcoreModeData(this.mode),
      tutorialChoice: this.tutorialChoice,
    };
    this.scene.soundSystem?.playUiConfirm?.();
    this.close(false);
    onChoose?.(selection);
    return true;
  }

  _refresh() {
    const layout = this.config.cards;
    const oneLife = this.mode === HARDCORE_MODE_CONFIG.modes.oneLifeHardcore;
    const hardcoreCard = this.cards.get("hardcore");
    hardcoreCard.title.setText(
      oneLife ? this.copy.oneLifeTitle : this.copy.hardcoreTitle,
    );
    hardcoreCard.body.setText(
      oneLife ? this.copy.oneLifeBody : this.copy.hardcoreBody,
    );
    const selectedIds = new Set([
      this.mode === HARDCORE_MODE_CONFIG.modes.casual ? "casual" : "hardcore",
      this.tutorialChoice === TOWN_TUTORIAL_CHOICES.YES ? "guided" : "skip",
    ]);
    for (const [id, card] of this.cards) {
      const selected = selectedIds.has(id);
      card.chrome.setSelected(selected);
      card.selected.setVisible(selected);
      card.root.setAlpha(selected ? layout.selectedAlpha : layout.idleAlpha);
    }
    if (this.tutorialChoice === TOWN_TUTORIAL_CHOICES.YES) {
      this.status.setColor(UI_COLORS.success).setText(this.copy.guidedStatus);
    } else {
      this.status.setColor(UI_COLORS.danger).setText(
        this.copy.skipStatus.replace(
          "{value}",
          this.skipConfirmation || "_",
        ),
      );
    }
  }

  destroy() {
    this.inputController?.destroy();
    this.inputController = null;
    this.root?.destroy(true);
    this.root = null;
    this.panel = null;
    this.startButton = null;
    this.status = null;
    this.cards.clear();
    this.scene = null;
  }
}
