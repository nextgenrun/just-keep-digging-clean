import { SECOND_WORLD_CONFIG } from "../../values/secondWorldConfig.js";
import { TILE_TYPES } from "../../values/tileTypes.js";

function hashUint(a, b, c, d = 0) {
  let value = Math.imul(a | 0, 0x1f123bb5) ^ Math.imul(b | 0, 0x5f356495);
  value ^= Math.imul(c | 0, 0x6c8e9cf5) ^ Math.imul(d | 0, 0x27d4eb2d);
  value = Math.imul(value ^ (value >>> 15), 0x2c1b3c6d);
  value = Math.imul(value ^ (value >>> 12), 0x297a2d39);
  return (value ^ (value >>> 15)) >>> 0;
}

function hash01(a, b, c, d = 0) {
  return hashUint(a, b, c, d) / 0x100000000;
}

function randomInt(seed, salt, min, max) {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return lo + Math.floor(hash01(seed, salt, 991) * (hi - lo + 1));
}

function isInsideEllipse(tx, ty, cx, cy, rx, ry) {
  const nx = (tx - cx) / Math.max(1, rx);
  const ny = (ty - cy) / Math.max(1, ry);
  return nx * nx + ny * ny <= 1;
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

function buildMask(worldModel, area) {
  const mask = new Uint8Array(worldModel.tileType.length);
  let cellCount = 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

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
      mask[idx] = 1;
      cellCount += 1;
      minX = Math.min(minX, tx);
      minY = Math.min(minY, ty);
      maxX = Math.max(maxX, tx);
      maxY = Math.max(maxY, ty);
    }
  }

  const targetBounds = area?.targetBounds || {};
  const bounds = cellCount > 0
    ? {
        x: Number.isInteger(targetBounds.x) ? targetBounds.x : minX,
        y: Number.isInteger(targetBounds.y) ? targetBounds.y : minY,
        width: Number.isInteger(targetBounds.width) ? targetBounds.width : maxX - minX + 1,
        height: Number.isInteger(targetBounds.height) ? targetBounds.height : maxY - minY + 1,
      }
    : null;

  return { mask, bounds, cellCount };
}

function setGeneratedTile(worldModel, tx, ty, type, hp = null) {
  if (!worldModel.inBounds(tx, ty)) return;
  const idx = worldModel.index(tx, ty);
  const nextHp = hp === null ? worldModel.getTileMaxHp(tx, ty, type) : hp;
  worldModel.setTile(tx, ty, type, nextHp);
  worldModel.skyTileOriginalType[idx] = 0;
  worldModel.skyTileRarity[idx] = 0;
  worldModel.rootOverlay[idx] = 0;
}

function chooseBaseTile(worldModel, tx, ty, bounds, config) {
  const floorY = config.entry.floorY;
  const localDepth = Math.max(0, ty - floorY);
  const maxDepth = Math.max(1, bounds.y + bounds.height - floorY);
  const depthBias = Math.min(1, localDepth / maxDepth);
  const roll = hash01(tx, ty, worldModel.config.seed, 4117);

  if (roll < 0.018 + depthBias * 0.035) return TILE_TYPES.MAGMA_CRYSTAL;
  if (roll < 0.08 + depthBias * 0.075) return TILE_TYPES.EMBER_ORE;
  if (roll < 0.27 + depthBias * 0.08) return TILE_TYPES.OBSIDIAN;
  if (roll < 0.31 + depthBias * 0.03) return TILE_TYPES.GOLD;
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
    const type = chooseWeightedTile(seed, 5600 + i, gen.nodeTiles);

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

function carveEntry(worldModel, config) {
  const entry = config.entry;
  for (let tx = entry.bridgeStartX; tx <= entry.bridgeEndX; tx += 1) {
    if (!worldModel.inBounds(tx, entry.floorY)) continue;
    for (let yOffset = entry.airRowsAboveFloor; yOffset >= 1; yOffset -= 1) {
      setGeneratedTile(worldModel, tx, entry.floorY - yOffset, TILE_TYPES.AIR, 0);
    }
    setGeneratedTile(worldModel, tx, entry.floorY, TILE_TYPES.FLOOR_TOWN_2, 0);
    for (let yOffset = 1; yOffset <= entry.airRowsBelowFloor; yOffset += 1) {
      setGeneratedTile(worldModel, tx, entry.floorY + yOffset, TILE_TYPES.AIR, 0);
    }
  }
}

export function applySecondWorldArea(worldModel, area, config = SECOND_WORLD_CONFIG) {
  if (!area?.enabled) {
    return { applied: false, reason: "disabled" };
  }

  const { mask, bounds, cellCount } = buildMask(worldModel, area);
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
      } else if (ty === floorY) {
        setGeneratedTile(worldModel, tx, ty, TILE_TYPES.FLOOR_TOWN_2, 0);
        floorTiles += 1;
      } else {
        setGeneratedTile(worldModel, tx, ty, chooseBaseTile(worldModel, tx, ty, bounds, config));
        terrainTiles += 1;
      }
    }
  }

  const nodeTiles = paintResourceNodes(worldModel, mask, bounds, config);
  const caveTiles = paintCaves(worldModel, mask, bounds, config);
  reinforceBounds(worldModel, mask, bounds, config);
  carveEntry(worldModel, config);

  return {
    applied: true,
    cells: cellCount,
    terrainTiles,
    floorTiles,
    nodeTiles,
    caveTiles,
    bounds,
  };
}
