import { TITAN_DISCOVERY_CONFIG } from "../../values/titanDiscoveries.js";

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function buildOffsets(radius, step) {
  const offsets = [0];
  for (let distance = step; distance <= radius; distance += step) {
    offsets.push(distance, -distance);
  }
  return offsets;
}

function overlapsExisting(candidate, zones, padding) {
  return zones.some(zone => !(
    candidate.rightExclusive + padding <= zone.left
    || candidate.left >= zone.rightExclusive + padding
    || candidate.bottomExclusive + padding <= zone.top
    || candidate.top >= zone.bottomExclusive + padding
  ));
}

function inspectCandidate(worldModel, definition, centerX, centerY, searchConfig) {
  const width = definition.zoneWidthTiles;
  const height = definition.zoneHeightTiles;
  const minimumLeft = searchConfig.worldEdgeMarginTiles;
  const maximumLeft = worldModel.width - width - searchConfig.worldEdgeMarginTiles;
  const minimumTop = worldModel.topAirRows + 1;
  const maximumTop = worldModel.depth - height - searchConfig.worldEdgeMarginTiles;
  const left = clamp(Math.round(centerX - width / 2), minimumLeft, maximumLeft);
  const top = clamp(Math.round(centerY - height / 2), minimumTop, maximumTop);
  const cells = [];

  for (let ty = top; ty < top + height; ty += 1) {
    for (let tx = left; tx < left + width; tx += 1) {
      if (worldModel.isDiggable(tx, ty)) cells.push(Object.freeze({ tx, ty }));
    }
  }

  return {
    definition,
    left,
    top,
    rightExclusive: left + width,
    bottomExclusive: top + height,
    centerXTile: left + width / 2,
    centerYTile: top + height / 2,
    cells,
    searchDistance: (
      Math.abs(centerX - definition.preferredXTile)
      + Math.abs(centerY - (worldModel.topAirRows + definition.preferredDepthTiles))
    ),
  };
}

function chooseZone(worldModel, definition, existingZones, searchConfig) {
  const xOffsets = buildOffsets(
    searchConfig.horizontalRadiusTiles,
    searchConfig.stepTiles
  );
  const yOffsets = buildOffsets(
    searchConfig.verticalRadiusTiles,
    searchConfig.stepTiles
  );
  const preferredY = worldModel.topAirRows + definition.preferredDepthTiles;
  let best = null;

  for (const yOffset of yOffsets) {
    for (const xOffset of xOffsets) {
      const candidate = inspectCandidate(
        worldModel,
        definition,
        definition.preferredXTile + xOffset,
        preferredY + yOffset,
        searchConfig
      );
      if (overlapsExisting(candidate, existingZones, searchConfig.overlapPaddingTiles)) continue;
      if (
        !best
        || candidate.cells.length > best.cells.length
        || (
          candidate.cells.length === best.cells.length
          && candidate.searchDistance < best.searchDistance
        )
      ) {
        best = candidate;
      }
      if (
        candidate.cells.length === definition.zoneWidthTiles * definition.zoneHeightTiles
        && candidate.searchDistance === 0
      ) {
        return candidate;
      }
    }
  }
  return best;
}

export function buildTitanDiscoveryZones(
  worldModel,
  config = TITAN_DISCOVERY_CONFIG
) {
  if (!worldModel) return [];
  const zones = [];

  for (const definition of config.definitions) {
    const candidate = chooseZone(worldModel, definition, zones, config.zoneSearch);
    if (!candidate || candidate.cells.length < config.zoneSearch.minimumTrackedTiles) {
      continue;
    }
    zones.push(Object.freeze({
      ...candidate,
      cells: Object.freeze(candidate.cells),
    }));
  }
  return Object.freeze(zones);
}
