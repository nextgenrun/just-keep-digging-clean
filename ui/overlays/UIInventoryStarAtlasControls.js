import { STAR_IDENTITY_LIBRARY_CONFIG } from
  "../../values/starIdentityLibrary.js?rev=20260826-inventory-codex-v2";
import { STAR_RARITY_PROGRESSION_CONFIG } from "../../values/starRarityProgression.js";
import { getStarRarityTier } from "../../values/starRarityProgressionMath.js";
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
import { renderStarAtlasPageControls } from
  "./UIInventoryStarAtlasPagination.js?rev=20260826-inventory-codex-v3";
import { addUiStarIdleSelectorMotion } from
  "./UIStarIdleMotion.js?rev=20260826-star-idle-ui-v2";

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
    const point = starAtlasPoint(
      bounds,
      layout.rarityTabCentersXPx[rarityIndex],
      layout.rarityTabCenterYPx,
      layout,
    );
    const count = STAR_IDENTITY_LIBRARY_CONFIG.rarityIdentityCounts[rarityIndex];
    addStarAtlasText(scene, parent, point.x, point.y, `${tier.name}\n${count} STARS`, {
      fontFamily: UI_FONTS.display,
      fontSizePx: starAtlasFontSize(
        bounds,
        layout.rarityLabelFontSizePx,
        layout,
        9,
      ),
      fontStyle: "bold",
      color: selected ? tier.palette.highlight : tier.palette.primary,
      lineSpacing: -2,
      stroke: tier.palette.shadow,
      strokeThickness: selected ? 3 : 2,
    }).setAlpha(selected ? 1 : 0.72);
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
  onSelect,
) {
  const layout = STAR_IDENTITY_LIBRARY_CONFIG.inventory.layout;
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
      const tier = getStarRarityTier(identity.rarityIndex);
      const ring = scene.add.graphics();
      ring.lineStyle(
        Math.max(1, starAtlasSize(bounds, layout.selectedRingWidthPx, layout)),
        Number.parseInt(tier.palette.highlight.replace("#", ""), 16),
        0.96,
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
      identity.name.toUpperCase(),
      {
        fontFamily: UI_FONTS.display,
        fontSizePx: starAtlasFontSize(
          bounds,
          layout.selectorLabelFontSizePx,
          layout,
          8,
        ),
        fontStyle: "bold",
        color: selected ? UI_COLORS.gold : UI_COLORS.body,
        wordWrapWidth: starAtlasSize(bounds, layout.selectorHitSizePx, layout),
        lineSpacing: -2,
        stroke: "#02060A",
        strokeThickness: 2,
      },
    ).setAlpha(selected ? 1 : 0.78);
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
  renderStarAtlasPageControls(
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
