import { V11_SKY_ISLAND_LAYOUT } from "./v11SkyIslandLayout.js";

// ==================== PLAYER ABILITIES CONFIG ====================
export const PLAYER_ABILITIES_CONFIG = Object.freeze({
  // Depth warnings
  climbWarningDepthTiles: 30,
  safeReturnDepthTiles: 10,

  // Sky island
  skyIslandTileX: V11_SKY_ISLAND_LAYOUT.levels[0].leftTile,
  skyIslandTileY: V11_SKY_ISLAND_LAYOUT.levels[0].floorRow,
  skyIslandWidthTiles: V11_SKY_ISLAND_LAYOUT.levels[0].widthTiles,

  // Quickslash ability
  quickslashEnabled: true,
  quickslashCost: 10,
  quickslashSpeedMultiplier: 4,
  quickslashCooldownMs: 50,

  // Thunder Strike ability
  thunderStrikeEnabled: true,
  thunderStrikeCost: 100,
  thunderStrikeMaxTiles: 10,
  thunderStrikeNormalDamageMultiplier: 1.5,
  thunderStrikeBaseDamage: 50,
  thunderStrikeBaseDamageMultiplier: 3,
  thunderStrikeDamageFalloff: 0.10,
});
