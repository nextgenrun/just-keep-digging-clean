import { STAR_IDENTITY_LIBRARY_CONFIG } from
  "../../values/starIdentityLibrary.js?rev=20260830-star-codex-v3";
import { STAR_RARITY_PROGRESSION_CONFIG } from "../../values/starRarityProgression.js";
import { getStarRarityTier } from "../../values/starRarityProgressionMath.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import {
  starAtlasFontSize,
  starAtlasPoint,
  starAtlasSize,
} from "./UIInventoryStarAtlasLayout.js?rev=20260830-star-codex-v3";
import {
  addStarAtlasHitZone,
  addStarAtlasText,
} from "./UIInventoryStarAtlasPrimitives.js?rev=20260830-star-codex-v3";
import { renderStarAtlasPageControls } from
  "./UIInventoryStarAtlasPagination.js?rev=20260830-star-codex-v3";
import { addUiStarIdleSelectorMotion } from
  "./UIStarIdleMotion.js?rev=20260826-star-idle-ui-v2";

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
      point.y,
      `${tier.name.toUpperCase()}\n${found} / ${count} ${copy.found}`,
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
    const light = scene.add.image(
      point.x,
      point.y,
      identity.lightAtlasKey,
      identity.lightFrameName,
    ).setDisplaySize(
      imageSize * layout.selectorLightScale,
      imageSize * layout.selectorLightScale,
    ).setAlpha(layout.selectorLightAlpha);
    light.setBlendMode?.(globalThis.Phaser?.BlendModes?.ADD);
    parent.add(light);
    const image = scene.add.image(
      point.x,
      point.y,
      identity.atlasKey,
      identity.frameName,
    )
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
    addUiStarIdleSelectorMotion(scene, parent, {
      x: point.x,
      y: point.y,
      size: imageSize,
      identityIndex: identity.index,
      selected,
    });
    addStarAtlasText(
      scene,
      parent,
      point.x,
      starAtlasPoint(
        bounds,
        0,
        layout.selectorCentersYPx[row] + layout.selectorLabelOffsetYPx,
        layout,
      ).y,
      `${identity.name.toUpperCase()}\n${copy.collected}`
        + ((identityCounts[identity.index] || 0) > 1
          ? ` ×${identityCounts[identity.index]}`
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
