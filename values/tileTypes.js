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

  // Cave wall — unbreakable decorative shell using the shared unbreakable material.
  CAVE_WALL: 24,

  // Geode interior — rare resource tile inside a geode pocket
  GEODE_INTERIOR: 27,
  // Geode wall — undiggable shell (heavy punch type)
  GEODE_WALL: 28,

  // Chest — treasure chest (visual-only, non-diggable)
  CHEST: 29,

  // Glow Crystal — pretty glowing clusters (visual-only, non-diggable)
  GLOW_CRYSTAL: 30,

  // Second world resources — industrial magma area
  LAVA_DIRT: 31,
  OBSIDIAN: 32,
  EMBER_ORE: 33,
  MAGMA_CRYSTAL: 34,

  // Ancient Relic Cache — rare deep-world treasure chest (mineable)
  ANCIENT_RELIC_CACHE: 35,
});

export function isUnbreakableMiningSurface(tileType) {
  return tileType === TILE_TYPES.BEDROCK
    || tileType === TILE_TYPES.CAVE_WALL
    || tileType === TILE_TYPES.FLOOR_TOWN_1
    || tileType === TILE_TYPES.FLOOR_TOWN_2;
}
