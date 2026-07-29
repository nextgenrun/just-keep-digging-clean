import { TILE_TYPES } from "../../values/tileTypes.js";
import { getGemPowerBlockTier } from "../../values/specialBlocks.js";

export const SPECIAL_MARKER_KEY_BY_TYPE = Object.freeze({
  [TILE_TYPES.TELEPORT_TILE]: "teleport",
  [TILE_TYPES.GAMBLE_TILE]: "gamble",
  [TILE_TYPES.GEM_POWER_BLOCK]: "gemPower",
  [TILE_TYPES.SPEED_BLOCK]: "speed",
  [TILE_TYPES.XP_BLOCK]: "xp",
  [TILE_TYPES.CRIT_BLOCK]: "crit",
  [TILE_TYPES.BERSERK_BLOCK]: "berserk",
  [TILE_TYPES.COMBO_BLOCK]: "combo",
  [TILE_TYPES.LEGEND_BLOCK]: "legend",
  [TILE_TYPES.GEODE_INTERIOR]: "geodeInterior",
  [TILE_TYPES.GEODE_WALL]: "geodeWall",
  [TILE_TYPES.CHEST]: "chest",
  [TILE_TYPES.ANCIENT_RELIC_CACHE]: "ancientRelic",
  [TILE_TYPES.GLOW_CRYSTAL]: "glowCrystal",
});

export const clamp01 = value => Math.max(0, Math.min(1, value));
export const scenicFacadeTextureKey = material => `world-scenic-facade-${material}`;

export function scenicMarkerVariant(tx, ty, type, variants) {
  let hash = Math.imul(tx + 17, 374761393) ^ Math.imul(ty + 31, 668265263) ^ Math.imul(type + 7, 2246822519);
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  return ((hash ^ (hash >>> 16)) >>> 0) % variants;
}

export function resolveScenicFacadeMarker(
  markerConfig,
  tileType,
  resourceKey,
  tileY,
  topAirRows = 0
) {
  const resourceMarker = markerConfig.resourceMarkers[resourceKey];
  if (resourceMarker) return resourceMarker;
  if (tileType === TILE_TYPES.GEM_POWER_BLOCK) {
    const depthTiles = Math.max(0, tileY - topAirRows);
    const tier = getGemPowerBlockTier(depthTiles);
    return markerConfig.specialMarkers.gemPowerTiers?.[tier.id]
      || markerConfig.specialMarkers.gemPower;
  }
  return markerConfig.specialMarkers[SPECIAL_MARKER_KEY_BY_TYPE[tileType]];
}

export function mixScenicColor(from, to, amount) {
  const t = clamp01(amount);
  const channel = shift => Math.round(((from >> shift) & 255) * (1 - t) + ((to >> shift) & 255) * t);
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}
