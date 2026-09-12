import { TILE_TYPES } from "./tileTypes.js";
import { WORLD_DEPTH_CONFIG } from "./worldDepthConfig.js";

export const TILE_HEALTH = Object.freeze({
  dirt: 3,
  stone: 5,
  copper: 6,
  steel: 8,
  iron: 10,
  bronze: 12,
  silver: 15,
  gold: 20,
  lavaDirt: 32,
  obsidian: 45,
  emberOre: 58,
  magmaCrystal: 75,
  darkDirtNormal: 8,
  darkDirtStrong: 12,
  bedrock: 255,
  gemPowerBlock: 50,
  speedBlock: 30,
  xpBlock: 25,
  sellBlock: 20,
  berserkBlock: 40,
  comboBlock: 30,
  legendBlock: 100,
  abilityBlock: 35,
});

export const TILE_HEALTH_CONFIG = Object.freeze({
  // Celestial talents can multiply the amount of ground cleared during a
  // single activation. Make the approach to the 300m gate keep pace with
  // that power curve, while keeping the authored material ordering intact.
  earlyDepthScaling: Object.freeze({
    thresholdMeters: 300,
    maximumMultiplier: 4,
    exponent: 2,
  }),
  tileHealth: {
    [TILE_TYPES.DIRT]: { min: 45, max: 200 },
    [TILE_TYPES.DARK_DIRT_NORMAL]: { min: 125, max: 362 },
    [TILE_TYPES.DARK_DIRT_STRONG]: { min: 237, max: 625 },
    [TILE_TYPES.STONE]: { min: 87, max: 312 },
    [TILE_TYPES.COPPER]: { min: 140, max: 412 },
    [TILE_TYPES.STEEL]: { min: 87, max: 462 },
    [TILE_TYPES.IRON]: { min: 212, max: 525 },
    [TILE_TYPES.BRONZE]: { min: 312, max: 637 },
    [TILE_TYPES.SILVER]: { min: 450, max: 900 },
    [TILE_TYPES.GOLD]: { min: 1375, max: 2375 },
    [TILE_TYPES.LAVA_DIRT]: { min: 1800, max: 3600 },
    [TILE_TYPES.OBSIDIAN]: { min: 3200, max: 6200 },
    [TILE_TYPES.EMBER_ORE]: { min: 4200, max: 7600 },
    [TILE_TYPES.MAGMA_CRYSTAL]: { min: 5600, max: 9800 },
    // Bonus blocks scale with depth; rarer spawns have stronger shells.
    [TILE_TYPES.GEM_POWER_BLOCK]: { min: 120, max: 6000 },
    [TILE_TYPES.COMBO_BLOCK]: { min: 150, max: 7500 },
    [TILE_TYPES.XP_BLOCK]: { min: 180, max: 9000 },
    [TILE_TYPES.BERSERK_BLOCK]: { min: 240, max: 12000 },
    [TILE_TYPES.SPEED_BLOCK]: { min: 280, max: 14000 },
    [TILE_TYPES.LEGEND_BLOCK]: { min: 480, max: 24000 },
    // The active choice is the reward interaction, so this shell stays brisk
    // even though the block itself is rarer than a Crown.
    [TILE_TYPES.ABILITY_BLOCK]: { min: 160, max: 8000 },
    [TILE_TYPES.ANCIENT_RELIC_CACHE]: { min: 700, max: 700 },
    [TILE_TYPES.TELEPORT_TILE]: { min: 999999999, max: 999999999999 },
    [TILE_TYPES.GAMBLE_TILE]: { min: 99999999999, max: 99999999999999 },
  },
});

export function getTileHealth(tileType, depthTiles) {
  const hc = TILE_HEALTH_CONFIG.tileHealth[tileType];
  if (!hc) return 10;
  if (hc.min === hc.max) return hc.min;
  const maxDepth = WORLD_DEPTH_CONFIG.levelTwoDepthMeters;
  const depth = Math.max(0, Number(depthTiles) || 0);
  const depthRatio = Math.min(1, depth / maxDepth);
  const baseHealth = hc.min + (hc.max - hc.min) * depthRatio;

  // The multiplier rises exponentially through the early expedition and
  // then holds its 300m value, avoiding a durability cliff at the gate.
  const early = TILE_HEALTH_CONFIG.earlyDepthScaling;
  const earlyRatio = Math.min(1, depth / early.thresholdMeters);
  const earlyMultiplier = 1 + (early.maximumMultiplier - 1)
    * (earlyRatio ** early.exponent);
  return Math.floor(baseHealth * earlyMultiplier);
}
