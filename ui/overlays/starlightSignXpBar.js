import { ASSET_KEYS } from "../../values/assetKeys.js";

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function cropToProgress(image, progress) {
  if (!image) return;
  const width = Math.max(1, image.width || image.texture?.source?.[0]?.width || 1);
  const height = Math.max(1, image.height || image.texture?.source?.[0]?.height || 1);
  image.setCrop?.(0, 0, Math.max(1, width * clamp01(progress)), height);
}

export function createStarlightSignXpBar({
  scene,
  parent,
  x,
  y,
  width,
  height,
  progress,
  alpha = 1,
}) {
  const assetKey = ASSET_KEYS.ui.starlightTalentTree.progressPlaque;
  if (
    !assetKey
    || (scene.textures?.exists && !scene.textures.exists(assetKey))
  ) {
    return null;
  }
  const image = scene.add.image(x - width / 2, y, assetKey)
    .setOrigin(0, 0.5)
    .setDisplaySize(width, height)
    .setAlpha(alpha);
  cropToProgress(image, progress);
  image.setProgress = value => {
    cropToProgress(image, value);
    return image;
  };
  parent?.add?.(image);
  return image;
}
