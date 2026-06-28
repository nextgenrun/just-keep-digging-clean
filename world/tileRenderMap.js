/**
 * Tile render index constants and helper functions.
 * Maps tile types and HP to their atlas frame indices.
 */
import { TILE_TYPES } from "../values/tileTypes.js";

// Soil atlas occupies frames 1..SOIL_ATLAS_FRAME_COUNT
export const SOIL_ATLAS_FRAME_COUNT = 3750; // 5 bands * 3 variants * 5 types * 5 rarities * 10 stages

// Tileset source keys (in order they appear in the atlas after soil)
export const TILESET_SOURCE_KEYS = [
  // Bedrock variants
  "tile-bedrock",
  "tile-approved-cave-wall",
  "tile-approved-cave-ceiling",
  "tile-approved-cave-ceiling-chains",
  "tile-approved-treasure-stone",
  "tile-approved-sky-island-top",
  "tile-approved-chest-normal",
  "tile-approved-chest-rare",
  "tile-approved-town-exit",
  // Dark dirt
  "tile-dark-dirt-normal",
  "tile-dark-dirt-strong",
  // Resources (base textures, not HP stages)
  "tile-bronze",
  "tile-steel",
  "tile-iron",
  "tile-silver",
  "tile-gold",
  // Special tiles
  "tile-teleport",
  "tile-gamble",
  "tile-floor-town-1",
  "tile-floor-town-2",
  // Special blocks
  "gempower-block",
  "speed-block",
  "xp-block",
  "sell-block",
  "crit-block",
  "berserk-block",
  "combo-block",
  "crown-block",
  // Overlays
  "overlay-roots",
  "overlay-roots-deep",
  // Geode
  "tile-geode-interior",
  // Cave wall sprite
  "tile-soil-band-0-variant-0", // fallback
];

export const RUBBLE_INDEX_START = SOIL_ATLAS_FRAME_COUNT + TILESET_SOURCE_KEYS.length;
export const RUBBLE_DAMAGE_STAGE_COUNT = 5;
export const RUBBLE_TILE_TYPES = [
  TILE_TYPES.DIRT, TILE_TYPES.STONE, TILE_TYPES.COPPER,
  TILE_TYPES.DARK_DIRT_NORMAL, TILE_TYPES.DARK_DIRT_STRONG,
  TILE_TYPES.BRONZE, TILE_TYPES.STEEL, TILE_TYPES.IRON,
  TILE_TYPES.SILVER, TILE_TYPES.GOLD,
];
export const RUBBLE_FRAME_COUNT = RUBBLE_TILE_TYPES.length * RUBBLE_DAMAGE_STAGE_COUNT;

// Damage stage keys by tile type for rubble rendering
export const DAMAGE_STAGE_KEYS_BY_TYPE = {
  [TILE_TYPES.DIRT]:           ["tile-dirt-hp1", "tile-dirt-hp2", "tile-dirt-hp3", "tile-dirt-hp4", "tile-dirt-hp5"],
  [TILE_TYPES.STONE]:          ["tile-stone-hp1", "tile-stone-hp2", "tile-stone-hp3", "tile-stone-hp4", "tile-stone-hp5"],
  [TILE_TYPES.COPPER]:         ["tile-copper-hp1", "tile-copper-hp2", "tile-copper-hp3", "tile-copper-hp4", "tile-copper-hp5"],
  [TILE_TYPES.DARK_DIRT_NORMAL]: ["tile-dark-dirt-normal-hp1", "tile-dark-dirt-normal-hp2", "tile-dark-dirt-normal-hp3", "tile-dark-dirt-normal-hp4", "tile-dark-dirt-normal-hp5"],
  [TILE_TYPES.DARK_DIRT_STRONG]: ["tile-dark-dirt-strong-hp1", "tile-dark-dirt-strong-hp2", "tile-dark-dirt-strong-hp3", "tile-dark-dirt-strong-hp4", "tile-dark-dirt-strong-hp5"],
  [TILE_TYPES.BRONZE]:         ["tile-bronze-hp1", "tile-bronze-hp2", "tile-bronze-hp3", "tile-bronze-hp4", "tile-bronze-hp5"],
  [TILE_TYPES.STEEL]:          ["tile-steel-hp1", "tile-steel-hp2", "tile-steel-hp3", "tile-steel-hp4", "tile-steel-hp5"],
  [TILE_TYPES.IRON]:           ["tile-iron-hp1", "tile-iron-hp2", "tile-iron-hp3", "tile-iron-hp4", "tile-iron-hp5"],
  [TILE_TYPES.SILVER]:         ["tile-silver-hp1", "tile-silver-hp2", "tile-silver-hp3", "tile-silver-hp4", "tile-silver-hp5"],
  [TILE_TYPES.GOLD]:           ["tile-gold-hp1", "tile-gold-hp2", "tile-gold-hp3", "tile-gold-hp4", "tile-gold-hp5"],
};

