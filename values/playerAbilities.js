import { V11_SKY_ISLAND_LAYOUT } from "./v11SkyIslandLayout.js";

// ==================== PLAYER ABILITIES CONFIG ====================
export const PLAYER_ABILITIES_CONFIG = Object.freeze({
  // Depth warnings
  flightWarningDepthTiles: 30,
  safeReturnDepthTiles: 10,

  // Sky island
  skyIslandTileX: V11_SKY_ISLAND_LAYOUT.levels[0].leftTile,
  skyIslandTileY: V11_SKY_ISLAND_LAYOUT.levels[0].floorRow,
  skyIslandWidthTiles: V11_SKY_ISLAND_LAYOUT.levels[0].widthTiles,

  // Quickslash ability
  quickslashEnabled: true,
  quickslashCost: 12,
  quickslashDamageMultiplier: 3,
  quickslashMovementBonusPxPerSec: 240,
  quickslashSpeedMultiplier: 2.5,
  quickslashMinimumCooldownMs: 180,
  quickslashMasteryMinimumCooldownMs: 150,
  quickslashHighGpCostMultiplier: 0.5,

  // Thunder Strike ability
  thunderStrikeEnabled: true,
  thunderStrikeCost: 100,
  thunderStrikeBaseRangeTiles: 6,
  thunderStrikeNormalDamageMultiplier: 1.5,
  thunderStrikeDamageFalloff: 0.08,
});
