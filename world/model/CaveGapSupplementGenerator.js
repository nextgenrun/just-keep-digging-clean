import { SECOND_WORLD_CONFIG } from "../../values/secondWorldConfig.js";
import { hash01, isInsideEllipse } from "../../values/deterministicMath.js";
import { RESOURCE_TILE_TYPE_VALUES } from "../../values/resourceTypes.js";
import { TILE_TYPES } from "../../values/tileTypes.js";
import { WORLD_GEN_CONFIG } from "../../values/worldGen.js";
import {
  applyCaveFeatures,
  attachCaveIdentity,
  isCaveZoneStructurallyLive,
} from "./CaveIdentityPlanner.js";

const RESOURCE_TYPES = new Set(RESOURCE_TILE_TYPE_VALUES);
const GAP_SALT = 0x5a17c3e9;

function markTripleRuns(mask, runs) {
  const source = Array.isArray(runs) ? runs : [];
  for (let index = 0; index < source.length; index += 3) {
    const start = source[index];
    const length = source[index + 1];
    if (!Number.isInteger(start) || !Number.isInteger(length)) continue;
    const end = Math.min(mask.length, start + length);
    for (let cursor = Math.max(0, start); cursor < end; cursor += 1) mask[cursor] = 1;
  }
}

function markPairRuns(mask, runs) {
  const source = Array.isArray(runs) ? runs : [];
  for (let index = 0; index < source.length; index += 2) {
    const start = source[index];
    const length = source[index + 1];
    if (!Number.isInteger(start) || !Number.isInteger(length)) continue;
    const end = Math.min(mask.length, start + length);
    for (let cursor = Math.max(0, start); cursor < end; cursor += 1) mask[cursor] = 1;
  }
}

export function buildCaveProtectedCellMask(
  worldModel,
  tiledOverride,
  secondWorldConfig = SECOND_WORLD_CONFIG,
) {
  const mask = new Uint8Array(worldModel.widthTiles * worldModel.depthTiles);
  markTripleRuns(mask, tiledOverride?.runs);
  markPairRuns(mask, tiledOverride?.secondWorldArea?.runs);

  const runtimeArea = secondWorldConfig.runtimeArea;
  const startY = Math.max(0, runtimeArea.extensionStartTileY);
  for (let ty = startY; ty < worldModel.depthTiles; ty += 1) {
    for (let tx = runtimeArea.leftTile; tx <= runtimeArea.rightTile; tx += 1) {
      if (worldModel.inBounds(tx, ty)) mask[worldModel.index(tx, ty)] = 1;
    }
  }
  return mask;
}

function isUnprotectedResource(worldModel, protectedMask, tx, ty) {
  return worldModel.inBounds(tx, ty)
    && !protectedMask[worldModel.index(tx, ty)]
    && RESOURCE_TYPES.has(worldModel.getTileType(tx, ty));
}

function isPassableTravelCell(worldModel, protectedMask, tx, ty) {
  if (!worldModel.inBounds(tx, ty)) return false;
  const index = worldModel.index(tx, ty);
  if (protectedMask[index]) return worldModel.getTileType(tx, ty) === TILE_TYPES.AIR;
  return RESOURCE_TYPES.has(worldModel.getTileType(tx, ty));
}

function travelLaneIsAvailable(worldModel, protectedMask, zone) {
  for (let tx = zone.cx - zone.rx; tx <= zone.cx + zone.rx; tx += 1) {
    if (!isPassableTravelCell(worldModel, protectedMask, tx, zone.cy)) return false;
  }
  for (const side of zone.entranceSides) {
    const direction = side === "right" ? 1 : -1;
    const innerX = zone.cx + direction * zone.rx;
    const outerX = zone.cx + direction * (zone.rx + zone.wallThickness);
    for (let tx = Math.min(innerX, outerX); tx <= Math.max(innerX, outerX); tx += 1) {
      if (!isPassableTravelCell(worldModel, protectedMask, tx, zone.cy)) return false;
    }
  }
  const shellOffset = zone.ry + zone.wallThickness;
  return isUnprotectedResource(worldModel, protectedMask, zone.cx, zone.cy - shellOffset)
    || isUnprotectedResource(worldModel, protectedMask, zone.cx, zone.cy + shellOffset);
}

function isSpacedFromCaves(zone, caves, config) {
  return caves.every(existing => (
    Math.abs(zone.cx - existing.cx)
      > zone.rx + existing.rx + config.horizontalSpacingTiles
    || Math.abs(zone.cy - existing.cy)
      > zone.ry + existing.ry + config.verticalSpacingTiles
  ));
}


