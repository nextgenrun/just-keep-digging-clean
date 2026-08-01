import { ASSET_KEYS } from "../../values/assetKeys.js";
import { STAR_IDENTITY_LIBRARY_CONFIG } from "../../values/starIdentityLibrary.js";
import { STAR_RARITY_PROGRESSION_CONFIG } from "../../values/starRarityProgression.js";
import { getStarRarityTier } from "../../values/starRarityProgressionMath.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";

export function addStarAtlasText(
  scene,
  parent,
  x,
  y,
  value,
  style = {},
) {
  const text = scene.add.text(x, y, value, {
    fontFamily: style.fontFamily || UI_FONTS.body,
    fontSize: `${style.fontSizePx || 12}px`,
    fontStyle: style.fontStyle,
    color: style.color || UI_COLORS.body,
    align: style.align || "center",
    wordWrap: style.wordWrapWidth
      ? { width: style.wordWrapWidth, useAdvancedWrap: true }
      : undefined,
    lineSpacing: style.lineSpacing,
    stroke: style.stroke,
    strokeThickness: style.strokeThickness,
  }).setOrigin(style.originX ?? 0.5, style.originY ?? 0.5);
  parent.add(text);
  return text;
}

function addHitZone(scene, parent, x, y, width, height, onClick) {
  const zone = scene.add.zone(x, y, width, height)
    .setInteractive({ useHandCursor: true });
  zone.on("pointerdown", onClick);
  parent.add(zone);
  return zone;
}

export function fitStarAtlasFoundation(rect, layout) {
  let width = Math.min(layout.maximumWidthPx, rect.width);
  let height = width / layout.aspectRatio;
  if (height > rect.height) {
    height = rect.height;
    width = height * layout.aspectRatio;
  }
  return Object.freeze({
    left: rect.left + (rect.width - width) / 2,
    top: rect.top + (rect.height - height) / 2,
    width,
    height,
  });
}

function renderRarityTabs(
  scene,
  parent,
  bounds,
  selectedRarity,
  onSelect,
) {
  const layout = STAR_IDENTITY_LIBRARY_CONFIG.inventory.layout;
  STAR_RARITY_PROGRESSION_CONFIG.rarityTiers.forEach((unused, rarityIndex) => {
    const tier = getStarRarityTier(rarityIndex);
    const selected = rarityIndex === selectedRarity;
    const x = bounds.left + bounds.width * layout.rarityTabCentersX[rarityIndex];
    const y = bounds.top + bounds.height * layout.rarityTabCenterY;
    addStarAtlasText(scene, parent, x, y, tier.name, {
      fontFamily: UI_FONTS.display,
      fontSizePx: layout.rarityLabelFontSizePx,
      fontStyle: "bold",
      color: selected ? tier.palette.highlight : tier.palette.primary,
      stroke: tier.palette.shadow,
      strokeThickness: selected ? 3 : 2,
    }).setAlpha(selected ? 1 : 0.72);
    addHitZone(
      scene,
      parent,
      x,
      y,
      bounds.width * layout.rarityTabHitWidthRatio,
      bounds.height * layout.rarityTabHitHeightRatio,
      () => onSelect(rarityIndex),
    );
  });
}

function renderIdentitySelectors(
  scene,
  parent,
  bounds,
  identities,
  selectedIdentity,
  onSelect,
) {
  const layout = STAR_IDENTITY_LIBRARY_CONFIG.inventory.layout;
  identities.forEach((identity, index) => {
    const row = Math.floor(index / layout.selectorCentersX.length);
    const column = index % layout.selectorCentersX.length;
    const x = bounds.left + bounds.width * layout.selectorCentersX[column];
    const y = bounds.top + bounds.height * layout.selectorCentersY[row];
    const selected = identity.index === selectedIdentity;
    const imageSize = bounds.width * layout.selectorImageSizeRatio;
    const light = scene.add.image(
      x,
      y,
      identity.lightAtlasKey,
      identity.lightFrameName,
    ).setDisplaySize(
      imageSize * layout.selectorLightScale,
      imageSize * layout.selectorLightScale,
    ).setAlpha(layout.selectorLightAlpha);
    light.setBlendMode?.(globalThis.Phaser?.BlendModes?.ADD);
    parent.add(light);
    const image = scene.add.image(x, y, identity.atlasKey, identity.frameName)
      .setDisplaySize(imageSize, imageSize)
      .setAlpha(selected ? layout.selectedAlpha : layout.idleAlpha);
    if (selected) {
      image.setScale(
        image.scaleX * layout.selectedScale,
        image.scaleY * layout.selectedScale,
      );
    }
    image.setBlendMode?.(globalThis.Phaser?.BlendModes?.SCREEN);
    parent.add(image);
    addStarAtlasText(
      scene,
      parent,
      x,
      y + bounds.height * layout.selectorLabelOffsetYRatio,
      identity.name.toUpperCase(),
      {
        fontFamily: UI_FONTS.display,
        fontSizePx: layout.selectorLabelFontSizePx,
        fontStyle: "bold",
        color: selected ? identity.secondary : identity.primary,
        wordWrapWidth: bounds.width * layout.selectorHitSizeRatio,
        lineSpacing: -2,
        stroke: "#02060A",
        strokeThickness: 2,
      },
    ).setAlpha(selected ? 1 : 0.78);
    addHitZone(
      scene,
      parent,
      x,
      y,
      bounds.width * layout.selectorHitSizeRatio,
      bounds.width * layout.selectorHitSizeRatio,
      () => onSelect(identity.index),
    );
  });
}

