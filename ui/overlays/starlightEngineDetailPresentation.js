import { ASSET_KEYS } from "../../values/assetKeys.js";
import {
  CELESTIAL_ENGINE_CONFIG,
  CELESTIAL_ENGINE_IDS,
  CELESTIAL_ENGINE_ORDER,
} from "../../values/celestialEngines.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { STARLIGHT_TALENT_TREE_CONFIG } from "../../values/starlightTalentTree.js";

const ENGINE_TEXTURES = Object.freeze({
  [CELESTIAL_ENGINE_IDS.WAYWARD_STAR]: ASSET_KEYS.ui.starlightTalentTree.waywardStar,
  [CELESTIAL_ENGINE_IDS.HOLLOW_SUN]: ASSET_KEYS.ui.starlightTalentTree.hollowSun,
  [CELESTIAL_ENGINE_IDS.COMET_ENGINE]: ASSET_KEYS.ui.starlightTalentTree.cometEngine,
});

function fitImage(image, maxWidth, maxHeight) {
  const width = Math.max(1, image.width || image.displayWidth || 1);
  const height = Math.max(1, image.height || image.displayHeight || 1);
  image.setScale(Math.min(maxWidth / width, maxHeight / height));
  return image;
}

function scaledFont(base, minimum, scale) {
  return Math.max(minimum, Math.round(base * scale));
}

function getEngineStatus(view, engineId) {
  const copy = STARLIGHT_TALENT_TREE_CONFIG.copy;
  const owned = view.snapshot.godMode
    || view.snapshot.unlockedEngines.includes(engineId);
  if (view.snapshot.selectedEngine === engineId) return copy.engineEquipped;
  if (view.snapshot.godMode) return copy.engineGodMode;
  if (owned) return copy.engineOwned;
  if (view.snapshot.availableHearts > 0) return copy.engineAvailable;
  return copy.engineLocked;
}

function addEngineHeart(view) {
  const cfg = STARLIGHT_TALENT_TREE_CONFIG;
  const layout = cfg.layout;
  const scale = view.layoutScale;
  const bounds = view.contentBounds;
  const x = bounds.x + bounds.width * layout.detailHeartXFraction;
  const y = bounds.y + layout.detailHeartOffsetYPx * scale;
  const heart = fitImage(
    view.scene.add.image(x, y, ASSET_KEYS.ui.starlightTalentTree.starHeart),
    layout.detailHeartSizePx * scale,
    layout.detailHeartSizePx * scale,
  );
  view.summaryRoot.add(heart);
  view.addSummaryText(
    x,
    y + layout.detailHeartLabelOffsetYPx * scale,
    cfg.copy.starHeart,
    {
      fontFamily: UI_FONTS.display,
      fontSize: `${scaledFont(
        layout.detailHeartLabelFontSizePx,
        layout.detailHeartLabelMinimumFontSizePx,
        scale,
      )}px`,
      fontStyle: "bold",
      color: UI_COLORS.title,
      stroke: "#02060A",
      strokeThickness: 1,
    },
    0.5,
  );
  view.addSummaryText(
    x,
    y + layout.detailHeartCountOffsetYPx * scale,
    view.snapshot.godMode ? "FREE" : `${view.snapshot.availableHearts || 0} READY`,
    {
      fontFamily: UI_FONTS.mono,
      fontSize: `${scaledFont(
        layout.detailHeartCountFontSizePx,
        layout.detailHeartCountMinimumFontSizePx,
        scale,
      )}px`,
      color: view.snapshot.godMode || view.snapshot.availableHearts > 0
        ? UI_COLORS.gold
        : UI_COLORS.body,
    },
    0.5,
  );
}

