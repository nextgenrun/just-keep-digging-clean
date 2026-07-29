export function clampArcCoreValue(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

export function smoothArcCoreValue(value) {
  const amount = clampArcCoreValue(value);
  return amount * amount * (3 - 2 * amount);
}

export function arcCoreEnvelope(progress, start, peak, end) {
  if (progress <= start || progress >= end) return 0;
  if (progress < peak) {
    return smoothArcCoreValue((progress - start) / (peak - start));
  }
  return 1 - smoothArcCoreValue((progress - peak) / (end - peak));
}

export function createArcCoreLayer(scene, texture, blendMode) {
  const layer = scene.add.sprite(0, 0, texture).setVisible(false);
  if (blendMode !== undefined) layer.setBlendMode(blendMode);
  return layer;
}

export function applyArcCoreLayer(layer, options) {
  const alpha = clampArcCoreValue(options.alpha);
  const visible = alpha > options.visibleAlphaThreshold;
  const cache = layer.__arcCoreLayerCache || (layer.__arcCoreLayerCache = {});
  const actualVisibilityChanged = typeof layer.visible === "boolean"
    && layer.visible !== visible;
  if (cache.visible !== visible || actualVisibilityChanged) {
    layer.setVisible(visible);
    cache.visible = visible;
  }
  if (!visible) return;

  const originX = options.originX ?? 0.5;
  const originY = options.originY ?? 0.5;
  const tint = options.tint ?? 0xffffff;
  if (cache.texture !== options.texture) {
    layer.setTexture(options.texture);
    cache.texture = options.texture;
  }
  if (cache.originX !== originX || cache.originY !== originY) {
    layer.setOrigin(originX, originY);
    cache.originX = originX;
    cache.originY = originY;
  }
  if (cache.depth !== options.depth) {
    layer.setDepth(options.depth);
    cache.depth = options.depth;
  }
  if (cache.tint !== tint) {
    layer.setTint(tint);
    cache.tint = tint;
  }
  layer
    .setPosition(options.x, options.y)
    .setDisplaySize(options.width, options.height)
    .setAngle(options.angleDeg ?? 0)
    .setAlpha(alpha);
}

export function textureForArcCoreRole(state, role) {
  const texture = state?.roles?.[role];
  if (!texture) throw new Error(`Arc Core .sprite role is missing: ${role}`);
  return texture;
}

export function hideArcCoreLayers(state, keys) {
  if (!state) return;
  for (const key of keys) {
    const layer = state[key];
    if (!layer) continue;
    layer.setVisible(false);
    if (layer.__arcCoreLayerCache) {
      layer.__arcCoreLayerCache.visible = false;
    }
  }
}
