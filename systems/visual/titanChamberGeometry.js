export function distanceToTitanZone(playerTile, zone) {
  if (!playerTile) return Number.POSITIVE_INFINITY;
  const dx = playerTile.tx < zone.left
    ? zone.left - playerTile.tx
    : playerTile.tx >= zone.rightExclusive
      ? playerTile.tx - zone.rightExclusive + 1
      : 0;
  const dy = playerTile.ty < zone.top
    ? zone.top - playerTile.ty
    : playerTile.ty >= zone.bottomExclusive
      ? playerTile.ty - zone.bottomExclusive + 1
      : 0;
  return Math.max(dx, dy);
}

export function fitTitanChamberScale(image, maximumWidth, maximumHeight, maximumScale) {
  return Math.min(
    maximumScale,
    maximumWidth / Math.max(1, image.width || image.displayWidth || 1),
    maximumHeight / Math.max(1, image.height || image.displayHeight || 1)
  );
}
