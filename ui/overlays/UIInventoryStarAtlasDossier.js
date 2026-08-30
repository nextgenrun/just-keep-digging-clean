import { STAR_IDENTITY_LIBRARY_CONFIG } from
  "../../values/starIdentityLibrary.js?rev=20260830-star-codex-v3";
import { getStarRarityTier } from "../../values/starRarityProgressionMath.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import {
  starAtlasFontSize,
  starAtlasPoint,
  starAtlasSize,
} from "./UIInventoryStarAtlasLayout.js?rev=20260830-star-codex-v3";
import { addStarAtlasText } from
  "./UIInventoryStarAtlasPrimitives.js?rev=20260830-star-codex-v3";
import { addUiStarIdlePreviewMotion } from
  "./UIStarIdleMotion.js?rev=20260826-star-idle-ui-v2";

function addDossierText(scene, parent, bounds, xPx, yPx, value, style) {
  const layout = STAR_IDENTITY_LIBRARY_CONFIG.inventory.layout;
  const point = starAtlasPoint(bounds, xPx, yPx, layout);
  return addStarAtlasText(scene, parent, point.x, point.y, value, style);
}

export function renderEmptyStarAtlasDossier(
  scene,
  parent,
  bounds,
) {
  const config = STAR_IDENTITY_LIBRARY_CONFIG;
  const copy = config.inventory.copy;
  const layout = config.inventory.layout;
  const appearance = config.inventory.appearance;
  addDossierText(
    scene,
    parent,
    bounds,
    layout.previewBadgeXPx,
    layout.previewBadgeYPx,
    `0 ${copy.found}`,
    {
      fontFamily: UI_FONTS.display,
      fontSizePx: starAtlasFontSize(
        bounds,
        layout.previewBadgeFontSizePx,
        layout,
        10,
      ),
      fontStyle: "bold",
      color: appearance.muted,
    },
  );
  addDossierText(
    scene,
    parent,
    bounds,
    layout.nameCenterXPx,
    layout.nameCenterYPx,
    copy.emptyTitle,
    {
      fontFamily: UI_FONTS.display,
      fontSizePx: starAtlasFontSize(bounds, layout.nameFontSizePx, layout, 18),
      fontStyle: "bold",
      color: appearance.title,
      stroke: appearance.shadow,
      strokeThickness: 3,
    },
  );
  addDossierText(
    scene,
    parent,
    bounds,
    layout.nameCenterXPx,
    layout.flavourCenterYPx,
    copy.emptyBody,
    {
      fontFamily: UI_FONTS.body,
      fontSizePx: starAtlasFontSize(bounds, layout.flavourFontSizePx, layout, 12),
      fontStyle: "bold",
      color: appearance.body,
      wordWrapWidth: starAtlasSize(bounds, layout.flavourWidthPx, layout),
      lineSpacing: 4,
    },
  );
  return null;
}

