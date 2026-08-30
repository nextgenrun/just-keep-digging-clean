import { STAR_IDENTITY_LIBRARY_CONFIG } from
  "../../values/starIdentityLibrary.js?rev=20260830-star-codex-v3";

export function fitStarAtlasFoundation(
  rect,
  layout = STAR_IDENTITY_LIBRARY_CONFIG.inventory.layout,
) {
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

export function starAtlasPoint(bounds, xPx, yPx, layout) {
  return Object.freeze({
    x: bounds.left + bounds.width * (xPx / layout.sourceWidthPx),
    y: bounds.top + bounds.height * (yPx / layout.sourceHeightPx),
  });
}

export function starAtlasSize(bounds, sizePx, layout) {
  return bounds.width * (sizePx / layout.sourceWidthPx);
}

export function starAtlasFontSize(
  bounds,
  fontSizePx,
  layout,
  minimumPx = 7,
) {
  const scale = bounds.width / layout.maximumWidthPx;
  return Math.max(minimumPx, Math.round(fontSizePx * scale));
}
