import { createButton } from "../PhaserUiKit.js";
import { INVENTORY_RESOURCE_GUIDE } from "../../values/inventoryResourceGuide.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { UI_RESOURCE_PRESENTATION } from "../../values/uiIcons.js";
import {
  addInventoryLavaDirtTile,
  addInventoryWorldTile,
  installInventoryResourceFrames,
} from "./UIInventoryWorldTilePreview.js";

function addText(scene, parent, x, y, value, style = {}, originX = 0, originY = 0) {
  const text = scene.add.text(x, y, value, {
    fontFamily: style.fontFamily || UI_FONTS.body,
    fontSize: style.fontSize || "13px",
    fontStyle: style.fontStyle,
    color: style.color || UI_COLORS.body,
    align: style.align,
    wordWrap: style.wordWrap,
    lineSpacing: style.lineSpacing,
  }).setOrigin(originX, originY);
  parent.add(text);
  return text;
}

function addPanel(scene, parent, x, y, width, height, selected = false) {
  const panel = scene.add.graphics();
  panel.fillStyle(selected ? UI_COLORS.cardSel : UI_COLORS.cardBase, 0.98);
  panel.fillRoundedRect(x, y, width, height, 7);
  panel.lineStyle(selected ? 2 : 1, selected ? UI_COLORS.borderSel : UI_COLORS.borderDim, 0.96);
  panel.strokeRoundedRect(x, y, width, height, 7);
  parent.add(panel);
}

function renderSelectors(scene, parent, atlas, rect, selectedKey, onSelect, desktop) {
  const guide = INVENTORY_RESOURCE_GUIDE;
  const layout = guide.layout;
  addPanel(scene, parent, rect.left, rect.top, rect.width, rect.height);
  addText(scene, parent, rect.left + layout.panelPadding, rect.top + 12,
    guide.copy.selectorTitle, {
      fontFamily: UI_FONTS.display,
      fontSize: desktop ? "14px" : "12px",
      fontStyle: "bold",
      color: UI_COLORS.title,
    });
  addText(scene, parent, rect.right - layout.panelPadding, rect.top + 15,
    guide.copy.selectorHint, {
      fontFamily: UI_FONTS.mono,
      fontSize: desktop ? "9px" : "8px",
      color: UI_COLORS.dim,
    }, 1, 0);

  const columns = desktop
    ? layout.desktopSelectorColumns
    : layout.compactSelectorColumns;
  const rows = Math.ceil(guide.resourceKeys.length / columns);
  const listTop = rect.top + layout.selectorHeaderHeight;
  const availableHeight = rect.bottom - listTop - layout.panelPadding;
  const itemWidth = (
    rect.width - layout.panelPadding * 2 - layout.selectorGap * (columns - 1)
  ) / columns;
  const itemHeight = (
    availableHeight - layout.selectorGap * (rows - 1)
  ) / rows;
  const thumbnailSize = Math.min(
    layout.maxSelectorThumbnailSize,
    itemHeight - (desktop ? 12 : 16),
    itemWidth * (desktop ? 0.31 : 0.25)
  );

  return guide.resourceKeys.map((resourceKey, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const x = rect.left + layout.panelPadding
      + column * (itemWidth + layout.selectorGap)
      + itemWidth / 2;
    const y = listTop + row * (itemHeight + layout.selectorGap) + itemHeight / 2;
    const presentation = UI_RESOURCE_PRESENTATION[resourceKey];
    const labelSize = presentation.name.length > 15
      ? (desktop ? "8px" : "7px")
      : (desktop ? "10px" : "8px");
    const button = createButton(scene, {
      x,
      y,
      width: itemWidth,
      height: itemHeight,
      label: presentation.name.toUpperCase(),
      labelColor: presentation.color,
      fontSize: labelSize,
      align: "left",
      autoIcon: false,
      selected: resourceKey === selectedKey,
      accent: UI_COLORS.borderSel,
      parent,
      onClick: () => onSelect(resourceKey),
    });
    const thumbX = -itemWidth / 2 + thumbnailSize / 2 + 7;
    if (resourceKey === "lavaDirt") {
      addInventoryLavaDirtTile(scene, button.root, {
        stage: 5,
        x: thumbX,
        y: 0,
        size: thumbnailSize,
      });
    } else {
      const groundTypeIndex = guide.groundTypeIndices[resourceKey] ?? 0;
      const groundSlots = guide.groundMaterialSlots[resourceKey] || guide.grounds;
      addInventoryWorldTile(scene, button.root, {
        atlas,
        resourceKey: guide.formationKeys.includes(resourceKey) ? resourceKey : null,
        variant: index % atlas.variants,
        groundSlot: groundSlots[index % groundSlots.length],
        groundTypeIndex,
        x: thumbX,
        y: 0,
        size: thumbnailSize,
      });
    }
    button.text
      .setX(-itemWidth / 2 + thumbnailSize + 14)
      .setOrigin(0, 0.5);
    button.text.setWordWrapWidth?.(itemWidth - thumbnailSize - 22);
    button.text.setAlign?.("left");
    button.setSelected(resourceKey === selectedKey);
    return button;
  });
}

