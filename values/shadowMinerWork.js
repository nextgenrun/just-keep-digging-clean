import { TILE_TYPES } from "./tileTypes.js";
export const SHADOW_MINER_WORK = Object.freeze({
  minimumObserveMs: 6500, maximumApproachMs: 2100,
  approachTilesPerSecond: 0.9, fleeTilesPerSecond: 1.2,
  torchRangeTiles: 3.2, torchArrivalGraceMs: 1600,
  cycleMs: 1800, actionMs: 1150, contactRatio: 0.56,
  maximumBlocks: 3, minimumPlayerDistanceTiles: 3,
  targetOffsets: Object.freeze([[1, 0], [-1, 0], [0, 1]]),
  mutableTypes: Object.freeze([TILE_TYPES.DIRT, TILE_TYPES.STONE,
    TILE_TYPES.DARK_DIRT_NORMAL, TILE_TYPES.DARK_DIRT_STRONG]),
});
