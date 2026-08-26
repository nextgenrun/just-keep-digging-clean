import { STAR_IDENTITY_LIBRARY_CONFIG } from
  "../../values/starIdentityLibrary.js?rev=20260826-inventory-codex-v2";
import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import {
  starAtlasFontSize,
  starAtlasPoint,
  starAtlasSize,
} from "./UIInventoryStarAtlasLayout.js?rev=20260826-inventory-codex-v2";
import {
  addStarAtlasHitZone,
  addStarAtlasText,
} from "./UIInventoryStarAtlasPrimitives.js?rev=20260826-inventory-codex-v3";

export function renderStarAtlasPageControls(
  scene,
  parent,
  bounds,
  identities,
  pageIndex,
  pageCount,
  onSelect,
) {
  const config = STAR_IDENTITY_LIBRARY_CONFIG;
  const layout = config.inventory.layout;
  const pageSize = layout.selectorsPerPage;
  const controls = [
    { xPx: layout.pagePreviousCenterXPx, direction: -1 },
    { xPx: layout.pageNextCenterXPx, direction: 1 },
  ];
  controls.forEach(({ xPx, direction }) => {
    if (pageCount <= 1) return;
    const point = starAtlasPoint(
      bounds,
      xPx,
      layout.pageControlCenterYPx,
      layout,
    );
    const targetPage = (pageIndex + direction + pageCount) % pageCount;
    const targetIdentity = identities[targetPage * pageSize];
    addStarAtlasHitZone(
      scene,
      parent,
      point.x,
      point.y,
      starAtlasSize(bounds, layout.pageHitSizePx, layout),
      starAtlasSize(bounds, layout.pageHitSizePx, layout),
      () => onSelect(targetIdentity.index),
    );
  });
  const labelPoint = starAtlasPoint(
    bounds,
    layout.pageLabelCenterXPx,
    layout.pageControlCenterYPx + layout.pageLabelOffsetYPx,
    layout,
  );
  addStarAtlasText(
    scene,
    parent,
    labelPoint.x,
    labelPoint.y,
    `${config.inventory.copy.pageLabel} ${pageIndex + 1} / ${pageCount}`,
    {
      fontFamily: UI_FONTS.mono,
      fontSizePx: starAtlasFontSize(
        bounds,
        layout.pageLabelFontSizePx,
        layout,
        9,
      ),
      fontStyle: "bold",
      color: UI_COLORS.title,
      stroke: "#02060A",
      strokeThickness: 2,
    },
  );
  const hintPoint = starAtlasPoint(
    bounds,
    layout.pageLabelCenterXPx,
    layout.pageControlCenterYPx + layout.pageHintOffsetYPx,
    layout,
  );
  addStarAtlasText(
    scene,
    parent,
    hintPoint.x,
    hintPoint.y,
    config.inventory.copy.navigationHint,
    {
      fontFamily: UI_FONTS.mono,
      fontSizePx: starAtlasFontSize(
        bounds,
        layout.navigationHintFontSizePx,
        layout,
        7,
      ),
      fontStyle: "bold",
      color: UI_COLORS.muted,
    },
  );
}
