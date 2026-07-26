import { CAVE_GAMEPLAY_CONFIG } from "../../values/caveGameplay.js";
import { hash01, hashUint } from "../../values/deterministicMath.js";
import { TILE_TYPES } from "../../values/tileTypes.js";

function isNearEntrance(zone, tx, clearance) {
  const entranceXs = (zone.entranceSides || []).map(side => (
    Math.round(zone.cx + (side === "right" ? zone.rx : -zone.rx))
  ));
  if (zone.entry?.tx !== undefined) entranceXs.push(zone.entry.tx);
  return entranceXs.some(entryX => Math.abs(entryX - tx) <= clearance);
}

function collectOpenColumns(worldModel, zone, config) {
  const columns = [];
  const minX = Math.ceil(zone.cx - zone.rx + config.placementEdgeMarginTiles);
  const maxX = Math.floor(zone.cx + zone.rx - config.placementEdgeMarginTiles);
  for (let tx = minX; tx <= maxX; tx += 1) {
    if (isNearEntrance(zone, tx, config.entranceClearanceTiles)) continue;
    const minY = Math.floor(zone.cy - zone.ry);
    const maxY = Math.ceil(zone.cy + zone.ry);
    let ceilingY = null;
    for (let ty = minY; ty <= maxY + 1; ty += 1) {
      const isAir = ty <= maxY && worldModel.getTileType(tx, ty) === TILE_TYPES.AIR;
      if (isAir && ceilingY === null) {
        ceilingY = ty;
        continue;
      }
      if (isAir || ceilingY === null) continue;
      const floorY = ty;
      const openHeightTiles = floorY - ceilingY;
      if (
        worldModel.isSolid(tx, floorY)
        && openHeightTiles >= config.minimumOpenHeightTiles
      ) {
        columns.push({ tx, ceilingY, floorY, openHeightTiles });
      }
      ceilingY = null;
    }
  }
  return columns;
}

function findCheckpoint(columns, startTx, direction, floorY, config) {
  const checkpointTx = startTx + direction * config.checkpointOffsetTiles;
  const column = columns.find(entry => (
    entry.tx === checkpointTx && entry.floorY === floorY
  ));
  return column ? { tx: column.tx, ty: column.floorY - 1 } : null;
}

function resolveHazardKind(profile, column, zone, hazardIndex, config, salts) {
  const kinds = profile.preferredKinds;
  const index = Math.min(
    kinds.length - 1,
    Math.floor(hash01(zone.visualSeed, hazardIndex, zone.cx, salts.hazardKind) * kinds.length),
  );
  const preferred = kinds[index];
  if (
    (preferred === "spike-run" || preferred === "ember-vent")
    && column.openHeightTiles < config.tallHazardMinimumOpenHeightTiles
  ) {
    return "timed-gate";
  }
  return preferred;
}

function buildHazard(zone, columns, column, kind, hazardIndex, gameplayConfig) {
  const config = gameplayConfig.hazards;
  const timing = config.timings[kind];
  const profile = config.profiles[zone.archetypeId];
  let startTx = column.tx;
  let endTx = column.tx;
  if (kind === "spike-run") {
    const widthRange = config.spikeRunMaximumWidthTiles - config.spikeRunMinimumWidthTiles + 1;
    const width = config.spikeRunMinimumWidthTiles + Math.floor(
      hash01(zone.visualSeed, hazardIndex, zone.cy, gameplayConfig.salts.hazardPosition)
        * widthRange,
    );
    endTx = startTx + width - 1;
    const span = [];
    for (let tx = startTx; tx <= endTx; tx += 1) {
      const matching = columns.find(entry => (
        entry.tx === tx && entry.floorY === column.floorY
      ));
      if (matching) span.push(matching);
    }
    if (span.length !== width) return null;
  }
  const leftCheckpoint = findCheckpoint(columns, startTx, -1, column.floorY, config);
  const rightCheckpoint = findCheckpoint(columns, endTx, 1, column.floorY, config);
  if (!leftCheckpoint || !rightCheckpoint) return null;
  const phaseMs = Math.floor(
    hash01(zone.visualSeed, hazardIndex, zone.cy, gameplayConfig.salts.hazardPhase)
      * timing.periodMs,
  );
  return {
    id: `${zone.id}:hazard-${hazardIndex + 1}`,
    source: config.source,
    caveId: zone.id,
    archetypeId: zone.archetypeId,
    kind,
    label: profile.label,
    hint: profile.hint,
    color: profile.color,
    glowColor: profile.glowColor,
    startTx,
    endTx,
    centerTx: (startTx + endTx) / 2,
    ceilingY: column.ceilingY,
    floorY: column.floorY,
    leftCheckpoint,
    rightCheckpoint,
    periodMs: timing.periodMs,
    activeMs: timing.activeMs,
    telegraphMs: timing.telegraphMs,
    static: timing.static,
    phaseMs,
  };
}

export function planCaveHazards(worldModel, zone, gameplayConfig = CAVE_GAMEPLAY_CONFIG) {
  const config = gameplayConfig.hazards;
  zone.hazards = [];
  if (!config.enabled || zone.standaloneScene || zone.rx < config.minimumRadiusX) return [];
  const depth = Math.max(0, zone.cy - worldModel.topAirRows);
  const chance = Math.min(
    config.maximumChance,
    config.baseChance + depth / 1000 * config.depthChancePerThousandTiles,
  );
  const guaranteed = config.featuredChallengesGuaranteed && zone.featuredChallenge === true;
  if (
    !guaranteed
    && hash01(zone.visualSeed, zone.cx, zone.cy, gameplayConfig.salts.hazardChance) >= chance
  ) {
    return [];
  }
  const profile = config.profiles[zone.archetypeId];
  if (!profile) return [];
  const columns = collectOpenColumns(worldModel, zone, config);
  columns.sort((a, b) => (
    hashUint(zone.visualSeed, a.tx, zone.cy, gameplayConfig.salts.hazardPosition)
    - hashUint(zone.visualSeed, b.tx, zone.cy, gameplayConfig.salts.hazardPosition)
  ));
  const wantsSecond = zone.rx >= config.secondHazardMinimumRadiusX
    && hash01(zone.visualSeed, zone.rx, zone.cy, gameplayConfig.salts.hazardChance + 1)
      < config.secondHazardChance;
  const targetCount = Math.min(config.maximumPerCave, wantsSecond ? 2 : 1);
  for (const column of columns) {
    if (zone.hazards.length >= targetCount) break;
    if (zone.hazards.some(hazard => (
      Math.abs(hazard.centerTx - column.tx) < config.minimumHazardSpacingTiles
    ))) continue;
    const hazardIndex = zone.hazards.length;
    const kind = resolveHazardKind(
      profile,
      column,
      zone,
      hazardIndex,
      config,
      gameplayConfig.salts,
    );
    const hazard = buildHazard(
      zone,
      columns,
      column,
      kind,
      hazardIndex,
      gameplayConfig,
    );
    if (hazard) zone.hazards.push(hazard);
  }
  return zone.hazards;
}
