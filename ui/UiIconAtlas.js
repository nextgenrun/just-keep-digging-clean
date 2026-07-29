import {
  SELL_CAPABLE_MERCHANT_IDS,
  UI_AUTO_ICON_LABELS,
  UI_ICON_ATLAS,
  UI_ICON_FRAMES,
  UI_MERCHANT_ICONS,
  UI_UPGRADE_ICONS,
} from "../values/uiIcons.js";
import { ASSET_KEYS } from "../values/assetKeys.js";

const PICKAXE_ICON_ASSETS = Object.freeze(
  Object.values(ASSET_KEYS.ui.pickaxeIcons || {})
);

function getDirectIconFallback(iconName) {
  const isPickaxeIcon = PICKAXE_ICON_ASSETS.some(asset => asset.key === iconName);
  return isPickaxeIcon ? "pickaxe" : iconName;
}

export function getUiIconFrame(iconName) {
  return UI_ICON_FRAMES[iconName] ?? UI_ICON_FRAMES.info;
}

export function createUiIcon(scene, iconName, options = {}) {
  if (!scene?.add) return null;
  const directTexture = scene.textures?.exists(iconName) === true;
  const atlasIconName = getDirectIconFallback(iconName);
  if (!directTexture && !scene.textures?.exists(UI_ICON_ATLAS.key)) return null;
  const image = scene.add.image(
    options.x ?? 0,
    options.y ?? 0,
    directTexture ? iconName : UI_ICON_ATLAS.key,
    directTexture ? undefined : getUiIconFrame(atlasIconName)
  );
  const size = options.size ?? UI_ICON_ATLAS.displaySize;
  image.setDisplaySize(size, size).setOrigin(0.5);
  if (options.alpha != null) image.setAlpha(options.alpha);
  if (options.depth != null) image.setDepth(options.depth);
  if (options.scrollFactor != null) image.setScrollFactor(options.scrollFactor);
  options.parent?.add?.(image);
  return image;
}

export function setUiIcon(image, iconName) {
  if (!image?.active) return;
  if (image.scene?.textures?.exists(iconName)) {
    image.setTexture(iconName);
    return;
  }
  image.setTexture(UI_ICON_ATLAS.key, getUiIconFrame(getDirectIconFallback(iconName)));
}

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
