import { WORLD_MAP_CONFIG } from "../../../values/worldMapConfig.js";

/** Draws restrained surface and depth references over the surveyed world bounds. */
export function drawWorldMapDepthGrid({
  graphics,
  layout,
  viewState,
  model,
  worldOrigin,
  worldToScreen,
  config = WORLD_MAP_CONFIG,
}) {
  const drawing = config.drawing;
  const colors = config.colors;
  const gridLeft = Math.max(layout.x, worldOrigin.x);
  const gridRight = Math.min(
    layout.x + layout.width,
    worldOrigin.x + model.widthTiles * worldOrigin.pixelsPerTile,
  );
  if (gridRight <= gridLeft) return;

  const interval = drawing.depthGridIntervalTiles;
  for (let tileY = model.topAirRows; tileY < model.depthTiles; tileY += interval) {
    const point = worldToScreen(0, tileY, layout, viewState);
    if (point.y < layout.y || point.y > layout.y + layout.height) continue;
    const major = Math.round((tileY - model.topAirRows) / interval)
      % drawing.depthGridMajorEvery === 0;
    graphics.lineStyle(
      drawing.depthGridWidthPx,
      colors.grid,
      major ? drawing.depthGridMajorAlpha : drawing.depthGridMinorAlpha,
    );
    graphics.lineBetween(gridLeft, point.y, gridRight, point.y);
  }

  const surfacePoint = worldToScreen(0, model.topAirRows, layout, viewState);
  if (surfacePoint.y < layout.y || surfacePoint.y > layout.y + layout.height) return;
  graphics.lineStyle(
    drawing.surfaceLineWidthPx,
    colors.surface,
    drawing.surfaceLineAlpha,
  );
  graphics.lineBetween(gridLeft, surfacePoint.y, gridRight, surfacePoint.y);
}
