import { SECOND_WORLD_CONFIG } from "../../values/secondWorldConfig.js";
import { TILE_TYPES } from "../../values/tileTypes.js";
import { hash01, isInsideEllipse } from "../../values/deterministicMath.js";
import {
  GAMEPLAY_FEATURE_IDS,
  isGameplayFeatureEnabled,
} from "../../values/gameplayDevFlags.js";
import { WORLD_DEPTH_CONFIG } from "../../values/worldDepthConfig.js";

function randomInt(seed, salt, min, max) {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return lo + Math.floor(hash01(seed, salt, 991) * (hi - lo + 1));
}

function chooseWeightedTile(seed, salt, entries) {
  const totalWeight = entries.reduce((sum, entry) => sum + Math.max(0, entry.weight || 0), 0);
  if (totalWeight <= 0) return TILE_TYPES.LAVA_DIRT;

  let roll = hash01(seed, salt, 2039) * totalWeight;
  for (const entry of entries) {
    roll -= Math.max(0, entry.weight || 0);
    if (roll <= 0) return entry.type;
  }
  return entries[entries.length - 1]?.type || TILE_TYPES.LAVA_DIRT;
}

function markMaskCell(mask, worldModel, tx, ty, state) {
  if (!worldModel.inBounds(tx, ty)) return;
  const idx = worldModel.index(tx, ty);
  if (mask[idx]) return;
  mask[idx] = 1;
  state.cellCount += 1;
  state.minX = Math.min(state.minX, tx);
  state.minY = Math.min(state.minY, ty);
  state.maxX = Math.max(state.maxX, tx);
  state.maxY = Math.max(state.maxY, ty);
}

function buildMask(worldModel, area, config) {
  const mask = new Uint8Array(worldModel.tileType.length);
  const state = {
    cellCount: 0,
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  };

  const runs = Array.isArray(area?.runs) ? area.runs : [];
  for (let i = 0; i < runs.length; i += 2) {
    const startIndex = runs[i];
    const runLength = runs[i + 1];
    if (!Number.isInteger(startIndex) || !Number.isInteger(runLength) || runLength <= 0) continue;

    for (let offset = 0; offset < runLength; offset += 1) {
      const idx = startIndex + offset;
      if (idx < 0 || idx >= mask.length || mask[idx]) continue;
      const tx = idx % worldModel.width;
      const ty = Math.floor(idx / worldModel.width);
      markMaskCell(mask, worldModel, tx, ty, state);
    }
  }

  const runtimeArea = config.runtimeArea;
  const extensionStartY = Math.max(config.entry.floorY + 1, runtimeArea.extensionStartTileY);
  for (let ty = extensionStartY; ty < worldModel.depthTiles; ty += 1) {
    for (let tx = runtimeArea.leftTile; tx <= runtimeArea.rightTile; tx += 1) {
      markMaskCell(mask, worldModel, tx, ty, state);
    }
  }

  const targetBounds = area?.targetBounds || {};
  const bounds = state.cellCount > 0
    ? {
        x: state.minX,
        y: state.minY,
        width: state.maxX - state.minX + 1,
        height: state.maxY - state.minY + 1,
      }
    : null;

  return { mask, bounds, cellCount: state.cellCount };
}

function setGeneratedTile(worldModel, tx, ty, type, hp = null) {
  if (!worldModel.inBounds(tx, ty)) return;
  const idx = worldModel.index(tx, ty);
  const nextHp = hp === null ? worldModel.getTileMaxHp(tx, ty, type) : hp;
  worldModel.setTile(tx, ty, type, nextHp);
  worldModel.skyTileOriginalType[idx] = 0;
  worldModel.skyTileRarity[idx] = 0;
  worldModel.skyTileIdentity[idx] = 0;
}

function interpolate(top, bottom, progress) {
  return top + (bottom - top) * Math.max(0, Math.min(1, progress));
}

function resolveNodeTiles(generation, depthBias, depthEconomyEnabled) {
  if (!depthEconomyEnabled || !Array.isArray(generation.nodeTilesDeep)) {
    return generation.nodeTiles;
  }
  return generation.nodeTiles.map(entry => {
    const deep = generation.nodeTilesDeep.find(candidate => candidate.type === entry.type);
    return {
      type: entry.type,
      weight: interpolate(entry.weight, deep?.weight ?? entry.weight, depthBias),
    };
  });
}