function renderPreview(scene, parent, atlas, rect, resourceKey) {
  const guide = INVENTORY_RESOURCE_GUIDE;
  const layout = guide.layout;
  const presentation = UI_RESOURCE_PRESENTATION[resourceKey];
  const isFormation = guide.formationKeys.includes(resourceKey);
  const isLavaDirt = resourceKey === "lavaDirt";
  const groundTypeIndex = guide.groundTypeIndices[resourceKey] ?? 0;
  const entries = isLavaDirt
    ? guide.lavaDirtStages
    : (guide.groundMaterialSlots[resourceKey] || guide.grounds);
  const artLabel = isLavaDirt
    ? guide.copy.damageArtLabel
    : isFormation
      ? guide.copy.formationArtLabel
      : guide.copy.groundArtLabel;
  const previewHint = isLavaDirt
    ? guide.copy.damageHint
    : isFormation
      ? guide.copy.formationHint
      : guide.copy.groundHint;

  addPanel(scene, parent, rect.left, rect.top, rect.width, rect.height, true);
  addText(scene, parent, rect.left + layout.panelPadding, rect.top + 12,
    presentation.name.toUpperCase(), {
      fontFamily: UI_FONTS.display,
      fontSize: "20px",
      fontStyle: "bold",
      color: presentation.color,
    });
  addText(scene, parent, rect.left + layout.panelPadding, rect.top + 37,
    guide.descriptions[resourceKey], {
      fontFamily: UI_FONTS.body,
      fontSize: "11px",
      color: UI_COLORS.body,
    });
  addText(scene, parent, rect.left + layout.panelPadding, rect.top + 57,
    artLabel, {
      fontFamily: UI_FONTS.mono,
      fontSize: "9px",
      color: UI_COLORS.gold,
    });
  addText(scene, parent, rect.left + layout.panelPadding, rect.top + 76,
    previewHint, {
      fontFamily: UI_FONTS.mono,
      fontSize: "8px",
      color: UI_COLORS.dim,
      wordWrap: { width: rect.width - layout.panelPadding * 2 },
    });

  const gridTop = rect.top + layout.previewHeaderHeight;
  const gridHeight = rect.bottom - gridTop - layout.panelPadding;
  const rows = Math.ceil(entries.length / layout.previewColumns);
  const cellWidth = (
    rect.width - layout.panelPadding * 2
    - layout.previewGap * (layout.previewColumns - 1)
  ) / layout.previewColumns;
  const cellHeight = (
    gridHeight - layout.previewGap * (rows - 1)
  ) / rows;
  const tileSize = Math.max(44, Math.min(
    layout.maxPreviewTileSize,
    cellWidth - 8,
    cellHeight - layout.previewLabelHeight - 8
  ));
  entries.forEach((entry, variant) => {
    const row = Math.floor(variant / layout.previewColumns);
    const column = variant % layout.previewColumns;
    const cellX = rect.left + layout.panelPadding
      + column * (cellWidth + layout.previewGap);
    const cellY = gridTop + row * (cellHeight + layout.previewGap);
    const centerX = cellX + cellWidth / 2;
    const centerY = cellY + tileSize / 2 + 3;
    if (isLavaDirt) {
      addInventoryLavaDirtTile(scene, parent, {
        stage: entry.stage,
        x: centerX,
        y: centerY,
        size: tileSize,
      });
    } else {
      addInventoryWorldTile(scene, parent, {
        atlas,
        resourceKey: isFormation ? resourceKey : null,
        variant,
        groundSlot: entry,
        groundTypeIndex,
        x: centerX,
        y: centerY,
        size: tileSize,
      });
    }
    addText(scene, parent, centerX, centerY + tileSize / 2 + 7, entry.label, {
      fontFamily: UI_FONTS.mono,
      fontSize: tileSize >= 84 ? "8px" : "7px",
      color: UI_COLORS.body,
    }, 0.5, 0);
  });
}

export function renderInventoryResourceGuide(scene, shell, rect, selectedKey, onSelect) {
  const guide = INVENTORY_RESOURCE_GUIDE;
  const atlas = installInventoryResourceFrames(scene);
  const selected = guide.resourceKeys.includes(selectedKey)
    ? selectedKey
    : guide.resourceKeys[0];
  const desktop = rect.width >= guide.layout.desktopThreshold;
  if (desktop) {
    const selectorWidth = guide.layout.desktopSelectorWidth;
    const selectorRect = {
      left: rect.left,
      top: rect.top,
      right: rect.left + selectorWidth,
      bottom: rect.bottom,
      width: selectorWidth,
      height: rect.height,
    };
    const previewLeft = selectorRect.right + guide.layout.panelGap;
    const previewRect = {
      left: previewLeft,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.right - previewLeft,
      height: rect.height,
    };
    renderSelectors(scene, shell.content, atlas, selectorRect, selected, onSelect, true);
    renderPreview(scene, shell.content, atlas, previewRect, selected);
  } else {
    const selectorHeight = Math.min(184, Math.max(148, rect.height * 0.36));
    const selectorRect = {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.top + selectorHeight,
      width: rect.width,
      height: selectorHeight,
    };
    const previewTop = selectorRect.bottom + guide.layout.panelGap;
    const previewRect = {
      left: rect.left,
      top: previewTop,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.bottom - previewTop,
    };
    renderSelectors(scene, shell.content, atlas, selectorRect, selected, onSelect, false);
    renderPreview(scene, shell.content, atlas, previewRect, selected);
  }
  return selected;
}
