import { getTitanCreatureFootprintRows } from "../../values/titanCreatureFootprints.js";

function tileKey(tx, ty) {
  return `${tx},${ty}`;
}

export function buildTitanCreatureCoverageCells(zone) {
  const rows = getTitanCreatureFootprintRows(zone?.definition?.id);
  const width = zone?.rightExclusive - zone?.left;
  const height = zone?.bottomExclusive - zone?.top;
  if (
    !zone
    || !Number.isInteger(width)
    || !Number.isInteger(height)
    || rows.length !== height
  ) {
    return Object.freeze([]);
  }
  const trackedCells = new Map(
    zone.cells.map(cell => [tileKey(cell.tx, cell.ty), cell])
  );
  const footprint = [];
  for (let row = 0; row < height; row += 1) {
    const rowMask = rows[row];
    for (let column = 0; column < width; column += 1) {
      if ((rowMask & 2 ** column) === 0) continue;
      const cell = trackedCells.get(tileKey(
        zone.left + column,
        zone.top + row
      ));
      if (cell) footprint.push(cell);
    }
  }
  return Object.freeze(footprint);
}

export function countRemainingTitanCoverage(worldModel, coverageCells) {
  return coverageCells.reduce(
    (total, cell) => (
      total + (worldModel.isSolid(cell.tx, cell.ty) ? 1 : 0)
    ),
    0
  );
}
