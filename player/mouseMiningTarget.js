import {
  isTargetTileAdjacentToPlayerBody,
  resolvePlayerTargetDirection,
} from "./playerDirectionalTargets.js";

export function resolveMouseMiningTarget({
  body,
  tileSize,
  worldPoint,
  worldModel,
}) {
  if (
    !worldPoint
    || !Number.isFinite(worldPoint.x)
    || !Number.isFinite(worldPoint.y)
    || !Number.isFinite(tileSize)
    || tileSize <= 0
  ) return null;

  const targetTile = {
    tx: Math.floor(worldPoint.x / tileSize),
    ty: Math.floor(worldPoint.y / tileSize),
  };
  if (!worldModel?.inBounds?.(targetTile.tx, targetTile.ty)) return null;
  if (!worldModel?.isSolid?.(targetTile.tx, targetTile.ty)) return null;
  if (!isTargetTileAdjacentToPlayerBody(body, tileSize, targetTile)) return null;

  const direction = resolvePlayerTargetDirection(body, tileSize, targetTile);
  if (!direction) return null;
  return Object.freeze({ ...targetTile, ...direction });
}

export function isPrimaryMousePointer(pointer, primaryButton) {
  return Boolean(pointer) && pointer.button === primaryButton;
}
