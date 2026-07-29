function cellKey(cell) {
  return `${cell.tx},${cell.ty}`;
}

export function clearRemainingTitanCoverage(worldModel, coverageCells) {
  if (!worldModel?.applyDugTileKeys || !Array.isArray(coverageCells)) return [];
  const keys = coverageCells
    .filter(cell => worldModel.isSolid(cell.tx, cell.ty))
    .map(cellKey);
  return keys.length ? worldModel.applyDugTileKeys(keys) : [];
}
