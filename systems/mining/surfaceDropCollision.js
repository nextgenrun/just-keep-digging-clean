import { TILE_TYPES } from "../../values/tileTypes.js";

const DROP_THROUGH_SURFACE_TYPES = new Set([
  TILE_TYPES.AIR,
  TILE_TYPES.FLOOR_TOWN_1,
  TILE_TYPES.FLOOR_TOWN_2,
]);

export function isSurfacePlatformTileType(tileType) {
  return tileType === TILE_TYPES.FLOOR_TOWN_1
    || tileType === TILE_TYPES.FLOOR_TOWN_2;
}

export function getSurfaceBodyColumns(entity, tileSize, skinPx) {
  const skin = Math.min(skinPx, entity.w * 0.25);
  return Object.freeze({
    left: Math.floor((entity.x + skin) / tileSize),
    right: Math.floor((entity.x + entity.w - skin) / tileSize),
  });
}

export function surfacePlatformCoversBody(worldModel, entity, tileSize, skinPx, surfaceRow) {
  const columns = getSurfaceBodyColumns(entity, tileSize, skinPx);
  for (let tx = columns.left; tx <= columns.right; tx += 1) {
    if (!worldModel.inBounds(tx, surfaceRow)) return false;
  }
  return true;
}

export function isAtSurfacePlatform(entity, tileSize, surfaceRow, tolerancePx) {
  const feetY = entity.y + entity.h;
  return Math.abs(feetY - surfaceRow * tileSize) <= tolerancePx;
}

export function crossesSurfacePlatform(entity, step, tileSize, surfaceRow) {
  const feetY = entity.y + entity.h;
  const surfaceY = surfaceRow * tileSize;
  return step > 0 && feetY <= surfaceY && feetY + step >= surfaceY;
}

export function canBeginSurfaceDrop(
  worldModel,
  entity,
  tileSize,
  skinPx,
  surfaceRow,
  config,
) {
  if (!isAtSurfacePlatform(entity, tileSize, surfaceRow, config.contactTolerancePx)) return false;
  const columns = getSurfaceBodyColumns(entity, tileSize, skinPx);
  for (let tx = columns.left; tx <= columns.right; tx += 1) {
    if (!worldModel.inBounds(tx, surfaceRow + config.clearRowsBelow)) return false;
    if (!DROP_THROUGH_SURFACE_TYPES.has(worldModel.getTileType(tx, surfaceRow))) return false;
    for (let offset = 1; offset <= config.clearRowsBelow; offset += 1) {
      if (worldModel.getTileType(tx, surfaceRow + offset) !== TILE_TYPES.AIR) return false;
    }
  }
  return true;
}

export function ignoresSurfaceTile(
  entity,
  tileY,
  tileType,
  surfaceRow = tileY,
  tileSize = 0,
  movementY = 0,
  tolerancePx = 0,
) {
  if (tileY !== surfaceRow || !isSurfacePlatformTileType(tileType)) return false;
  if (entity.surfaceDropThroughRow === tileY) return true;

  // Town Square is a one-way platform, not a ceiling. Upward flight always
  // passes through it. Once a body is already beneath/inside the platform,
  // horizontal movement and overlap recovery must ignore it as well so the
  // collider cannot be pushed back underground mid-ascent.
  if (movementY < 0) return true;
  if (!(tileSize > 0) || movementY > 0) return false;
  return entity.y + entity.h > surfaceRow * tileSize + tolerancePx;
}

export function refreshSurfaceDropState(entity, tileSize, releaseMarginPx) {
  if (!Number.isInteger(entity.surfaceDropThroughRow)) return false;
  const releaseY = (entity.surfaceDropThroughRow + 1) * tileSize + releaseMarginPx;
  if (entity.y < releaseY) return false;
  entity.clearSurfaceDropThrough?.();
  return true;
}
