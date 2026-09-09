import { STAR_IDENTITY_LIBRARY_CONFIG } from
  "../../values/starIdentityLibrary.js?rev=20260906-baked-celestial-v2";
import { STAR_RARITY_PROGRESSION_CONFIG } from "../../values/starRarityProgression.js";
import { getStarRarityTier } from "../../values/starRarityProgressionMath.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import {
  starAtlasFontSize,
  starAtlasPoint,
  starAtlasSize,
} from "./UIInventoryStarAtlasLayout.js?rev=20260906-baked-celestial-v2";
import {
  addStarAtlasHitZone,
  addStarAtlasText,
} from "./UIInventoryStarAtlasPrimitives.js?rev=20260906-baked-celestial-v2";
import { renderStarAtlasPageControls } from
  "./UIInventoryStarAtlasPagination.js?rev=20260906-baked-celestial-v2";
import { BAKED_STAR_ATLASES } from "../../values/bakedCelestialUi.js";
import { prepareArt, fitBakedUiImage, fitLiveUiText } from "../../systems/visual/bakedUiArt.js";
import { animateBakedStar } from "./UIBakedStarMotion.js";

function renderRarityTabs(
  scene,
  parent,
  bounds,
  selectedRarity,
  identityCounts,
  onSelect,
) {
  const config = STAR_IDENTITY_LIBRARY_CONFIG;
  const layout = config.inventory.layout;
  const copy = config.inventory.copy;
  const appearance = config.inventory.appearance;
  STAR_RARITY_PROGRESSION_CONFIG.rarityTiers.forEach((unused, rarityIndex) => {
    const tier = getStarRarityTier(rarityIndex);
    const selected = rarityIndex === selectedRarity;
    const point = starAtlasPoint(
      bounds,
      layout.rarityTabCentersXPx[rarityIndex],
      layout.rarityTabCenterYPx,
      layout,
    );
    const count = config.rarityIdentityCounts[rarityIndex];
    const found = config.identities.filter(
      identity => identity.rarityIndex === rarityIndex
        && (identityCounts[identity.index] || 0) > 0,
    ).length;
    addStarAtlasText(
      scene,
      parent,
      point.x,
      config.inventory.bakedCopy
        ? starAtlasPoint(bounds, 0, layout.rarityCountCenterYPx, layout).y : point.y,
      config.inventory.bakedCopy ? `${found} / ${count}`
        : `${tier.name.toUpperCase()}\n${found} / ${count} ${copy.found}`,
      {
        fontFamily: UI_FONTS.body,
        fontSizePx: starAtlasFontSize(
          bounds,
          layout.rarityLabelFontSizePx,
          layout,
          9,
        ),
        fontStyle: "bold",
        color: selected ? appearance.title : tier.palette.primary,
        lineSpacing: -2,
        stroke: appearance.shadow,
        strokeThickness: selected ? 3 : 2,
      },
    ).setAlpha(selected ? 1 : layout.rarityIdleAlpha);
    addStarAtlasHitZone(
      scene,
      parent,
      point.x,
      point.y,
      starAtlasSize(bounds, layout.rarityTabHitWidthPx, layout),
      starAtlasSize(bounds, layout.rarityTabHitHeightPx, layout),
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
  identityCounts,
  onSelect,
) {
  const config = STAR_IDENTITY_LIBRARY_CONFIG;
  const layout = config.inventory.layout;
  const copy = config.inventory.copy;
  const appearance = config.inventory.appearance;
  identities.forEach((identity, index) => {
    const row = Math.floor(index / layout.selectorCentersXPx.length);
    const column = index % layout.selectorCentersXPx.length;
    const point = starAtlasPoint(
      bounds,
      layout.selectorCentersXPx[column],
      layout.selectorCentersYPx[row],
      layout,
    );
    const selected = identity.index === selectedIdentity;
    const imageSize = starAtlasSize(bounds, layout.selectorImageSizePx, layout);
    if (selected) {
      const ring = scene.add.graphics();
      ring.lineStyle(
        Math.max(1, starAtlasSize(bounds, layout.selectedRingWidthPx, layout)),
        appearance.focusNumber,
        appearance.focusAlpha,
      );
      ring.strokeCircle(
        point.x,
        point.y,
        starAtlasSize(bounds, layout.selectedRingSizePx, layout) / 2,
      );
      parent.add(ring);
    }
    const art = prepareArt(scene, BAKED_STAR_ATLASES[identity.rarityIndex].frames[identity.frame]);
    const image = scene.add.image(point.x, point.y, art.key, art.frame)
      .setAlpha(selected ? layout.selectedAlpha : layout.idleAlpha);
    const density = scene.game.canvas.width / scene.scale.width;
    fitBakedUiImage(image, Math.min(imageSize, image.width / density),
      Math.min(imageSize, image.height / density));
    image.setData("bakedStarIdentity", identity.index);
    parent.add(image);
    animateBakedStar(scene, image, identity.index);
    const name = addStarAtlasText(
      scene,
      parent,
      point.x,
      starAtlasPoint(
        bounds,
        0,
        layout.selectorCentersYPx[row] + layout.selectorLabelOffsetYPx,
        layout,
      ).y,
      identity.name.toUpperCase()
        + ((identityCounts[identity.index] || 0) > 1
          ? `\n×${identityCounts[identity.index]}`
          : ""),
      {
        fontFamily: UI_FONTS.display,
        fontSizePx: starAtlasFontSize(
          bounds,
          layout.selectorLabelFontSizePx,
          layout,
          8,
        ),
        fontStyle: "bold",
        color: selected ? appearance.focus : appearance.body,
        wordWrapWidth: starAtlasSize(bounds, layout.selectorHitSizePx, layout),
        lineSpacing: -2,
        stroke: appearance.shadow,
        strokeThickness: 2,
      },
    ).setAlpha(selected ? 1 : layout.selectorLabelIdleAlpha);
    fitLiveUiText(name, starAtlasSize(bounds, layout.selectorHitSizePx, layout),
      starAtlasSize(bounds, layout.selectorLabelOffsetYPx / 2, layout));
    addStarAtlasHitZone(
      scene,
      parent,
      point.x,
      point.y,
      starAtlasSize(bounds, layout.selectorHitSizePx, layout),
      starAtlasSize(bounds, layout.selectorHitSizePx, layout),
      () => onSelect(identity.index),
    );
  });
}

export function renderStarAtlasControls(
  scene,
  parent,
  bounds,
  rarityIndex,
  identities,
  selectedIdentity,
  identityCounts,
  onSelectRarity,
  onSelectIdentity,
) {
  const layout = STAR_IDENTITY_LIBRARY_CONFIG.inventory.layout;
  const pageSize = layout.selectorsPerPage;
  const collectedIdentities = identities.filter(
    identity => (identityCounts[identity.index] || 0) > 0,
  );
  const selectedPosition = Math.max(
    0,
    collectedIdentities.findIndex(identity => identity.index === selectedIdentity),
  );
  const pageIndex = Math.floor(selectedPosition / pageSize);
  const pageCount = Math.max(1, Math.ceil(collectedIdentities.length / pageSize));
  const visible = collectedIdentities.slice(
    pageIndex * pageSize,
    (pageIndex + 1) * pageSize,
  );
  renderRarityTabs(
    scene,
    parent,
    bounds,
    rarityIndex,
    identityCounts,
    onSelectRarity,
  );
  renderStarAtlasPageControls(
    scene,
    parent,
    bounds,
    collectedIdentities,
    pageIndex,
    pageCount,
    identities.length,
    onSelectIdentity,
  );
  renderIdentitySelectors(
    scene,
    parent,
    bounds,
    visible,
    selectedIdentity,
    identityCounts,
    onSelectIdentity,
  );
  return Object.freeze({ pageIndex, pageCount, visibleIdentityCount: visible.length });
}
