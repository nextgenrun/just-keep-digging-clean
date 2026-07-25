import { createButton } from "../PhaserUiKit.js";
import { createIconBadge, createModalShell } from "../UiModalShell.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { UI_RESOURCE_PRESENTATION } from "../../values/uiIcons.js";
import { USER_SETTINGS, keyToPhaserKey } from "../../systems/UserSettings.js";

export class UIInventoryPopup {
  constructor(scene) {
    this.scene = scene;
    this.isOpen = false;
    this.shell = null;
    this.panel = null;
    this.backdrop = null;
    this.items = {};
    this.money = 0;
    this.moneyText = null;
    this.summaryText = null;
    Object.keys(UI_RESOURCE_PRESENTATION).forEach(key => {
      this.items[key] = 0;
    });
    this.setupKeyboardListeners();
  }

  setupKeyboardListeners() {
    this.inventoryKey?.off("down", this.handleInventoryToggle, this);
    this.escapeKey?.off("down", this.handleInventoryClose, this);
    this.inventoryKey = this.scene.input.keyboard.addKey(keyToPhaserKey(USER_SETTINGS.getKey("inventory")));
    this.escapeKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.handleInventoryToggle = () => this.toggle();
    this.handleInventoryClose = () => {
      if (this.isOpen) this.close();
    };
    this.inventoryKey.on("down", this.handleInventoryToggle);
    this.escapeKey.on("down", this.handleInventoryClose);
  }

  refreshKeybinds() {
    this.setupKeyboardListeners();
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.scene.setShopOpen?.(true);
    this.scene.playerController?.setControlsEnabled?.(false);
    this.createPopup();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    const shell = this.shell;
    this.shell = null;
    this.panel = null;
    this.backdrop = null;
    this.moneyText = null;
    this.summaryText = null;
    shell?.hide?.(() => shell.destroy?.());
    this.scene.setShopOpen?.(false);
    this.scene.playerController?.setControlsEnabled?.(true);
  }

  createPopup() {
    this.shell?.destroy?.();
    const shell = createModalShell(this.scene, {
      title: "FIELD INVENTORY",
      subtitle: "Collected materials and current wallet",
      icon: "inventory",
      maxWidth: 940,
      maxHeight: 640,
      depth: 3220,
      dismissOnBackdrop: true,
      onClose: () => this.close(),
    });
    this.shell = shell;
    this.panel = shell;
    this.backdrop = shell.backdrop;
    this._render();
    shell.show();
  }

  _text(x, y, value, style = {}, originX = 0, originY = 0) {
    const text = this.scene.add.text(x, y, value, {
      fontFamily: style.fontFamily || UI_FONTS.body,
      fontSize: style.fontSize || "13px",
      fontStyle: style.fontStyle,
      color: style.color || UI_COLORS.body,
      align: style.align,
      wordWrap: style.wordWrap,
      lineSpacing: style.lineSpacing,
    }).setOrigin(originX, originY);
    this.shell.content.add(text);
    return text;
  }

  _surface(x, y, width, height, selected = false) {
    const gfx = this.scene.add.graphics();
    gfx.fillStyle(selected ? UI_COLORS.cardSel : UI_COLORS.cardBase, 0.98);
    gfx.fillRoundedRect(x, y, width, height, 7);
    gfx.lineStyle(selected ? 2 : 1, selected ? UI_COLORS.borderSel : UI_COLORS.borderDim, 0.96);
    gfx.strokeRoundedRect(x, y, width, height, 7);
    this.shell.content.add(gfx);
    return gfx;
  }

