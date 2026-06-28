// ==================== TILE TYPES ====================
export const TILE_TYPES = Object.freeze({
  AIR: 0,
  DIRT: 1,
  STONE: 2,
  COPPER: 3,
  BEDROCK: 4,
  DARK_DIRT_NORMAL: 5,
  DARK_DIRT_STRONG: 6,
  BRONZE: 7,
  STEEL: 8,
  IRON: 9,
  SILVER: 10,
  GOLD: 11,
  TELEPORT_TILE: 12,
  GAMBLE_TILE: 13,
  FLOOR_TOWN_1: 14,
  FLOOR_TOWN_2: 15,
  SKY_TILE: 16,
  
  // Special Blocks
  GEM_POWER_BLOCK: 17,
  SPEED_BLOCK: 18,
  XP_BLOCK: 19,
  CRIT_BLOCK: 20,
  BERSERK_BLOCK: 21,
  COMBO_BLOCK: 22,
  LEGEND_BLOCK: 23,

  // Cave wall — unbreakable decorative shell around caves (uses bedrock sprite as placeholder)
  CAVE_WALL: 24,

  // Root overlay types — placed on top of base tiles as visual decoration
  // (you can't "dig" a root tile; you dig the base tile underneath)
  ROOT_OVERLAY: 25,
  ROOT_OVERLAY_DEEP: 26,

  // Geode interior — rare resource tile inside a geode pocket
  GEODE_INTERIOR: 27,
  // Geode wall — undiggable shell (heavy punch type)
  GEODE_WALL: 28,

  // Chest — treasure chest (visual-only, non-diggable)
  CHEST: 29,

  // Glow Crystal — pretty glowing clusters (visual-only, non-diggable)
  GLOW_CRYSTAL: 30,
});
