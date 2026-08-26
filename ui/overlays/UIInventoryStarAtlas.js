import {
  STAR_IDENTITY_LIBRARY_CONFIG,
} from "../../values/starIdentityLibrary.js?rev=20260826-inventory-codex-v2";
import {
  getStarIdentitiesForRarity,
  getStarIdentity,
} from "../../values/starIdentityLibraryMath.js";
import { getStarRarityTier } from "../../values/starRarityProgressionMath.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import {
  installStarIdentityTextureFrames,
} from "../../systems/visual/installStarIdentityTextureFrames.js";
import {
  renderStarAtlasControls,
} from "./UIInventoryStarAtlasControls.js?rev=20260826-inventory-codex-v3";
import { addStarAtlasText } from
  "./UIInventoryStarAtlasPrimitives.js?rev=20260826-inventory-codex-v3";
import {
  fitStarAtlasFoundation,
  starAtlasFontSize,
  starAtlasPoint,
  starAtlasSize,
} from "./UIInventoryStarAtlasLayout.js?rev=20260826-inventory-codex-v2";
import { addUiStarIdlePreviewMotion } from
  "./UIStarIdleMotion.js?rev=20260826-star-idle-ui-v2";

function renderIdentityDossier(scene, parent, bounds, identity) {
  const config = STAR_IDENTITY_LIBRARY_CONFIG;
  const copy = config.inventory.copy;
  const layout = config.inventory.layout;
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

  const badgePoint = starAtlasPoint(
    bounds,
    layout.previewBadgeXPx,
    layout.previewBadgeYPx,
    layout,
  );
  addStarAtlasText(
    scene,
    parent,
    badgePoint.x,
    badgePoint.y,
    `${tier.label}\n${tier.name}`,
    {
      fontFamily: UI_FONTS.display,
      fontSizePx: starAtlasFontSize(
        bounds,
        layout.previewBadgeFontSizePx,
        layout,
        8,
      ),
      fontStyle: "bold",
      color: tier.palette.highlight,
      lineSpacing: 2,
      stroke: tier.palette.shadow,
      strokeThickness: 3,
    },
  );
  const namePoint = starAtlasPoint(
    bounds,
    layout.nameCenterXPx,
    layout.nameCenterYPx,
    layout,
  );
  addStarAtlasText(
    scene,
    parent,
    namePoint.x,
    namePoint.y,
    identity.name.toUpperCase(),
    {
      fontFamily: UI_FONTS.display,
      fontSizePx: starAtlasFontSize(
        bounds,
        layout.nameFontSizePx,
        layout,
        17,
      ),
      fontStyle: "bold",
      color: UI_COLORS.title,
      stroke: "#02060A",
      strokeThickness: 3,
    },
  );
  const colourPoint = starAtlasPoint(
    bounds,
    layout.nameCenterXPx,
    layout.colourCenterYPx,
    layout,
  );
  addStarAtlasText(
    scene,
    parent,
    colourPoint.x,
    colourPoint.y,
    `STAR ${String(identity.index + 1).padStart(3, "0")} / ${config.identities.length}`
      + `  •  ${identity.colourName.toUpperCase()}`
      + `  •  ${copy.rewardTier}: ${tier.name}`,
    {
      fontFamily: UI_FONTS.mono,
      fontSizePx: starAtlasFontSize(
        bounds,
        layout.colourFontSizePx,
        layout,
        8,
      ),
      fontStyle: "bold",
      color: tier.palette.highlight,
    },
  );
  const flavourPoint = starAtlasPoint(
    bounds,
    layout.nameCenterXPx,
    layout.flavourCenterYPx,
    layout,
  );
  addStarAtlasText(
    scene,
    parent,
    flavourPoint.x,
    flavourPoint.y,
    identity.flavour,
    {
      fontFamily: UI_FONTS.body,
      fontSizePx: starAtlasFontSize(
        bounds,
        layout.flavourFontSizePx,
        layout,
        11,
      ),
      fontStyle: "italic",
      color: UI_COLORS.body,
      wordWrapWidth: starAtlasSize(bounds, layout.flavourWidthPx, layout),
      lineSpacing: 3,
    },
  );
  const lightPoint = starAtlasPoint(
    bounds,
    layout.nameCenterXPx,
    layout.lightCenterYPx,
    layout,
  );
  addStarAtlasText(
    scene,
    parent,
    lightPoint.x,
    lightPoint.y,
    `${copy.lightStyle}: ${identity.light.style.toUpperCase()}`
      + `  •  ${tier.minDepthTiles > 0
        ? `${copy.depthLocked} ${tier.minDepthTiles}M`
        : copy.surfaceDepth}`,
    {
      fontFamily: UI_FONTS.mono,
      fontSizePx: starAtlasFontSize(
        bounds,
        layout.lightFontSizePx,
        layout,
        8,
      ),
      fontStyle: "bold",
      color: UI_COLORS.muted,
    },
  );

  const stats = [
    `${copy.signXp}\n+${tier.signXp}`,
    `${copy.material}\n${tier.multiplier}x`,
    `${copy.engine}\n+${tier.engineCharge}`,
  ];
  stats.forEach((value, index) => {
    const statPoint = starAtlasPoint(
      bounds,
      layout.statCentersXPx[index],
      layout.statCenterYPx,
      layout,
    );
    addStarAtlasText(scene, parent, statPoint.x, statPoint.y, value, {
      fontFamily: UI_FONTS.display,
      fontSizePx: starAtlasFontSize(
        bounds,
        layout.statFontSizePx,
        layout,
        9,
      ),
      fontStyle: "bold",
      color: index === 1 ? tier.palette.highlight : UI_COLORS.title,
      lineSpacing: 2,
    });
  });
  return preview;
}

export function renderInventoryStarAtlas(
  scene,
  shell,
  rect,
  selectedRarity,
  selectedIdentity,
  onSelectRarity,
  onSelectIdentity,
) {
  const config = STAR_IDENTITY_LIBRARY_CONFIG;
  const framesReady = installStarIdentityTextureFrames(scene);
  if (!framesReady || !scene.textures?.exists?.(config.inventory.foundation.key)) {
    return Object.freeze({
      rarityIndex: 0,
      identityIndex: 0,
      preview: null,
      pageIndex: 0,
      pageCount: 0,
    });
  }
  const rarityIndex = Math.max(
    0,
    Math.min(config.rarityIdentityCounts.length - 1, selectedRarity || 0),
  );
  const identities = getStarIdentitiesForRarity(rarityIndex);
  const requested = getStarIdentity(selectedIdentity);
  const identity = requested.rarityIndex === rarityIndex
    ? requested
    : identities[0];
  const bounds = fitStarAtlasFoundation(rect, config.inventory.layout);
  const foundation = scene.add.image(
    bounds.left,
    bounds.top,
    config.inventory.foundation.key,
  ).setOrigin(0)
    .setDisplaySize(bounds.width, bounds.height);
  shell.content.add(foundation);

  const pageState = renderStarAtlasControls(
    scene,
    shell.content,
    bounds,
    rarityIndex,
    identities,
    identity.index,
    onSelectRarity,
    onSelectIdentity,
  );
  const preview = renderIdentityDossier(
    scene,
    shell.content,
    bounds,
    identity,
  );
  return Object.freeze({
    rarityIndex,
    identityIndex: identity.index,
    preview,
    ...pageState,
  });
}
