import { INVENTORY_CODEX_CONFIG } from
  "../../values/inventoryCodex.js?rev=20260826-inventory-codex-v2";
import { INVENTORY_RESOURCE_GUIDE } from
  "../../values/inventoryResourceGuide.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { UI_RESOURCE_PRESENTATION } from "../../values/uiIcons.js";
import {
  addResourceCodexPortrait,
  inventoryCodexFontSize,
  inventoryCodexPoint,
  inventoryCodexSize,
} from "./UIInventoryCodexArt.js?rev=20260826-inventory-codex-v2";
import {
  addResourceCodexHitZone,
  addResourceCodexText,
  hasDiscoveredResource,
} from "./UIInventoryResourceCodexShared.js?rev=20260826-inventory-codex-v3";

function addSelectedSocket(scene, parent, bounds, center) {
  const layout = INVENTORY_CODEX_CONFIG.layout;
  const size = inventoryCodexSize(
    bounds,
    layout.selectorHitWidthPx,
    layout.selectorHitHeightPx,
    layout,
  );
  const graphics = scene.add.graphics();
  graphics.lineStyle(
    Math.max(
      1,
      inventoryCodexSize(
        bounds,
        layout.selectedStrokeWidthPx,
        layout.selectedStrokeWidthPx,
        layout,
      ).width,
    ),
    layout.selectedStrokeColor,
    0.96,
  );
  graphics.strokeRoundedRect(
    center.x - size.width / 2,
    center.y - size.height / 2,
    size.width,
    size.height,
    Math.max(3, size.height * 0.08),
  );
  parent.add(graphics);
}

function renderCollectionHeader(scene, parent, bounds) {
  const { copy, layout } = INVENTORY_CODEX_CONFIG;
  const title = inventoryCodexPoint(
    bounds,
    layout.collectionTitleXPx,
    layout.collectionTitleYPx,
    layout,
  );
  addResourceCodexText(scene, parent, title.x, title.y, copy.collectionTitle, {
    fontFamily: UI_FONTS.display,
    fontSizePx: inventoryCodexFontSize(
      bounds,
      layout.collectionTitleFontSizePx,
      layout,
      10,
    ),
    fontStyle: "bold",
    color: UI_COLORS.title,
  });
  const count = inventoryCodexPoint(
    bounds,
    layout.collectionCountXPx,
    layout.collectionCountYPx,
    layout,
  );
  addResourceCodexText(scene, parent, count.x, count.y, copy.collectionHint, {
    fontFamily: UI_FONTS.mono,
    fontSizePx: inventoryCodexFontSize(
      bounds,
      layout.collectionCountFontSizePx,
      layout,
    ),
    fontStyle: "bold",
    color: UI_COLORS.muted,
  });
}

function renderCollectionEntry(
  scene,
  parent,
  bounds,
  resourceKey,
  index,
  selectedKey,
  items,
  onSelect,
) {
  const { copy, layout } = INVENTORY_CODEX_CONFIG;
  const row = Math.floor(index / 2);
  const column = index % 2;
  const center = inventoryCodexPoint(
    bounds,
    layout.selectorColumnCentersXPx[column],
    layout.selectorRowCentersYPx[row],
    layout,
  );
  const portrait = inventoryCodexPoint(
    bounds,
    layout.selectorPortraitCentersXPx[column],
    layout.selectorRowCentersYPx[row],
    layout,
  );
  const portraitSize = inventoryCodexSize(
    bounds,
    layout.selectorPortraitSizePx,
    layout.selectorPortraitSizePx,
    layout,
  );
  const selected = resourceKey === selectedKey;
  const discovered = hasDiscoveredResource(scene, items, resourceKey);
  if (selected) addSelectedSocket(scene, parent, bounds, center);
  addResourceCodexPortrait(scene, parent, resourceKey, {
    x: portrait.x,
    y: portrait.y,
    width: portraitSize.width,
    height: portraitSize.height,
    alpha: selected ? layout.selectedPortraitAlpha : layout.idlePortraitAlpha,
  });
  const textLeft = inventoryCodexPoint(
    bounds,
    layout.selectorTextLeftXPx[column],
    layout.selectorRowCentersYPx[row],
    layout,
  );
  const presentation = UI_RESOURCE_PRESENTATION[resourceKey];
  const nameSize = presentation.name.length > 16
    ? layout.selectorNameFontSizePx - 2
    : layout.selectorNameFontSizePx;
  const nameY = inventoryCodexPoint(
    bounds,
    0,
    layout.selectorRowCentersYPx[row] + layout.selectorNameOffsetYPx,
    layout,
  ).y;
  addResourceCodexText(
    scene,
    parent,
    textLeft.x,
    nameY,
    presentation.name.toUpperCase(),
    {
      originX: 0,
      fontFamily: UI_FONTS.display,
      fontSizePx: inventoryCodexFontSize(bounds, nameSize, layout, 8),
      fontStyle: "bold",
      color: selected ? UI_COLORS.title : presentation.color,
    },
  );
  const statusY = inventoryCodexPoint(
    bounds,
    0,
    layout.selectorRowCentersYPx[row] + layout.selectorStatusOffsetYPx,
    layout,
  ).y;
  addResourceCodexText(
    scene,
    parent,
    textLeft.x,
    statusY,
    discovered
      ? `${copy.discovered} • ${Math.floor(Number(items?.[resourceKey]) || 0)}`
      : copy.undiscovered,
    {
      originX: 0,
      fontFamily: UI_FONTS.mono,
      fontSizePx: inventoryCodexFontSize(
        bounds,
        layout.selectorStatusFontSizePx,
        layout,
      ),
      color: discovered ? UI_COLORS.body : UI_COLORS.dim,
    },
  );
  const hitSize = inventoryCodexSize(
    bounds,
    layout.selectorHitWidthPx,
    layout.selectorHitHeightPx,
    layout,
  );
  addResourceCodexHitZone(
    scene,
    parent,
    center.x,
    center.y,
    hitSize.width,
    hitSize.height,
    () => onSelect(resourceKey),
  );
}

export function renderInventoryResourceCollection(
  scene,
  parent,
  bounds,
  selectedKey,
  items,
  onSelect,
) {
  const { copy, layout } = INVENTORY_CODEX_CONFIG;
  renderCollectionHeader(scene, parent, bounds);
  INVENTORY_RESOURCE_GUIDE.resourceKeys.forEach((resourceKey, index) => {
    renderCollectionEntry(
      scene,
      parent,
      bounds,
      resourceKey,
      index,
      selectedKey,
      items,
      onSelect,
    );
  });
  const hint = inventoryCodexPoint(
    bounds,
    layout.navigationHintXPx,
    layout.navigationHintYPx,
    layout,
  );
  addResourceCodexText(scene, parent, hint.x, hint.y, copy.navigationHint, {
    fontFamily: UI_FONTS.mono,
    fontSizePx: inventoryCodexFontSize(
      bounds,
      layout.navigationHintFontSizePx,
      layout,
    ),
    fontStyle: "bold",
    color: UI_COLORS.muted,
  });
}
