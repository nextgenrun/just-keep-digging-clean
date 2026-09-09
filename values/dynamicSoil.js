import { TILE_TYPES } from "./tileTypes.js";
import { hash01, hashUint } from "./deterministicMath.js";

export const SOIL_DEPTH_LIMIT = 1000;
export const SOIL_BAND_SIZE = 200;
export const SOIL_BAND_COUNT = 5;
export const SOIL_VARIANT_COUNT = 3;
export const DEEP_SOIL_DEPTH_START = 1000;
export const DEEP_SOIL_BAND_SIZE = 200;
export const DEEP_SOIL_BAND_COUNT = 4;
export const DEEP_SOIL_VARIANT_COUNT = 6;
export const SOIL_TYPE_COUNT = 3;
// Ordinary underground resources have one visual/economy tier. Multipliers
// belong exclusively to the independent Star rarity progression.
export const SOIL_RARITY_COUNT = 1;
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
      rarity: 0,
      deep: true,
    };
  }

  const band = getSoilBand(tx, depthTiles, seed);
  if (band < 0) return null;
  return {
    band,
    variant: getSoilVariant(tx, ty, seed),
    typeIndex,
    rarity: 0,
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