export function renderStarAtlasDossier(
  scene,
  parent,
  bounds,
  identity,
  collectionCount,
) {
  const config = STAR_IDENTITY_LIBRARY_CONFIG;
  const copy = config.inventory.copy;
  const layout = config.inventory.layout;
  const appearance = config.inventory.appearance;
  const tier = getStarRarityTier(identity.rarityIndex);
  const previewPoint = starAtlasPoint(
    bounds,
    layout.previewCenterXPx,
    layout.previewCenterYPx,
    layout,
  );
  const previewSize = starAtlasSize(bounds, layout.previewImageSizePx, layout);
  const previewLight = scene.add.image(
    previewPoint.x,
    previewPoint.y,
    identity.lightAtlasKey,
    identity.lightFrameName,
  ).setDisplaySize(
    previewSize * layout.previewLightScale,
    previewSize * layout.previewLightScale,
  ).setAlpha(layout.previewLightAlpha);
  previewLight.setBlendMode?.(globalThis.Phaser?.BlendModes?.ADD);
  parent.add(previewLight);
  const preview = scene.add.image(
    previewPoint.x,
    previewPoint.y,
    identity.atlasKey,
    identity.frameName,
  ).setDisplaySize(previewSize, previewSize);
  preview.setBlendMode?.(globalThis.Phaser?.BlendModes?.SCREEN);
  parent.add(preview);
  addUiStarIdlePreviewMotion(scene, parent, {
    x: previewPoint.x,
    y: previewPoint.y,
    size: previewSize,
    identityIndex: identity.index,
  });

  addDossierText(
    scene,
    parent,
    bounds,
    layout.previewBadgeXPx,
    layout.previewBadgeYPx,
    `${copy.collected}\n${tier.name.toUpperCase()}`,
    {
      fontFamily: UI_FONTS.display,
      fontSizePx: starAtlasFontSize(
        bounds,
        layout.previewBadgeFontSizePx,
        layout,
        10,
      ),
      fontStyle: "bold",
      color: tier.palette.highlight,
      lineSpacing: 2,
      stroke: appearance.shadow,
      strokeThickness: 3,
    },
  );
  addDossierText(
    scene,
    parent,
    bounds,
    layout.nameCenterXPx,
    layout.nameCenterYPx,
    identity.name.toUpperCase(),
    {
      fontFamily: UI_FONTS.display,
      fontSizePx: starAtlasFontSize(bounds, layout.nameFontSizePx, layout, 18),
      fontStyle: "bold",
      color: appearance.title,
      stroke: appearance.shadow,
      strokeThickness: 3,
    },
  );
  const collectionLabel = collectionCount > 1
    ? `${copy.collected} ×${collectionCount}`
    : copy.collected;
  addDossierText(
    scene,
    parent,
    bounds,
    layout.nameCenterXPx,
    layout.colourCenterYPx,
    `${collectionLabel}  •  STAR ${String(identity.index + 1).padStart(3, "0")}`
      + `  •  ${copy.colour}: ${identity.colourName.toUpperCase()}`,
    {
      fontFamily: UI_FONTS.mono,
      fontSizePx: starAtlasFontSize(bounds, layout.colourFontSizePx, layout, 10),
      fontStyle: "bold",
      color: appearance.focus,
      stroke: appearance.shadow,
      strokeThickness: 2,
    },
  );
  addDossierText(
    scene,
    parent,
    bounds,
    layout.nameCenterXPx,
    layout.flavourCenterYPx,
    identity.flavour,
    {
      fontFamily: UI_FONTS.body,
      fontSizePx: starAtlasFontSize(bounds, layout.flavourFontSizePx, layout, 12),
      fontStyle: "italic",
      color: appearance.body,
      wordWrapWidth: starAtlasSize(bounds, layout.flavourWidthPx, layout),
      lineSpacing: 4,
    },
  );
  addDossierText(
    scene,
    parent,
    bounds,
    layout.nameCenterXPx,
    layout.lightCenterYPx,
    `${copy.lightStyle}: ${identity.light.style.toUpperCase()}`
      + `  •  ${tier.minDepthTiles > 0
        ? `${copy.depthLocked} ${tier.minDepthTiles}M`
        : copy.surfaceDepth}`,
    {
      fontFamily: UI_FONTS.mono,
      fontSizePx: starAtlasFontSize(bounds, layout.lightFontSizePx, layout, 10),
      fontStyle: "bold",
      color: appearance.muted,
    },
  );

  const stats = [
    `${copy.signXp}\n+${tier.signXp}`,
    `${copy.material}\n${tier.multiplier}x`,
    `${copy.engine}\n+${tier.engineCharge}`,
  ];
  stats.forEach((value, index) => {
    addDossierText(
      scene,
      parent,
      bounds,
      layout.statCentersXPx[index],
      layout.statCenterYPx,
      value,
      {
        fontFamily: UI_FONTS.display,
        fontSizePx: starAtlasFontSize(bounds, layout.statFontSizePx, layout, 11),
        fontStyle: "bold",
        color: index === 1 ? appearance.focus : appearance.title,
        lineSpacing: 2,
      },
    );
  });
  return preview;
}
