import { WORLD_MAP_CONFIG } from "../../../values/worldMapConfig.js";

export class WorldMapRenderer {
  constructor(scene, discoverySystem, activityRegistry) {
    this.scene = scene;
    this.discoverySystem = discoverySystem;
    this.activityRegistry = activityRegistry;
  }

  getMetrics(layout, viewState) {
    const model = this.scene.worldModel;
    const baseScale = Math.min(
      layout.width / Math.max(1, model.widthTiles),
      layout.height / Math.max(1, model.depthTiles)
    );
    const pixelsPerTile = baseScale * viewState.zoom;
    return {
      model,
      pixelsPerTile,
      centerX: layout.x + layout.width / 2,
      centerY: layout.y + layout.height / 2,
    };
  }

  clampView(layout, viewState) {
    const { model, pixelsPerTile } = this.getMetrics(layout, viewState);
    const halfVisibleX = layout.width / pixelsPerTile / 2;
    const halfVisibleY = layout.height / pixelsPerTile / 2;
    viewState.centerTileX = halfVisibleX >= model.widthTiles / 2
      ? model.widthTiles / 2
      : Phaser.Math.Clamp(viewState.centerTileX, halfVisibleX, model.widthTiles - halfVisibleX);
    viewState.centerTileY = halfVisibleY >= model.depthTiles / 2
      ? model.depthTiles / 2
      : Phaser.Math.Clamp(viewState.centerTileY, halfVisibleY, model.depthTiles - halfVisibleY);
  }

  worldToScreen(tileX, tileY, layout, viewState) {
    const metrics = this.getMetrics(layout, viewState);
    return {
      x: metrics.centerX + (tileX - viewState.centerTileX) * metrics.pixelsPerTile,
      y: metrics.centerY + (tileY - viewState.centerTileY) * metrics.pixelsPerTile,
      pixelsPerTile: metrics.pixelsPerTile,
    };
  }

  render(graphics, layout, viewState) {
    const config = WORLD_MAP_CONFIG;
    const colors = config.colors;
    const model = this.scene.worldModel;
    this.clampView(layout, viewState);
    graphics.clear();

    graphics.fillStyle(colors.fog, 1);
    graphics.fillRect(layout.x, layout.y, layout.width, layout.height);
    graphics.lineStyle(1, colors.fogHatch, 0.38);
    const hatchGap = config.view.fogHatchGapPx;
    const hatchLength = config.view.fogHatchLengthPx;
    for (let x = layout.x - layout.height; x < layout.x + layout.width; x += hatchGap) {
      graphics.lineBetween(x, layout.y + layout.height, x + layout.height + hatchLength, layout.y);
    }

    const cellSize = config.discovery.cellSizeTiles;
    const bandColors = colors.depthBands;
    for (const { cellX, cellY } of this.discoverySystem.getDiscoveredCells()) {
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
      const point = this.worldToScreen(tileX, tileY, layout, viewState);
      const sizePx = Math.max(1.5, cellSize * point.pixelsPerTile + 0.75);
      if (
        point.x + sizePx < layout.x
        || point.y + sizePx < layout.y
        || point.x > layout.x + layout.width
        || point.y > layout.y + layout.height
      ) {
        continue;
      }
      const depthRatio = tileY / Math.max(1, model.depthTiles);
      const bandIndex = Math.min(bandColors.length - 1, Math.floor(depthRatio * bandColors.length));
      graphics.fillStyle(bandColors[bandIndex], 0.92);
      graphics.fillRect(point.x, point.y, sizePx, sizePx);
      if (point.pixelsPerTile * cellSize >= 5) {
        graphics.lineStyle(1, colors.discoveredOutline, 0.24);
        graphics.strokeRect(point.x, point.y, sizePx, sizePx);
      }
    }

    const dugKeys = Array.from(model.dugTiles?.keys?.() || []);
    const step = Math.max(1, Math.ceil(dugKeys.length / config.view.maxDugTilesPerDraw));
    graphics.fillStyle(colors.tunnel, 0.9);
    for (let index = 0; index < dugKeys.length; index += step) {
      const [tileX, tileY] = String(dugKeys[index]).split(",").map(Number);
      if (!this.discoverySystem.isTileDiscovered(tileX, tileY)) continue;
      const point = this.worldToScreen(tileX, tileY, layout, viewState);
      if (
        point.x < layout.x
        || point.y < layout.y
        || point.x > layout.x + layout.width
        || point.y > layout.y + layout.height
      ) {
        continue;
      }
      const sizePx = Math.max(1, point.pixelsPerTile);
      graphics.fillRect(point.x, point.y, sizePx, sizePx);
    }

    const worldOrigin = this.worldToScreen(0, 0, layout, viewState);
    graphics.lineStyle(2, colors.discoveredOutline, 0.55);
    graphics.strokeRect(
      worldOrigin.x,
      worldOrigin.y,
      model.widthTiles * worldOrigin.pixelsPerTile,
      model.depthTiles * worldOrigin.pixelsPerTile
    );

    const markers = this.activityRegistry.getMarkers({
      scene: this.scene,
      discoverySystem: this.discoverySystem,
      worldModel: model,
    });
    markers.forEach(marker => {
      if (
        marker.alwaysVisible !== true
        && !this.discoverySystem.isWorldPositionDiscovered(marker.worldX, marker.worldY)
      ) {
        return;
      }
      const tile = model.worldToTile(marker.worldX, marker.worldY);
      const point = this.worldToScreen(tile.tx, tile.ty, layout, viewState);
      if (
        point.x < layout.x
        || point.y < layout.y
        || point.x > layout.x + layout.width
        || point.y > layout.y + layout.height
      ) {
        return;
      }
      graphics.fillStyle(marker.color ?? colors.marker, 0.95);
      graphics.fillCircle(point.x, point.y, 5);
      graphics.lineStyle(2, 0x081018, 0.9);
      graphics.strokeCircle(point.x, point.y, 6);
    });

    const player = this.scene.player || this.scene.playerController?.sprite;
    if (player) {
      const tile = model.worldToTile(player.x, player.y);
      const point = this.worldToScreen(tile.tx, tile.ty, layout, viewState);
      graphics.fillStyle(colors.player, 1);
      graphics.fillTriangle(
        point.x,
        point.y - 9,
        point.x - 7,
        point.y + 7,
        point.x + 7,
        point.y + 7
      );
      graphics.lineStyle(2, 0xffffff, 0.85);
      graphics.strokeCircle(point.x, point.y, 11);
    }

    const playerTile = player ? model.worldToTile(player.x, player.y) : { ty: model.topAirRows };
    return {
      discoveryRatio: this.discoverySystem.getDiscoveryRatio(),
      currentDepth: Math.max(0, playerTile.ty - model.topAirRows),
      maxDepth: Math.max(0, model.depthTiles - model.topAirRows),
      widthTiles: model.widthTiles,
      depthTiles: model.depthTiles,
      markerCount: markers.length,
    };
  }
}
