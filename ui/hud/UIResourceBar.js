import { ASSET_KEYS } from "../../values/assetKeys.js";

const DEFAULT_RESOURCES = Object.freeze({
  dirt: 0,
  stone: 0,
  copper: 0,
  darkDirtNormal: 0,
  darkDirtStrong: 0,
  steel: 0,
  iron: 0,
  bronze: 0,
  silver: 0,
  gold: 0,
});

function clampCount(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

export class UIResourceBar {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.x = options.x ?? 960;
    this.y = options.y ?? 20;
    this.iconSize = options.iconSize ?? 28;
    this.gap = options.gap ?? 10;
    this.slotWidth = options.slotWidth ?? 50;
    this.slotHeight = options.slotHeight ?? 50;

    this.resources = { ...DEFAULT_RESOURCES };
    this.money = -1;
    this.items = {};

    this.createUI();
  }

  createUI() {
    this.container = this.scene.add.container(this.x, this.y);
    this.container.setScrollFactor(0);
    this.container.setDepth(2000);

    // Resource bar panel — 3:2 ratio (image is 1536×1024)
    const barW = this.slotWidth * 4 + this.gap * 3 + 20;
    const barH = Math.round(barW * (2 / 3));
    const panelCenterY = Math.round(barH / 2);
    this.background = this.scene.add.image(barW / 2, panelCenterY, ASSET_KEYS.ui.resourceBar4slot)
      .setDisplaySize(barW, barH);
    this.container.add(this.background);

    // Slot Y positioned at the visual center row of the panel
    const slotY = Math.round(barH * 0.25);
    this.items.dirt = this.createResourceSlot(10, ASSET_KEYS.ui.resources.dirt, "#d8c3a5", slotY);
    this.items.stone = this.createResourceSlot(10 + this.slotWidth + this.gap, ASSET_KEYS.ui.resources.stone, "#c9d2db", slotY);
    this.items.copper = this.createResourceSlot(10 + (this.slotWidth + this.gap) * 2, ASSET_KEYS.ui.resources.copper, "#ffd27a", slotY);
    this.items.money = this.createMoneySlot(10 + (this.slotWidth + this.gap) * 3, slotY);

    this.refreshAll();
  }

  createResourceSlot(offsetX, iconKey, countColor, offsetY = 10) {
    const slot = this.scene.add.container(offsetX, offsetY);

    const icon = this.scene.add.image(11, 11, iconKey);
    icon.setDisplaySize(this.iconSize, this.iconSize);
    icon.setOrigin(0, 0);

    const countText = this.scene.add.text(11, 32, "0", {
      fontFamily: "Consolas, monospace",
      fontSize: "18px",
      color: countColor,
      fontStyle: "bold",
    });
    countText.setOrigin(0.5, 0);

    slot.add(icon);
    slot.add(countText);
    this.container.add(slot);

    return {
      slot,
      icon,
      countText,
      lastValue: -1,
    };
  }

  createMoneySlot(offsetX, offsetY = 10) {
    const slot = this.scene.add.container(offsetX, offsetY);

    // Divider line separating money from resources
    const divider = this.scene.add.rectangle(-5, 25, 2, 50, 0x4a5a6a, 0.8).setOrigin(0.5, 0);
    const label = this.scene.add.image(11, 11, ASSET_KEYS.ui.iconCoin)
      .setDisplaySize(33, 22)   // 3:2 ratio
      .setOrigin(0.5, 0);

    const countText = this.scene.add.text(11, 32, "0", {
      fontFamily: "Consolas, monospace",
      fontSize: "18px",
      color: "#ffd700",
      fontStyle: "bold",
    });
    countText.setOrigin(0.5, 0);

    slot.add([divider, label, countText]);
    this.container.add(slot);

    return { slot, countText, lastValue: -1 };
  }

  setMoney(amount) {
    const clamped = clampCount(amount);
    const item = this.items.money;
    if (!item || item.lastValue === clamped) {
      return;
    }
    item.lastValue = clamped;
    item.countText.setText(`${clamped}`);
  }

  setResources(resources = DEFAULT_RESOURCES) {
    const next = {
      dirt: clampCount(resources.dirt),
      stone: clampCount(resources.stone),
      copper: clampCount(resources.copper),
    };

    this.updateCount("dirt", next.dirt);
    this.updateCount("stone", next.stone);
    this.updateCount("copper", next.copper);

    this.resources = next;
  }

  updateCount(key, value) {
    const item = this.items[key];
    if (!item || item.lastValue === value) {
      return;
    }

    item.lastValue = value;
    
    // FIX: Hide resource icon and text when value is 0
    if (value === 0) {
      item.icon.setVisible(false);
      item.countText.setVisible(false);
    } else {
      item.icon.setVisible(true);
      item.countText.setVisible(true);
      item.countText.setText(`${value}`);
    }
  }

  refreshAll() {
    this.setResources(this.resources);
  }

  setVisible(visible) {
    this.container.setVisible(visible);
  }

  destroy() {
    this.container.destroy();
  }
}