// Tile render index constants (for non-soil tiles in the atlas)
export const TILE_RENDER_INDEX = Object.freeze({
  BEDROCK: SOIL_ATLAS_FRAME_COUNT,
  CAVE_WALL: SOIL_ATLAS_FRAME_COUNT + 1,
  CAVE_CEILING: SOIL_ATLAS_FRAME_COUNT + 2,
  CAVE_CEILING_CHAINS: SOIL_ATLAS_FRAME_COUNT + 3,
  TREASURE_STONE: SOIL_ATLAS_FRAME_COUNT + 4,
  SKY_ISLAND_TOP: SOIL_ATLAS_FRAME_COUNT + 5,
  CHEST_NORMAL: SOIL_ATLAS_FRAME_COUNT + 6,
  CHEST_RARE: SOIL_ATLAS_FRAME_COUNT + 7,
  TOWN_EXIT: SOIL_ATLAS_FRAME_COUNT + 8,
  DARK_DIRT_NORMAL: SOIL_ATLAS_FRAME_COUNT + 9,
  DARK_DIRT_STRONG: SOIL_ATLAS_FRAME_COUNT + 10,
  BRONZE: SOIL_ATLAS_FRAME_COUNT + 11,
  STEEL: SOIL_ATLAS_FRAME_COUNT + 12,
  IRON: SOIL_ATLAS_FRAME_COUNT + 13,
  SILVER: SOIL_ATLAS_FRAME_COUNT + 14,
  GOLD: SOIL_ATLAS_FRAME_COUNT + 15,
  TELEPORT: SOIL_ATLAS_FRAME_COUNT + 16,
  GAMBLE: SOIL_ATLAS_FRAME_COUNT + 17,
  FLOOR_TOWN_1: SOIL_ATLAS_FRAME_COUNT + 18,
  FLOOR_TOWN_2: SOIL_ATLAS_FRAME_COUNT + 19,
  GEM_POWER: SOIL_ATLAS_FRAME_COUNT + 20,
  SPEED: SOIL_ATLAS_FRAME_COUNT + 21,
  XP: SOIL_ATLAS_FRAME_COUNT + 22,
  SELL: SOIL_ATLAS_FRAME_COUNT + 23,
  CRIT: SOIL_ATLAS_FRAME_COUNT + 24,
  BERSERK: SOIL_ATLAS_FRAME_COUNT + 25,
  COMBO: SOIL_ATLAS_FRAME_COUNT + 26,
  LEGEND: SOIL_ATLAS_FRAME_COUNT + 27,
  ROOT_OVERLAY: SOIL_ATLAS_FRAME_COUNT + 28,
  ROOT_OVERLAY_DEEP: SOIL_ATLAS_FRAME_COUNT + 29,
  GEODE_INTERIOR: SOIL_ATLAS_FRAME_COUNT + 30,
});

/**
 * Get the render index for a specific tile type/hp combo.
 * Returns the atlas frame index, or -1 for AIR.
 */
