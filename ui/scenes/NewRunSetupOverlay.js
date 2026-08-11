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
import {
  createSaveChoiceChrome,
  createSaveMenuButton,
} from "../components/SaveMenuPresentationView.js";
import { NewRunSetupInputController } from "./NewRunSetupInputController.js";

export class NewRunSetupOverlay {
  constructor(scene, config = NEW_RUN_SETUP_CONFIG) {
    this.scene = scene;
    this.config = config;
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
    const copy = cfg.copy;
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const panelKey = ASSET_KEYS.ui.hardcore.oathPanel;
    if (!this.scene.textures.exists(panelKey)) {
      throw new Error("[NewRunSetupOverlay] Approved panel art is missing.");
    }
    this.root = this.scene.add.container(width / 2, height / 2)
      .setDepth(cfg.depth)
      .setVisible(false);
    const inputShield = this.scene.add.zone(0, 0, width, height).setInteractive();
    const panel = this.scene.add.image(0, 0, panelKey)
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
      color: UI_COLORS.body,
    }).setOrigin(0.5);
    this.root.add([inputShield, panel, title, subtitle]);
    Object.values(cfg.sectionLabels).forEach(section => {
      this.root.add(this.scene.add.text(section.x, section.y, section.text, {
        fontFamily: UI_FONTS.mono,
        fontSize: "11px",
        fontStyle: "bold",
        color: UI_COLORS.gold,
      }).setOrigin(0.5));
    });

    const cards = cfg.cards;
    this._addCard("casual", {
      x: -cards.xOffset,
      y: cards.modeY,
      iconKey: ASSET_KEYS.ui.approvedHud.playerCore,
      iconWidth: cards.casualIconWidth,
      iconHeight: cards.casualIconHeight,
      title: copy.casualTitle,
      body: copy.casualBody,
      activate: () => this._setMode(HARDCORE_MODE_CONFIG.modes.casual),
    });
    this._addCard("hardcore", {
      x: cards.xOffset,
      y: cards.modeY,
      iconKey: ASSET_KEYS.ui.hardcore.oathCrest,
      title: copy.hardcoreTitle,
      body: copy.hardcoreBody,
      activate: () => this._setMode(HARDCORE_MODE_CONFIG.modes.hardcore),
    });
    this._addCard("guided", {
      x: -cards.xOffset,
      y: cards.tutorialY,
      iconKey: ASSET_KEYS.onboarding.openingFlightV2.shaftMarker,
      title: copy.guidedTitle,
      body: copy.guidedBody,
      activate: () => this._setTutorial(TOWN_TUTORIAL_CHOICES.YES),
    });
    this._addCard("skip", {
      x: cards.xOffset,
      y: cards.tutorialY,
      iconKey: ASSET_KEYS.ui.approvedHud.inventory,
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
    this.startButton = createSaveMenuButton(this.scene, {
      x: 0,
      y: cfg.start.y,
      width: cfg.start.width,
      height: cfg.start.height,
      label: copy.startLabel,
      accent: UI_COLORS.borderSel,
      parent: this.root,
      depth: cfg.depth + 2,
      useAuthoredArt: true,
      autoIcon: false,
      onClick: () => this._confirm(),
    });
    const footer = this.scene.add.text(0, cfg.footer.y, copy.footer, {
      fontFamily: UI_FONTS.mono,
      fontSize: `${cfg.footer.fontSize}px`,
      fontStyle: "bold",
      color: UI_COLORS.body,
      stroke: "#02060a",
      strokeThickness: 2,
    }).setOrigin(0.5);
    this.root.add([this.status, footer]);
  }

  _addCard(id, options) {
    const layout = this.config.cards;
    const root = this.scene.add.container(options.x, options.y);
    const chrome = createSaveChoiceChrome(this.scene, {
      width: layout.width,
      height: layout.height,
    });
    if (!chrome) throw new Error("[NewRunSetupOverlay] Approved choice art is missing.");
    const hit = this.scene.add.zone(0, 0, layout.width, layout.height)
      .setInteractive({ useHandCursor: true });
    const icon = this.scene.add.image(layout.iconX, layout.iconY, options.iconKey)
      .setDisplaySize(
        options.iconWidth || layout.iconSize,
        options.iconHeight || layout.iconSize,
      );
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
      this.config.copy.selected,
      {
        fontFamily: UI_FONTS.mono,
        fontSize: `${layout.selectedFontSize}px`,
        fontStyle: "bold",
        color: UI_COLORS.success,
      },
    ).setOrigin(0.5);
    root.add([chrome.root, icon, title, body, selected, hit]);
    this.root.add(root);
    hit.on("pointerover", () => root.setAlpha(1));
    hit.on("pointerout", () => this._refresh());
    hit.on("pointerdown", () => {
      options.activate();
      this.scene.soundSystem?.playUiSelect?.();
    });
    this.cards.set(id, { root, chrome, title, body, selected });
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
      && this.skipConfirmation !== this.config.copy.skipConfirmation
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
      oneLife ? this.config.copy.oneLifeTitle : this.config.copy.hardcoreTitle,
    );
    hardcoreCard.body.setText(
      oneLife ? this.config.copy.oneLifeBody : this.config.copy.hardcoreBody,
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
      this.status.setColor(UI_COLORS.success).setText(this.config.copy.guidedStatus);
    } else {
      this.status.setColor(UI_COLORS.danger).setText(
        this.config.copy.skipStatus.replace(
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
    this.cards.clear();
    this.scene = null;
  }
}
