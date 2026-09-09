import {
  LEVEL_ONE_BIOME_FIELD,
  resolveLevelOneBiomeFieldAtTile,
} from "../../../values/levelOneBiomeField.js";
import { WORLD_MAP_CONFIG } from "../../../values/worldMapConfig.js";
import { isWorldMapTerrainDetailActive } from "./WorldMapTerrainTextureView.js";

function territoryKey(cellX, cellY) {
  return `${cellX},${cellY}`;
}

function isInsideView(point, sizePx, layout) {
  return point.x + sizePx >= layout.x
    && point.y + sizePx >= layout.y
    && point.x <= layout.x + layout.width
    && point.y <= layout.y + layout.height;
}

function drawTerritoryBoundary(
  graphics,
  territory,
  neighbor,
  point,
  sizePx,
  edge,
  config,
) {
  if (!neighbor || neighbor.siteKey === territory.siteKey) return;
  const presentation = config.starTerritories;
  const consumed = territory.state === "consumed" || neighbor.state === "consumed";
  graphics.lineStyle(
    presentation.boundaryWidthPx,
    consumed ? presentation.consumedBoundaryColor : territory.color,
    consumed ? presentation.consumedBoundaryAlpha : presentation.boundaryAlpha,
  );
  if (edge === "right") {
    graphics.lineBetween(
      point.x + sizePx,
      point.y,
      point.x + sizePx,
      point.y + sizePx,
    );
    return;
  }
  graphics.lineBetween(
    point.x,
    point.y + sizePx,
    point.x + sizePx,
    point.y + sizePx,
  );
}

/** Draws known terrain plus the Star ownership layer for every underground cell. */
export function renderWorldMapDiscoveredTerrain({
  graphics,
  layout,
  model,
  discoverySystem,
  worldToScreen,
  biomeFieldEnabled,
  territorySnapshot,
  config = WORLD_MAP_CONFIG,
}) {
  const drawing = config.drawing;
  const cellSize = config.discovery.cellSizeTiles;
  const bandColors = config.colors.depthBands;
  const discoveredBiomeIds = new Set();
  const visibleTerritories = [];
  const pixelsPerTile = worldToScreen(0, 0, layout).pixelsPerTile;
  const terrainDetailActive = isWorldMapTerrainDetailActive(
    layout, pixelsPerTile, config,
  );

  for (const { cellX, cellY } of discoverySystem.getDiscoveredCells()) {
    const tileX = cellX * cellSize;
    const tileY = cellY * cellSize;
    if (
      tileX >= model.widthTiles
      || tileY >= model.depthTiles
      || tileX + cellSize <= 0
      || tileY + cellSize <= 0
    ) {
      continue;
    }
    const point = worldToScreen(tileX, tileY, layout);
    const sizePx = Math.max(
      drawing.minimumCellPx,
      cellSize * point.pixelsPerTile + drawing.cellPaddingPx,
    );
    if (!isInsideView(point, sizePx, layout)) continue;
    const biome = biomeFieldEnabled
      ? resolveLevelOneBiomeFieldAtTile(
        tileX + cellSize * 0.5,
        tileY + cellSize * 0.5,
        LEVEL_ONE_BIOME_FIELD,
      )
      : null;
    const depthRatio = tileY / Math.max(1, model.depthTiles);
    const bandIndex = Math.min(
      bandColors.length - 1,
      Math.floor(depthRatio * bandColors.length),
    );
    if (biome) discoveredBiomeIds.add(biome.id);
    graphics.fillStyle(
      biome?.mapColor ?? bandColors[bandIndex],
      terrainDetailActive ? config.terrainDetail.biomeBackdropAlpha : drawing.cellAlpha,
    );
    graphics.fillRect(point.x, point.y, sizePx, sizePx);

    const territory = territorySnapshot?.cellByKey?.get?.(territoryKey(cellX, cellY));
    if (territory) {
      const consumed = territory.state === "consumed";
      const alpha = consumed
        ? config.starTerritories.consumedCellAlpha
        : (territory.siteDiscovered
          ? config.starTerritories.intactCellAlpha
          : config.starTerritories.signalCellAlpha);
      graphics.fillStyle(
        consumed ? config.starTerritories.consumedCellColor : territory.color,
        alpha,
      );
      graphics.fillRect(point.x, point.y, sizePx, sizePx);
      visibleTerritories.push({ territory, point, sizePx, cellX, cellY });
    }

    if (
      !terrainDetailActive
      && point.pixelsPerTile * cellSize >= drawing.cellOutlineMinimumPx
    ) {
      graphics.lineStyle(
        drawing.cellOutlineWidthPx,
        config.colors.discoveredOutline,
        drawing.cellOutlineAlpha,
      );
      graphics.strokeRect(point.x, point.y, sizePx, sizePx);
    }
    if (biome && sizePx >= drawing.biomeBoundaryMinimumPx) {
      const rightBiome = discoverySystem.isTileDiscovered(tileX + cellSize, tileY)
        ? resolveLevelOneBiomeFieldAtTile(
          tileX + cellSize * 1.5,
          tileY + cellSize * 0.5,
          LEVEL_ONE_BIOME_FIELD,
        )
        : null;
      const downBiome = discoverySystem.isTileDiscovered(tileX, tileY + cellSize)
        ? resolveLevelOneBiomeFieldAtTile(
          tileX + cellSize * 0.5,
          tileY + cellSize * 1.5,
          LEVEL_ONE_BIOME_FIELD,
        )
        : null;
      graphics.lineStyle(
        drawing.biomeBoundaryWidthPx,
        config.colors.biomeBoundary,
        drawing.biomeBoundaryAlpha,
      );
      if (rightBiome && rightBiome.id !== biome.id) {
        graphics.lineBetween(point.x + sizePx, point.y, point.x + sizePx, point.y + sizePx);
      }
      if (downBiome && downBiome.id !== biome.id) {
        graphics.lineBetween(point.x, point.y + sizePx, point.x + sizePx, point.y + sizePx);
      }
    }
  }

  for (const entry of visibleTerritories) {
    if (entry.point.pixelsPerTile < config.starTerritories.boundaryMinimumPixelsPerTile) {
      continue;
    }
    drawTerritoryBoundary(
      graphics,
      entry.territory,
      territorySnapshot.cellByKey.get(territoryKey(entry.cellX + 1, entry.cellY)),
      entry.point,
      entry.sizePx,
      "right",
      config,
    );
    drawTerritoryBoundary(
      graphics,
      entry.territory,
      territorySnapshot.cellByKey.get(territoryKey(entry.cellX, entry.cellY + 1)),
      entry.point,
      entry.sizePx,
      "down",
      config,
    );
  }
  return discoveredBiomeIds;
}
