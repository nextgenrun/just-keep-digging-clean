import { WORLD_MAP_CONFIG } from "../../../values/worldMapConfig.js";
import {
  LEVEL_ONE_BIOME_FIELD,
  resolveLevelOneBiomeFieldAtTile,
  resolveLevelOneBiomeFieldEnabled,
} from "../../../values/levelOneBiomeField.js";
import { resolveWorldMapPlayerTile } from "../../../systems/map/resolveWorldMapPlayerTile.js";
import {
  resolveWorldMapBiomeLabels,
  resolveWorldMapMarkerAnnotations,
} from "./resolveWorldMapAnnotations.js";
import { drawWorldMapDepthGrid } from "./drawWorldMapDepthGrid.js";
import { drawWorldMapStarNavigation } from "./drawWorldMapStarNavigation.js";
import { renderWorldMapDiscoveredTerrain } from
  "./renderWorldMapDiscoveredTerrain.js";

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
    const { model } = this.getMetrics(layout, viewState);
    viewState.centerTileX = Phaser.Math.Clamp(
      Number.isFinite(viewState.centerTileX) ? viewState.centerTileX : model.widthTiles / 2,
      0,
      Math.max(0, model.widthTiles - 1),
    );
    viewState.centerTileY = Phaser.Math.Clamp(
      Number.isFinite(viewState.centerTileY) ? viewState.centerTileY : model.depthTiles / 2,
      0,
      Math.max(0, model.depthTiles - 1),
    );
  }

  worldToScreen(tileX, tileY, layout, viewState) {
    const metrics = this.getMetrics(layout, viewState);
    return {
      x: metrics.centerX + (tileX - viewState.centerTileX) * metrics.pixelsPerTile,
      y: metrics.centerY + (tileY - viewState.centerTileY) * metrics.pixelsPerTile,
      pixelsPerTile: metrics.pixelsPerTile,
    };
  }

  screenToWorld(screenX, screenY, layout, viewState) {
    const metrics = this.getMetrics(layout, viewState);
    return {
      tileX: viewState.centerTileX + (screenX - metrics.centerX) / metrics.pixelsPerTile,
      tileY: viewState.centerTileY + (screenY - metrics.centerY) / metrics.pixelsPerTile,
    };
  }

  zoomAtScreenPoint(layout, viewState, nextZoom, screenX, screenY) {
    const anchor = this.screenToWorld(screenX, screenY, layout, viewState);
    viewState.zoom = nextZoom;
    const metrics = this.getMetrics(layout, viewState);
    viewState.centerTileX = anchor.tileX - (screenX - metrics.centerX) / metrics.pixelsPerTile;
    viewState.centerTileY = anchor.tileY - (screenY - metrics.centerY) / metrics.pixelsPerTile;
    this.clampView(layout, viewState);
  }

  render(graphics, layout, viewState) {
    const config = WORLD_MAP_CONFIG;
    const colors = config.colors;
    const drawing = config.drawing;
    const model = this.scene.worldModel;
    const biomeFieldEnabled = resolveLevelOneBiomeFieldEnabled();
    const playerTile = resolveWorldMapPlayerTile(this.scene);
    const territorySnapshot = this.scene.worldMapStarTerritorySystem?.resolveMap?.(
      this.discoverySystem,
      playerTile,
    ) || null;
    this.clampView(layout, viewState);
    graphics.clear();

    graphics.fillStyle(colors.fog, 1);
    graphics.fillRect(layout.x, layout.y, layout.width, layout.height);
    graphics.lineStyle(drawing.fogHatchWidthPx, colors.fogHatch, drawing.fogHatchAlpha);
    const hatchGap = config.view.fogHatchGapPx;
    const hatchLength = config.view.fogHatchLengthPx;
    for (let x = layout.x - layout.height; x < layout.x + layout.width; x += hatchGap) {
      graphics.lineBetween(x, layout.y + layout.height, x + layout.height + hatchLength, layout.y);
    }

    const discoveredBiomeIds = renderWorldMapDiscoveredTerrain({
      graphics,
      layout,
      model,
      discoverySystem: this.discoverySystem,
      worldToScreen: (tileX, tileY, targetLayout) => (
        this.worldToScreen(tileX, tileY, targetLayout, viewState)
      ),
      biomeFieldEnabled,
      territorySnapshot,
      config,
    });

    const worldOrigin = this.worldToScreen(0, 0, layout, viewState);
    drawWorldMapDepthGrid({
      graphics,
      layout,
      viewState,
      model,
      worldOrigin,
      worldToScreen: this.worldToScreen.bind(this),
      config,
    });

    const dugKeys = Array.from(model.dugTiles?.keys?.() || []);
    const step = Math.max(1, Math.ceil(dugKeys.length / config.view.maxDugTilesPerDraw));
    graphics.fillStyle(colors.tunnel, drawing.tunnelAlpha);
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

    graphics.lineStyle(
      drawing.worldOutlineWidthPx,
      colors.discoveredOutline,
      drawing.worldOutlineAlpha,
    );
    graphics.strokeRect(
      worldOrigin.x,
      worldOrigin.y,
      model.widthTiles * worldOrigin.pixelsPerTile,
      model.depthTiles * worldOrigin.pixelsPerTile
    );
    drawWorldMapStarNavigation({
      graphics,
      layout,
      playerTile,
      currentTerritory: territorySnapshot?.currentTerritory,
      worldToScreen: (tileX, tileY, targetLayout) => (
        this.worldToScreen(tileX, tileY, targetLayout, viewState)
      ),
      config,
    });

    const markers = this.activityRegistry.getMarkers({
      scene: this.scene,
      discoverySystem: this.discoverySystem,
      worldModel: model,
    }, { includeHidden: true });
    const knownMarkers = markers.filter(marker => (
      marker.alwaysVisible === true
      || this.discoverySystem.isWorldPositionDiscovered(marker.worldX, marker.worldY)
    ));
    const markerCounts = knownMarkers.reduce((counts, marker) => {
      counts[marker.providerId] = (counts[marker.providerId] || 0) + 1;
      return counts;
    }, {});
    const markerAnnotations = resolveWorldMapMarkerAnnotations({
      markers: markers.filter(marker => marker.providerVisible !== false),
      model,
      discoverySystem: this.discoverySystem,
      layout,
      viewState,
      worldToScreen: this.worldToScreen.bind(this),
      config,
    });
    const biomeLabels = resolveWorldMapBiomeLabels({
      discoverySystem: this.discoverySystem,
      layout,
      viewState,
      worldToScreen: this.worldToScreen.bind(this),
      enabled: biomeFieldEnabled,
      avoidPoints: markerAnnotations
        .filter(marker => marker.showLabel)
        .map(marker => ({
          x: marker.x,
          y: marker.y + config.annotations.markerLabelOffsetYPx,
        })),
      config,
    });

    const currentBiome = playerTile && biomeFieldEnabled
      ? resolveLevelOneBiomeFieldAtTile(
        playerTile.tx,
        playerTile.ty,
        LEVEL_ONE_BIOME_FIELD
      )
      : null;
    let playerAnnotation = null;
    if (playerTile) {
      const point = this.worldToScreen(playerTile.tx, playerTile.ty, layout, viewState);
      if (
        point.x >= layout.x
        && point.y >= layout.y
        && point.x <= layout.x + layout.width
        && point.y <= layout.y + layout.height
      ) {
        playerAnnotation = {
          key: "player",
          x: point.x,
          y: point.y,
          label: config.copy.player,
          color: colors.player,
          iconFrame: config.symbolAtlas.frames.player,
          iconSizePx: config.annotations.iconSizesPx.player,
          showLabel: point.pixelsPerTile >= config.annotations.markerLabelMinimumPixelsPerTile,
          priority: config.annotations.markerPriorities.player,
        };
      }
    }

    return {
      discoveryRatio: this.discoverySystem.getDiscoveryRatio(),
      currentDepth: Math.max(0, (playerTile?.ty ?? model.topAirRows) - model.topAirRows),
      maxDepth: Math.max(0, model.depthTiles - model.topAirRows),
      widthTiles: model.widthTiles,
      depthTiles: model.depthTiles,
      markerCount: knownMarkers.length,
      markerCounts,
      markerAnnotations,
      biomeLabels,
      playerAnnotation,
      currentBiome: currentBiome?.label || "",
      biomeFieldActive: Boolean(currentBiome),
      discoveredBiomeCount: discoveredBiomeIds.size,
      totalBiomeCount: biomeFieldEnabled ? LEVEL_ONE_BIOME_FIELD.profiles.length : 0,
      currentStarTerritory: territorySnapshot?.currentTerritory || null,
      knownStarTerritoryCount: territorySnapshot?.knownSites?.length || 0,
      knownIntactStarCount: territorySnapshot?.knownIntactCount || 0,
      knownConsumedStarCount: territorySnapshot?.knownConsumedCount || 0,
    };
  }
}
