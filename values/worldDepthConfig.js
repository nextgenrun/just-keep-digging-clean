// Shared world-depth contract. Level One keeps its authored 2,000-row runtime,
// while the separated Level Two shaft continues for 5,000 playable meters.
export const WORLD_DEPTH_CONFIG = Object.freeze({
  topAirRows: 65,
  // The visual/one-way surface occupies topAirRows. Keep this many complete
  // AIR rows beneath it before ordinary mineable terrain begins.
  surfaceClearanceRowsBelow: 1,
  levelOneRuntimeDepthTiles: 2000,
  levelTwoDepthMeters: 5000,
  worldDepthTiles: 5065,
  levelTwoLeftTile: 132,
  levelTwoRightTile: 279,
});

export function getSurfaceClearanceBottomTile(
  topAirRows = WORLD_DEPTH_CONFIG.topAirRows,
  config = WORLD_DEPTH_CONFIG,
) {
  const surfaceRow = Number.isInteger(topAirRows)
    ? topAirRows
    : WORLD_DEPTH_CONFIG.topAirRows;
  const clearanceRows = Number.isInteger(config?.surfaceClearanceRowsBelow)
    ? config.surfaceClearanceRowsBelow
    : WORLD_DEPTH_CONFIG.surfaceClearanceRowsBelow;
  return surfaceRow + Math.max(0, clearanceRows);
}

export function isSurfaceClearanceTileY(
  tileY,
  topAirRows = WORLD_DEPTH_CONFIG.topAirRows,
  config = WORLD_DEPTH_CONFIG,
) {
  return Number.isInteger(tileY)
    && tileY > topAirRows
    && tileY <= getSurfaceClearanceBottomTile(topAirRows, config);
}

export function isSurfaceTraversalReservedTileY(
  tileY,
  topAirRows = WORLD_DEPTH_CONFIG.topAirRows,
  config = WORLD_DEPTH_CONFIG,
) {
  return tileY === topAirRows
    || isSurfaceClearanceTileY(tileY, topAirRows, config);
}
