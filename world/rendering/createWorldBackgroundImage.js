export function createWorldBackgroundImage(scene, entry, runtimeId, rect, style, depth) {
  const image = scene.add.image(rect.left, rect.top, entry.textureKey)
    .setOrigin(0, 0);
  if (entry.sourceCrop) {
    const crop = entry.sourceCrop;
    image.setCrop(crop.x, crop.y, crop.width, crop.height);
  }
  image.setDisplaySize(rect.width, rect.height)
    .setDepth(depth)
    .setAlpha((Number.isFinite(entry.opacity) ? entry.opacity : 1) * style.alphaMultiplier)
    .setVisible(entry.visible !== false);
  const tint = Number.isFinite(entry.tint) ? entry.tint : style.tint;
  if (tint !== null && tint !== undefined) image.setTint(tint);
  image.name = entry.name || runtimeId;
  return image;
}
