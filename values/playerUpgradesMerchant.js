import { UPGRADE_CATEGORIES } from "./upgradeCategories.js";

// ==================== PLAYER UPGRADES MERCHANT ====================
export const MERCHANT_UPGRADES = Object.freeze({
  efficientDigging: {
    id: "efficientDigging",
    category: UPGRADE_CATEGORIES.MINING,
    name: "Efficient Digging",
    description: "Reduce energy cost per dig by 10% per level",
    baseCost: 150,
    costMultiplier: 1.5,
    maxLevel: 10,
    effectType: "energyCost",
    merchant: "playerUpgradesMerchant"
  },
  deepBreath: {
    id: "deepBreath",
    category: UPGRADE_CATEGORIES.MINING,
    name: "Deep Breath",
    description: "Hold breath 15% longer per level",
    baseCost: 120,
    costMultiplier: 1.4,
    maxLevel: 5,
    effectType: "breathHolding",
    merchant: "playerUpgradesMerchant"
  },
  fortune: {
    id: "fortune",
    category: UPGRADE_CATEGORIES.DIGGING,
    name: "Fortune",
    description: "5% chance to double resources per level",
    baseCost: 250,
    costMultiplier: 1.8,
    maxLevel: 10,
    effectType: "fortune",
    merchant: "playerUpgradesMerchant"
  },
  efficiency: {
    id: "efficiency",
    category: UPGRADE_CATEGORIES.DIGGING,
    name: "Efficiency",
    description: "Increase dig speed by 10% per level",
    baseCost: 200,
    costMultiplier: 1.6,
    maxLevel: 10,
    effectType: "digSpeed",
    merchant: "playerUpgradesMerchant"
  },
  unbreaking: {
    id: "unbreaking",
    category: UPGRADE_CATEGORIES.EQUIPMENT,
    name: "Unbreaking",
    description: "Pickaxe has 10% chance not to consume durability per level",
    baseCost: 300,
    costMultiplier: 2.0,
    maxLevel: 10,
    effectType: "durabilityChance",
    merchant: "playerUpgradesMerchant"
  },
  strength: {
    id: "strength",
    category: UPGRADE_CATEGORIES.COMBAT,
    name: "Strength",
    description: "Deal 1 extra damage per level",
    baseCost: 180,
    costMultiplier: 1.7,
    maxLevel: 10,
    effectType: "bonusDamage",
    merchant: "playerUpgradesMerchant"
  },
});