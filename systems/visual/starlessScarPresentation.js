import { TILE_TYPES } from "../../values/tileTypes.js";
import { resolveStarScarBoundaryEdges } from
  "../environment/starScarTerritory.js";

export function starlessScarColor(value, fallback = 0x80556f) {
  if (Number.isFinite(value)) return value;
  const parsed = Number.parseInt(String(value || "").replace("#", ""), 16);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function drawStarScarCellFill(
  graphics,
  cells,
  tileSize,
  visual,
  color,
  alpha,
) {
  const overlap = tileSize * visual.cellOverlapRatio;
  graphics.fillStyle(color, alpha);
  for (const cell of cells) {
    graphics.fillRect(
      cell.tx * tileSize - overlap,
      cell.ty * tileSize - overlap,
      tileSize + overlap * 2,
      tileSize + overlap * 2,
    );
  }
}

export function drawStarScarBoundaries(
  graphics,
  cells,
  tileSize,
  visual,
  {
    color = null,
    alpha = null,
    widthTiles = null,
    shadow = false,
    boundaryEdges = null,
  } = {},
) {
  if (!cells.length) return [];
  const edges = Array.isArray(boundaryEdges)
    ? boundaryEdges
    : resolveStarScarBoundaryEdges(cells);
  if (shadow) {
    graphics.lineStyle(
      Math.max(1, tileSize * visual.edgeShadowWidthTiles),
      visual.edgeShadowColor,
      visual.edgeShadowAlpha,
    );
    for (const edge of edges) {
      graphics.lineBetween(
        edge.x1 * tileSize,
        edge.y1 * tileSize,
        edge.x2 * tileSize,
        edge.y2 * tileSize,
      );
    }
  }
  for (const edge of edges) {
    graphics.lineStyle(
      Math.max(1, tileSize * (widthTiles ?? visual.edgeWidthTiles)),
      color ?? starlessScarColor(edge.site?.color, visual.veinColor),
      alpha ?? visual.edgeAlpha,
    );
    graphics.lineBetween(
      edge.x1 * tileSize,
      edge.y1 * tileSize,
      edge.x2 * tileSize,
      edge.y2 * tileSize,
    );
  }
  return edges;
}

export function drawStarScarCoreAccents(rim, scars, tileSize, visual) {
  for (const scar of scars) {
    rim.lineStyle(
      Math.max(1, visual.coreRimWidthTiles * tileSize),
      scar.identityColor,
      visual.coreRimAlpha * (scar.presentationAlpha ?? 1),
    );
    rim.strokeCircle(
      (scar.tx + 0.5) * tileSize,
      (scar.ty + 0.5) * tileSize,
      visual.coreHaloRadiusTiles * tileSize,
    );
  }
}

export function collectFallbackStarScars({
  bounds,
  worldModel,
  getProfileAt,
}) {
  if (!bounds) return [];
  const scars = [];
  for (let ty = bounds.top; ty <= bounds.bottom; ty += 1) {
    for (let tx = bounds.left; tx <= bounds.right; tx += 1) {
      if (worldModel.getTileType?.(tx, ty) === TILE_TYPES.SKY_TILE) continue;
      if (worldModel.getDugTileSource?.(tx, ty)?.type !== TILE_TYPES.SKY_TILE) {
        continue;
      }
      const profile = getProfileAt?.(tx, ty);
      scars.push({
        ...profile,
        tx,
        ty,
        key: profile?.key || `${tx},${ty}`,
        seed: profile?.seed || 0,
        identityColor: starlessScarColor(profile?.identityPrimary),
      });
    }
  }
  return scars;
}

export function drawFallbackStarScars({
  base,
  rim,
  maskGraphics,
  scars,
  tileSize,
  radiusTiles,
  visual,
}) {
  const radius = radiusTiles * tileSize;
  for (const scar of scars) {
    const x = (scar.tx + 0.5) * tileSize;
    const y = (scar.ty + 0.5) * tileSize;
    base.fillStyle(visual.baseColor, visual.baseAlpha).fillCircle(x, y, radius);
    maskGraphics.fillStyle(0xffffff, 1).fillCircle(x, y, radius);
    rim.lineStyle(
      Math.max(1, tileSize * visual.edgeWidthTiles),
      scar.identityColor,
      visual.edgeAlpha,
    ).strokeCircle(x, y, radius);
  }
}