  _render() {
    if (!this.shell) return;
    this.shell.layout();
    this.shell.content.removeAll(true);
    const rect = this.shell.getContentRect();
    const values = Object.values(this.items).map(Number).filter(Number.isFinite);
    const unique = values.filter(value => value > 0).length;
    const total = values.reduce((sum, value) => sum + Math.max(0, value), 0);

    const summaryHeight = 58;
    this._surface(rect.left, rect.top, rect.width, summaryHeight, true);
    this._text(rect.left + 18, rect.top + 17, unique + " MATERIAL TYPES", {
      fontFamily: UI_FONTS.display,
      fontSize: "15px",
      fontStyle: "bold",
      color: UI_COLORS.title,
    });
    this.summaryText = this._text(rect.left + 18, rect.top + 39,
      Math.floor(total).toLocaleString() + " TOTAL UNITS", {
        fontFamily: UI_FONTS.mono,
        fontSize: "10px",
        color: UI_COLORS.body,
      }
    );
    createIconBadge(this.scene, "sell", {
      x: rect.right - 142,
      y: rect.top + summaryHeight / 2,
      size: 42,
      iconSize: 34,
      selected: true,
      parent: this.shell.content,
    });
    this.moneyText = this._text(rect.right - 18, rect.top + summaryHeight / 2,
      Number(this.money || 0).toLocaleString() + " M", {
        fontFamily: UI_FONTS.display,
        fontSize: "19px",
        fontStyle: "bold",
        color: UI_COLORS.gold,
      }, 1, 0.5
    );

    const held = Object.entries(UI_RESOURCE_PRESENTATION)
      .filter(([key]) => Number(this.items[key]) > 0);
    const gridTop = rect.top + summaryHeight + 14;
    const gridHeight = rect.bottom - gridTop;
    if (!held.length) {
      createIconBadge(this.scene, "inventory", {
        x: rect.left + rect.width / 2,
        y: gridTop + gridHeight / 2 - 34,
        size: 86,
        iconSize: 72,
        parent: this.shell.content,
      });
      this._text(rect.left + rect.width / 2, gridTop + gridHeight / 2 + 38,
        "YOUR BAG IS EMPTY", {
          fontFamily: UI_FONTS.display,
          fontSize: "18px",
          fontStyle: "bold",
          color: UI_COLORS.title,
        }, 0.5, 0.5
      );
      this._text(rect.left + rect.width / 2, gridTop + gridHeight / 2 + 64,
        "Dig and collect materials to fill it.", {
          fontFamily: UI_FONTS.mono,
          fontSize: "12px",
          color: UI_COLORS.body,
        }, 0.5, 0.5
      );
    } else {
      const columns = rect.width >= 700 ? 2 : 1;
      const gap = 12;
      const rows = Math.ceil(held.length / columns);
      const cardWidth = (rect.width - gap * (columns - 1)) / columns;
      const cardHeight = Math.max(54, Math.min(72, (gridHeight - gap * (rows - 1)) / rows));
      held.forEach(([key, config], index) => {
        const row = Math.floor(index / columns);
        const column = index % columns;
        const x = rect.left + column * (cardWidth + gap);
        const y = gridTop + row * (cardHeight + gap);
        this._surface(x, y, cardWidth, cardHeight, false);
        createIconBadge(this.scene, config.icon, {
          x: x + 38,
          y: y + cardHeight / 2,
          size: Math.min(48, cardHeight - 10),
          iconSize: Math.min(40, cardHeight - 18),
          parent: this.shell.content,
        });
        this._text(x + 70, y + cardHeight / 2 - 10, config.name.toUpperCase(), {
          fontFamily: UI_FONTS.display,
          fontSize: "14px",
          fontStyle: "bold",
          color: UI_COLORS.title,
        }, 0, 0.5);
        this._text(x + 70, y + cardHeight / 2 + 12, "MINED MATERIAL", {
          fontFamily: UI_FONTS.mono,
          fontSize: "9px",
          color: UI_COLORS.dim,
        }, 0, 0.5);
        this._text(x + cardWidth - 18, y + cardHeight / 2,
          Math.floor(this.items[key]).toLocaleString(), {
            fontFamily: UI_FONTS.display,
            fontSize: "20px",
            fontStyle: "bold",
            color: config.color,
          }, 1, 0.5
        );
      });
    }

    createButton(this.scene, {
      x: 0,
      y: this.shell.height / 2 - 27,
      width: 250,
      height: 36,
      label: "RETURN TO GAME",
      hint: USER_SETTINGS.getKeyLabel("inventory") + " / ESC",
      icon: "close",
      accent: UI_COLORS.borderDim,
      parent: this.shell.root,
      fontSize: "11px",
      onClick: () => this.close(),
    });
  }

  setMoney(amount) {
    if (Object.is(this.money, amount)) return;
    this.money = amount;
    this.moneyText?.setText(Number(amount || 0).toLocaleString() + " M");
  }

  setResources(resources) {
    const next = resources || {};
    const changed = Object.keys(UI_RESOURCE_PRESENTATION)
      .some(key => !Object.is(this.items[key], next[key] ?? this.items[key]));
    if (!changed) return;
    this.items = { ...this.items, ...next };
    if (this.isOpen) this._render();
  }

  resize() {
    if (this.isOpen) this._render();
  }

  destroy() {
    if (this.isOpen) this.close();
    else this.shell?.destroy?.();
    this.inventoryKey?.off("down", this.handleInventoryToggle, this);
    this.escapeKey?.off("down", this.handleInventoryClose, this);
  }
}