export function getTileRenderIndex(type, hp, maxHp, tx, ty, depthTiles, seed, visualHint) {
  if (type === TILE_TYPES.AIR) return -1;

  // Handle special visuals
  if (type === TILE_TYPES.BEDROCK) {
    if (visualHint === "skyIslandTop") return TILE_RENDER_INDEX.SKY_ISLAND_TOP;
    return TILE_RENDER_INDEX.BEDROCK;
  }

  switch (type) {
    case TILE_TYPES.CAVE_WALL:
      if (visualHint === "caveCeiling") return TILE_RENDER_INDEX.CAVE_CEILING;
      return TILE_RENDER_INDEX.CAVE_WALL;
    case TILE_TYPES.GEODE_WALL: return TILE_RENDER_INDEX.CAVE_WALL;
    case TILE_TYPES.GEODE_INTERIOR: return TILE_RENDER_INDEX.GEODE_INTERIOR;
    case TILE_TYPES.CHEST: return TILE_RENDER_INDEX.CHEST_NORMAL;
    case TILE_TYPES.GLOW_CRYSTAL: return TILE_RENDER_INDEX.TREASURE_STONE;
    case TILE_TYPES.TELEPORT_TILE: return TILE_RENDER_INDEX.TELEPORT;
    case TILE_TYPES.GAMBLE_TILE: return TILE_RENDER_INDEX.GAMBLE;
    case TILE_TYPES.FLOOR_TOWN_1: return TILE_RENDER_INDEX.FLOOR_TOWN_1;
    case TILE_TYPES.FLOOR_TOWN_2: return TILE_RENDER_INDEX.FLOOR_TOWN_2;
    case TILE_TYPES.GEM_POWER_BLOCK: return TILE_RENDER_INDEX.GEM_POWER;
    case TILE_TYPES.SPEED_BLOCK: return TILE_RENDER_INDEX.SPEED;
    case TILE_TYPES.XP_BLOCK: return TILE_RENDER_INDEX.XP;
    case TILE_TYPES.CRIT_BLOCK: return TILE_RENDER_INDEX.CRIT;
    case TILE_TYPES.BERSERK_BLOCK: return TILE_RENDER_INDEX.BERSERK;
    case TILE_TYPES.COMBO_BLOCK: return TILE_RENDER_INDEX.COMBO;
    case TILE_TYPES.LEGEND_BLOCK: return TILE_RENDER_INDEX.LEGEND;
    case TILE_TYPES.DARK_DIRT_NORMAL: return TILE_RENDER_INDEX.DARK_DIRT_NORMAL;
    case TILE_TYPES.DARK_DIRT_STRONG: return TILE_RENDER_INDEX.DARK_DIRT_STRONG;
    case TILE_TYPES.BRONZE: return TILE_RENDER_INDEX.BRONZE;
    case TILE_TYPES.STEEL: return TILE_RENDER_INDEX.STEEL;
    case TILE_TYPES.IRON: return TILE_RENDER_INDEX.IRON;
    case TILE_TYPES.SILVER: return TILE_RENDER_INDEX.SILVER;
    case TILE_TYPES.GOLD: return TILE_RENDER_INDEX.GOLD;
    case TILE_TYPES.SKY_TILE: return TILE_RENDER_INDEX.BEDROCK; // placeholder - rendered with graphics overlay
  }

  return TILE_RENDER_INDEX.BEDROCK;
}

/**
 * Get the render index for a rubble tile.
 */
export function getRubbleRenderIndex(type, hp, maxHp) {
  const idx = RUBBLE_TILE_TYPES.indexOf(type);
  if (idx === -1) return null;
  
  const maxStage = RUBBLE_DAMAGE_STAGE_COUNT;
  const hpRatio = maxHp > 0 ? hp / maxHp : 0;
  let stage = Math.max(1, Math.ceil(hpRatio * maxStage));
  stage = Math.min(stage, maxStage);
  
  return RUBBLE_INDEX_START + idx * RUBBLE_DAMAGE_STAGE_COUNT + (stage - 1);
}