function chooseBaseTile(worldModel, tx, ty, bounds, config) {
  const floorY = config.entry.floorY;
  const localDepth = Math.max(0, ty - floorY);
  const maxDepth = Math.max(1, bounds.y + bounds.height - floorY);
  const depthBias = Math.min(1, localDepth / maxDepth);
  const roll = hash01(tx, ty, worldModel.config.seed, 4117);

  if (worldModel.config.resourceEconomyEnabled === false) {
    if (roll < 0.018 + depthBias * 0.035) return TILE_TYPES.MAGMA_CRYSTAL;
    if (roll < 0.08 + depthBias * 0.075) return TILE_TYPES.EMBER_ORE;
    if (roll < 0.27 + depthBias * 0.08) return TILE_TYPES.OBSIDIAN;
    if (roll < 0.31 + depthBias * 0.03) return TILE_TYPES.GOLD;
    return chooseWeightedTile(
      worldModel.config.seed,
      tx * 8191 + ty,
      config.generation.baseTiles,
    );
  }

  let threshold = 0;
  for (const entry of config.generation.resourceCurve || []) {
    threshold += interpolate(entry.topChance, entry.bottomChance, depthBias);
    if (roll < threshold) return entry.type;
  }
  return chooseWeightedTile(worldModel.config.seed, tx * 8191 + ty, config.generation.baseTiles);
}

function paintEllipse(worldModel, mask, bounds, cx, cy, rx, ry, painter) {
  const minTy = Math.max(bounds.y, cy - Math.ceil(ry));
  const maxTy = Math.min(bounds.y + bounds.height - 1, cy + Math.ceil(ry));
  const minTx = Math.max(bounds.x, cx - Math.ceil(rx));
  const maxTx = Math.min(bounds.x + bounds.width - 1, cx + Math.ceil(rx));

  for (let ty = minTy; ty <= maxTy; ty += 1) {
    for (let tx = minTx; tx <= maxTx; tx += 1) {
      const idx = worldModel.index(tx, ty);
      if (!mask[idx] || !isInsideEllipse(tx, ty, cx, cy, rx, ry)) continue;
      painter(tx, ty);
    }
  }
}

function paintResourceNodes(worldModel, mask, bounds, config) {
  const seed = worldModel.config.seed;
  const gen = config.generation;
  const count = randomInt(seed, 5101, gen.nodeCountMin, gen.nodeCountMax);
  const floorY = config.entry.floorY;
  let painted = 0;

  for (let i = 0; i < count; i += 1) {
    const cx = bounds.x + randomInt(seed, 5200 + i * 7, 3, Math.max(3, bounds.width - 4));
    const cy = randomInt(seed, 5300 + i * 11, floorY + 5, bounds.y + bounds.height - 3);
    const rx = randomInt(seed, 5400 + i, gen.nodeRadiusXMin, gen.nodeRadiusXMax);
    const ry = randomInt(seed, 5500 + i, gen.nodeRadiusYMin, gen.nodeRadiusYMax);
    const maxDepth = Math.max(1, bounds.y + bounds.height - floorY);
    const depthBias = Math.min(1, Math.max(0, cy - floorY) / maxDepth);
    const type = chooseWeightedTile(
      seed,
      5600 + i,
      resolveNodeTiles(
        gen,
        depthBias,
        worldModel.config.resourceEconomyEnabled !== false,
      ),
    );

    paintEllipse(worldModel, mask, bounds, cx, cy, rx, ry, (tx, ty) => {
      if (ty <= floorY) return;
      setGeneratedTile(worldModel, tx, ty, type);
      painted += 1;
    });
  }

  return painted;
}

