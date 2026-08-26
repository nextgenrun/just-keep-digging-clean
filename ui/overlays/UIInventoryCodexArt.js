import { INVENTORY_CODEX_CONFIG } from
  "../../values/inventoryCodex.js?rev=20260826-inventory-codex-v2";

function requireTexture(scene, key) {
  if (!key || !scene.textures?.exists?.(key)) {
    throw new Error(`[UIInventoryCodexArt] Required texture was not preloaded: ${key}`);
  }
  return scene.textures.get(key);
}

export function fitInventoryCodexFoundation(
  rect,
  layout = INVENTORY_CODEX_CONFIG.layout,
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

export function inventoryCodexPoint(bounds, xPx, yPx, layout) {
  return Object.freeze({
    x: bounds.left + bounds.width * (xPx / layout.sourceWidthPx),
    y: bounds.top + bounds.height * (yPx / layout.sourceHeightPx),
  });
}

export function inventoryCodexSize(bounds, widthPx, heightPx, layout) {
  return Object.freeze({
    width: bounds.width * (widthPx / layout.sourceWidthPx),
    height: bounds.height * (heightPx / layout.sourceHeightPx),
  });
}

export function inventoryCodexFontSize(
  bounds,
  fontSizePx,
  layout,
  minimumPx = 7,
) {
  const scale = bounds.width / layout.maximumWidthPx;
  return Math.max(minimumPx, Math.round(fontSizePx * scale));
}

export function getResourceCodexPortraitFrameName(
  resourceKey,
  config = INVENTORY_CODEX_CONFIG,
) {
  const index = config.assets.portraits.frameIndices[resourceKey];
  return Number.isInteger(index)
    ? `${config.assets.portraits.framePrefix}${resourceKey}`
    : null;
}

export function installResourceCodexFrames(
  scene,
  config = INVENTORY_CODEX_CONFIG,
) {
  const atlas = config.assets.portraits;
  const texture = requireTexture(scene, atlas.key);
  const cellWidth = atlas.widthPx / atlas.columns;
  const cellHeight = atlas.heightPx / atlas.rows;
  Object.entries(atlas.frameIndices).forEach(([resourceKey, index]) => {
    const frameName = `${atlas.framePrefix}${resourceKey}`;
    if (texture.has(frameName)) return;
    const column = index % atlas.columns;
    const row = Math.floor(index / atlas.columns);
    const left = Math.round(column * cellWidth + atlas.cellInsetPx);
    const top = Math.round(row * cellHeight + atlas.cellInsetPx);
    const right = Math.round((column + 1) * cellWidth - atlas.cellInsetPx);
    const bottom = Math.round((row + 1) * cellHeight - atlas.cellInsetPx);
    texture.add(
      frameName,
      0,
      left,
      top,
      right - left,
      bottom - top,
    );
  });
  return atlas;
}

export function addResourceCodexPortrait(scene, parent, resourceKey, options) {
  const config = INVENTORY_CODEX_CONFIG;
  const frameName = getResourceCodexPortraitFrameName(resourceKey, config);
  if (!frameName) return null;
  installResourceCodexFrames(scene, config);
  const image = scene.add.image(
    options.x,
    options.y,
    config.assets.portraits.key,
    frameName,
  ).setDisplaySize(
    options.width ?? options.size,
    options.height ?? options.size,
  ).setAlpha(options.alpha ?? 1);
  parent.add(image);
  return image;
}
