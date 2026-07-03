import { ASSET_KEYS } from "../../values/assetKeys.js";
import { TILE_TYPES } from "../../values/tileTypes.js";
import {
  SOIL_ATLAS_FRAME_COUNT,
  getSoilAtlasOffset,
  getSoilVisualDescriptor,
} from "../../values/dynamicSoil.js";

export const DAMAGE_STAGE_KEYS_BY_TYPE = Object.freeze({
  [TILE_TYPES.DIRT]: [
    ASSET_KEYS.tiles.dirtHp1,
    ASSET_KEYS.tiles.dirtHp2,
    ASSET_KEYS.tiles.dirtHp3,
    ASSET_KEYS.tiles.dirtHp4,
    ASSET_KEYS.tiles.dirtHp5,
  ],
  [TILE_TYPES.STONE]: [
    ASSET_KEYS.tiles.stoneHp1,
    ASSET_KEYS.tiles.stoneHp2,
    ASSET_KEYS.tiles.stoneHp3,
    ASSET_KEYS.tiles.stoneHp4,
    ASSET_KEYS.tiles.stoneHp5,
  ],
  [TILE_TYPES.COPPER]: [
    ASSET_KEYS.tiles.copperHp1,
    ASSET_KEYS.tiles.copperHp2,
    ASSET_KEYS.tiles.copperHp3,
    ASSET_KEYS.tiles.copperHp4,
    ASSET_KEYS.tiles.copperHp5,
  ],
  [TILE_TYPES.DARK_DIRT_NORMAL]: [
    ASSET_KEYS.tiles.darkDirtNormalHp1,
    ASSET_KEYS.tiles.darkDirtNormalHp2,
    ASSET_KEYS.tiles.darkDirtNormalHp3,
    ASSET_KEYS.tiles.darkDirtNormalHp4,
    ASSET_KEYS.tiles.darkDirtNormalHp5,
  ],
  [TILE_TYPES.DARK_DIRT_STRONG]: [
    ASSET_KEYS.tiles.darkDirtStrongHp1,
    ASSET_KEYS.tiles.darkDirtStrongHp2,
    ASSET_KEYS.tiles.darkDirtStrongHp3,
    ASSET_KEYS.tiles.darkDirtStrongHp4,
    ASSET_KEYS.tiles.darkDirtStrongHp5,
  ],
  [TILE_TYPES.BRONZE]: [
    ASSET_KEYS.tiles.bronzeHp1,
    ASSET_KEYS.tiles.bronzeHp2,
    ASSET_KEYS.tiles.bronzeHp3,
    ASSET_KEYS.tiles.bronzeHp4,
    ASSET_KEYS.tiles.bronzeHp5,
  ],
  [TILE_TYPES.STEEL]: [
    ASSET_KEYS.tiles.steelHp1,
    ASSET_KEYS.tiles.steelHp2,
    ASSET_KEYS.tiles.steelHp3,
    ASSET_KEYS.tiles.steelHp4,
    ASSET_KEYS.tiles.steelHp5,
  ],
  [TILE_TYPES.IRON]: [
    ASSET_KEYS.tiles.ironHp1,
    ASSET_KEYS.tiles.ironHp2,
    ASSET_KEYS.tiles.ironHp3,
    ASSET_KEYS.tiles.ironHp4,
    ASSET_KEYS.tiles.ironHp5,
  ],
  [TILE_TYPES.SILVER]: [
    ASSET_KEYS.tiles.silverHp1,
    ASSET_KEYS.tiles.silverHp2,
    ASSET_KEYS.tiles.silverHp3,
    ASSET_KEYS.tiles.silverHp4,
    ASSET_KEYS.tiles.silverHp5,
  ],
  [TILE_TYPES.GOLD]: [
    ASSET_KEYS.tiles.goldHp1,
    ASSET_KEYS.tiles.goldHp2,
    ASSET_KEYS.tiles.goldHp3,
    ASSET_KEYS.tiles.goldHp4,
    ASSET_KEYS.tiles.goldHp5,
  ],
});

const DAMAGE_SOURCE_KEYS = Object.freeze(Object.values(DAMAGE_STAGE_KEYS_BY_TYPE).flat());
const DAMAGE_STAGE_COUNT = 5;
const DAMAGE_TILE_TYPES = Object.freeze(Object.keys(DAMAGE_STAGE_KEYS_BY_TYPE).map(Number));
const DAMAGE_INDEX_START_BY_TYPE = Object.freeze(
  DAMAGE_TILE_TYPES.reduce((acc, type, typeIndex) => {
    acc[type] = SOIL_ATLAS_FRAME_COUNT + typeIndex * DAMAGE_STAGE_COUNT;
    return acc;
  }, {})
);

