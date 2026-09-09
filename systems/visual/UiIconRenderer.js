import { UI_ICON_ATLAS, UI_ICON_FRAMES } from "../../values/uiIcons.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { fitBakedUiImage } from "./bakedUiArt.js";
import { RESOURCE_ICON_ART } from "../../values/resourceIconArt.js";
import { ABILITY_UPGRADE_ICON_ART } from "../../values/abilityUpgradeIconArt.js";

const PICKAXE_ICON_ASSETS = Object.freeze(
  Object.values(ASSET_KEYS.ui.pickaxeIcons || {})
);

function getDirectIconFallback(iconName) {
  const ability = Object.values(ABILITY_UPGRADE_ICON_ART).find(asset => asset.key === iconName);
  if (ability) return ability.fallback;
  const isPickaxeIcon = PICKAXE_ICON_ASSETS.some(asset => asset.key === iconName);
  return isPickaxeIcon ? "pickaxe" : iconName;
}

export function getUiIconFrame(iconName) {
  return UI_ICON_FRAMES[iconName] ?? UI_ICON_FRAMES.info;
}

export function createUiIcon(scene, iconName, options = {}) {
  if (!scene?.add) return null;
  const textureKey = RESOURCE_ICON_ART[iconName]?.key || iconName;
  const directTexture = scene.textures?.exists(textureKey) === true;
  const atlasIconName = getDirectIconFallback(iconName);
  if (!directTexture && !scene.textures?.exists(UI_ICON_ATLAS.key)) return null;
  const image = scene.add.image(
    options.x ?? 0,
    options.y ?? 0,
    directTexture ? textureKey : UI_ICON_ATLAS.key,
    directTexture ? undefined : getUiIconFrame(atlasIconName)
  );
  const size = options.size ?? UI_ICON_ATLAS.displaySize;
  image.uiIconSize = size;
  fitBakedUiImage(image, size, size).setOrigin(0.5);
  if (options.alpha != null) image.setAlpha(options.alpha);
  if (options.depth != null) image.setDepth(options.depth);
  if (options.scrollFactor != null) image.setScrollFactor(options.scrollFactor);
  options.parent?.add?.(image);
  return image;
}

export function setUiIcon(image, iconName) {
  if (!image?.active) return;
  const textureKey = RESOURCE_ICON_ART[iconName]?.key || iconName;
  if (image.scene?.textures?.exists(textureKey)) {
    image.setTexture(textureKey);
  } else {
    image.setTexture(UI_ICON_ATLAS.key, getUiIconFrame(getDirectIconFallback(iconName)));
  }
  const size = image.uiIconSize || UI_ICON_ATLAS.displaySize;
  fitBakedUiImage(image, size, size);
}
