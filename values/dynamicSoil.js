import { TILE_TYPES } from "./tileTypes.js";

export const SOIL_DEPTH_LIMIT = 1000;
export const SOIL_BAND_SIZE = 200;
export const SOIL_BAND_COUNT = 5;
export const SOIL_VARIANT_COUNT = 3;
export const DEEP_SOIL_DEPTH_START = 1000;
export const DEEP_SOIL_BAND_SIZE = 200;
export const DEEP_SOIL_BAND_COUNT = 4;
export const DEEP_SOIL_VARIANT_COUNT = 6;
export const SOIL_TYPE_COUNT = 3;
export const SOIL_RARITY_COUNT = 4;
export const SOIL_DAMAGE_STAGE_COUNT = 5;
export const SURFACE_SOIL_ATLAS_FRAME_COUNT =
  SOIL_BAND_COUNT * SOIL_VARIANT_COUNT * SOIL_TYPE_COUNT * SOIL_RARITY_COUNT * SOIL_DAMAGE_STAGE_COUNT;
export const DEEP_SOIL_ATLAS_FRAME_COUNT =
  DEEP_SOIL_BAND_COUNT * DEEP_SOIL_VARIANT_COUNT * SOIL_TYPE_COUNT * SOIL_RARITY_COUNT * SOIL_DAMAGE_STAGE_COUNT;
export const SOIL_ATLAS_FRAME_COUNT = SURFACE_SOIL_ATLAS_FRAME_COUNT + DEEP_SOIL_ATLAS_FRAME_COUNT;

export const SOIL_TYPES = Object.freeze([
  TILE_TYPES.DIRT,
  TILE_TYPES.DARK_DIRT_NORMAL,
  TILE_TYPES.DARK_DIRT_STRONG,
]);

export const RESOURCE_RARITIES = Object.freeze([
  Object.freeze({
    id: "normal", chance: 0, multiplier: 1, yieldMultiplier: 1,
    hpMultiplier: 1, legacyMultiplier: 1,
  }),
  Object.freeze({
    id: "rich", chance: 0.02, multiplier: 3, yieldMultiplier: 3,
    hpMultiplier: 1.5, legacyMultiplier: 2,
  }),
  Object.freeze({
    id: "packed", chance: 0.004, multiplier: 8, yieldMultiplier: 8,
    hpMultiplier: 2.5, legacyMultiplier: 5,
  }),
  Object.freeze({
    id: "ancient", chance: 0.0005, multiplier: 25, yieldMultiplier: 25,
    hpMultiplier: 5, legacyMultiplier: 12,
  }),
]);

const rarityDepthPoint = (minDepth, chanceMultiplier) => Object.freeze({
  minDepth,
  chanceMultiplier,
});

export const RESOURCE_RARITY_DEPTH_CURVE = Object.freeze([
  rarityDepthPoint(0, 1),
  rarityDepthPoint(300, 1.25),
  rarityDepthPoint(600, 1.6),
  rarityDepthPoint(1000, 2.2),
  rarityDepthPoint(1500, 3),
  rarityDepthPoint(2000, 3.5),
  rarityDepthPoint(3000, 4.2),
  rarityDepthPoint(4000, 4.7),
  rarityDepthPoint(5000, 5),
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
  TILE_TYPES.LAVA_DIRT,
  TILE_TYPES.OBSIDIAN,
  TILE_TYPES.EMBER_ORE,
  TILE_TYPES.MAGMA_CRYSTAL,
]);


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

export function getDeepSoilBand(tx, depthTiles, seed) {
  if (depthTiles < DEEP_SOIL_DEPTH_START) return -1;
  let band = 0;
  const deepDepth = depthTiles - DEEP_SOIL_DEPTH_START;
  for (let boundary = 1; boundary < DEEP_SOIL_BAND_COUNT; boundary += 1) {
    const cutoff = boundary * DEEP_SOIL_BAND_SIZE + boundaryOffset(tx, SOIL_BAND_COUNT + boundary, seed);
    if (deepDepth >= cutoff) band = boundary;
  }
  return Math.min(DEEP_SOIL_BAND_COUNT - 1, band);
}

export function getSoilVariant(tx, ty, seed) {
  return hashUint(tx, ty, seed, 733) % SOIL_VARIANT_COUNT;
}

export function getDeepSoilVariant(tx, ty, seed) {
  return hashUint(tx, ty, seed, 1907) % DEEP_SOIL_VARIANT_COUNT;
}

export function getResourceRarityChanceMultiplier(depthTiles) {
  const depth = Math.max(0, Number(depthTiles) || 0);
  const points = RESOURCE_RARITY_DEPTH_CURVE;
  if (depth <= points[0].minDepth) return points[0].chanceMultiplier;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (depth > current.minDepth) continue;
    const progress = (depth - previous.minDepth)
      / Math.max(1, current.minDepth - previous.minDepth);
    return previous.chanceMultiplier
      + (current.chanceMultiplier - previous.chanceMultiplier) * progress;
  }
  return points.at(-1).chanceMultiplier;
}

