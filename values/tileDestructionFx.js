import { TILE_TYPES } from "./tileTypes.js";
import { SPECIAL_BLOCKS_CONFIG } from "./specialBlocks.js";

const softenTint = (color, whiteMix = 0.4) => {
  const mix = Math.max(0, Math.min(1, whiteMix));
  const channel = shift => {
    const value = (color >> shift) & 0xff;
    return Math.round(value + (0xff - value) * mix);
  };
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
};

const FAMILY_ROWS = Object.freeze({
  dirt: 0,
  damp: 1,
  hard: 2,
  copper: 3,
  bronze: 4,
  iron: 5,
  steel: 6,
  silver: 7,
  gold: 8,
  lava: 9,
  obsidian: 10,
  ember: 11,
  magma: 12,
  crystal: 13,
  geode: 14,
  relic: 15,
  special: 16,
});

const FAMILY_BY_TILE = Object.freeze({
  [TILE_TYPES.DIRT]: "dirt",
  [TILE_TYPES.STONE]: "hard",
  [TILE_TYPES.COPPER]: "copper",
  [TILE_TYPES.BEDROCK]: "hard",
  [TILE_TYPES.DARK_DIRT_NORMAL]: "damp",
  [TILE_TYPES.DARK_DIRT_STRONG]: "damp",
  [TILE_TYPES.BRONZE]: "bronze",
  [TILE_TYPES.STEEL]: "steel",
  [TILE_TYPES.IRON]: "iron",
  [TILE_TYPES.SILVER]: "silver",
  [TILE_TYPES.GOLD]: "gold",
  [TILE_TYPES.TELEPORT_TILE]: "special",
  [TILE_TYPES.GAMBLE_TILE]: "special",
  [TILE_TYPES.FLOOR_TOWN_1]: "hard",
  [TILE_TYPES.FLOOR_TOWN_2]: "hard",
  [TILE_TYPES.SKY_TILE]: "crystal",
  [TILE_TYPES.GEM_POWER_BLOCK]: "special",
  [TILE_TYPES.SPEED_BLOCK]: "special",
  [TILE_TYPES.XP_BLOCK]: "special",
  [TILE_TYPES.CRIT_BLOCK]: "special",
  [TILE_TYPES.BERSERK_BLOCK]: "special",
  [TILE_TYPES.COMBO_BLOCK]: "special",
  [TILE_TYPES.LEGEND_BLOCK]: "special",
  [TILE_TYPES.CAVE_WALL]: "hard",
  [TILE_TYPES.GEODE_INTERIOR]: "geode",
  [TILE_TYPES.GEODE_WALL]: "geode",
  [TILE_TYPES.CHEST]: "relic",
  [TILE_TYPES.GLOW_CRYSTAL]: "crystal",
  [TILE_TYPES.LAVA_DIRT]: "lava",
  [TILE_TYPES.OBSIDIAN]: "obsidian",
  [TILE_TYPES.EMBER_ORE]: "ember",
  [TILE_TYPES.MAGMA_CRYSTAL]: "magma",
  [TILE_TYPES.ANCIENT_RELIC_CACHE]: "relic",
});

const TINT_BY_TILE = Object.freeze({
  [TILE_TYPES.DIRT]: 0xffffff,
  [TILE_TYPES.STONE]: 0xc7cdd1,
  [TILE_TYPES.COPPER]: 0xdf9c69,
  [TILE_TYPES.BEDROCK]: 0x8998aa,
  [TILE_TYPES.DARK_DIRT_NORMAL]: 0xc6a78e,
  [TILE_TYPES.DARK_DIRT_STRONG]: 0x9b7864,
  [TILE_TYPES.BRONZE]: 0xd09662,
  [TILE_TYPES.IRON]: 0xd6d8d9,
  [TILE_TYPES.STEEL]: 0xe1e8ec,
  [TILE_TYPES.SILVER]: 0xf2f4f5,
  [TILE_TYPES.GOLD]: 0xffdf79,
  [TILE_TYPES.TELEPORT_TILE]: 0x9deaff,
  [TILE_TYPES.GAMBLE_TILE]: 0xffb56f,
  [TILE_TYPES.FLOOR_TOWN_1]: 0xb19a7d,
  [TILE_TYPES.FLOOR_TOWN_2]: 0x8b7780,
  [TILE_TYPES.SKY_TILE]: 0xb8ecff,
  [TILE_TYPES.GEM_POWER_BLOCK]: softenTint(
    SPECIAL_BLOCKS_CONFIG.glowEffects.gemPowerBlock.color,
  ),
  [TILE_TYPES.SPEED_BLOCK]: softenTint(
    SPECIAL_BLOCKS_CONFIG.glowEffects.speedBlock.color,
  ),
  [TILE_TYPES.XP_BLOCK]: softenTint(
    SPECIAL_BLOCKS_CONFIG.glowEffects.xpBlock.color,
  ),
  [TILE_TYPES.CRIT_BLOCK]: softenTint(
    SPECIAL_BLOCKS_CONFIG.glowEffects.critBlock.color,
  ),
  [TILE_TYPES.BERSERK_BLOCK]: softenTint(
    SPECIAL_BLOCKS_CONFIG.glowEffects.berserkBlock.color,
  ),
  [TILE_TYPES.COMBO_BLOCK]: SPECIAL_BLOCKS_CONFIG.glowEffects.comboBlock.color,
  [TILE_TYPES.LEGEND_BLOCK]: 0xffe28a,
  [TILE_TYPES.CAVE_WALL]: 0x8499a8,
  [TILE_TYPES.GEODE_INTERIOR]: 0x70ffd6,
  [TILE_TYPES.GEODE_WALL]: 0xb675ff,
  [TILE_TYPES.CHEST]: 0xd8a35a,
  [TILE_TYPES.GLOW_CRYSTAL]: 0x66e8ff,
  [TILE_TYPES.LAVA_DIRT]: 0xffb274,
  [TILE_TYPES.OBSIDIAN]: 0x777487,
  [TILE_TYPES.EMBER_ORE]: 0xff9a58,
  [TILE_TYPES.MAGMA_CRYSTAL]: 0xff6fb4,
  [TILE_TYPES.ANCIENT_RELIC_CACHE]: 0xffd58a,
});

