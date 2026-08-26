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
  addResourceCodexText,
  getResourceCodexMaterialClass,
  hasDiscoveredResource,
} from "./UIInventoryResourceCodexShared.js?rev=20260826-inventory-codex-v2";

function renderDossierIdentity(scene, parent, bounds, resourceKey, entryIndex) {
  const { copy, layout } = INVENTORY_CODEX_CONFIG;
  const presentation = UI_RESOURCE_PRESENTATION[resourceKey];
  const name = inventoryCodexPoint(
    bounds,
    layout.nameCenterXPx,
    layout.nameCenterYPx,
    layout,
  );
  addResourceCodexText(
    scene,
    parent,
    name.x,
    name.y,
    presentation.name.toUpperCase(),
    {
      fontFamily: UI_FONTS.display,
      fontSizePx: inventoryCodexFontSize(
        bounds,
        presentation.name.length > 16
          ? layout.nameFontSizePx - 4
          : layout.nameFontSizePx,
        layout,
        16,
      ),
      fontStyle: "bold",
      color: UI_COLORS.title,
      stroke: "#02060A",
      strokeThickness: 3,
    },
  );
  const identity = inventoryCodexPoint(
    bounds,
    layout.nameCenterXPx,
    layout.identityCenterYPx,
    layout,
  );
  addResourceCodexText(
    scene,
    parent,
    identity.x,
    identity.y,
    `${copy.entry} ${String(entryIndex).padStart(2, "0")}`
      + ` / ${INVENTORY_RESOURCE_GUIDE.resourceKeys.length} • ${copy.specimen}`,
    {
      fontFamily: UI_FONTS.mono,
      fontSizePx: inventoryCodexFontSize(
        bounds,
        layout.identityFontSizePx,
        layout,
      ),
      fontStyle: "bold",
      color: presentation.color,
    },
  );
}

function renderDossierNotes(scene, parent, bounds, resourceKey) {
  const { copy, layout } = INVENTORY_CODEX_CONFIG;
  const notesTitle = inventoryCodexPoint(
    bounds,
    layout.notesCenterXPx,
    layout.notesTitleYPx,
    layout,
  );
  addResourceCodexText(
    scene,
    parent,
    notesTitle.x,
    notesTitle.y,
    copy.fieldNotes,
    {
      fontFamily: UI_FONTS.mono,
      fontSizePx: inventoryCodexFontSize(
        bounds,
        layout.notesTitleFontSizePx,
        layout,
        8,
      ),
      fontStyle: "bold",
      color: UI_COLORS.gold,
    },
  );
  const notesBody = inventoryCodexPoint(
    bounds,
    layout.notesCenterXPx,
    layout.notesBodyYPx,
    layout,
  );
  addResourceCodexText(
    scene,
    parent,
    notesBody.x,
    notesBody.y,
    INVENTORY_RESOURCE_GUIDE.descriptions[resourceKey],
    {
      fontFamily: UI_FONTS.body,
      fontSizePx: inventoryCodexFontSize(
        bounds,
        layout.notesBodyFontSizePx,
        layout,
        10,
      ),
      color: UI_COLORS.body,
      wordWrapWidth: inventoryCodexSize(
        bounds,
        layout.notesWidthPx,
        1,
        layout,
      ).width,
      lineSpacing: 4,
    },
  );
}

export function renderInventoryResourceDossier(
  scene,
  parent,
  bounds,
  resourceKey,
  items,
) {
  const { copy, layout } = INVENTORY_CODEX_CONFIG;
  const presentation = UI_RESOURCE_PRESENTATION[resourceKey];
  const discovered = hasDiscoveredResource(scene, items, resourceKey);
  const amount = Math.floor(Number(items?.[resourceKey]) || 0);
  const entryIndex = INVENTORY_RESOURCE_GUIDE.resourceKeys.indexOf(resourceKey) + 1;
  const preview = inventoryCodexPoint(
    bounds,
    layout.previewCenterXPx,
    layout.previewCenterYPx,
    layout,
  );
  const previewSize = inventoryCodexSize(
    bounds,
    layout.previewSizePx,
    layout.previewSizePx,
    layout,
  );
  addResourceCodexPortrait(scene, parent, resourceKey, {
    x: preview.x,
    y: preview.y,
    width: previewSize.width,
    height: previewSize.height,
    alpha: discovered ? 1 : 0.76,
  });
  renderDossierIdentity(scene, parent, bounds, resourceKey, entryIndex);

  const record = inventoryCodexPoint(
    bounds,
    layout.recordCenterXPx,
    layout.recordCenterYPx,
    layout,
  );
  addResourceCodexText(
    scene,
    parent,
    record.x,
    record.y,
    discovered
      ? `${copy.discovered}\n${amount.toLocaleString()} CURRENTLY CARRIED`
      : `${copy.undiscovered}\nMINE THIS MATERIAL TO RECORD IT`,
    {
      fontFamily: UI_FONTS.display,
      fontSizePx: inventoryCodexFontSize(
        bounds,
        layout.recordFontSizePx,
        layout,
        9,
      ),
      fontStyle: "bold",
      color: discovered ? presentation.color : UI_COLORS.dim,
      lineSpacing: 3,
    },
  );
  renderDossierNotes(scene, parent, bounds, resourceKey);

  const stats = [
    `${copy.carried}\n${discovered ? amount.toLocaleString() : "—"}`,
    `${copy.status}\n${discovered ? copy.discovered : "UNKNOWN"}`,
    `${copy.materialClass}\n${getResourceCodexMaterialClass(resourceKey)}`,
  ];
  stats.forEach((value, index) => {
    const point = inventoryCodexPoint(
      bounds,
      layout.statCentersXPx[index],
      layout.statCenterYPx,
      layout,
    );
    addResourceCodexText(scene, parent, point.x, point.y, value, {
      fontFamily: UI_FONTS.display,
      fontSizePx: inventoryCodexFontSize(
        bounds,
        layout.statFontSizePx,
        layout,
        9,
      ),
      fontStyle: "bold",
      color: index === 0 && discovered ? presentation.color : UI_COLORS.title,
      lineSpacing: 3,
    });
  });
}