export function getResourceRarityIndex(
  tileType,
  tx,
  ty,
  depthTiles,
  seed,
  depthEconomyEnabled = true,
) {
  if (!ALL_RESOURCE_TYPES.includes(tileType)) return 0;
  if (depthTiles < 0) return 0;
  const roll = hash01(tx, ty, seed, 1297);
  const chanceMultiplier = depthEconomyEnabled
    ? getResourceRarityChanceMultiplier(depthTiles)
    : 1;
  const ancientChance = RESOURCE_RARITIES[3].chance * chanceMultiplier;
  const packedChance = RESOURCE_RARITIES[2].chance * chanceMultiplier;
  const richChance = RESOURCE_RARITIES[1].chance * chanceMultiplier;
  if (roll < ancientChance) return 3;
  if (roll < ancientChance + packedChance) return 2;
  if (roll < ancientChance + packedChance + richChance) return 1;
  return 0;
}

function getResourceRarity(
  tileType,
  tx,
  ty,
  depthTiles,
  seed,
  depthEconomyEnabled,
) {
  return RESOURCE_RARITIES[
    getResourceRarityIndex(
      tileType,
      tx,
      ty,
      depthTiles,
      seed,
      depthEconomyEnabled,
    )
  ] || RESOURCE_RARITIES[0];
}

export function getResourceHpMultiplier(
  tileType,
  tx,
  ty,
  depthTiles,
  seed,
  depthEconomyEnabled = true,
) {
  const rarity = getResourceRarity(
    tileType, tx, ty, depthTiles, seed, depthEconomyEnabled,
  );
  return depthEconomyEnabled ? rarity.hpMultiplier : rarity.legacyMultiplier;
}

export function getResourceYieldMultiplier(
  tileType,
  tx,
  ty,
  depthTiles,
  seed,
  depthEconomyEnabled = true,
) {
  const rarity = getResourceRarity(
    tileType, tx, ty, depthTiles, seed, depthEconomyEnabled,
  );
  return depthEconomyEnabled ? rarity.yieldMultiplier : rarity.legacyMultiplier;
}

export function getResourceRarityDescriptor(
  tileType,
  tx,
  ty,
  depthTiles,
  seed,
  depthEconomyEnabled = true,
) {
  const index = getResourceRarityIndex(
    tileType, tx, ty, depthTiles, seed, depthEconomyEnabled,
  );
  const rarity = RESOURCE_RARITIES[index] || RESOURCE_RARITIES[0];
  const multiplier = depthEconomyEnabled
    ? rarity.yieldMultiplier
    : rarity.legacyMultiplier;
  return Object.freeze({
    index,
    id: rarity.id,
    multiplier,
    yieldMultiplier: multiplier,
    hpMultiplier: depthEconomyEnabled
      ? rarity.hpMultiplier
      : rarity.legacyMultiplier,
  });
}

export function getSoilRarityIndex(
  tileType,
  tx,
  ty,
  depthTiles,
  seed,
  depthEconomyEnabled = true,
) {
  if (!isSoilType(tileType)) return 0;
  return getResourceRarityIndex(
    tileType, tx, ty, depthTiles, seed, depthEconomyEnabled,
  );
}

export function getSoilVisualDescriptor(
  tileType,
  tx,
  ty,
  depthTiles,
  seed,
  depthEconomyEnabled = true,
) {
  const typeIndex = getSoilTypeIndex(tileType);
  if (typeIndex < 0) return null;

  const deepBand = getDeepSoilBand(tx, depthTiles, seed);
  if (deepBand >= 0) {
    return {
      band: deepBand,
      variant: getDeepSoilVariant(tx, ty, seed),
      typeIndex,
      rarity: getSoilRarityIndex(
        tileType, tx, ty, depthTiles, seed, depthEconomyEnabled,
      ),
      deep: true,
    };
  }

  const band = getSoilBand(tx, depthTiles, seed);
  if (band < 0) return null;
  return {
    band,
    variant: getSoilVariant(tx, ty, seed),
    typeIndex,
    rarity: getSoilRarityIndex(
      tileType, tx, ty, depthTiles, seed, depthEconomyEnabled,
    ),
  };
}

export function getSoilAtlasOffset(descriptor, damageStage) {
  const stageIndex = Math.max(1, Math.min(SOIL_DAMAGE_STAGE_COUNT, damageStage)) - 1;
  const rarityIndex = Number.isInteger(descriptor.rarityIndex) ? descriptor.rarityIndex : descriptor.rarity || 0;
  if (descriptor.deep) {
    return SURFACE_SOIL_ATLAS_FRAME_COUNT
      + (((descriptor.band * DEEP_SOIL_VARIANT_COUNT + descriptor.variant) * SOIL_TYPE_COUNT + descriptor.typeIndex)
        * SOIL_RARITY_COUNT + rarityIndex) * SOIL_DAMAGE_STAGE_COUNT + stageIndex;
  }
  return (((descriptor.band * SOIL_VARIANT_COUNT + descriptor.variant) * SOIL_TYPE_COUNT + descriptor.typeIndex)
    * SOIL_RARITY_COUNT + rarityIndex) * SOIL_DAMAGE_STAGE_COUNT + stageIndex;
}
import { hashUint, hash01 } from "./deterministicMath.js";
