import { NEXT_RESOURCE_KEYS, START_RESOURCE_KEYS } from "./resourceTypes.js";

// ==================== RESOURCE PRICES CONFIG ====================
export const RESOURCE_PRICES_CONFIG = Object.freeze({
  // Base prices for selling resources
  basePrices: {
    dirt: 1,
    stone: 5,
    copper: 15,
    darkDirtNormal: 3,
    darkDirtStrong: 5,
    steel: 50,
    iron: 75,
    bronze: 100,
    silver: 250,
    gold: 500,
    lavaDirt: 120,
    obsidian: 1200,
    emberOre: 3200,
    magmaCrystal: 8000,
    cloudstone: 900,
    stormglass: 4200,
    halostone: 1500,
    lumenite: 6800,
    cinderstone: 2600,
    hellglass: 12000,
  },
  
  // Resource name mapping for UI
  resourceNames: {
    dirt: "Dirt",
    stone: "Stone",
    copper: "Copper",
    darkDirtNormal: "Dark Dirt",
    darkDirtStrong: "Hard Dark Dirt",
    steel: "Steel",
    iron: "Iron",
    bronze: "Bronze",
    silver: "Silver",
    gold: "Gold",
    lavaDirt: "Lava Dirt",
    obsidian: "Obsidian",
    emberOre: "Ember Ore",
    magmaCrystal: "Magma Crystal",
    cloudstone: "Cloudstone",
    stormglass: "Stormglass",
    halostone: "Halostone",
    lumenite: "Lumenite",
    cinderstone: "Cinderstone",
    hellglass: "Hellglass",
  },
});

export function getAdjustedResourceUnitPrice(resource, effects = {}, basePriceOverride = null) {
  let price = Number.isFinite(basePriceOverride)
    ? Math.max(0, basePriceOverride)
    : RESOURCE_PRICES_CONFIG.basePrices[resource] || 0;
  if (START_RESOURCE_KEYS.includes(resource) && effects.startResourceBonus > 0) {
    price = Math.floor(price * (1 + effects.startResourceBonus));
  }
  if (NEXT_RESOURCE_KEYS.includes(resource) && effects.nextResourceBonus > 0) {
    price = Math.floor(price * (1 + effects.nextResourceBonus));
  }
  if (effects.marketBonus > 0) price = Math.floor(price * (1 + effects.marketBonus));
  return price;
}

export function getCargoSellValue(resources, effects = {}, resourceKeys = null) {
  const allowed = Array.isArray(resourceKeys) ? new Set(resourceKeys) : null;
  return Object.entries(resources || {}).reduce((total, [resource, amount]) => {
    if (allowed && !allowed.has(resource)) return total;
    const count = Number.isFinite(Number(amount)) ? Math.max(0, Math.floor(Number(amount))) : 0;
    return total + count * getAdjustedResourceUnitPrice(resource, effects);
  }, 0);
}