export function buildStarlightEngineSummary(view, selectedOffset) {
  view.clearSummary?.();
  if (!view.summaryRoot || view.pageIndex !== 2) return;
  const cfg = STARLIGHT_TALENT_TREE_CONFIG;
  const layout = cfg.layout;
  const scale = view.layoutScale;
  const bounds = view.contentBounds;
  const engineId = CELESTIAL_ENGINE_ORDER[selectedOffset];
  const definition = CELESTIAL_ENGINE_CONFIG.engines[engineId];
  if (!definition) return;

  const artX = bounds.x + bounds.width * layout.detailSignXFraction;
  const artY = bounds.y + layout.detailSignOffsetYPx * scale;
  const art = fitImage(
    view.scene.add.image(artX, artY, ENGINE_TEXTURES[engineId]),
    layout.detailSignMaxPx * scale,
    layout.detailSignMaxPx * scale,
  );
  view.summaryRoot.add(art);
  const textX = bounds.x + bounds.width * layout.detailTextXFraction;
  const textWidth = Math.max(
    1,
    bounds.width * (
      1
      - layout.detailTextXFraction
      - layout.detailTextRightPaddingFraction
    ),
  );
  view.addSummaryText(
    textX,
    bounds.y + layout.detailTitleOffsetYPx * scale,
    definition.shortName,
    {
      fontFamily: UI_FONTS.display,
      fontSize: `${scaledFont(
        layout.detailTitleFontSizePx,
        layout.detailTitleMinimumFontSizePx,
        scale,
      )}px`,
      fontStyle: "bold",
      color: definition.cssAccent,
      stroke: "#02060A",
      strokeThickness: Math.max(1, Math.round(2 * scale)),
    },
  );
  view.addSummaryText(
    textX,
    bounds.y + layout.detailBuffOffsetYPx * scale,
    `${definition.role}  •  ${getEngineStatus(view, engineId)}`,
    {
      fontFamily: UI_FONTS.display,
      fontSize: `${scaledFont(
        layout.detailBuffFontSizePx,
        layout.detailBuffMinimumFontSizePx,
        scale,
      )}px`,
      fontStyle: "bold",
      color: UI_COLORS.gold,
    },
  );
  view.addSummaryText(
    textX,
    bounds.y + layout.detailDescriptionOffsetYPx * scale,
    definition.description,
    {
      fontFamily: UI_FONTS.mono,
      fontSize: `${scaledFont(
        layout.detailBodyFontSizePx,
        layout.detailBodyMinimumFontSizePx,
        scale,
      )}px`,
      color: UI_COLORS.body,
      wordWrap: { width: textWidth, useAdvancedWrap: true },
      lineSpacing: Math.max(1, Math.round(2 * scale)),
    },
  );
  view.addSummaryText(
    textX,
    bounds.y + layout.detailPassiveOffsetYPx * scale,
    `${definition.capLabel}  •  ${cfg.copy.engineRule}`,
    {
      fontFamily: UI_FONTS.mono,
      fontSize: `${scaledFont(
        layout.detailMetaFontSizePx,
        layout.detailMetaMinimumFontSizePx,
        scale,
      )}px`,
      color: definition.cssAccent,
      wordWrap: { width: textWidth, useAdvancedWrap: true },
    },
  );

  const progressY = bounds.y + layout.detailProgressOffsetYPx * scale;
  if (layout.detailProgressPlaqueVisible) {
    const progressPlaque = fitImage(
      view.scene.add.image(
        textX + textWidth / 2,
        progressY,
        ASSET_KEYS.ui.starlightTalentTree.progressPlaque,
      ),
      textWidth,
      layout.detailProgressPlaqueHeightPx * scale,
    );
    view.summaryRoot.add(progressPlaque);
  }
  view.addSummaryText(
    textX + textWidth / 2,
    progressY,
    view.mode === "pillar" ? cfg.copy.engineAction : cfg.copy.pillarOnly,
    {
      fontFamily: UI_FONTS.mono,
      fontSize: `${scaledFont(
        layout.detailMetaFontSizePx,
        layout.detailMetaMinimumFontSizePx,
        scale,
      )}px`,
      color: view.mode === "pillar" ? UI_COLORS.gold : UI_COLORS.body,
      align: "center",
      wordWrap: {
        width: Math.max(1, textWidth - layout.detailProgressPlaqueHeightPx * scale),
        useAdvancedWrap: true,
      },
    },
    0.5,
    0.5,
  );
  addEngineHeart(view);
}