function paintCaves(worldModel, mask, bounds, config) {
  const seed = worldModel.config.seed;
  const gen = config.generation;
  const count = randomInt(seed, 6101, gen.caveCountMin, gen.caveCountMax);
  const floorY = config.entry.floorY;
  let carved = 0;

  for (let i = 0; i < count; i += 1) {
    const cx = bounds.x + randomInt(seed, 6200 + i * 13, 5, Math.max(5, bounds.width - 6));
    const cy = randomInt(seed, 6300 + i * 17, floorY + 7, bounds.y + bounds.height - 5);
    const rx = randomInt(seed, 6400 + i, gen.caveRadiusXMin, gen.caveRadiusXMax);
    const ry = randomInt(seed, 6500 + i, gen.caveRadiusYMin, gen.caveRadiusYMax);
    const shellRx = rx + 1;
    const shellRy = ry + 1;

    paintEllipse(worldModel, mask, bounds, cx, cy, shellRx, shellRy, (tx, ty) => {
      if (ty <= floorY) return;
      const inside = isInsideEllipse(tx, ty, cx, cy, rx, ry);
      if (inside) {
        setGeneratedTile(worldModel, tx, ty, TILE_TYPES.AIR, 0);
        carved += 1;
      } else {
        setGeneratedTile(worldModel, tx, ty, TILE_TYPES.OBSIDIAN);
      }
    });

    if (worldModel.getTileType(cx, cy) === TILE_TYPES.AIR) {
      worldModel.caveZones.push({
        id: `second-world-cave-${i + 1}`,
        source: "second-world",
        cx,
        cy,
        rx,
        ry,
        wallThickness: 1,
        shellTileType: TILE_TYPES.OBSIDIAN,
        standaloneScene: false,
        entranceSides: [],
      });
    }
  }

  return carved;
}

function reinforceBounds(worldModel, mask, bounds, config) {
  const minX = bounds.x;
  const maxX = bounds.x + bounds.width - 1;
  const maxY = bounds.y + bounds.height - 1;
  const floorY = config.entry.floorY;

  for (let ty = bounds.y; ty <= maxY; ty += 1) {
    for (const tx of [minX, maxX]) {
      const idx = worldModel.index(tx, ty);
      if (mask[idx] && ty > floorY + 1) setGeneratedTile(worldModel, tx, ty, TILE_TYPES.OBSIDIAN);
    }
  }

  for (let tx = minX; tx <= maxX; tx += 1) {
    const idx = worldModel.index(tx, maxY);
    if (mask[idx]) setGeneratedTile(worldModel, tx, maxY, TILE_TYPES.OBSIDIAN);
  }
}

function paintTeleportAnchors(worldModel, mask, config) {
  const anchors = config.generation.teleportAnchors || [];
  const accessOffsets = config.generation.teleportAccessOffsets || [];
  let teleportTiles = 0;

  for (const anchor of anchors) {
    const tx = anchor?.tx;
    const ty = anchor?.ty;
    if (!Number.isInteger(tx) || !Number.isInteger(ty)) continue;
    if (!worldModel.inBounds(tx, ty) || !mask[worldModel.index(tx, ty)]) continue;
    setGeneratedTile(worldModel, tx, ty, TILE_TYPES.TELEPORT_TILE);
    const accessCells = accessOffsets
      .map(offset => ({ tx: tx + offset.tx, ty: ty + offset.ty }))
      .filter(cell => (
        worldModel.inBounds(cell.tx, cell.ty)
        && mask[worldModel.index(cell.tx, cell.ty)]
      ));
    if (
      accessCells.length > 0
      && !accessCells.some(cell => !worldModel.isSolid(cell.tx, cell.ty))
    ) {
      const accessCell = accessCells[0];
      setGeneratedTile(
        worldModel,
        accessCell.tx,
        accessCell.ty,
        TILE_TYPES.AIR,
        0,
      );
    }
    teleportTiles += 1;
  }

  return teleportTiles;
}

function carveEntry(worldModel, config) {
  const entry = config.entry;
  let floorTiles = 0;
  for (let tx = entry.bridgeStartX; tx <= entry.bridgeEndX; tx += 1) {
    if (!worldModel.inBounds(tx, entry.floorY)) continue;
    for (let yOffset = entry.airRowsAboveFloor; yOffset >= 1; yOffset -= 1) {
      setGeneratedTile(worldModel, tx, entry.floorY - yOffset, TILE_TYPES.AIR, 0);
    }
    setGeneratedTile(worldModel, tx, entry.floorY, TILE_TYPES.FLOOR_TOWN_2, 0);
    floorTiles += 1;
    for (let yOffset = 1; yOffset <= entry.airRowsBelowFloor; yOffset += 1) {
      setGeneratedTile(worldModel, tx, entry.floorY + yOffset, TILE_TYPES.AIR, 0);
    }
  }
  return floorTiles;
}

