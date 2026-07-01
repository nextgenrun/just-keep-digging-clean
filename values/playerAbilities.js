// ==================== PLAYER ABILITIES CONFIG ====================
export const PLAYER_ABILITIES_CONFIG = Object.freeze({
  // Depth warnings
  climbWarningDepthTiles: 30,
  safeReturnDepthTiles: 10,

  // Sky island
  skyIslandTileX: 23,
  skyIslandTileY: 35,
  skyIslandWidthTiles: 20,

  // Quickslash ability
  quickslashEnabled: true,
  quickslashCost: 10,
  quickslashSpeedMultiplier: 4,
  quickslashCooldownMs: 50,

  // Thunder Strike ability
  thunderStrikeEnabled: true,
  thunderStrikeCost: 100,
  thunderStrikeChargeTimeMs: 1000,
  thunderStrikeMaxTiles: 10,
  thunderStrikeBaseDamage: 50,
  thunderStrikeBaseDamageMultiplier: 3,
  thunderStrikeDamageFalloff: 0.10,
});
