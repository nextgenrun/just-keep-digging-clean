import { UI_COLORS } from "../../values/uiColors.js";
import { createButton } from "../PhaserUiKit.js";
import { USER_SETTINGS, keyToPhaserKey } from "../../systems/UserSettings.js";

const RESOURCE_CONFIG = {
  dirt: { name: 'Dirt', icon: '🟫', color: '#d8c3a5' },
  stone: { name: 'Stone', icon: '⬜', color: '#c9d2db' },
  copper: { name: 'Copper', icon: '🟡', color: '#ffd27a' },
  darkDirtNormal: { name: 'Dark Dirt', icon: '🟫', color: '#8b5a2b' },
  darkDirtStrong: { name: 'Dark Dirt (Strong)', icon: '🟫', color: '#6b4226' },
  steel: { name: 'Steel', icon: '⬜', color: '#b8c4cc' },
  iron: { name: 'Iron', icon: '⬜', color: '#d4d4d4' },
  bronze: { name: 'Bronze', icon: '🟡', color: '#cd7f32' },
  silver: { name: 'Silver', icon: '⬜', color: '#c0c0c0' },
  gold: { name: 'Gold', icon: '🟡', color: '#ffd700' },
};

/** Main-menu dark theme color palette */
const COL = {
  bg:        UI_COLORS.bg,
  cardBase:  UI_COLORS.cardBase,
  cardHover: UI_COLORS.cardHover,
  borderDim: UI_COLORS.borderDim,
  borderHov: UI_COLORS.borderHov,
  accent:    UI_COLORS.borderSel,
  white:     UI_COLORS.white,
  title:     UI_COLORS.title,
  dim:       UI_COLORS.dim,
  hint:      UI_COLORS.hint,
  body:      UI_COLORS.body,
  gold:      '#ffd700',
};

export class UIInventoryPopup {
  constructor(scene) {
    this.scene = scene;
    this.isOpen = false;
    this.container = null;
    this.backdrop = null;
    this.items = {};
    this.qtyTexts = {};
    this.moneyText = null;
    this.money = 0;

    // Initialize all resources to 0
    for (const key in RESOURCE_CONFIG) {
      this.items[key] = 0;
      this.qtyTexts[key] = null;
    }

    this.setupKeyboardListeners();
  }

  setupKeyboardListeners() {
    if (this.inventoryKey) {
      this.inventoryKey.off('down');
    }
    if (this.escapeKey) {
      this.escapeKey.off('down');
    }
    this.inventoryKey = this.scene.input.keyboard.addKey(keyToPhaserKey(USER_SETTINGS.getKey("inventory")));
    this.inventoryKey.on('down', () => this.toggle());

    // ESC key to close inventory
    this.escapeKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.escapeKey.on('down', () => {
      if (this.isOpen) this.close();
    });
  }

  refreshKeybinds() {
    this.setupKeyboardListeners();
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.createPopup();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    const b = this.backdrop;
    const c = this.container;
    this.backdrop = null;
    this.container = null;
    this.moneyText = null;
    for (const key in RESOURCE_CONFIG) {
      this.qtyTexts[key] = null;
    }
    if (b && c) {
      this.scene.tweens.killTweensOf(b);
      this.scene.tweens.killTweensOf(c);
      this.scene.tweens.add({
        targets: [b, c],
        alpha: 0,
        duration: 160,
        ease: 'Power1.in',
        onComplete: () => { b.destroy(); c.destroy(); }
      });
    }
  }

