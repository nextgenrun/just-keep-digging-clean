import { CAVE_GAMEPLAY_CONFIG } from "../../values/caveGameplay.js";
import { hash01, hashUint } from "../../values/deterministicMath.js";
import { RESOURCE_TILE_TYPE_VALUES } from "../../values/resourceTypes.js";
import { TILE_TYPES } from "../../values/tileTypes.js";
import { WORLD_GEN_CONFIG } from "../../values/worldGen.js";

const RESOURCE_TYPES = new Set(RESOURCE_TILE_TYPE_VALUES);

function isAuthoredCell(worldModel, tx, ty) {
  return worldModel.authoredTileMask?.[worldModel.index(tx, ty)] === 1;
}

function isNearEntrance(zone, tx, clearance) {
  const entranceXs = (zone.entranceSides || []).map(side => (
    Math.round(zone.cx + (side === "right" ? zone.rx : -zone.rx))
  ));
  if (zone.entry?.tx !== undefined) entranceXs.push(zone.entry.tx);
  return entranceXs.some(entryX => Math.abs(entryX - tx) <= clearance);
}

function collectBoundaryCandidates(worldModel, zone, config) {
  const candidates = [];
  const wallRx = Math.ceil(zone.rx + zone.wallThickness);
  const wallRy = Math.ceil(zone.ry + zone.wallThickness);
  for (let ty = zone.cy - wallRy; ty <= zone.cy + wallRy; ty += 1) {
    for (let tx = zone.cx - wallRx; tx <= zone.cx + wallRx; tx += 1) {
      if (!worldModel.inBounds(tx, ty) || isAuthoredCell(worldModel, tx, ty)) continue;
      if (config.preserveCenterTravelLane && ty === Math.round(zone.cy)) continue;
      if (isNearEntrance(zone, tx, config.entranceClearanceTiles)) continue;
      const currentType = worldModel.getTileType(tx, ty);
      if (currentType !== TILE_TYPES.CAVE_WALL && !RESOURCE_TYPES.has(currentType)) continue;
      const touchesAir = [
        [tx - 1, ty],
        [tx + 1, ty],
        [tx, ty - 1],
        [tx, ty + 1],
      ].some(([nx, ny]) => worldModel.getTileType(nx, ny) === TILE_TYPES.AIR);
      if (!touchesAir) continue;
      candidates.push({
        tx,
        ty,
        side: ty < zone.cy ? "ceiling" : "floor",
      });
    }
  }
  return candidates;
}

function getDepthPool(depth, config) {
  return config.depthPools.find(pool => depth < pool.maxDepthExclusive)
    || config.depthPools[config.depthPools.length - 1];
}

function pickResourceType(zone, blockIndex, depth, config, salts) {
  const pool = getDepthPool(depth, config);
  const biases = new Set(config.archetypeBiases[zone.archetypeId] || []);
  const weighted = pool.entries
    .filter(entry => (
      TILE_TYPES[entry.tileTypeKey] !== TILE_TYPES.GOLD
      || depth >= WORLD_GEN_CONFIG.terrain.goldMinDepth
    ))
    .map(entry => ({
      ...entry,
      weight: entry.weight * (biases.has(entry.tileTypeKey) ? config.archetypeBiasWeight : 1),
    }));
  if (!weighted.length) return TILE_TYPES.DIRT;
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = hash01(zone.visualSeed, blockIndex, zone.cy, salts.seamType) * total;
  for (const entry of weighted) {
    cursor -= entry.weight;
    if (cursor <= 0) return TILE_TYPES[entry.tileTypeKey];
  }
  return TILE_TYPES[weighted[weighted.length - 1].tileTypeKey];
}

function chooseFormationBlocks(zone, candidates, targetCount, config, salts) {
  const formationCount = zone.rx >= config.largeCaveRadiusX
    ? config.largeCaveFormationCount
    : 1;
  const selected = [];
  const used = new Set();
  const anchors = [];

  for (let formationIndex = 0; formationIndex < formationCount; formationIndex += 1) {
    const available = candidates.filter(candidate => (
      !used.has(`${candidate.tx},${candidate.ty}`)
      && anchors.every(anchor => (
        Math.abs(anchor.tx - candidate.tx) >= config.minimumFormationSeparationTiles
        || anchor.side !== candidate.side
      ))
    ));
    if (!available.length) continue;
    available.sort((a, b) => (
      hashUint(zone.visualSeed, a.tx, a.ty, salts.seamCandidate + formationIndex)
      - hashUint(zone.visualSeed, b.tx, b.ty, salts.seamCandidate + formationIndex)
    ));
    const anchor = available[0];
    anchors.push(anchor);
    const quota = Math.ceil((targetCount - selected.length) / (formationCount - formationIndex));
    const cluster = candidates
      .filter(candidate => (
        !used.has(`${candidate.tx},${candidate.ty}`)
        && candidate.side === anchor.side
        && Math.abs(candidate.tx - anchor.tx) <= config.clusterSearchTiles
        && Math.abs(candidate.ty - anchor.ty) <= 1
      ))
      .sort((a, b) => (
        Math.abs(a.tx - anchor.tx) + Math.abs(a.ty - anchor.ty)
        - Math.abs(b.tx - anchor.tx) - Math.abs(b.ty - anchor.ty)
      ));
    for (const candidate of cluster.slice(0, quota)) {
      used.add(`${candidate.tx},${candidate.ty}`);
      selected.push({ ...candidate, formationIndex });
    }
  }
  return selected.slice(0, targetCount);
}

export function applyCaveResourceSeams(
  worldModel,
  zone,
  gameplayConfig = CAVE_GAMEPLAY_CONFIG,
) {
  const config = gameplayConfig.resourceSeams;
  zone.resourceSeams = [];
  if (!config.enabled || zone.standaloneScene || zone.rx < config.minimumRadiusX) return [];
  const candidates = collectBoundaryCandidates(worldModel, zone, config);
  const targetCount = Math.min(
    config.maximumBlocks,
    Math.max(config.minimumBlocks, Math.ceil(zone.rx / config.blocksPerRadiusTiles)),
    candidates.length,
  );
  const selected = chooseFormationBlocks(
    zone,
    candidates,
    targetCount,
    config,
    gameplayConfig.salts,
  );
  selected.forEach((candidate, blockIndex) => {
    const depth = Math.max(0, candidate.ty - worldModel.topAirRows);
    const tileType = pickResourceType(
      zone,
      blockIndex,
      depth,
      config,
      gameplayConfig.salts,
    );
    worldModel.setTile(
      candidate.tx,
      candidate.ty,
      tileType,
      worldModel.getTileMaxHp(candidate.tx, candidate.ty, tileType),
    );
    zone.resourceSeams.push({
      ...candidate,
      tileType,
      caveId: zone.id,
      source: config.source,
    });
  });
  return zone.resourceSeams;
}
