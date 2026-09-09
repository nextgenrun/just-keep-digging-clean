import { BAKED_UI_ART, BAKED_UI_LABELS } from "../../values/bakedUiArt.js";

// Select a frame from the original PNG. No canvas text or runtime raster baking.
function prepareArt(scene, asset) {
  if (!asset || !scene.textures?.exists?.(asset.key)) return null;
  if (asset.rect) {
    const texture = scene.textures.get(asset.key);
    if (!texture.has(asset.frame)) texture.add(asset.frame, 0, ...asset.rect);
  }
  return asset;
}

export function getBakedUiArt(scene, id) {
  return BAKED_UI_ART.enabled ? prepareArt(scene, BAKED_UI_ART.assets[id]) : null;
}

export function getBakedUiLabel(scene, value, caption = false) {
  if (!BAKED_UI_ART.enabled) return null;
  const label = BAKED_UI_LABELS[String(value || "").trim().toUpperCase()];
  if (!label || (label.captionOnly && !caption)) return null;
  return prepareArt(scene, { ...BAKED_UI_ART.assets[label.asset], frame: label.frame, rect: label.rect, captionRect: label.captionRect });
}

export function fitBakedControlKey(text, value, geometry, width, fontSize) {
  text.setText(value).setFontSize(fontSize).setPosition(width * geometry.xRatio, 0).setScale(1);
  text.setScale(Math.min(1, width * geometry.maxWidthRatio / Math.max(1, text.width)));
}

/** Attach authored caption artwork at a fixed label's existing layout position. */
export function addBakedUiCaption(scene, parent, text, options = {}) {
  const art = text && getBakedUiLabel(scene, text.text, true);
  if (!art || !art.captionRect) return null;
  const caption = prepareArt(scene, { ...art, frame: art.frame + "-caption", rect: art.captionRect });
  const geometry = BAKED_UI_ART.caption;
  const size = Math.max(geometry.minimumFontSize, parseFloat(text.style?.fontSize) || geometry.minimumFontSize);
  const height = size * geometry.fontHeightRatio;
  const scale = Math.min(height / caption.rect[3],
    (options.maxWidth || geometry.maxWidth) / caption.rect[2]);
  const image = scene.add.image(text.x, text.y, caption.key, caption.frame)
    .setOrigin(text.originX, text.originY)
    .setDisplaySize(caption.rect[2] * scale, caption.rect[3] * scale)
    .setScrollFactor(text.scrollFactorX, text.scrollFactorY);
  image.setData?.("bakedLabel", text.text);
  text.setVisible(false);
  text.bakedCaption = image;
  parent.add(image);
  return image;
}
