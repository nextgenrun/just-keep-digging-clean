import { TILE_TYPES } from "./tileTypes.js";

export const SOIL_DEPTH_LIMIT = 1000;
export const SOIL_BAND_SIZE = 200;
export const SOIL_BAND_COUNT = 5;
export const SOIL_VARIANT_COUNT = 3;
export const SOIL_TYPE_COUNT = 3;
export const SOIL_RARITY_COUNT = 4;
export const SOIL_DAMAGE_STAGE_COUNT = 5;
export const SOIL_ATLAS_FRAME_COUNT =
  SOIL_BAND_COUNT * SOIL_VARIANT_COUNT * SOIL_TYPE_COUNT * SOIL_RARITY_COUNT * SOIL_DAMAGE_STAGE_COUNT;

export const SOIL_TYPES = Object.freeze([
  TILE_TYPES.DIRT,
  TILE_TYPES.DARK_DIRT_NORMAL,
  TILE_TYPES.DARK_DIRT_STRONG,
]);

export const RESOURCE_RARITIES = Object.freeze([
  { id: "normal", chance: 0, multiplier: 1 },
  { id: "rich", chance: 0.02, multiplier: 2 },
  { id: "packed", chance: 0.004, multiplier: 5 },
  { id: "ancient", chance: 0.0005, multiplier: 12 },
]);

// Tile types that can have rarity tiers (affecting HP and yield)
export const ALL_RESOURCE_TYPES = Object.freeze([
  TILE_TYPES.DIRT,
  TILE_TYPES.STONE,
  TILE_TYPES.COPPER,
  TILE_TYPES.DARK_DIRT_NORMAL,
  TILE_TYPES.DARK_DIRT_STRONG,
  TILE_TYPES.BRONZE,
  TILE_TYPES.STEEL,
  TILE_TYPES.IRON,
  TILE_TYPES.SILVER,
  TILE_TYPES.GOLD,
]);

function hashUint(tx, ty, seed, salt = 0) {
  let value = Math.imul(tx | 0, 0x1f123bb5) ^ Math.imul(ty | 0, 0x5f356495);
  value ^= Math.imul(seed | 0, 0x6c8e9cf5) ^ Math.imul(salt | 0, 0x27d4eb2d);
  value = Math.imul(value ^ (value >>> 15), 0x2c1b3c6d);
  value = Math.imul(value ^ (value >>> 12), 0x297a2d39);
  return (value ^ (value >>> 15)) >>> 0;
}

function hash01(tx, ty, seed, salt = 0) {
  return hashUint(tx, ty, seed, salt) / 0x100000000;
}

function smoothstep(value) {
  return value * value * (3 - 2 * value);
}

function boundaryOffset(tx, boundaryIndex, seed) {
  const span = 16;
  const anchor = Math.floor(tx / span);
  const local = (tx - anchor * span) / span;
  const first = hash01(anchor, boundaryIndex, seed, 401) * 24 - 12;
  const second = hash01(anchor + 1, boundaryIndex, seed, 401) * 24 - 12;
  return first + (second - first) * smoothstep(local);
}

export function isSoilType(tileType) {
  return SOIL_TYPES.includes(tileType);
}

export function getSoilTypeIndex(tileType) {
  return SOIL_TYPES.indexOf(tileType);
}

export function getSoilBand(tx, depthTiles, seed) {
  if (depthTiles < 0 || depthTiles >= SOIL_DEPTH_LIMIT) return -1;
  let band = 0;
  for (let boundary = 1; boundary < SOIL_BAND_COUNT; boundary += 1) {
    const cutoff = boundary * SOIL_BAND_SIZE + boundaryOffset(tx, boundary, seed);
    if (depthTiles >= cutoff) band = boundary;
  }
  return band;
}

export function getSoilVariant(tx, ty, seed) {
  return hashUint(tx, ty, seed, 733) % SOIL_VARIANT_COUNT;
}

export function getResourceRarityIndex(tileType, tx, ty, depthTiles, seed) {
  if (!ALL_RESOURCE_TYPES.includes(tileType)) return 0;
  if (depthTiles < 0) return 0;
  const roll = hash01(tx, ty, seed, 1297);
  if (roll < RESOURCE_RARITIES[3].chance) return 3;
  if (roll < RESOURCE_RARITIES[3].chance + RESOURCE_RARITIES[2].chance) return 2;
  if (roll < RESOURCE_RARITIES[3].chance + RESOURCE_RARITIES[2].chance + RESOURCE_RARITIES[1].chance) return 1;
  return 0;
}

export function getResourceYieldMultiplier(tileType, tx, ty, depthTiles, seed) {
  return RESOURCE_RARITIES[getResourceRarityIndex(tileType, tx, ty, depthTiles, seed)].multiplier;
}

export function getResourceHpMultiplier(tileType, tx, ty, depthTiles, seed) {
  return RESOURCE_RARITIES[getResourceRarityIndex(tileType, tx, ty, depthTiles, seed)].multiplier;
}

export function getSoilYieldMultiplier(tileType, tx, ty, depthTiles, seed) {
  if (isSoilType(tileType)) return getResourceYieldMultiplier(tileType, tx, ty, depthTiles, seed);
  return 1;
}

export function getSoilRarityIndex(tileType, tx, ty, depthTiles, seed) {
  if (!isSoilType(tileType)) return 0;
  return getResourceRarityIndex(tileType, tx, ty, depthTiles, seed);
}

export function getSoilVisualDescriptor(tileType, tx, ty, depthTiles, seed) {
  const typeIndex = getSoilTypeIndex(tileType);
  const band = getSoilBand(tx, depthTiles, seed);
  if (typeIndex < 0 || band < 0) return null;
  return {
    band,
    variant: getSoilVariant(tx, ty, seed),
    typeIndex,
    rarity: getSoilRarityIndex(tileType, tx, ty, depthTiles, seed),
  };
}

export function getSoilAtlasOffset(descriptor, damageStage) {
  const stageIndex = Math.max(1, Math.min(SOIL_DAMAGE_STAGE_COUNT, damageStage)) - 1;
  const rarityIndex = Number.isInteger(descriptor.rarityIndex) ? descriptor.rarityIndex : descriptor.rarity || 0;
  return (((descriptor.band * SOIL_VARIANT_COUNT + descriptor.variant) * SOIL_TYPE_COUNT + descriptor.typeIndex)
    * SOIL_RARITY_COUNT + rarityIndex) * SOIL_DAMAGE_STAGE_COUNT + stageIndex;
}
