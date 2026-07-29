import { APPROVED_HUD_SKIN } from "../values/approvedHudSkin.js";
import { UI_NOTIFICATION_CAROUSEL_CONFIG } from "../values/uiNotificationCarousel.js";

function scaledValue(source, sourceKey, fallbackKey, scale) {
  const fallback = UI_NOTIFICATION_CAROUSEL_CONFIG.fallback;
  return (source[sourceKey] ?? fallback[fallbackKey]) * scale;
}

/**
 * Resolves one responsive notification-card layout from values-only tuning.
 */
export function createNotificationCarouselLayout(scene, approved) {
  const config = UI_NOTIFICATION_CAROUSEL_CONFIG;
  const fallback = config.fallback;
  const reference = APPROVED_HUD_SKIN.referenceViewport;
  const viewportWidth = scene.scale?.width || reference.width;
  const viewportHeight = scene.scale?.height || reference.height;
  const scale = Math.min(
    viewportWidth / reference.width,
    viewportHeight / reference.height,
  );
  const source = approved
    ? APPROVED_HUD_SKIN.layout.notification
    : fallback;
  const fallbackWidth = Math.min(
    fallback.maxWidthPx,
    Math.max(
      fallback.minWidthPx,
      viewportWidth - fallback.viewportInsetPx,
    ),
  );
  const width = approved ? source.width * scale : fallbackWidth;
  const iconInset = scaledValue(source, "iconInset", "iconInsetPx", scale);
  const rightInset = scaledValue(source, "rightInset", "rightInsetPx", scale);

  return Object.freeze({
    scale,
    width,
    minHeight: scaledValue(source, "minHeight", "minHeightPx", scale),
    iconInset,
    rightInset,
    verticalPadding: scaledValue(
      source,
      "verticalPadding",
      "verticalPaddingPx",
      scale,
    ),
    titleFontSize: scaledValue(
      source,
      "titleFontSize",
      "titleFontSizePx",
      scale,
    ),
    messageFontSize: scaledValue(
      source,
      "fontSize",
      "messageFontSizePx",
      scale,
    ),
    counterFontSize: scaledValue(
      source,
      "counterFontSize",
      "counterFontSizePx",
      scale,
    ),
    controlSize: scaledValue(
      source,
      "controlSize",
      "controlSizePx",
      scale,
    ),
    dismissSize: scaledValue(
      source,
      "dismissSize",
      "dismissSizePx",
      scale,
    ),
    controlHitWidth: scaledValue(
      source,
      "controlHitWidth",
      "controlHitWidthPx",
      scale,
    ),
    controlHitHeight: scaledValue(
      source,
      "controlHitHeight",
      "controlHitHeightPx",
      scale,
    ),
    titleTopInset: scaledValue(
      source,
      "titleTopInset",
      "titleTopInsetPx",
      scale,
    ),
    counterBottomInset: scaledValue(
      source,
      "counterBottomInset",
      "counterBottomInsetPx",
      scale,
    ),
    previousInsetX: scaledValue(
      source,
      "previousInsetX",
      "previousInsetXPx",
      scale,
    ),
    nextInsetX: scaledValue(
      source,
      "nextInsetX",
      "nextInsetXPx",
      scale,
    ),
    dismissInsetX: scaledValue(
      source,
      "dismissInsetX",
      "dismissInsetXPx",
      scale,
    ),
    dismissInsetY: scaledValue(
      source,
      "dismissInsetY",
      "dismissInsetYPx",
      scale,
    ),
    cycleOffsetY: scaledValue(
      source,
      "cycleOffsetY",
      "cycleOffsetYPx",
      scale,
    ),
    lineSpacing: scaledValue(
      source,
      "lineSpacing",
      "lineSpacingPx",
      scale,
    ),
    messageX: -width / 2 + iconInset,
    messageWidth: width - iconInset - rightInset,
  });
}
