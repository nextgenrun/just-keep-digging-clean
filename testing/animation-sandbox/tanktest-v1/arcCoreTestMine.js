const REQUIRED_TILE_KEYS = Object.freeze([
  "AIR",
  "DIRT",
  "STONE",
  "BEDROCK",
]);

function validateTileTypes(tile) {
  for (const key of REQUIRED_TILE_KEYS) {
    if (!Number.isInteger(tile?.[key])) {
      throw new Error(`Arc Core test mine is missing TILE.${key}`);
    }
  }
}

function isInsideChamber(column, row, chamber) {
  return column >= chamber.leftTile
    && column <= chamber.rightTile
    && row >= chamber.topTile
    && row <= chamber.bottomTile;
}

function isBoundary(column, row, stage, thickness) {
  return column < thickness
    || row < thickness
    || column >= stage.worldCols - thickness
    || row >= stage.worldRows - thickness;
}

/**
 * Builds one deterministic, persistent Arc test mine.
 *
 * The central chamber is sized for the approved Omega circular collider. Both
 * Arc forms then mine outward through coherent dirt and stone regions instead
 * of being teleported between one-shot review walls.
 */
export function createArcCoreTestMine(stage, tile) {
  validateTileTypes(tile);
  const mine = stage?.mine;
  if (!mine?.chamber) {
    throw new Error("Arc Core test mine configuration is incomplete");
  }

  const grid = [];
  for (let row = 0; row < stage.worldRows; row += 1) {
    grid[row] = [];
    for (let column = 0; column < stage.worldCols; column += 1) {
      if (isBoundary(column, row, stage, mine.boundaryThicknessTiles)) {
        grid[row][column] = tile.BEDROCK;
      } else if (isInsideChamber(column, row, mine.chamber)) {
        grid[row][column] = tile.AIR;
      } else if (
        column >= mine.stoneStartTileX
        || row >= mine.stoneStartTileY
      ) {
        grid[row][column] = tile.STONE;
      } else {
        grid[row][column] = tile.DIRT;
      }
    }
  }
  return grid;
}

export function countArcCoreMineTiles(world, tile) {
  validateTileTypes(tile);
  const stats = {
    air: 0,
    dirt: 0,
    stone: 0,
    bedrock: 0,
    diggable: 0,
    total: 0,
  };
  for (const row of world || []) {
    for (const type of row || []) {
      stats.total += 1;
      if (type === tile.AIR) stats.air += 1;
      else if (type === tile.DIRT) stats.dirt += 1;
      else if (type === tile.STONE) stats.stone += 1;
      else if (type === tile.BEDROCK) stats.bedrock += 1;
    }
  }
  stats.diggable = stats.dirt + stats.stone;
  return stats;
}
