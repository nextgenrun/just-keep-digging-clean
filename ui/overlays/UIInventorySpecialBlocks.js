import { createButton } from "../PhaserUiKit.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { INVENTORY_SPECIAL_BLOCKS } from "../../values/inventorySpecialBlocks.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";

const SPECIAL_BLOCK_TEXTURE_KEYS = Object.freeze({
  GEM_POWER_BLOCK: ASSET_KEYS.tiles.gemPowerBlock,
  SPEED_BLOCK: ASSET_KEYS.tiles.speedBlock,
  XP_BLOCK: ASSET_KEYS.tiles.xpBlock,
  CRIT_BLOCK: ASSET_KEYS.tiles.critBlock,
  BERSERK_BLOCK: ASSET_KEYS.tiles.berserkBlock,
  COMBO_BLOCK: ASSET_KEYS.tiles.comboBlock,
  LEGEND_BLOCK: ASSET_KEYS.tiles.legendBlock,
});

function addText(scene, parent, x, y, text, style = {}) {
  const object = scene.add.text(x, y, text, {
    fontFamily: style.fontFamily || UI_FONTS.body,
    fontSize: style.fontSize || "12px",
    fontStyle: style.fontStyle,
    color: style.color || UI_COLORS.body,
    wordWrap: style.wordWrap,
    lineSpacing: style.lineSpacing,
  }).setOrigin(style.originX || 0, style.originY || 0);
  parent.add(object);
  return object;
}

function addPanel(scene, parent, rect, selected = false) {
  const panel = scene.add.graphics();
  panel.fillStyle(selected ? UI_COLORS.cardSel : UI_COLORS.cardBase, 0.98);
  panel.fillRoundedRect(rect.left, rect.top, rect.width, rect.height, 8);
  panel.lineStyle(selected ? 2 : 1, selected ? UI_COLORS.borderSel : UI_COLORS.borderDim, 0.96);
  panel.strokeRoundedRect(rect.left, rect.top, rect.width, rect.height, 8);
  parent.add(panel);
}

function addProductionTile(scene, parent, entry, x, y, size) {
  const textureKey = SPECIAL_BLOCK_TEXTURE_KEYS[entry.renderKey];
  if (!textureKey || !scene.textures.exists(textureKey)) {
    throw new Error(`[UIInventorySpecialBlocks] Missing production tile ${entry.renderKey}`);
  }
  const image = scene.add.image(x, y, textureKey)
    .setDisplaySize(size, size);
  parent.add(image);
  return image;
}

function renderSelectors(scene, parent, rect, selectedId, onSelect) {
  const config = INVENTORY_SPECIAL_BLOCKS;
  const layout = config.layout;
  addPanel(scene, parent, rect);
  addText(scene, parent, rect.left + layout.panelPaddingPx, rect.top + 12, config.selectorTitle, {
    fontFamily: UI_FONTS.display,
    fontSize: "14px",
    fontStyle: "bold",
    color: UI_COLORS.title,
  });
  const listTop = rect.top + layout.selectorHeaderHeightPx;
  const itemHeight = (
    rect.bottom - listTop - layout.panelPaddingPx
    - layout.selectorGapPx * (config.entries.length - 1)
  ) / config.entries.length;
  config.entries.forEach((entry, index) => {
    const y = listTop + index * (itemHeight + layout.selectorGapPx) + itemHeight / 2;
    const button = createButton(scene, {
      x: rect.left + rect.width / 2,
      y,
      width: rect.width - layout.panelPaddingPx * 2,
      height: itemHeight,
      label: entry.name.toUpperCase(),
      labelColor: entry.color,
      fontSize: "10px",
      align: "left",
      autoIcon: false,
      selected: entry.id === selectedId,
      accent: UI_COLORS.borderSel,
      parent,
      onClick: () => onSelect(entry.id),
    });
    const tileSize = Math.min(34, itemHeight - 7);
    addProductionTile(scene, button.root, entry, -rect.width / 2 + 33, 0, tileSize);
    button.text.setX(-rect.width / 2 + 58).setOrigin(0, 0.5);
  });
}

