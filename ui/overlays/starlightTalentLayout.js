export function resolveStarlightContentBounds(pageBounds, layout) {
  const availableAspect = pageBounds.width / Math.max(1, pageBounds.height);
  const width = availableAspect > layout.foundationAspectRatio
    ? pageBounds.height * layout.foundationAspectRatio
    : pageBounds.width;
  const height = width / layout.foundationAspectRatio;
  return {
    x: pageBounds.x + (pageBounds.width - width) / 2,
    y: pageBounds.y + (pageBounds.height - height) / 2,
    width,
    height,
  };
}
