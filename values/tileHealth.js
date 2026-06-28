import { TILE_TYPES } from "./tileTypes.js";

export const TILE_HEALTH = Object.freeze({
  dirt: 3,
  stone: 5,
  copper: 6,
  steel: 8,
  iron: 10,
  bronze: 12,
  silver: 15,
  gold: 20,
  darkDirtNormal: 8,
  darkDirtStrong: 12,
  bedrock: 255,
  gemPowerBlock: 50,
  speedBlock: 30,
  xpBlock: 25,
  sellBlock: 20,
  critBlock: 35,
  berserkBlock: 40,
  comboBlock: 30,
  legendBlock: 100,
});

export const TILE_HEALTH_CONFIG = Object.freeze({
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
    [TILE_TYPES.TELEPORT_TILE]: { min: 999999999, max: 999999999999 },
    [TILE_TYPES.GAMBLE_TILE]: { min: 99999999999, max: 99999999999999 },
  },
});

export function getTileHealth(tileType, depthTiles, rarityMultiplier = 1) {
  const hc = TILE_HEALTH_CONFIG.tileHealth[tileType];
  if (!hc) return 10;
  if (hc.min === hc.max) return hc.min;
  const maxDepth = 1940;
  const dr = Math.min(1, Math.max(0, depthTiles / maxDepth));
  const bh = Math.floor(hc.min + (hc.max - hc.min) * dr);
  return Math.floor(bh * rarityMultiplier);
}
