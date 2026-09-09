import { STAR_IDENTITY_LIBRARY_CONFIG } from
  "../../values/starIdentityLibrary.js?rev=20260906-baked-celestial-v2";
import { UI_FONTS } from "../../values/uiLayout.js";
import { BAKED_STAR_LAYOUT } from "../../values/bakedCelestialUi.js";
import { fitLiveUiText } from "../../systems/visual/bakedUiArt.js";
import {
  starAtlasFontSize,
  starAtlasPoint,
  starAtlasSize,
} from "./UIInventoryStarAtlasLayout.js?rev=20260906-baked-celestial-v2";
import {
  addStarAtlasHitZone,
  addStarAtlasText,
} from "./UIInventoryStarAtlasPrimitives.js?rev=20260906-baked-celestial-v2";

export function renderStarAtlasPageControls(
  scene,
  parent,
  bounds,
  identities,
  pageIndex,
  pageCount,
  totalIdentityCount,
  onSelect,
) {
  const config = STAR_IDENTITY_LIBRARY_CONFIG;
  const layout = config.inventory.layout;
  const appearance = config.inventory.appearance;
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
  if (config.inventory.bakedCopy) {
    const g = BAKED_STAR_LAYOUT;
    for (const [xPx, value] of [
      [g.foundX, `${identities.length} / ${totalIdentityCount}`],
      [g.pageX, `${pageIndex + 1} / ${Math.max(1, pageCount)}`],
    ]) {
      const point = starAtlasPoint(bounds, xPx, g.pageY, layout);
      const text = addStarAtlasText(scene, parent, point.x, point.y, value, {
        fontFamily: UI_FONTS.mono,
        fontSizePx: starAtlasFontSize(bounds, layout.pageLabelFontSizePx, layout, 9),
        fontStyle: "bold", color: appearance.title,
        stroke: appearance.shadow, strokeThickness: 2,
      });
      fitLiveUiText(text, starAtlasSize(bounds, g.pageValueWidth, layout));
    }
    return;
  }
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
    `${identities.length} / ${totalIdentityCount} ${config.inventory.copy.found}`
      + (pageCount > 1
        ? `  •  ${config.inventory.copy.pageLabel} ${pageIndex + 1} / ${pageCount}`
        : ""),
    {
      fontFamily: UI_FONTS.mono,
      fontSizePx: starAtlasFontSize(
        bounds,
        layout.pageLabelFontSizePx,
        layout,
        9,
      ),
      fontStyle: "bold",
      color: appearance.title,
      stroke: appearance.shadow,
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
    identities.length > 0
      ? config.inventory.copy.navigationHint
      : config.inventory.copy.emptyNavigationHint,
    {
      fontFamily: UI_FONTS.mono,
      fontSizePx: starAtlasFontSize(
        bounds,
        layout.navigationHintFontSizePx,
        layout,
        7,
      ),
      fontStyle: "bold",
      color: appearance.muted,
    },
  );
}