const STATIC_SOURCE_KEYS = Object.freeze([
  ASSET_KEYS.tiles.bedrock,
  ASSET_KEYS.tiles.caveWall,
  ASSET_KEYS.tiles.caveEdge,
  ASSET_KEYS.tiles.caveCeiling,
  ASSET_KEYS.tiles.caveCeilingChains,
  ASSET_KEYS.tiles.treasureStone,
  ASSET_KEYS.tiles.skyIslandTop,
  ASSET_KEYS.tiles.chestNormal,
  ASSET_KEYS.tiles.chestRare,
  ASSET_KEYS.tiles.teleportTile,
  ASSET_KEYS.tiles.gambleTile,
  ASSET_KEYS.tiles.floorTown1,
  ASSET_KEYS.tiles.floorTown2,
  ASSET_KEYS.tiles.gemPowerBlock,
  ASSET_KEYS.tiles.speedBlock,
  ASSET_KEYS.tiles.xpBlock,
  ASSET_KEYS.tiles.sellBlock,
  ASSET_KEYS.tiles.critBlock,
  ASSET_KEYS.tiles.berserkBlock,
  ASSET_KEYS.tiles.comboBlock,
  ASSET_KEYS.tiles.legendBlock,
  ASSET_KEYS.tiles.rootOverlay,
  ASSET_KEYS.tiles.rootOverlayDeep,
  ASSET_KEYS.tiles.geodeInterior,
]);

export const TILESET_SOURCE_KEYS = Object.freeze([
  ...DAMAGE_SOURCE_KEYS,
  ...STATIC_SOURCE_KEYS,
]);

const STATIC_INDEX_START = SOIL_ATLAS_FRAME_COUNT + DAMAGE_SOURCE_KEYS.length + 1;
export const RUBBLE_TILE_TYPES = DAMAGE_TILE_TYPES;
export const RUBBLE_DAMAGE_STAGE_COUNT = DAMAGE_STAGE_COUNT;
export const RUBBLE_INDEX_START = SOIL_ATLAS_FRAME_COUNT + TILESET_SOURCE_KEYS.length + 1;
export const RUBBLE_FRAME_COUNT = RUBBLE_TILE_TYPES.length * RUBBLE_DAMAGE_STAGE_COUNT;

export const TILE_RENDER_INDEX = Object.freeze({
  BEDROCK: STATIC_INDEX_START,
  CAVE_WALL: STATIC_INDEX_START + 1,
  CAVE_EDGE: STATIC_INDEX_START + 2,
  CAVE_CEILING: STATIC_INDEX_START + 3,
  CAVE_CEILING_CHAINS: STATIC_INDEX_START + 4,
  TREASURE_STONE: STATIC_INDEX_START + 5,
  SKY_ISLAND_TOP: STATIC_INDEX_START + 6,
  CHEST: STATIC_INDEX_START + 7,
  CHEST_RARE: STATIC_INDEX_START + 8,
  TELEPORT_TILE: STATIC_INDEX_START + 9,
  GAMBLE_TILE: STATIC_INDEX_START + 10,
  FLOOR_TOWN_1: STATIC_INDEX_START + 11,
  FLOOR_TOWN_2: STATIC_INDEX_START + 12,
  GEM_POWER_BLOCK: STATIC_INDEX_START + 13,
  SPEED_BLOCK: STATIC_INDEX_START + 14,
  XP_BLOCK: STATIC_INDEX_START + 15,
  SELL_BLOCK: STATIC_INDEX_START + 16,
  CRIT_BLOCK: STATIC_INDEX_START + 17,
  BERSERK_BLOCK: STATIC_INDEX_START + 18,
  COMBO_BLOCK: STATIC_INDEX_START + 19,
  LEGEND_BLOCK: STATIC_INDEX_START + 20,
  ROOT_OVERLAY: STATIC_INDEX_START + 21,
  ROOT_OVERLAY_DEEP: STATIC_INDEX_START + 22,
  GLOW_CRYSTAL: -1,
  GEODE_INTERIOR: STATIC_INDEX_START + 23,
});

function visualHash(tx, ty, seed, salt = 0) {
  let value = Math.imul(tx | 0, 0x1f123bb5) ^ Math.imul(ty | 0, 0x5f356495);
  value ^= Math.imul(seed | 0, 0x6c8e9cf5) ^ Math.imul(salt | 0, 0x27d4eb2d);
  value = Math.imul(value ^ (value >>> 15), 0x2c1b3c6d);
  value = Math.imul(value ^ (value >>> 12), 0x297a2d39);
  return (value ^ (value >>> 15)) >>> 0;
}

export function getDamageStage(hp, maxHp) {
  if (!Number.isFinite(hp) || hp <= 0) {
    return 1;
  }

  if (!Number.isFinite(maxHp) || maxHp <= 0) {
    return 5;
  }

  const ratio = Math.max(0, Math.min(1, hp / maxHp));
  if (ratio > 0.8) return 5;
  if (ratio > 0.6) return 4;
  if (ratio > 0.4) return 3;
  if (ratio > 0.2) return 2;
  return 1;
}

