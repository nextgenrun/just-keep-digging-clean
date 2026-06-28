import { UPGRADE_CATEGORIES } from "./upgradeCategories.js";

// ==================== MONEY MONSTER UPGRADES ====================
export const MONEY_MONSTER_UPGRADES = Object.freeze({
  sellAllButton: {
    id: "sellAllButton",
    category: UPGRADE_CATEGORIES.SPECIAL,
    name: "Sell All Button",
    description: "Adds a button to sell all resources at once",
    baseCost: 100,
    effectType: "sellAllUnlocked",
    merchant: "moneyMonster",
    oneTimePurchase: true
  },
  startResourcePrices: {
    id: "startResourcePrices",
    category: UPGRADE_CATEGORIES.SPECIAL,
    name: "Start Resource Prices",
    description: "Improve prices for dirt, stone, copper",
    baseCost: 50,
    baseEffect: 0.20,
    effectType: "startResourceBonus",
    maxLevel: 4,
    merchant: "moneyMonster"
  },
  nextResourcePrices: {
    id: "nextResourcePrices",
    category: UPGRADE_CATEGORIES.SPECIAL,
    name: "Next Resource Prices",
    description: "Improve prices for iron, bronze, steel, silver, gold",
    baseCost: 100,
    baseEffect: 0.20,
    effectType: "nextResourceBonus",
    maxLevel: 4,
    merchant: "moneyMonster"
  },
  marketInsight: {
    id: "marketInsight",
    category: UPGRADE_CATEGORIES.SPECIAL,
    name: "Market Insight",
    description: "Get bonus money on all sales",
    baseCost: 200,
    baseEffect: 0.10,
    effectType: "marketBonus",
    maxLevel: 4,
    merchant: "moneyMonster"
  },
  luckySales: {
    id: "luckySales",
    category: UPGRADE_CATEGORIES.SPECIAL,
    name: "Lucky Sales",
    description: "Chance for bonus money when selling",
    baseCost: 150,
    baseEffect: 1,
    effectType: "luckySales",
    maxLevel: 4,
    merchant: "moneyMonster"
  }
});
