import { createIconBadge } from "../UiModalShell.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import {
  UI_INVENTORY_COPY,
  UI_INVENTORY_LAYOUT,
  UI_RESOURCE_PRESENTATION,
} from "../../values/uiIcons.js";

function addText(scene, shell, x, y, value, style = {}, originX = 0, originY = 0) {
  const text = scene.add.text(x, y, value, {
    fontFamily: style.fontFamily || UI_FONTS.body,
    fontSize: style.fontSize || "13px",
    fontStyle: style.fontStyle,
    color: style.color || UI_COLORS.body,
    align: style.align,
    wordWrap: style.wordWrap,
    lineSpacing: style.lineSpacing,
  }).setOrigin(originX, originY);
  shell.content.add(text);
  return text;
}

function addSurface(scene, shell, x, y, width, height, selected = false) {
  const gfx = scene.add.graphics();
  gfx.fillStyle(selected ? UI_COLORS.cardSel : UI_COLORS.cardBase, 0.98);
  gfx.fillRoundedRect(x, y, width, height, 7);
  gfx.lineStyle(selected ? 2 : 1, selected ? UI_COLORS.borderSel : UI_COLORS.borderDim, 0.96);
  gfx.strokeRoundedRect(x, y, width, height, 7);
  shell.content.add(gfx);
}

function addResourceArtwork(scene, shell, key, x, y, size, discovered) {
  const textureKey = ASSET_KEYS.ui.lootPickups[key];
  if (!textureKey || scene.textures?.exists?.(textureKey) === false) return null;
  const artwork = scene.add.image(x, y, textureKey).setOrigin(0.5);
  const sourceWidth = Math.max(1, Number(artwork.width) || size);
  const sourceHeight = Math.max(1, Number(artwork.height) || size);
  artwork
    .setScale(Math.min(size / sourceWidth, size / sourceHeight))
    .setAlpha(discovered ? 1 : 0.68);
  shell.content.add(artwork);
  return artwork;
}

function renderResourceCard(scene, shell, items, key, config, metrics) {
  const discovered = Number(items[key]) > 0
    || scene.retentionProgressSystem?.hasDiscoveredMaterial?.(key) === true;
  const { x, y, width, height } = metrics;
  addSurface(scene, shell, x, y, width, height);
  addResourceArtwork(
    scene,
    shell,
    key,
    x + UI_INVENTORY_LAYOUT.itemIconInset,
    y + height / 2,
    Math.min(UI_INVENTORY_LAYOUT.iconSize - 8, height - 14),
    discovered,
  );
  addText(scene, shell, x + UI_INVENTORY_LAYOUT.itemTextInset, y + height / 2 - 10,
    config.name.toUpperCase(), {
      fontFamily: UI_FONTS.display,
      fontSize: "14px",
      fontStyle: "bold",
      color: config.color,
    }, 0, 0.5);
  addText(scene, shell, x + UI_INVENTORY_LAYOUT.itemTextInset, y + height / 2 + 12,
    discovered ? UI_INVENTORY_COPY.discoveredStatus : UI_INVENTORY_COPY.undiscoveredStatus, {
      fontFamily: UI_FONTS.mono,
      fontSize: "9px",
      color: UI_COLORS.dim,
    }, 0, 0.5);
  addText(scene, shell, x + width - UI_INVENTORY_LAYOUT.itemQuantityInset, y + height / 2,
    discovered ? Math.floor(items[key]).toLocaleString() : UI_INVENTORY_COPY.lockedAmount, {
      fontFamily: UI_FONTS.display,
      fontSize: "20px",
      fontStyle: "bold",
      color: discovered ? config.color : UI_COLORS.dim,
    }, 1, 0.5);
}

export function renderInventoryHoldingsView(scene, shell, rect, items, money) {
  const values = Object.values(items).map(Number).filter(Number.isFinite);
  const unique = values.filter(value => value > 0).length;
  const total = values.reduce((sum, value) => sum + Math.max(0, value), 0);
  const summaryHeight = UI_INVENTORY_LAYOUT.summaryHeight;

  addSurface(scene, shell, rect.left, rect.top, rect.width, summaryHeight, true);
  addText(scene, shell, rect.left + 18, rect.top + 17, UI_INVENTORY_COPY.iconKeyTitle, {
    fontFamily: UI_FONTS.display,
    fontSize: "15px",
    fontStyle: "bold",
    color: UI_COLORS.title,
  });
  const summaryText = addText(scene, shell, rect.left + 18, rect.top + 39,
    `${unique} DISCOVERED • ${Math.floor(total).toLocaleString()} ${UI_INVENTORY_COPY.totalUnitsSuffix}`, {
      fontFamily: UI_FONTS.mono,
      fontSize: "10px",
      color: UI_COLORS.body,
    });
  createIconBadge(scene, "sell", {
    x: rect.right - 142,
    y: rect.top + summaryHeight / 2,
    size: 42,
    iconSize: 34,
    selected: true,
    parent: shell.content,
  });
  const moneyText = addText(scene, shell, rect.right - 18, rect.top + summaryHeight / 2,
    `${Number(money || 0).toLocaleString()} ${UI_INVENTORY_COPY.walletSuffix}`, {
      fontFamily: UI_FONTS.display,
      fontSize: "19px",
      fontStyle: "bold",
      color: UI_COLORS.gold,
    }, 1, 0.5);

  const entries = Object.entries(UI_RESOURCE_PRESENTATION);
  const gridTop = rect.top + summaryHeight + UI_INVENTORY_LAYOUT.summaryGap;
  const gridHeight = rect.bottom - gridTop;
  const columns = rect.width >= UI_INVENTORY_LAYOUT.desktopColumnThreshold
    ? UI_INVENTORY_LAYOUT.desktopColumns
    : UI_INVENTORY_LAYOUT.compactColumns;
  const rows = Math.ceil(entries.length / columns);
  const cardWidth = (
    rect.width - UI_INVENTORY_LAYOUT.columnGap * (columns - 1)
  ) / columns;
  const cardHeight = Math.max(
    UI_INVENTORY_LAYOUT.minItemHeight,
    Math.min(
      UI_INVENTORY_LAYOUT.maxItemHeight,
      (
        gridHeight - UI_INVENTORY_LAYOUT.rowGap * (rows - 1)
      ) / rows
    )
  );
  entries.forEach(([key, config], index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    renderResourceCard(scene, shell, items, key, config, {
      x: rect.left + column * (cardWidth + UI_INVENTORY_LAYOUT.columnGap),
      y: gridTop + row * (cardHeight + UI_INVENTORY_LAYOUT.rowGap),
      width: cardWidth,
      height: cardHeight,
    });
  });
  return { moneyText, summaryText };
}
