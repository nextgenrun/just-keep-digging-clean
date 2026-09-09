import {
  SELL_CAPABLE_MERCHANT_IDS,
  UI_AUTO_ICON_LABELS,
  UI_MERCHANT_ICONS,
  UI_UPGRADE_ICONS,
} from "../values/uiIcons.js";
import { ASSET_KEYS } from "../values/assetKeys.js";

export { createUiIcon, getUiIconFrame, setUiIcon } from "../systems/visual/UiIconRenderer.js";

export function resolveUiIconForLabel(label) {
  const normalized = String(label || "").replace(/[^a-zA-Z0-9]+/g, " ").trim().toUpperCase();
  if (!normalized) return null;
  if (UI_AUTO_ICON_LABELS[normalized]) return UI_AUTO_ICON_LABELS[normalized];
  const match = Object.entries(UI_AUTO_ICON_LABELS)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([key]) => normalized.includes(key));
  return match?.[1] || null;
}

export function resolveUpgradeUiIcon(upgrade) {
  if (!upgrade) return "upgrade";
  if (upgrade.uiIcon) return upgrade.uiIcon;
  const pickaxeIcon = ASSET_KEYS.ui.pickaxeIcons?.[upgrade.id]?.key;
  if (pickaxeIcon) return pickaxeIcon;
  if (UI_UPGRADE_ICONS[upgrade.id]) return UI_UPGRADE_ICONS[upgrade.id];
  const category = String(upgrade.category || "").toLowerCase();
  if (category.includes("pickaxe") || category.includes("gear")) return "pickaxe";
  if (category.includes("gem")) return "gem";
  return "upgrade";
}

export function resolveMerchantUiIcon(merchantId) {
  return UI_MERCHANT_ICONS[merchantId] || "shop";
}

export function isSellCapableMerchant(merchantId) {
  return SELL_CAPABLE_MERCHANT_IDS.includes(merchantId);
}
