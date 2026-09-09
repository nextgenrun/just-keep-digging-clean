// ==================== CELESTIAL CURRENCY HUD ====================
// Always-resident Money + Star Points presentation values and authored asset paths.

import { UI_ICON_ATLAS, UI_ICON_FRAMES } from "./uiIcons.js";

const foundation = Object.freeze({
  key: "ui-celestial-currency-baked-v2",
  path: "sprites/UI/baked-copy-v1/currency-integrated-v2.png",
  frame: "currency",
  rect: Object.freeze([28, 170, 2006, 360]),
  bakedIcons: true,
});
const starPointIcon = Object.freeze({
  key: "ui-celestial-star-point-icon-v1",
  path: "sprites/UI/starlight-talent-tree-v4/star-heart-ui-v2.png",
});

export const CELESTIAL_CURRENCY_HUD_PRELOAD_ASSETS = Object.freeze([
  foundation,
  starPointIcon,
]);

export const CELESTIAL_CURRENCY_HUD_CONFIG = Object.freeze({
  assets: Object.freeze({
    foundation,
    moneyIcon: Object.freeze({
      key: UI_ICON_ATLAS.key,
      frame: UI_ICON_FRAMES.sell,
    }),
    starsIcon: starPointIcon,
  }),
  layout: Object.freeze({
    referenceWidthPx: 1280,
    referenceHeightPx: 720,
    minimumScale: 0.7,
    maximumScale: 1,
    widthPx: 296,
    heightPx: 58.5,
    leftPx: 14,
    bottomPx: 13,
    moneyIconXFraction: 0.103,
    moneyValueXFraction: 0.319,
    starsValueXFraction: 0.678,
    starsIconXFraction: 0.875,
    iconSizePx: 31,
    starIconSizePx: 29,
    valueOffsetYPx: 1,
    valueWidthPx: 72,
    valueHeightPx: 26,
  }),
  presentation: Object.freeze({
    depth: 1965,
    foundationAlpha: 0.94,
    moneyColor: "#F5D584",
    starsColor: "#D9F7FF",
    shadowColor: "#02060A",
    shadowThicknessPx: 3,
    valueFontSizePx: 18,
    pulseScale: 1.16,
    pulseDurationMs: 190,
  }),
});

export function formatCelestialMoney(value) {
  const amount = Math.max(0, Number(value) || 0);
  const decimals = Number.isInteger(amount) ? 0 : 2;
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: 2,
  });
}

export function formatCelestialStars(value) {
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString("en-US");
}
