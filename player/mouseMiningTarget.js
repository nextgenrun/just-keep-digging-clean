import {
  getAabbAdjacentAimCandidates,
  isTargetTileAdjacentToPlayerBody,
  resolvePlayerTargetDirection,
} from "./playerDirectionalTargets.js";

export function resolveMouseMiningTarget({
  body,
  tileSize,
  worldPoint,
  worldModel,
  allowRangedDirection = false,
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
  if (
    worldModel?.inBounds?.(targetTile.tx, targetTile.ty)
    && worldModel?.isSolid?.(targetTile.tx, targetTile.ty)
    && isTargetTileAdjacentToPlayerBody(body, tileSize, targetTile)
  ) {
    const direction = resolvePlayerTargetDirection(body, tileSize, targetTile);
    if (direction) return Object.freeze({ ...targetTile, ...direction });
  }

  if (allowRangedDirection !== true) return null;
  const centerX = Number(body?.x) + Number(body?.w) * 0.5;
  const centerY = Number(body?.y) + Number(body?.h) * 0.5;
  if (!Number.isFinite(centerX) || !Number.isFinite(centerY)) return null;

  const deltaX = worldPoint.x - centerX;
  const deltaY = worldPoint.y - centerY;
  const aim = Math.abs(deltaX) >= Math.abs(deltaY)
    ? { x: Math.sign(deltaX), y: 0 }
    : { x: 0, y: Math.sign(deltaY) };
  if (aim.x === 0 && aim.y === 0) return null;

  const rangedTarget = getAabbAdjacentAimCandidates(body, tileSize, aim)
    .find(candidate => worldModel?.inBounds?.(candidate.tx, candidate.ty));
  if (!rangedTarget) return null;
  const direction = resolvePlayerTargetDirection(body, tileSize, rangedTarget);
  if (!direction) return null;
  return Object.freeze({ ...rangedTarget, ...direction });
}

export function isPrimaryMousePointer(pointer, primaryButton) {
  return Boolean(pointer) && pointer.button === primaryButton;
}
