import { createButton, createPanel, UI_THEME } from "../PhaserUiKit.js";
import { createUiIcon } from "../UiIconAtlas.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { UI_INVENTORY_LAYOUT, UI_RESOURCE_PRESENTATION } from "../../values/uiIcons.js";
import { USER_SETTINGS, keyToPhaserKey } from "../../systems/UserSettings.js";

export class UIInventoryPopup {
  constructor(scene) {
    this.scene = scene;
    this.isOpen = false;
    this.backdrop = null;
    this.panel = null;
    this.resourceContainer = null;
    this.resourceSlots = [];
    this.qtyTexts = {};
    this.items = {};
    this.money = 0;
    this.moneyText = null;
    this.summaryText = null;
    this.panelWidth = UI_INVENTORY_LAYOUT.maxWidth;
    this.panelHeight = UI_INVENTORY_LAYOUT.maxHeight;

    Object.keys(UI_RESOURCE_PRESENTATION).forEach(key => {
      this.items[key] = 0;
      this.qtyTexts[key] = null;
    });
    this.setupKeyboardListeners();
  }

  setupKeyboardListeners() {
    this.inventoryKey?.off("down", this.handleInventoryToggle, this);
    this.escapeKey?.off("down", this.handleInventoryClose, this);
    this.inventoryKey = this.scene.input.keyboard.addKey(keyToPhaserKey(USER_SETTINGS.getKey("inventory")));
    this.escapeKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.handleInventoryToggle = () => this.toggle();
    this.handleInventoryClose = () => { if (this.isOpen) this.close(); };
    this.inventoryKey.on("down", this.handleInventoryToggle);
    this.escapeKey.on("down", this.handleInventoryClose);
  }

  refreshKeybinds() {
    this.setupKeyboardListeners();
  }

  toggle() {
    if (this.isOpen) this.close(); else this.open();
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.createPopup();
    this.scene.playerController?.setControlsEnabled?.(false);
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    const backdrop = this.backdrop;
    const panel = this.panel;
    this.backdrop = null;
    this.panel = null;
    this.resourceContainer = null;
    this.resourceSlots = [];
    this.moneyText = null;
    this.summaryText = null;
    Object.keys(this.qtyTexts).forEach(key => { this.qtyTexts[key] = null; });

    if (backdrop && panel?.root) {
      this.scene.tweens.killTweensOf([backdrop, panel.root]);
      this.scene.tweens.add({
        targets: [backdrop, panel.root],
        alpha: 0,
        duration: UI_THEME.fadeMs,
        ease: "Power1.in",
        onComplete: () => {
          backdrop.destroy();
          panel.destroy();
        },
      });
    }
    this.scene.playerController?.setControlsEnabled?.(true);
  }

  createPopup() {
    const layout = UI_INVENTORY_LAYOUT;
    const viewportWidth = this.scene.scale.gameSize.width;
    const viewportHeight = this.scene.scale.gameSize.height;
    this.panelWidth = Math.max(layout.minimumWidth, Math.min(viewportWidth - layout.viewportMarginX, layout.maxWidth));
    this.panelHeight = Math.max(layout.minimumHeight, Math.min(viewportHeight - layout.viewportMarginY, layout.maxHeight));
    const centerX = viewportWidth / 2;
    const centerY = viewportHeight / 2;

    this.backdrop = this.scene.add.rectangle(centerX, centerY, viewportWidth, viewportHeight, UI_COLORS.overlay, 0)
      .setInteractive({ useHandCursor: true })
      .setScrollFactor(0)
      .setDepth(UI_THEME.depthOverlay - 1)
      .on("pointerdown", () => this.close());

    this.panel = createPanel(this.scene, {
      x: centerX,
      y: centerY,
      width: this.panelWidth,
      height: this.panelHeight,
      title: "FIELD INVENTORY",
      icon: "inventory",
      depth: UI_THEME.depthOverlay,
      accent: UI_COLORS.borderSel,
    });
    this.panel.root.setAlpha(0);

    const blocker = this.scene.add.rectangle(0, 0, this.panelWidth, this.panelHeight, UI_COLORS.overlay, 0)
      .setInteractive()
      .on("pointerdown", (_pointer, _x, _y, event) => event?.stopPropagation?.());
    this.panel.root.add(blocker);

    createButton(this.scene, {
      x: this.panelWidth / 2 - 66,
      y: -this.panelHeight / 2 + 29,
      width: 104,
      height: 34,
      label: "CLOSE",
      hint: USER_SETTINGS.getKeyLabel("pause"),
      accent: UI_COLORS.borderBad,
      labelColor: UI_COLORS.danger,
      parent: this.panel.root,
      fontSize: "11px",
      onClick: () => this.close(),
    });

    this.createHeaderSummary();
    this.createResourceSection();
    const footer = this.scene.add.text(0, this.panelHeight / 2 - 24,
      `Click outside or press ${USER_SETTINGS.getKeyLabel("inventory")} / ESC to return`, {
        fontFamily: UI_THEME.fontBody,
        fontSize: "11px",
        color: UI_COLORS.hint,
      }).setOrigin(0.5);
    this.panel.root.add(footer);

    this.scene.tweens.add({ targets: this.backdrop, alpha: 0.72, duration: UI_THEME.fadeMs, ease: "Power1.out" });
    this.scene.tweens.add({ targets: this.panel.root, alpha: 1, duration: 220, ease: "Power2.out" });
  }