function paintLevelDivider(worldModel, config) {
  const divider = config.levelDivider || config.undergroundDivider;
  if (!divider || !Number.isInteger(divider.tileX) || !Number.isInteger(divider.topTileY)) return 0;

  let dividerTiles = 0;
  for (let ty = divider.topTileY; ty < worldModel.depthTiles; ty += 1) {
    if (!worldModel.inBounds(divider.tileX, ty)) continue;
    const type = ty === divider.floorTileY ? TILE_TYPES.FLOOR_TOWN_2 : TILE_TYPES.BEDROCK;
    setGeneratedTile(worldModel, divider.tileX, ty, type, 0);
    dividerTiles += 1;
  }
  return dividerTiles;
}

function paintDemoLevelTwoWall(worldModel, config) {
  const tileX = config.runtimeArea.leftTile;
  let wallTiles = 0;
  for (let tileY = 0; tileY < worldModel.depthTiles; tileY += 1) {
    if (!worldModel.inBounds(tileX, tileY)) continue;
    setGeneratedTile(worldModel, tileX, tileY, TILE_TYPES.BEDROCK, 0);
    wallTiles += 1;
  }
  return wallTiles;
}

function paintLevelOneDepthSeal(worldModel, config) {
  const sealTileY = WORLD_DEPTH_CONFIG.levelOneRuntimeDepthTiles;
  let sealTiles = 0;
  for (let tileX = 0; tileX < config.runtimeArea.leftTile; tileX += 1) {
    if (!worldModel.inBounds(tileX, sealTileY)) continue;
    setGeneratedTile(worldModel, tileX, sealTileY, TILE_TYPES.BEDROCK, 0);
    sealTiles += 1;
  }
  return sealTiles;
}

export function applySecondWorldExclusionBoundary(worldModel, config = SECOND_WORLD_CONFIG) {
  return {
    applied: false,
    excluded: true,
    reason: "demo-mode",
    wallTiles: paintDemoLevelTwoWall(worldModel, config),
    depthSealTiles: paintLevelOneDepthSeal(worldModel, config),
  };
}

export function applySecondWorldArea(worldModel, area, config = SECOND_WORLD_CONFIG) {
  if (!isGameplayFeatureEnabled(GAMEPLAY_FEATURE_IDS.LEVEL_TWO)) {
    return applySecondWorldExclusionBoundary(worldModel, config);
  }
  if (!area?.enabled) {
    return { applied: false, reason: "disabled" };
  }

  const { mask, bounds, cellCount } = buildMask(worldModel, area, config);
  if (!bounds || cellCount <= 0) {
    return { applied: false, reason: "empty-mask" };
  }

  const floorY = config.entry.floorY;
  let terrainTiles = 0;
  let floorTiles = 0;

  for (let ty = bounds.y; ty < bounds.y + bounds.height; ty += 1) {
    for (let tx = bounds.x; tx < bounds.x + bounds.width; tx += 1) {
      const idx = worldModel.index(tx, ty);
      if (!mask[idx]) continue;

      if (ty < floorY) {
        setGeneratedTile(worldModel, tx, ty, TILE_TYPES.AIR, 0);
      } else {
        // Keep the Level Two surface mineable; carveEntry restores only the safe bridge floor.
        setGeneratedTile(worldModel, tx, ty, chooseBaseTile(worldModel, tx, ty, bounds, config));
        terrainTiles += 1;
      }
    }
  }

  const nodeTiles = paintResourceNodes(worldModel, mask, bounds, config);
  const caveTiles = paintCaves(worldModel, mask, bounds, config);
  reinforceBounds(worldModel, mask, bounds, config);
  const teleportTiles = paintTeleportAnchors(worldModel, mask, config);
  floorTiles += carveEntry(worldModel, config);

  // The door remains the authored Level 1 -> Level 2 route. The final
  // UndergroundBedrockLayout authority opens only the shared surface-clearance
  // row and resumes this column immediately below it.
  const dividerTiles = paintLevelDivider(worldModel, config);

  return {
    applied: true,
    cells: cellCount,
    terrainTiles,
    floorTiles,
    nodeTiles,
    caveTiles,
    teleportTiles,
    dividerTiles,
    depthMeters: config.runtimeArea.depthMeters,
    bounds,
  };
}
