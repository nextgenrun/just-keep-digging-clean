import { TILE_TYPES } from "../../values/tileTypes.js";

const cellKey = (tx, ty) => `${tx},${ty}`;

function isUnderground(worldModel, tileY, minimumDepthOffsetTiles) {
  const firstUndergroundTile = (Number(worldModel?.topAirRows) || 0)
    + Math.max(0, Number(minimumDepthOffsetTiles) || 0);
  return tileY >= firstUndergroundTile;
}

function isInsideRadius(site, tileX, tileY, radiusTiles) {
  if (!site) return false;
  const radius = Math.max(0, Number(radiusTiles) || 0);
  return (site.tx - tileX) ** 2 + (site.ty - tileY) ** 2 <= radius ** 2;
}

function isInsideScarCoverage(
  site,
  tileX,
  tileY,
  radiusTiles,
  coversEntireTerritory,
) {
  return coversEntireTerritory === true
    || isInsideRadius(site, tileX, tileY, radiusTiles);
}

export function isConsumedStarSite(worldModel, site) {
  return Boolean(
    site
    && worldModel?.getTileType?.(site.tx, site.ty) !== TILE_TYPES.SKY_TILE,
  );
}

/** Resolves the consumed Star whose configured nearest-Star territory owns a tile. */
export function resolveStarScarTerritorySite({
  worldModel,
  territorySystem,
  tileX,
  tileY,
  radiusTiles,
  coversEntireTerritory = false,
  minimumDepthOffsetTiles = 1,
}) {
  if (
    !territorySystem?.getNearestSite
    || !isUnderground(worldModel, tileY, minimumDepthOffsetTiles)
  ) {
    return null;
  }
  const site = territorySystem.getNearestSite(tileX, tileY);
  if (!isConsumedStarSite(worldModel, site)) return null;
  return isInsideScarCoverage(
    site,
    tileX,
    tileY,
    radiusTiles,
    coversEntireTerritory,
  ) ? site : null;
}

/** Samples visible tile cells inside one or every consumed nearest-Star territory. */
export function collectStarScarTerritoryCells({
  bounds,
  worldModel,
  territorySystem,
  radiusTiles,
  coversEntireTerritory = false,
  minimumDepthOffsetTiles = 1,
  targetSiteKey = "",
  consumedOnly = true,
}) {
  if (!bounds || !territorySystem?.getNearestSite) return [];
  const cells = [];
  for (let ty = bounds.top; ty <= bounds.bottom; ty += 1) {
    if (!isUnderground(worldModel, ty, minimumDepthOffsetTiles)) continue;
    for (let tx = bounds.left; tx <= bounds.right; tx += 1) {
      const site = territorySystem.getNearestSite(tx, ty);
      if (!site || (targetSiteKey && site.key !== targetSiteKey)) continue;
      if (!isInsideScarCoverage(
        site,
        tx,
        ty,
        radiusTiles,
        coversEntireTerritory,
      )) continue;
      if (consumedOnly && !isConsumedStarSite(worldModel, site)) continue;
      cells.push({ tx, ty, siteKey: site.key, site });
    }
  }
  return cells;
}

/** Returns each visible outer/ownership edge once in tile coordinates. */
export function resolveStarScarBoundaryEdges(cells) {
  const byKey = new Map(cells.map(cell => [cellKey(cell.tx, cell.ty), cell]));
  const seen = new Set();
  const edges = [];
  const candidates = [
    { side: "top", dx: 0, dy: -1, x1: 0, y1: 0, x2: 1, y2: 0 },
    { side: "right", dx: 1, dy: 0, x1: 1, y1: 0, x2: 1, y2: 1 },
    { side: "bottom", dx: 0, dy: 1, x1: 0, y1: 1, x2: 1, y2: 1 },
    { side: "left", dx: -1, dy: 0, x1: 0, y1: 0, x2: 0, y2: 1 },
  ];
  for (const cell of cells) {
    for (const edge of candidates) {
      const neighbor = byKey.get(cellKey(cell.tx + edge.dx, cell.ty + edge.dy));
      if (neighbor?.siteKey === cell.siteKey) continue;
      const x1 = cell.tx + edge.x1;
      const y1 = cell.ty + edge.y1;
      const x2 = cell.tx + edge.x2;
      const y2 = cell.ty + edge.y2;
      const key = x1 < x2 || (x1 === x2 && y1 <= y2)
        ? `${x1},${y1}:${x2},${y2}`
        : `${x2},${y2}:${x1},${y1}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({
        x1,
        y1,
        x2,
        y2,
        side: edge.side,
        outwardX: edge.dx,
        outwardY: edge.dy,
        kind: neighbor ? "territory" : "outer",
        cellTx: cell.tx,
        cellTy: cell.ty,
        site: cell.site,
      });
    }
  }
  return edges;
}