  createHeaderSummary() {
    const topY = -this.panelHeight / 2 + 78;
    const walletBg = this.scene.add.rectangle(this.panelWidth / 2 - 124, topY, 196, 44, UI_COLORS.cardSel, 0.96)
      .setStrokeStyle(1, UI_COLORS.borderDim);
    const walletIcon = createUiIcon(this.scene, "sell", { x: this.panelWidth / 2 - 200, y: topY, size: 38 });
    this.moneyText = this.scene.add.text(this.panelWidth / 2 - 176, topY, `${this.money.toLocaleString()} M`, {
      fontFamily: UI_THEME.fontBody,
      fontSize: "16px",
      fontStyle: "bold",
      color: UI_COLORS.gold,
    }).setOrigin(0, 0.5);
    this.summaryText = this.scene.add.text(-this.panelWidth / 2 + 32, topY, "", {
      fontFamily: UI_THEME.fontBody,
      fontSize: "12px",
      color: UI_COLORS.body,
    }).setOrigin(0, 0.5);
    this.panel.root.add([walletBg, walletIcon, this.moneyText, this.summaryText].filter(Boolean));
    this.refreshSummary();
  }

  createResourceSection() {
    this.resourceContainer?.destroy(true);
    this.resourceSlots = [];
    this.resourceContainer = this.scene.add.container(0, -this.panelHeight / 2 + UI_INVENTORY_LAYOUT.headerHeight + 30);
    this.panel.root.add(this.resourceContainer);

    const heldResources = Object.entries(UI_RESOURCE_PRESENTATION)
      .filter(([key]) => Number(this.items[key]) > 0);
    if (!heldResources.length) {
      const emptyIcon = createUiIcon(this.scene, "inventory", { x: 0, y: 92, size: 72, alpha: 0.55 });
      const emptyText = this.scene.add.text(0, 148, "YOUR BAG IS EMPTY\nDig and collect materials to fill it.", {
        fontFamily: UI_THEME.fontBody,
        fontSize: "15px",
        color: UI_COLORS.dim,
        align: "center",
        lineSpacing: 8,
      }).setOrigin(0.5);
      this.resourceContainer.add([emptyIcon, emptyText].filter(Boolean));
      return;
    }

    const layout = UI_INVENTORY_LAYOUT;
    const cardWidth = (this.panelWidth - layout.contentInset * 2 - layout.columnGap) / layout.columns;
    heldResources.forEach(([key, config], index) => {
      const row = Math.floor(index / layout.columns);
      const col = index % layout.columns;
      const x = -this.panelWidth / 2 + layout.contentInset + cardWidth / 2 + col * (cardWidth + layout.columnGap);
      const y = row * (layout.itemHeight + layout.rowGap);
      this.createResourceRow(x, y, cardWidth, config, this.items[key], key);
    });
  }

  createResourceRow(x, y, width, config, quantity, resourceKey) {
    const height = UI_INVENTORY_LAYOUT.itemHeight;
    const root = this.scene.add.container(x, y);
    const card = this.scene.add.rectangle(0, 0, width, height, UI_COLORS.cardBase, 0.96)
      .setStrokeStyle(1, UI_COLORS.borderDim);
    const accentColor = Phaser.Display.Color.HexStringToColor(config.color).color;
    const accent = this.scene.add.rectangle(-width / 2 + 2, 0, 4, height - 8, accentColor, 0.9);
    const icon = createUiIcon(this.scene, config.icon, {
      x: -width / 2 + 36,
      y: 0,
      size: UI_INVENTORY_LAYOUT.iconSize,
    });
    const name = this.scene.add.text(-width / 2 + 70, -9, config.name.toUpperCase(), {
      fontFamily: UI_THEME.fontBody,
      fontSize: "13px",
      fontStyle: "bold",
      color: UI_COLORS.white,
    }).setOrigin(0, 0.5);
    const type = this.scene.add.text(-width / 2 + 70, 12, "MINED MATERIAL", {
      fontFamily: UI_THEME.fontBody,
      fontSize: "9px",
      color: UI_COLORS.hint,
      letterSpacing: 1,
    }).setOrigin(0, 0.5);
    const qtyText = this.scene.add.text(width / 2 - 18, 0, Math.floor(quantity).toLocaleString(), {
      fontFamily: UI_THEME.fontBody,
      fontSize: "20px",
      fontStyle: "bold",
      color: config.color,
    }).setOrigin(1, 0.5);
    root.add([card, accent, icon, name, type, qtyText].filter(Boolean));
    this.resourceContainer.add(root);
    this.resourceSlots.push(root);
    this.qtyTexts[resourceKey] = qtyText;
  }

  refreshSummary() {
    if (!this.summaryText) return;
    const values = Object.values(this.items).map(Number).filter(Number.isFinite);
    const unique = values.filter(value => value > 0).length;
    const total = values.reduce((sum, value) => sum + Math.max(0, value), 0);
    this.summaryText.setText(`${unique} MATERIAL TYPES  ·  ${Math.floor(total).toLocaleString()} TOTAL UNITS`);
  }

  setMoney(amount) {
    if (Object.is(this.money, amount)) return;
    this.money = amount;
    this.moneyText?.setText(`${Number(amount || 0).toLocaleString()} M`);
  }

  setResources(resources) {
    const nextResources = resources || {};
    const hasChanges = Object.keys(UI_RESOURCE_PRESENTATION)
      .some(key => !Object.is(this.items[key], nextResources[key] ?? this.items[key]));
    if (!hasChanges) return;
    this.items = { ...this.items, ...nextResources };
    if (this.isOpen) {
      this.createResourceSection();
      this.refreshSummary();
    }
  }

  resize() {
    if (!this.isOpen) return;
    this.backdrop?.destroy();
    this.panel?.destroy();
    this.backdrop = null;
    this.panel = null;
    this.createPopup();
  }

  destroy() {
    this.close();
    this.inventoryKey?.off("down", this.handleInventoryToggle, this);
    this.escapeKey?.off("down", this.handleInventoryClose, this);
  }
}
