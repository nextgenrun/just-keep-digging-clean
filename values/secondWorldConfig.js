import { TILE_TYPES } from "./tileTypes.js";

export const SECOND_WORLD_CONFIG = Object.freeze({
  markerGid: 3094,
  markerLayerName: "00_PAINT_HERE_tile_types",
  entry: Object.freeze({
    bridgeStartX: 120,
    bridgeEndX: 136,
    floorY: 65,
    airRowsAboveFloor: 4,
    airRowsBelowFloor: 1,
  }),
  generation: Object.freeze({
    caveCountMin: 10,
    caveCountMax: 16,
    caveRadiusXMin: 5,
    caveRadiusXMax: 17,
    caveRadiusYMin: 2,
    caveRadiusYMax: 6,
    nodeCountMin: 18,
    nodeCountMax: 28,
    nodeRadiusXMin: 2,
    nodeRadiusXMax: 6,
    nodeRadiusYMin: 1,
    nodeRadiusYMax: 3,
    baseTiles: Object.freeze([
      Object.freeze({ type: TILE_TYPES.LAVA_DIRT, weight: 64 }),
      Object.freeze({ type: TILE_TYPES.OBSIDIAN, weight: 20 }),
      Object.freeze({ type: TILE_TYPES.EMBER_ORE, weight: 9 }),
      Object.freeze({ type: TILE_TYPES.MAGMA_CRYSTAL, weight: 3 }),
      Object.freeze({ type: TILE_TYPES.GOLD, weight: 4 }),
    ]),
    nodeTiles: Object.freeze([
      Object.freeze({ type: TILE_TYPES.OBSIDIAN, weight: 44 }),
      Object.freeze({ type: TILE_TYPES.EMBER_ORE, weight: 32 }),
      Object.freeze({ type: TILE_TYPES.MAGMA_CRYSTAL, weight: 14 }),
      Object.freeze({ type: TILE_TYPES.GOLD, weight: 10 }),
    ]),
  }),
});
