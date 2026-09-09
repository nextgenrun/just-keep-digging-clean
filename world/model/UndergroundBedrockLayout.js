import { SECOND_WORLD_CONFIG } from "../../values/secondWorldConfig.js";
import { TILE_TYPES } from "../../values/tileTypes.js";
import { isSurfaceClearanceTileY } from "../../values/worldDepthConfig.js";

function replacementType(tileX, dividerTileX) {
  return tileX < dividerTileX ? TILE_TYPES.DIRT : TILE_TYPES.LAVA_DIRT;
}

function isBridgeUndercroft(config, tileX, tileY) {
  const entry = config.entry;
  return tileX >= entry.bridgeStartX
    && tileX <= entry.bridgeEndX
    && tileY > entry.floorY
    && tileY <= entry.floorY + entry.airRowsBelowFloor;
}

/**
 * Makes one gate-controlled Level 1/Level 2 divider, pauses it through the
 * shared surface-clearance row, and removes every unrelated BEDROCK or legacy
 * integrated-cave wall cell from the normal world.
 */
export function enforceUndergroundBedrockLayout(
  worldModel,
  config = SECOND_WORLD_CONFIG,
) {
  const divider = config.levelDivider || config.undergroundDivider;
  const firstUndergroundTileY = worldModel.topAirRows + 1;
  const report = {
    removedLevelOne: 0,
    removedLevelTwo: 0,
    removedCaveWalls: 0,
    clearedBridgeUndercroft: 0,
    clearedLegacyGate: 0,
    clearedSurfaceClearance: 0,
    repairedDivider: 0,
    retainedDivider: 0,
  };

  let expectedDividerTiles = 0;
  for (let tileY = divider.topTileY; tileY < worldModel.depthTiles; tileY += 1) {
    const isSurfaceClearance = isSurfaceClearanceTileY(
      tileY,
      worldModel.topAirRows,
      worldModel.config,
    );
    const dividerType = isSurfaceClearance
      ? TILE_TYPES.AIR
      : tileY === divider.floorTileY
        ? TILE_TYPES.FLOOR_TOWN_2
        : TILE_TYPES.BEDROCK;
    if (worldModel.getTileType(divider.tileX, tileY) !== dividerType) {
      if (isSurfaceClearance) {
        report.clearedSurfaceClearance += 1;
      } else {
        report.repairedDivider += 1;
      }
    }
    const index = worldModel.index(divider.tileX, tileY);
    worldModel.setTile(divider.tileX, tileY, dividerType, 0);
    worldModel.skyTileOriginalType[index] = 0;
    worldModel.skyTileRarity[index] = 0;
    if (!isSurfaceClearance) {
      report.retainedDivider += 1;
      expectedDividerTiles += 1;
    }
  }

  for (let offset = 0; offset < divider.gateHeightTiles; offset += 1) {
    const tileY = divider.gateTopTileY + offset;
    if (worldModel.getTileType(divider.legacyGateTileX, tileY) !== TILE_TYPES.AIR) {
      report.clearedLegacyGate += 1;
    }
    const index = worldModel.index(divider.legacyGateTileX, tileY);
    worldModel.setTile(divider.legacyGateTileX, tileY, TILE_TYPES.AIR, 0);
    worldModel.skyTileOriginalType[index] = 0;
    worldModel.skyTileRarity[index] = 0;
  }

  for (let tileY = firstUndergroundTileY; tileY < worldModel.depthTiles; tileY += 1) {
    for (let tileX = 0; tileX < worldModel.widthTiles; tileX += 1) {
      const currentType = worldModel.getTileType(tileX, tileY);
      if (currentType !== TILE_TYPES.BEDROCK && currentType !== TILE_TYPES.CAVE_WALL) continue;

      if (currentType === TILE_TYPES.BEDROCK
        && tileX === divider.tileX
        && tileY >= divider.topTileY) {
        continue;
      }

      const nextType = isBridgeUndercroft(config, tileX, tileY)
        ? TILE_TYPES.AIR
        : replacementType(tileX, divider.tileX);
      const nextHp = nextType === TILE_TYPES.AIR
        ? 0
        : worldModel.getTileMaxHp(tileX, tileY, nextType);
      const index = worldModel.index(tileX, tileY);

      worldModel.setTile(tileX, tileY, nextType, nextHp);
      worldModel.skyTileOriginalType[index] = 0;
      worldModel.skyTileRarity[index] = 0;
      if (currentType === TILE_TYPES.CAVE_WALL) report.removedCaveWalls += 1;

      if (nextType === TILE_TYPES.AIR) {
        report.clearedBridgeUndercroft += 1;
      } else if (tileX < divider.tileX) {
        report.removedLevelOne += 1;
      } else {
        report.removedLevelTwo += 1;
      }
    }
  }

  if (report.retainedDivider !== expectedDividerTiles) {
    throw new Error(
      `[UndergroundBedrockLayout] Divider gap detected: expected ${expectedDividerTiles} tiles, `
      + `retained ${report.retainedDivider}`,
    );
  }

  return report;
}
