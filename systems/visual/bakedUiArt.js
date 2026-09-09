import { BAKED_UI_ART, BAKED_UI_LABELS, BAKED_UI_BADGES } from "../../values/bakedUiArt.js";

// Select a frame from the original PNG. No canvas text or runtime raster baking.
export function prepareArt(scene, asset) {
  if (!asset || !scene.textures?.exists?.(asset.key)) return null;
  if (asset.rect) {
    const texture = scene.textures.get?.(asset.key);
    if (!texture?.has || !texture?.add) return null;
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

/** Contain the authored frame without changing the proportions of its lettering. */
export function fitBakedUiImage(image, width, height) {
  const sourceWidth = image.width;
  const sourceHeight = image.height;
  if (!(sourceWidth > 0 && sourceHeight > 0)) return image;
  const scale = Math.max(0, Math.min(width / sourceWidth, height / sourceHeight));
  return image.setDisplaySize(sourceWidth * scale, sourceHeight * scale);
}

export function getBakedHudDetail(scene, id) {
  return prepareArt(scene, { ...BAKED_UI_ART.assets.hudDetails, ...BAKED_UI_ART.hudDetails[id] });
}

export function getBakedPauseStat(scene, id) {
  const frame = BAKED_UI_ART.pauseStats[id];
  return frame?.rect ? prepareArt(scene, { ...BAKED_UI_ART.assets.pauseStats, ...frame }) : null;
}

/** Resize empty panel interiors while preserving the authored corner proportions. */
export function createBakedUiPanel(scene, x, y, width, height) {
  const art = getBakedHudDetail(scene, "panel");
  if (!art) return null;
  const cfg = BAKED_UI_ART.hudDetails;
  const scale = Math.min(cfg.maximumSourceScale, height / art.rect[3]);
  if (scene.game?.renderer?.gl && scene.add.nineslice) {
    return scene.add.nineslice(x, y, art.key, art.frame, width / scale, height / scale,
      cfg.edgeWidth, cfg.edgeWidth, cfg.edgeHeight, cfg.edgeHeight).setScale(scale);
  }
  return fitBakedUiImage(scene.add.image(x, y, art.key, art.frame), width, height);
}

export function getBakedUiBadge(scene, icon) {
  const badge = BAKED_UI_ART.enabled && BAKED_UI_BADGES[icon];
  return badge ? prepareArt(scene, { ...BAKED_UI_ART.assets.iconBadges, ...badge }) : null;
}

/** Keep live values centered within the empty area authored for them. */
export function fitLiveUiText(text, width, height = Infinity) {
  text.setScale(1);
  const scale = Math.min(1, width / Math.max(1, text.width), height / Math.max(1, text.height));
  text.uiFittedScale = scale;
  return text.setScale(scale);
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
  const scale = Math.min(geometry.maximumSourceScale, height / caption.rect[3],
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