function carveGapCave(worldModel, protectedMask, zone) {
  const wallRx = zone.rx + zone.wallThickness;
  const wallRy = zone.ry + zone.wallThickness;
  for (let ty = zone.cy - wallRy; ty <= zone.cy + wallRy; ty += 1) {
    for (let tx = zone.cx - wallRx; tx <= zone.cx + wallRx; tx += 1) {
      if (!worldModel.inBounds(tx, ty)) continue;
      if (protectedMask[worldModel.index(tx, ty)]) continue;
      if (!RESOURCE_TYPES.has(worldModel.getTileType(tx, ty))) continue;
      if (!isInsideEllipse(tx, ty, zone.cx, zone.cy, wallRx, wallRy)) continue;
      const inside = isInsideEllipse(tx, ty, zone.cx, zone.cy, zone.rx, zone.ry);
      if (inside) worldModel.setTile(tx, ty, TILE_TYPES.AIR, 0);
    }
  }

  for (const side of zone.entranceSides) {
    const direction = side === "right" ? 1 : -1;
    const outerX = zone.cx + direction * wallRx;
    const innerX = zone.cx + direction * zone.rx;
    for (let tx = Math.min(outerX, innerX); tx <= Math.max(outerX, innerX); tx += 1) {
      if (!protectedMask[worldModel.index(tx, zone.cy)]) {
        worldModel.setTile(tx, zone.cy, TILE_TYPES.AIR, 0);
      }
    }
    if (!zone.entry) {
      zone.entry = { tx: innerX, ty: zone.cy };
      zone.mouthAnchor = { tx: outerX, ty: zone.cy };
      zone.entrySide = side;
    }
  }

  applyCaveFeatures(worldModel, zone);
}

function makeCandidate(worldModel, band, attempt, config, featuredChallenge = false) {
  const minY = Math.max(
    worldModel.topAirRows + band.minDepth,
    worldModel.topAirRows + 2,
  );
  const maxY = Math.min(
    worldModel.topAirRows + band.maxDepth,
    worldModel.depthTiles - 4,
  );
  const radiusRoll = hash01(worldModel.config.seed, attempt, band.minDepth, GAP_SALT);
  const radiusMin = featuredChallenge
    ? Math.max(config.radiusXMin, config.featuredRadiusXMin || config.radiusXMin)
    : config.radiusXMin;
  const radiusCurve = featuredChallenge ? radiusRoll : radiusRoll * radiusRoll;
  const rx = radiusMin + Math.floor(
    radiusCurve * (config.radiusXMax - radiusMin + 1),
  );
  const ry = config.radiusY;
  const wallRx = rx + config.wallThickness;
  const minX = wallRx + 1;
  const maxX = worldModel.widthTiles - wallRx - 2;
  const cx = minX + Math.floor(
    hash01(worldModel.config.seed, attempt, band.maxDepth, GAP_SALT + 1)
      * Math.max(1, maxX - minX + 1),
  );
  const cy = minY + Math.floor(
    hash01(worldModel.config.seed, attempt, band.minDepth, GAP_SALT + 2)
      * Math.max(1, maxY - minY + 1),
  );
  const entranceRoll = hash01(worldModel.config.seed, cx, cy, GAP_SALT + 3);
  const firstSide = entranceRoll < 0.5 ? "left" : "right";
  const hasSecondSide = rx >= 9
    && hash01(worldModel.config.seed, cx, cy, GAP_SALT + 4) < 0.34;

  return {
    id: "",
    source: "authored-gap",
    cx,
    cy,
    rx,
    ry,
    wallThickness: config.wallThickness,
    standaloneScene: false,
    featuredChallenge,
    entranceSides: [
      firstSide,
      ...(hasSecondSide ? [firstSide === "left" ? "right" : "left"] : []),
    ],
  };
}

export function supplementAuthoredCaveGaps(
  worldModel,
  tiledOverride,
  config = WORLD_GEN_CONFIG.caves.authoredGapSupplement,
) {
  if (!config?.enabled || !Array.isArray(config.bands)) {
    return { added: 0, bands: {} };
  }

  const protectedMask = buildCaveProtectedCellMask(worldModel, tiledOverride);
  const liveCaves = (worldModel.caveZones || [])
    .filter(zone => (
      isCaveZoneStructurallyLive(worldModel, zone)
      && !protectedMask[worldModel.index(zone.cx, zone.cy)]
    ));
  const bandResults = {};
  let totalAdded = 0;

  for (const band of config.bands) {
    const existingInBand = liveCaves.filter(zone => {
      const depth = zone.cy - worldModel.topAirRows;
      return depth >= band.minDepth && depth <= band.maxDepth;
    }).length;
    const needed = Math.max(0, band.targetCaves - existingInBand);
    let addedInBand = 0;
    let featuredPlaced = false;

    for (
      let attempt = 0;
      attempt < config.placementAttemptsPerBand && addedInBand < needed;
      attempt += 1
    ) {
      const featuredAttempt = !featuredPlaced
        && attempt < config.featuredPlacementAttemptsPerBand;
      const candidate = makeCandidate(
        worldModel,
        band,
        attempt + totalAdded * config.placementAttemptsPerBand,
        config,
        featuredAttempt,
      );
      if (!isSpacedFromCaves(candidate, liveCaves, config)) continue;
      if (!travelLaneIsAvailable(worldModel, protectedMask, candidate)) continue;

      candidate.id = `cave-gap-${band.id}-${addedInBand + 1}`;
      attachCaveIdentity(
        candidate,
        worldModel.config.seed || 133742,
        worldModel.topAirRows,
        undefined,
        addedInBand === 0 ? band.featuredArchetypeId : null,
      );
      worldModel.caveZones.push(candidate);
      carveGapCave(worldModel, protectedMask, candidate);
      liveCaves.push(candidate);
      featuredPlaced ||= featuredAttempt;
      addedInBand += 1;
      totalAdded += 1;
    }
    bandResults[band.id] = { existing: existingInBand, added: addedInBand, target: band.targetCaves };
  }

  return { added: totalAdded, bands: bandResults };
}
