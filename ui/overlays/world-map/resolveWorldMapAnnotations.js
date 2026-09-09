import {
  LEVEL_ONE_BIOME_FIELD,
  resolveLevelOneBiomeFieldAtTile,
} from "../../../values/levelOneBiomeField.js";
import { WORLD_MAP_CONFIG } from "../../../values/worldMapConfig.js";

function insideViewport(point, layout, inset = 0) {
  return point.x >= layout.x + inset
    && point.y >= layout.y + inset
    && point.x <= layout.x + layout.width - inset
    && point.y <= layout.y + layout.height - inset;
}

function squaredDistance(a, b) {
  const deltaX = a.x - b.x;
  const deltaY = a.y - b.y;
  return deltaX * deltaX + deltaY * deltaY;
}

export function resolveWorldMapLabelPlacement(
  point,
  layout,
  config = WORLD_MAP_CONFIG,
) {
  const presentation = config.annotations;
  const halfWidth = presentation.markerLabelMaximumWidthPx * 0.5;
  const inset = presentation.markerLabelViewportInsetPx;
  const flipAbove = point.y > (
    layout.y + layout.height - presentation.markerLabelFlipInsetPx
  );
  return {
    labelX: Math.max(
      layout.x + inset + halfWidth,
      Math.min(layout.x + layout.width - inset - halfWidth, point.x),
    ),
    labelY: point.y + presentation.markerLabelOffsetYPx * (flipAbove ? -1 : 1),
    labelOriginY: flipAbove ? 1 : 0,
  };
}

function markerIsKnown(marker, discoverySystem) {
  return marker.alwaysVisible === true
    || discoverySystem.isWorldPositionDiscovered(marker.worldX, marker.worldY);
}

export function resolveWorldMapMarkerAnnotations({
  markers,
  model,
  discoverySystem,
  layout,
  viewState,
  worldToScreen,
  config = WORLD_MAP_CONFIG,
}) {
  const presentation = config.annotations;
  const visible = [];
  for (const marker of markers) {
    if (!markerIsKnown(marker, discoverySystem)) continue;
    const tile = model.worldToTile(marker.worldX, marker.worldY);
    const point = worldToScreen(tile.tx, tile.ty, layout, viewState);
    if (!insideViewport(point, layout)) continue;
    visible.push({
      ...marker,
      key: `marker:${marker.providerId}:${marker.id}`,
      x: point.x,
      y: point.y,
      ...resolveWorldMapLabelPlacement(point, layout, config),
      pixelsPerTile: point.pixelsPerTile,
      iconFrame: Number.isInteger(marker.iconFrame)
        ? marker.iconFrame
        : config.symbolAtlas.frames.landmark,
      iconSizePx: presentation.iconSizesPx[marker.iconSizeKey]
        || presentation.iconSizesPx.default,
      showLabel: false,
    });
  }

  const acceptedLabels = [];
  const minimumDistanceSquared = presentation.markerLabelMinimumSeparationPx ** 2;
  const ordered = [...visible].sort((a, b) => (b.priority || 0) - (a.priority || 0));
  for (const marker of ordered) {
    if (!marker.label) continue;
    if (
      marker.forceLabel !== true
      && marker.pixelsPerTile < presentation.markerLabelMinimumPixelsPerTile
    ) {
      continue;
    }
    if (acceptedLabels.some(other => squaredDistance(marker, other) < minimumDistanceSquared)) {
      continue;
    }
    marker.showLabel = true;
    acceptedLabels.push(marker);
    if (acceptedLabels.length >= presentation.maxMarkerLabels) break;
  }

  const labelKeys = new Set(acceptedLabels.map(marker => marker.key));
  return visible
    .map(marker => ({ ...marker, showLabel: labelKeys.has(marker.key) }))
    .sort((a, b) => (a.priority || 0) - (b.priority || 0));
}

export function resolveWorldMapBiomeLabels({
  discoverySystem,
  layout,
  viewState,
  worldToScreen,
  enabled,
  avoidPoints = [],
  config = WORLD_MAP_CONFIG,
  field = LEVEL_ONE_BIOME_FIELD,
}) {
  if (!enabled) return [];
  const presentation = config.annotations;
  const samplePoint = worldToScreen(field.bounds.leftTile, field.bounds.topTile, layout, viewState);
  if (samplePoint.pixelsPerTile < presentation.biomeLabelMinimumPixelsPerTile) return [];
  const viewportCenter = {
    x: layout.x + layout.width * 0.5,
    y: layout.y + layout.height * 0.5,
  };
  const nearestByProfile = new Map();

  const cellSize = config.discovery.cellSizeTiles;
  for (const { cellX, cellY } of discoverySystem.getDiscoveredCells()) {
    const tileX = cellX * cellSize + cellSize * 0.5;
    const tileY = cellY * cellSize + cellSize * 0.5;
    const profile = resolveLevelOneBiomeFieldAtTile(tileX, tileY, field);
    if (!profile) continue;
    const sourcePoint = worldToScreen(tileX, tileY, layout, viewState);
    const point = {
      ...sourcePoint,
      y: sourcePoint.y + presentation.biomeLabelOffsetYPx,
    };
    if (!insideViewport(point, layout, presentation.biomeLabelViewportInsetPx)) continue;
    const candidate = {
      key: `biome:${profile.id}`,
      x: point.x,
      y: point.y,
      label: profile.label.toUpperCase(),
      color: profile.mapColor,
      distance: squaredDistance(point, viewportCenter),
    };
    const current = nearestByProfile.get(profile.id);
    if (!current || candidate.distance < current.distance) {
      nearestByProfile.set(profile.id, candidate);
    }
  }

  const accepted = [];
  const minimumDistanceSquared = presentation.biomeLabelMinimumSeparationPx ** 2;
  const candidates = [...nearestByProfile.values()].sort((a, b) => a.distance - b.distance);
  for (const candidate of candidates) {
    const markerCollisionSquared = presentation.biomeMarkerLabelSeparationPx ** 2;
    if (avoidPoints.some(point => squaredDistance(candidate, point) < markerCollisionSquared)) {
      continue;
    }
    if (accepted.some(other => squaredDistance(candidate, other) < minimumDistanceSquared)) continue;
    accepted.push(candidate);
    if (accepted.length >= presentation.maxBiomeLabels) break;
  }
  return accepted;
}
