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
  layer
    .setTexture(options.texture)
    .setOrigin(options.originX ?? 0.5, options.originY ?? 0.5)
    .setPosition(options.x, options.y)
    .setDisplaySize(options.width, options.height)
    .setAngle(options.angleDeg ?? 0)
    .setDepth(options.depth)
    .setAlpha(clampArcCoreValue(options.alpha))
    .setTint(options.tint ?? 0xffffff)
    .setVisible(options.alpha > options.visibleAlphaThreshold);
}

export function textureForArcCoreRole(state, role) {
  const texture = state?.roles?.[role];
  if (!texture) throw new Error(`Arc Core .sprite role is missing: ${role}`);
  return texture;
}

export function hideArcCoreLayers(state, keys) {
  if (!state) return;
  for (const key of keys) state[key]?.setVisible(false);
}