function getDamageRenderIndex(type, hp, maxHp) {
  const start = DAMAGE_INDEX_START_BY_TYPE[type];
  if (!Number.isFinite(start)) {
    return null;
  }

  const stage = getDamageStage(hp, maxHp);
  return start + stage;
}

export function getRubbleRenderIndex(type, hp, maxHp) {
  const typeIndex = RUBBLE_TILE_TYPES.indexOf(type);
  if (typeIndex < 0) {
    return null;
  }

  return RUBBLE_INDEX_START
    + typeIndex * RUBBLE_DAMAGE_STAGE_COUNT
    + getDamageStage(hp, maxHp) - 1;
}

export function getTileRenderIndex(type, hp, maxHp = hp, tx = 0, ty = 0, depthTiles = 0, seed = 0, visualHint = "") {
  if (type === TILE_TYPES.AIR) {
    return -1;
  }

  const soil = getSoilVisualDescriptor(type, tx, ty, depthTiles, seed);
  if (soil) {
    return 1 + getSoilAtlasOffset(soil, getDamageStage(hp, maxHp));
  }

  if (type === TILE_TYPES.BEDROCK) {
    if (visualHint === "skyIslandTop") {
      return TILE_RENDER_INDEX.SKY_ISLAND_TOP;
    }
    return TILE_RENDER_INDEX.BEDROCK;
  }

  if (type === TILE_TYPES.CAVE_WALL) {
    if (visualHint === "caveCeiling") {
      return visualHash(tx, ty, seed, 641) % 5 === 0
        ? TILE_RENDER_INDEX.CAVE_CEILING_CHAINS
        : TILE_RENDER_INDEX.CAVE_CEILING;
    }
    if (visualHint === "caveEdge") return TILE_RENDER_INDEX.CAVE_EDGE;
    return TILE_RENDER_INDEX.CAVE_WALL;
  }

  if (type === TILE_TYPES.GEODE_WALL) {
    return TILE_RENDER_INDEX.TREASURE_STONE;
  }

  const damageRenderIndex = getDamageRenderIndex(type, hp, maxHp);
  if (damageRenderIndex !== null) {
    return damageRenderIndex;
  }

  if (type === TILE_TYPES.TELEPORT_TILE) {
    return TILE_RENDER_INDEX.TELEPORT_TILE;
  }

  if (type === TILE_TYPES.GAMBLE_TILE) {
    return TILE_RENDER_INDEX.GAMBLE_TILE;
  }

  if (type === TILE_TYPES.FLOOR_TOWN_1) {
    return TILE_RENDER_INDEX.FLOOR_TOWN_1;
  }

  if (type === TILE_TYPES.FLOOR_TOWN_2) {
    return TILE_RENDER_INDEX.FLOOR_TOWN_2;
  }

  if (type === TILE_TYPES.SKY_TILE) {
    return TILE_RENDER_INDEX.BEDROCK;
  }

  if (type === TILE_TYPES.GEM_POWER_BLOCK) {
    return TILE_RENDER_INDEX.GEM_POWER_BLOCK;
  }

  if (type === TILE_TYPES.SPEED_BLOCK) {
    return TILE_RENDER_INDEX.SPEED_BLOCK;
  }

  if (type === TILE_TYPES.XP_BLOCK) {
    return TILE_RENDER_INDEX.XP_BLOCK;
  }

  if (type === TILE_TYPES.SELL_BLOCK) {
    return TILE_RENDER_INDEX.SELL_BLOCK;
  }

  if (type === TILE_TYPES.CRIT_BLOCK) {
    return TILE_RENDER_INDEX.CRIT_BLOCK;
  }

  if (type === TILE_TYPES.BERSERK_BLOCK) {
    return TILE_RENDER_INDEX.BERSERK_BLOCK;
  }

  if (type === TILE_TYPES.COMBO_BLOCK) {
    return TILE_RENDER_INDEX.COMBO_BLOCK;
  }

  if (type === TILE_TYPES.LEGEND_BLOCK) {
    return TILE_RENDER_INDEX.LEGEND_BLOCK;
  }

  if (type === TILE_TYPES.ROOT_OVERLAY || type === TILE_TYPES.ROOT_OVERLAY_DEEP) {
    return -1;
  }

  if (type === TILE_TYPES.CHEST) {
    return visualHash(tx, ty, seed, 947) % 7 === 0
      ? TILE_RENDER_INDEX.CHEST_RARE
      : TILE_RENDER_INDEX.CHEST;
  }

  if (type === TILE_TYPES.GLOW_CRYSTAL) {
    return -1;
  }

  if (type === TILE_TYPES.GEODE_INTERIOR) {
    return TILE_RENDER_INDEX.GEODE_INTERIOR;
  }

  return -1;
}
