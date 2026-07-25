import { TILE_TYPES } from "./tileTypes.js";
import { WORLD_DEPTH_CONFIG } from "./worldDepthConfig.js";

const SECOND_WORLD_ENTRY_FLOOR_Y = 65;
const SECOND_WORLD_ENTRY_AIR_ROWS_BELOW_FLOOR = 1;

export const SECOND_WORLD_CONFIG = Object.freeze({
  markerGid: 3094,
  markerLayerName: "00_PAINT_HERE_tile_types",
  entry: Object.freeze({
    bridgeStartX: 120,
    bridgeEndX: 136,
    floorY: SECOND_WORLD_ENTRY_FLOOR_Y,
    airRowsAboveFloor: 4,
    airRowsBelowFloor: SECOND_WORLD_ENTRY_AIR_ROWS_BELOW_FLOOR,
  }),
  undergroundDivider: Object.freeze({
    tileX: WORLD_DEPTH_CONFIG.levelTwoLeftTile,
    startTileY: SECOND_WORLD_ENTRY_FLOOR_Y + SECOND_WORLD_ENTRY_AIR_ROWS_BELOW_FLOOR + 1,
  }),
  runtimeArea: Object.freeze({
    leftTile: WORLD_DEPTH_CONFIG.levelTwoLeftTile,
    rightTile: WORLD_DEPTH_CONFIG.levelTwoRightTile,
    extensionStartTileY: 133,
    depthMeters: WORLD_DEPTH_CONFIG.levelTwoDepthMeters,
    levelOneBottomTileY: WORLD_DEPTH_CONFIG.levelOneRuntimeDepthTiles - 1,
  }),
  generation: Object.freeze({
    caveCountMin: 180,
    caveCountMax: 240,
    caveRadiusXMin: 5,
    caveRadiusXMax: 17,
    caveRadiusYMin: 2,
    caveRadiusYMax: 6,
    nodeCountMin: 360,
    nodeCountMax: 460,
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
    // Level Two is generated after the authored Tiled override, so its special
    // tiles must be restored explicitly. These anchors sit on deterministic
    // cave walls from the current seed, spread through the full 3000m route.
    teleportAnchors: Object.freeze([
      Object.freeze({ tx: 200, ty: 110 }),
      Object.freeze({ tx: 256, ty: 263 }),
      Object.freeze({ tx: 241, ty: 480 }),
      Object.freeze({ tx: 186, ty: 753 }),
      Object.freeze({ tx: 190, ty: 1080 }),
      Object.freeze({ tx: 168, ty: 1428 }),
      Object.freeze({ tx: 204, ty: 1780 }),
      Object.freeze({ tx: 159, ty: 2140 }),
      Object.freeze({ tx: 161, ty: 2521 }),
      Object.freeze({ tx: 163, ty: 2920 }),
      Object.freeze({ tx: 152, ty: 3333 }),
      Object.freeze({ tx: 163, ty: 3785 }),
      Object.freeze({ tx: 264, ty: 4231 }),
      Object.freeze({ tx: 205, ty: 4700 }),
    ]),
  }),
});

export function isProtectedSecondWorldDividerTile(tileX, tileY) {
  const divider = SECOND_WORLD_CONFIG.undergroundDivider;
  return tileX === divider.tileX && tileY >= divider.startTileY;
}
