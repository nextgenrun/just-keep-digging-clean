import { ASSET_KEYS } from "../../values/assetKeys.js";
import {
  CONSTELLATION_BUFFS,
  CONSTELLATION_MATCHING_STAR_YIELD_BONUS,
} from "../../values/constellationBuffs.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import {
  STARLIGHT_TALENT_RESOURCE_ORDER,
  STARLIGHT_TALENT_TREE_CONFIG,
} from "../../values/starlightTalentTree.js";

function fitImage(image, maxWidth, maxHeight) {
  const width = Math.max(1, image.width || image.displayWidth || 1);
  const height = Math.max(1, image.height || image.displayHeight || 1);
  image.setScale(Math.min(maxWidth / width, maxHeight / height));
  return image;
}

function scaledFont(base, minimum, scale) {
  return Math.max(minimum, Math.round(base * scale));
}

function addStarHeart(view, masteredCount) {
  const cfg = STARLIGHT_TALENT_TREE_CONFIG;
  const layout = cfg.layout;
  const scale = view.layoutScale;
  const bounds = view.contentBounds;
  const x = bounds.x + bounds.width * layout.detailHeartXFraction;
  const y = bounds.y + layout.detailHeartOffsetYPx * scale;
  const size = layout.detailHeartSizePx * scale;
  const socket = fitImage(
    view.scene.add.image(x, y, ASSET_KEYS.ui.starlightTalentTree.starHeartSocket),
    size,
    size,
  );
  const image = fitImage(
    view.scene.add.image(x, y, ASSET_KEYS.ui.starlightTalentTree.starHeart),
    size * 0.78,
    size * 0.78,
  );
  view.summaryRoot.add([socket, image]);
  view.trackSummaryAnimation?.(image);
  const scaleX = image.scaleX;
  const scaleY = image.scaleY;
  view.scene.tweens.add({
    targets: image,
    scaleX: scaleX * layout.selectedPulseScale,
    scaleY: scaleY * layout.selectedPulseScale,
    duration: layout.ambientPulseMs,
    yoyo: true,
    repeat: -1,
    ease: "Sine.InOut",
  });
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
      align: "center",
      stroke: "#02060A",
      strokeThickness: 1,
    },
    0.5,
  );
  view.addSummaryText(
    x,
    y + layout.detailHeartCountOffsetYPx * scale,
    `${masteredCount} / ${STARLIGHT_TALENT_RESOURCE_ORDER.length}`,
    {
      fontFamily: UI_FONTS.mono,
      fontSize: `${scaledFont(
        layout.detailHeartCountFontSizePx,
        layout.detailHeartCountMinimumFontSizePx,
        scale,
      )}px`,
      color: masteredCount >= STARLIGHT_TALENT_RESOURCE_ORDER.length
        ? UI_COLORS.gold
        : UI_COLORS.body,
    },
    0.5,
  );
}

export function buildStarlightTalentSummary(view) {
  view.clearSummary?.();
  if (!view.summaryRoot || !view.selectedResource || view.pageIndex >= 2) return;
  const cfg = STARLIGHT_TALENT_TREE_CONFIG;
  const layout = cfg.layout;
  const scale = view.layoutScale;
  const bounds = view.contentBounds;
  const status = view.statuses[view.selectedResource];
  const definition = view.data.defs?.[view.selectedResource] || {};
  const buff = CONSTELLATION_BUFFS[view.selectedResource];
  const signX = bounds.x + bounds.width * layout.detailSignXFraction;
  const signY = bounds.y + layout.detailSignOffsetYPx * scale;
  const sign = fitImage(
    view.scene.add.image(
      signX,
      signY,
      ASSET_KEYS.constellations.signs[view.selectedResource],
    ),
    layout.detailSignMaxPx * scale,
    layout.detailSignMaxPx * scale,
  );
  sign.setAlpha(status.abilityLocked ? 0.22 : status.hasAny || status.isUnlocked ? 1 : 0.38);
  if (status.abilityLocked || (!status.hasAny && !status.isUnlocked)) {
    sign.setTint(0x526478);
  }
  view.summaryRoot.add(sign);
  if (status.abilityLocked) {
    const lock = fitImage(
      view.scene.add.image(
        signX,
        signY,
        ASSET_KEYS.ui.starlightTalentTree.boboLock,
      ),
      layout.detailLockSizePx * scale,
      layout.detailLockSizePx * scale,
    );
    view.summaryRoot.add(lock);
  }

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
    definition.name || view.selectedResource,
    {
      fontFamily: UI_FONTS.display,
      fontSize: `${scaledFont(
        layout.detailTitleFontSizePx,
        layout.detailTitleMinimumFontSizePx,
        scale,
      )}px`,
      fontStyle: "bold",
      color: status.cssColor,
      stroke: "#02060A",
      strokeThickness: Math.max(1, Math.round(2 * scale)),
    },
  );
  view.addSummaryText(
    textX,
    bounds.y + layout.detailBuffOffsetYPx * scale,
    buff?.name || "Constellation Talent",
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
    buff?.description || "",
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

  const yieldState = status.isUnlocked ? "ACTIVE" : "ON MASTERY";
  view.addSummaryText(
    textX,
    bounds.y + layout.detailPassiveOffsetYPx * scale,
    `STAR YIELD  +${CONSTELLATION_MATCHING_STAR_YIELD_BONUS}x  •  ${yieldState}`,
    {
      fontFamily: UI_FONTS.mono,
      fontSize: `${scaledFont(
        layout.detailMetaFontSizePx,
        layout.detailMetaMinimumFontSizePx,
        scale,
      )}px`,
      color: status.isUnlocked ? UI_COLORS.success : UI_COLORS.dim,
    },
  );

  const mutationState = status.abilityLocked
    ? "BUY ABILITY FROM BOBO"
    : status.rewardActive
      ? cfg.copy.mutationActive
      : cfg.copy.mutationPending;
  const relicText = status.relicRequired > 0
    ? `  •  ${status.relicCount}/${status.relicRequired} RELICS`
    : "";
  const progressText = `${mutationState}`
    + `  •  ${status.collected}/${status.threshold} STARS${relicText}`;
  const progressY = bounds.y + layout.detailProgressOffsetYPx * scale;
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
  view.addSummaryText(
    textX + textWidth / 2,
    progressY,
    progressText,
    {
      fontFamily: UI_FONTS.mono,
      fontSize: `${scaledFont(
        layout.detailMetaFontSizePx,
        layout.detailMetaMinimumFontSizePx,
        scale,
      )}px`,
      color: status.abilityLocked ? UI_COLORS.danger : status.statusColor,
      align: "center",
      wordWrap: {
        width: Math.max(1, textWidth - layout.detailProgressPlaqueHeightPx * scale),
        useAdvancedWrap: true,
      },
    },
    0.5,
    0.5,
  );

  const masteredCount = STARLIGHT_TALENT_RESOURCE_ORDER.filter(
    resourceType => view.statuses[resourceType].isUnlocked,
  ).length;
  addStarHeart(view, masteredCount);
}