function renderDetail(scene, parent, rect, entry, compact) {
  const layout = INVENTORY_SPECIAL_BLOCKS.layout;
  addPanel(scene, parent, rect, true);
  addText(scene, parent, rect.left + layout.panelPaddingPx, rect.top + 14, entry.name.toUpperCase(), {
    fontFamily: UI_FONTS.display,
    fontSize: compact ? "17px" : "22px",
    fontStyle: "bold",
    color: entry.color,
  });
  addText(scene, parent, rect.right - layout.panelPaddingPx, rect.top + 18, entry.rarity, {
    fontFamily: UI_FONTS.mono,
    fontSize: "10px",
    fontStyle: "bold",
    color: UI_COLORS.gold,
    originX: 1,
  });
  const tileSize = compact ? layout.previewTileCompactSizePx : layout.previewTileSizePx;
  const tileX = compact ? rect.left + tileSize / 2 + layout.panelPaddingPx : rect.left + rect.width * 0.28;
  const tileY = rect.top + 72 + tileSize / 2;
  addProductionTile(scene, parent, entry, tileX, tileY, tileSize);
  const textLeft = compact ? tileX + tileSize / 2 + 18 : rect.left + rect.width * 0.52;
  const textWidth = rect.right - textLeft - layout.detailTextWidthInsetPx;
  addText(scene, parent, textLeft, rect.top + 78, INVENTORY_SPECIAL_BLOCKS.detailTitle, {
    fontFamily: UI_FONTS.mono,
    fontSize: "10px",
    fontStyle: "bold",
    color: UI_COLORS.gold,
  });
  addText(scene, parent, textLeft, rect.top + 105, entry.effect, {
    fontSize: compact ? "10px" : "13px",
    color: UI_COLORS.body,
    wordWrap: { width: textWidth },
    lineSpacing: 4,
  });
  addText(scene, parent, textLeft, rect.top + (compact ? 174 : 206), "USE NOTE", {
    fontFamily: UI_FONTS.mono,
    fontSize: "9px",
    fontStyle: "bold",
    color: UI_COLORS.dim,
  });
  addText(scene, parent, textLeft, rect.top + (compact ? 196 : 230), entry.use, {
    fontSize: compact ? "9px" : "11px",
    color: UI_COLORS.body,
    wordWrap: { width: textWidth },
    lineSpacing: 3,
  });
}

export function renderInventorySpecialBlocks(scene, shell, rect, selectedId, onSelect) {
  const config = INVENTORY_SPECIAL_BLOCKS;
  const selected = config.entries.find(entry => entry.id === selectedId) || config.entries[0];
  const desktop = rect.width >= config.layout.desktopThresholdPx;
  if (desktop) {
    const selectorRect = {
      left: rect.left, top: rect.top,
      right: rect.left + config.layout.selectorWidthPx,
      bottom: rect.bottom, width: config.layout.selectorWidthPx, height: rect.height,
    };
    const detailRect = {
      left: selectorRect.right + config.layout.panelGapPx, top: rect.top,
      right: rect.right, bottom: rect.bottom,
      width: rect.right - selectorRect.right - config.layout.panelGapPx, height: rect.height,
    };
    renderSelectors(scene, shell.content, selectorRect, selected.id, onSelect);
    renderDetail(scene, shell.content, detailRect, selected, false);
  } else {
    const selectorHeight = Math.min(230, rect.height * 0.46);
    const selectorRect = { left: rect.left, top: rect.top, right: rect.right, bottom: rect.top + selectorHeight, width: rect.width, height: selectorHeight };
    const detailRect = { left: rect.left, top: selectorRect.bottom + config.layout.panelGapPx, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.bottom - selectorRect.bottom - config.layout.panelGapPx };
    renderSelectors(scene, shell.content, selectorRect, selected.id, onSelect);
    renderDetail(scene, shell.content, detailRect, selected, true);
  }
  return selected.id;
}