  createPopup() {
    const viewportWidth = this.scene.scale.gameSize.width;
    const viewportHeight = this.scene.scale.gameSize.height;

    // Backdrop
    this.backdrop = this.scene.add.rectangle(
      viewportWidth / 2,
      viewportHeight / 2,
      viewportWidth,
      viewportHeight,
      0x0d1117,
      0.88
    );
    this.backdrop.setInteractive();
    this.backdrop.on('pointerdown', () => this.close());
    this.backdrop.setScrollFactor(0);
    this.backdrop.setDepth(2999);

    this.container = this.scene.add.container(viewportWidth / 2, viewportHeight / 2);
    this.container.setScrollFactor(0);
    this.container.setDepth(3000);

    // Panel — main menu dark theme
    const bg = this.scene.add.rectangle(0, 0, 700, 650, 0x0d1117, 0.97);
    bg.setStrokeStyle(2, 0x2a3a4a);
    bg.setOrigin(0.5);
    this.container.add(bg);

    createButton(this.scene, {
      x: 296,
      y: -304,
      width: 82,
      height: 34,
      label: 'CLOSE',
      hint: USER_SETTINGS.getKeyLabel("pause"),
      accent: UI_COLORS.borderBad,
      labelColor: UI_COLORS.danger,
      parent: this.container,
      fontSize: '11px',
      onClick: () => this.close(),
    });

    // Header
    const header = this.scene.add.text(0, -285, 'INVENTORY', {
      fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#c9a227',
      letterSpacing: 2,
    });
    header.setOrigin(0.5);
    this.container.add(header);

    // Money
    this.moneyText = this.scene.add.text(0, -255, `Money: ${this.money.toLocaleString()} M`, {
      fontFamily: 'Consolas, monospace',
      fontSize: '16px',
      color: '#ffd700'
    });
    this.moneyText.setOrigin(0.5);
    this.container.add(this.moneyText);

    // Separator
    const sep = this.scene.add.graphics();
    sep.lineStyle(1, 0x2a3a4a, 0.8);
    sep.lineBetween(-300, -240, 300, -240);
    this.container.add(sep);

    this.createResourceSection();

    const footer = this.scene.add.text(0, 304, `Click outside, Close, or ${USER_SETTINGS.getKeyLabel("pause")} / Esc to return`, {
      fontFamily: 'Consolas, monospace',
      fontSize: '12px',
      color: COL.hint,
    }).setOrigin(0.5);
    this.container.add(footer);

    // Fade in
    this.backdrop.setAlpha(0);
    this.container.setAlpha(0);
    this.scene.tweens.add({ targets: [this.backdrop, this.container], alpha: 1, duration: 200, ease: 'Power2.out' });
  }

  createResourceSection() {
    const startY = -230;
    let y = startY;
    let rowIndex = 0;

    for (const [key, config] of Object.entries(RESOURCE_CONFIG)) {
      y += this.createResourceItem(y, config.name, config.icon, config.color, this.items[key], key, rowIndex++);
    }
  }

  createResourceItem(y, name, icon, color, quantity, resourceKey, rowIndex = 0) {
    // Alternating row backgrounds — main menu card style
    const rowBgColor = rowIndex % 2 === 0 ? 0x131c26 : 0x0f1820;
    const itemBg = this.scene.add.rectangle(0, y + 20, 660, 50, rowBgColor, 0.7);
    itemBg.setOrigin(0.5);
    this.container.add(itemBg);

    // Icon
    const iconText = this.scene.add.text(-280, y + 20, icon, {
      fontFamily: 'Arial',
      fontSize: '28px'
    });
    iconText.setOrigin(0.5);
    this.container.add(iconText);

    // Name
    const nameText = this.scene.add.text(-180, y + 20, name, {
      fontFamily: 'Consolas, monospace',
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    nameText.setOrigin(0.5, 0.5);
    this.container.add(nameText);

    // Quantity — color-coded by resource type
    const qtyText = this.scene.add.text(280, y + 20, quantity > 0 ? quantity.toString() : '—', {
      fontFamily: 'Consolas, monospace',
      fontSize: '22px',
      color: quantity > 0 ? color : '#4a5a6a',
      fontStyle: quantity > 0 ? 'bold' : 'normal'
    });
    qtyText.setOrigin(0.5, 0.5);
    this.container.add(qtyText);

    // Store reference to quantity text for updates
    this.qtyTexts[resourceKey] = qtyText;

    return 55;
  }

  setMoney(amount) {
    this.money = amount;
    if (this.isOpen && this.moneyText) {
      this.moneyText.setText(`Money: ${amount.toLocaleString()} M`);
    }
  }

  setResources(resources) {
    this.items = { ...resources };
    if (this.isOpen) {
      for (const key in RESOURCE_CONFIG) {
        if (this.qtyTexts[key] && this.items[key] !== undefined) {
          const qty = this.items[key];
          this.qtyTexts[key].setText(qty > 0 ? qty.toString() : '—');
          // Update color dynamically
          this.qtyTexts[key].setColor(qty > 0 ? RESOURCE_CONFIG[key]?.color || '#ffffff' : '#4a5a6a');
        }
      }
    }
  }

  resize() {
    // Called on viewport resize — currently no layout recalc needed
  }

  destroy() {
    this.close();
    if (this.inventoryKey) {
      this.inventoryKey.off('down');
    }
    if (this.escapeKey) {
      this.escapeKey.off('down');
    }
  }
}
