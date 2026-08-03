import { TILE_TYPES } from "../../values/tileTypes.js";
import { WORLD_DEPTH_CONFIG } from "../../values/worldDepthConfig.js";

const SURFACE_FLOOR_TYPES = new Set([
  TILE_TYPES.FLOOR_TOWN_1,
  TILE_TYPES.FLOOR_TOWN_2,
]);

function resetTilePresentationMetadata(worldModel, tileX, tileY) {
  const index = worldModel.index(tileX, tileY);
  if (worldModel.skyTileOriginalType) worldModel.skyTileOriginalType[index] = 0;
  if (worldModel.skyTileRarity) worldModel.skyTileRarity[index] = 0;
}

function resolveSurfaceFloorType(worldModel, tileX, surfaceRow, levelTwoLeftTile) {
  const currentType = worldModel.getTileType(tileX, surfaceRow);
  if (SURFACE_FLOOR_TYPES.has(currentType)) return currentType;
  return tileX < levelTwoLeftTile
    ? TILE_TYPES.FLOOR_TOWN_1
    : TILE_TYPES.FLOOR_TOWN_2;
}

/**
 * Makes the visual surface the only tile-aligned authority at ground level and
 * reserves complete AIR rows beneath it for safe one-way player traversal.
 */
export function enforceSurfaceTraversalLayout(
  worldModel,
  config = WORLD_DEPTH_CONFIG,
) {
  const surfaceRow = worldModel.topAirRows;
  const clearanceRows = config.surfaceClearanceRowsBelow;
  const levelTwoLeftTile = config.levelTwoLeftTile;
  if (!Number.isInteger(surfaceRow)
    || !Number.isInteger(clearanceRows)
    || clearanceRows < 1
    || !Number.isInteger(levelTwoLeftTile)
    || !worldModel.inBounds(0, surfaceRow + clearanceRows)) {
    throw new Error("[surfaceTraversalLayout] Invalid surface traversal geometry");
  }

  let normalizedSurfaceTiles = 0;
  let clearedClearanceTiles = 0;
  for (let tileX = 0; tileX < worldModel.widthTiles; tileX += 1) {
    const surfaceType = resolveSurfaceFloorType(
      worldModel,
      tileX,
      surfaceRow,
      levelTwoLeftTile,
    );
    if (worldModel.getTileType(tileX, surfaceRow) !== surfaceType) {
      normalizedSurfaceTiles += 1;
    }
    worldModel.setTile(tileX, surfaceRow, surfaceType, 0);
    resetTilePresentationMetadata(worldModel, tileX, surfaceRow);

    for (let offset = 1; offset <= clearanceRows; offset += 1) {
      const tileY = surfaceRow + offset;
      if (worldModel.getTileType(tileX, tileY) !== TILE_TYPES.AIR) {
        clearedClearanceTiles += 1;
      }
      worldModel.setTile(tileX, tileY, TILE_TYPES.AIR, 0);
      resetTilePresentationMetadata(worldModel, tileX, tileY);
    }
  }

  return Object.freeze({
    surfaceRow,
    clearanceRows,
    normalizedSurfaceTiles,
    clearedClearanceTiles,
  });
}