function animatePageArrow(scene, arrow, direction) {
  if (!scene.tweens?.add) return;
  scene.tweens.add({
    targets: arrow,
    x: arrow.x + direction * 7,
    duration: 90,
    yoyo: true,
    ease: "Sine.Out",
  });
}

function renderPageControls(
  scene,
  parent,
  bounds,
  identities,
  pageIndex,
  pageCount,
  onSelect,
) {
  if (pageCount <= 1) return;
  const config = STAR_IDENTITY_LIBRARY_CONFIG;
  const layout = config.inventory.layout;
  const y = bounds.top + bounds.height * layout.pageControlCenterY;
  const pageSize = layout.selectorsPerPage;
  const controls = [
    {
      asset: ASSET_KEYS.ui.notificationControls.previous,
      xRatio: layout.pagePreviousCenterX,
      direction: -1,
    },
    {
      asset: ASSET_KEYS.ui.notificationControls.next,
      xRatio: layout.pageNextCenterX,
      direction: 1,
    },
  ];
  controls.forEach(({ asset, xRatio, direction }) => {
    const x = bounds.left + bounds.width * xRatio;
    const targetPage = (pageIndex + direction + pageCount) % pageCount;
    const targetIdentity = identities[targetPage * pageSize];
    const arrow = scene.add.image(x, y, asset.key)
      .setDisplaySize(
        bounds.width * layout.pageArrowSizeRatio,
        bounds.width * layout.pageArrowSizeRatio,
      );
    parent.add(arrow);
    addHitZone(
      scene,
      parent,
      x,
      y,
      bounds.width * layout.pageHitSizeRatio,
      bounds.width * layout.pageHitSizeRatio,
      () => {
        animatePageArrow(scene, arrow, direction);
        onSelect(targetIdentity.index);
      },
    );
  });
  addStarAtlasText(
    scene,
    parent,
    bounds.left + bounds.width * layout.pageLabelCenterX,
    y,
    `${config.inventory.copy.pageLabel} ${pageIndex + 1} / ${pageCount}`,
    {
      fontFamily: UI_FONTS.mono,
      fontSizePx: layout.pageLabelFontSizePx,
      fontStyle: "bold",
      color: UI_COLORS.muted,
      stroke: "#02060A",
      strokeThickness: 2,
    },
  );
}

export function renderStarAtlasControls(
  scene,
  parent,
  bounds,
  rarityIndex,
  identities,
  selectedIdentity,
  onSelectRarity,
  onSelectIdentity,
) {
  const layout = STAR_IDENTITY_LIBRARY_CONFIG.inventory.layout;
  const pageSize = layout.selectorsPerPage;
  const selectedPosition = Math.max(
    0,
    identities.findIndex(identity => identity.index === selectedIdentity),
  );
  const pageIndex = Math.floor(selectedPosition / pageSize);
  const pageCount = Math.ceil(identities.length / pageSize);
  const visible = identities.slice(
    pageIndex * pageSize,
    (pageIndex + 1) * pageSize,
  );
  renderRarityTabs(scene, parent, bounds, rarityIndex, onSelectRarity);
  renderPageControls(
    scene,
    parent,
    bounds,
    identities,
    pageIndex,
    pageCount,
    onSelectIdentity,
  );
  renderIdentitySelectors(
    scene,
    parent,
    bounds,
    visible,
    selectedIdentity,
    onSelectIdentity,
  );
  return Object.freeze({ pageIndex, pageCount, visibleIdentityCount: visible.length });
}