export const TILE_DESTRUCTION_FX_CONFIG = Object.freeze({
  schemaVersion: 3,
  enabled: true,
  rollback: Object.freeze({
    queryParam: "authoredMineImpact",
    disabledValues: Object.freeze(["0", "false", "off", "legacy"]),
  }),
  reducedMotionMediaQuery: "(prefers-reduced-motion: reduce)",
  families: FAMILY_ROWS,
  familyByTile: FAMILY_BY_TILE,
  tintByTile: TINT_BY_TILE,
  defaultFamily: "hard",
  defaultTint: 0xffffff,
  assets: Object.freeze({
    core: Object.freeze({
      key: "tile-destruction-core-v3",
      path: "sprites/fx/tile-destruction-fx-v3/tile-break-core-v3.png",
      frameWidth: 256,
      frameHeight: 208,
      columns: 4,
    }),
    shards: Object.freeze({
      key: "tile-destruction-shards-v3",
      path: "sprites/fx/tile-destruction-fx-v3/tile-break-shards-v3.png",
      frameWidth: 80,
      frameHeight: 80,
      columns: 5,
    }),
  }),
  core: Object.freeze({
    phases: Object.freeze(["p01", "p02", "p03", "p04"]),
    phaseTimesMs: Object.freeze([0, 58, 126, 214]),
    displayWidthTiles: 1.08,
    displayHeightTiles: 0.88,
    offsetYTiles: 0.015,
    depth: 36,
    alpha: 0.96,
    startScale: 0.88,
    impactScale: 1.035,
    settleScale: 1.01,
    enterMs: 68,
    fadeMs: 185,
  }),
  shards: Object.freeze({
    count: 5,
    reducedMotionCount: 2,
    depth: 38,
    displayMinTiles: 0.13,
    displayMaxTiles: 0.22,
    spawnRadiusTiles: 0.05,
    launchMinTiles: 0.18,
    launchMaxTiles: 0.42,
    lateralSpreadTiles: 0.34,
    liftTiles: 0.09,
    gravityTiles: 0.2,
    startScale: 0.52,
    midScale: 0.94,
    cameraScale: 1.28,
    launchMinMs: 105,
    launchMaxMs: 145,
    settleMinMs: 175,
    settleMaxMs: 235,
    rotationMin: 0.55,
    rotationMax: 1.7,
  }),
});

export function getTileDestructionFxPreloadAssets(config = TILE_DESTRUCTION_FX_CONFIG) {
  return Object.values(config.assets).map(({ key, path }) => ({ key, path }));
}

export function resolveTileDestructionFxEnabled(
  search = globalThis.location?.search || "",
  config = TILE_DESTRUCTION_FX_CONFIG,
) {
  if (config.enabled !== true) return false;
  const value = new URLSearchParams(search)
    .get(config.rollback.queryParam)
    ?.trim()
    .toLowerCase();
  return !value || !config.rollback.disabledValues.includes(value);
}

export function resolveTileDestructionFamily(tileType, config = TILE_DESTRUCTION_FX_CONFIG) {
  return config.familyByTile[tileType] || config.defaultFamily;
}

export function resolveTileDestructionTint(tileType, config = TILE_DESTRUCTION_FX_CONFIG) {
  return config.tintByTile[tileType] || config.defaultTint;
}
