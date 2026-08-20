import {
  STAR_IDENTITY_LIBRARY_CONFIG,
} from "../../values/starIdentityLibrary.js";
import {
  getStarIdentitiesForRarity,
  getStarIdentity,
} from "../../values/starIdentityLibraryMath.js";
import { getStarRarityTier } from "../../values/starRarityProgressionMath.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import {
  installStarIdentityTextureFrames,
} from "../../systems/visual/installStarIdentityTextureFrames.js";
import {
  addStarAtlasText,
  fitStarAtlasFoundation,
  renderStarAtlasControls,
} from "./UIInventoryStarAtlasControls.js";

function renderIdentityDossier(scene, parent, bounds, identity) {
  const config = STAR_IDENTITY_LIBRARY_CONFIG;
  const copy = config.inventory.copy;
  const layout = config.inventory.layout;
  const tier = getStarRarityTier(identity.rarityIndex);
  const previewX = bounds.left + bounds.width * layout.previewCenterX;
  const previewY = bounds.top + bounds.height * layout.previewCenterY;
  const previewSize = bounds.width * layout.previewImageSizeRatio;
  const previewLight = scene.add.image(
    previewX,
    previewY,
    identity.lightAtlasKey,
    identity.lightFrameName,
  ).setDisplaySize(
    previewSize * layout.previewLightScale,
    previewSize * layout.previewLightScale,
  ).setAlpha(layout.previewLightAlpha);
  previewLight.setBlendMode?.(globalThis.Phaser?.BlendModes?.ADD);
  parent.add(previewLight);
  const preview = scene.add.image(
    previewX,
    previewY,
    identity.atlasKey,
    identity.frameName,
  ).setDisplaySize(previewSize, previewSize);
  preview.setBlendMode?.(globalThis.Phaser?.BlendModes?.SCREEN);
  parent.add(preview);

  addStarAtlasText(
    scene,
    parent,
    bounds.left + bounds.width * layout.previewBadgeX,
    bounds.top + bounds.height * layout.previewBadgeY,
    `${tier.label}\n${tier.name}`,
    {
      fontFamily: UI_FONTS.display,
      fontSizePx: layout.previewBadgeFontSizePx,
      fontStyle: "bold",
      color: tier.palette.highlight,
      lineSpacing: 2,
      stroke: tier.palette.shadow,
      strokeThickness: 3,
    },
  );
  addStarAtlasText(
    scene,
    parent,
    bounds.left + bounds.width * layout.nameCenterX,
    bounds.top + bounds.height * layout.nameCenterY,
    identity.name.toUpperCase(),
    {
      fontFamily: UI_FONTS.display,
      fontSizePx: layout.nameFontSizePx,
      fontStyle: "bold",
      color: identity.primary,
      stroke: "#02060A",
      strokeThickness: 3,
    },
  );
  addStarAtlasText(
    scene,
    parent,
    bounds.left + bounds.width * layout.nameCenterX,
    bounds.top + bounds.height * layout.colourCenterY,
    `${identity.colourName.toUpperCase()}  •  ${copy.rewardTier}: ${tier.name}`,
    {
      fontFamily: UI_FONTS.mono,
      fontSizePx: layout.colourFontSizePx,
      fontStyle: "bold",
      color: identity.secondary,
    },
  );
  addStarAtlasText(
    scene,
    parent,
    bounds.left + bounds.width * layout.nameCenterX,
    bounds.top + bounds.height * layout.flavourCenterY,
    identity.flavour,
    {
      fontFamily: UI_FONTS.body,
      fontSizePx: layout.flavourFontSizePx,
      fontStyle: "italic",
      color: tier.palette.text,
      wordWrapWidth: bounds.width * layout.flavourWidthRatio,
      lineSpacing: 3,
    },
  );
  addStarAtlasText(
    scene,
    parent,
    bounds.left + bounds.width * layout.nameCenterX,
    bounds.top + bounds.height * layout.lightCenterY,
    `${copy.lightStyle}: ${identity.light.style.toUpperCase()}`
      + `  •  ${tier.minDepthTiles > 0
        ? `${copy.depthLocked} ${tier.minDepthTiles}M`
        : copy.surfaceDepth}`,
    {
      fontFamily: UI_FONTS.mono,
      fontSizePx: layout.lightFontSizePx,
      color: tier.palette.secondary,
    },
  );

  const stats = [
    `${copy.signXp}\n+${tier.signXp}`,
    `${copy.material}\n${tier.multiplier}x`,
    `${copy.engine}\n+${tier.engineCharge}`,
  ];
  stats.forEach((value, index) => addStarAtlasText(
    scene,
    parent,
    bounds.left + bounds.width * layout.statCentersX[index],
    bounds.top + bounds.height * layout.statCenterY,
    value,
    {
      fontFamily: UI_FONTS.display,
      fontSizePx: layout.statFontSizePx,
      fontStyle: "bold",
      color: index === 0
        ? identity.primary
        : index === 1
          ? tier.palette.highlight
          : tier.palette.secondary,
      lineSpacing: 2,
    },
  ));
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
  addStarAtlasText(
    scene,
    shell.content,
    bounds.left + bounds.width * config.inventory.layout.ruleCenterX,
    bounds.top + bounds.height * config.inventory.layout.ruleCenterY,
    config.inventory.copy.libraryRule,
    {
      fontFamily: UI_FONTS.mono,
      fontSizePx: config.inventory.layout.ruleFontSizePx,
      fontStyle: "bold",
      color: identity.secondary,
      stroke: "#02060A",
      strokeThickness: 2,
    },
  );
  addStarAtlasText(
    scene,
    shell.content,
    bounds.left + bounds.width * config.inventory.layout.ruleCenterX,
    bounds.top + bounds.height * config.inventory.layout.navigationHintCenterY,
    config.inventory.copy.navigationHint,
    {
      fontFamily: UI_FONTS.mono,
      fontSizePx: config.inventory.layout.navigationHintFontSizePx,
      fontStyle: "bold",
      color: identity.secondary,
      stroke: "#02060A",
      strokeThickness: 2,
    },
  );
  return Object.freeze({
    rarityIndex,
    identityIndex: identity.index,
    preview,
    ...pageState,
  });
}
