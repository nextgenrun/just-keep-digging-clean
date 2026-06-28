import { UPGRADE_CATEGORIES } from "./upgradeCategories.js";

// ==================== GEM POWER MERCHANT UPGRADES ====================
export const GEM_POWER_MERCHANT_UPGRADES = Object.freeze({
  gemPowerTank: {
    id: "gemPowerTank",
    category: UPGRADE_CATEGORIES.GEM_POWER,
    name: "Gem Power Tank",
    description: "Increases max Gem Power capacity",
    baseCost: 15,
    baseEffect: 20,
    effectType: "gemPowerMax",
    merchant: "gemPowerMerchant"
  },
  gemPowerRegeneration: {
    id: "gemPowerRegeneration",
    category: UPGRADE_CATEGORIES.GEM_POWER,
    name: "Gem Power Regeneration",
    description: "Increases Gem Power regeneration rate",
    baseCost: 35,
    baseEffect: 3,
    effectType: "gemPowerRegenIncrease",
    merchant: "gemPowerMerchant"
  },
  gemFlySpeed: {
    id: "gemFlySpeed",
    category: UPGRADE_CATEGORIES.GEM_POWER,
    name: "Gem Fly Speed",
    description: "Increases flight/climbing speed in all directions. Scales aggressively!",
    baseCost: 60,
    baseEffect: 40,
    effectType: "levitationSpeed",
    merchant: "gemPowerMerchant"
  },
  gemVisionUnlock: {
    id: "gemVisionUnlock",
    category: UPGRADE_CATEGORIES.GEM_POWER,
    name: "Gem Vision",
    description: "Hold Z to zoom out and see more of world! Consumes Gem Power while active.",
    baseCost: 150,
    baseEffect: 2,
    effectType: "gemVisionUnlocked",
    merchant: "gemPowerMerchant",
    oneTimePurchase: true
  },
  gemVisionRange: {
    id: "gemVisionRange",
    category: UPGRADE_CATEGORIES.GEM_POWER,
    name: "Gem Vision Range",
    description: "Increases zoom out range to see even more of world",
    baseCost: 200,
    baseEffect: 2,
    effectType: "gemVisionRange",
    merchant: "gemPowerMerchant"
  },
  gemVisionEfficiency: {
    id: "gemVisionEfficiency",
    category: UPGRADE_CATEGORIES.GEM_POWER,
    name: "Gem Vision Efficiency",
    description: "Reduces Gem Power drain while using Gem Vision",
    baseCost: 300,
    baseEffect: 2,
    effectType: "gemVisionDrainReduction",
    merchant: "gemPowerMerchant"
  },
  upOrDown: {
    id: "upOrDown",
    category: UPGRADE_CATEGORIES.GEM_POWER,
    name: "Up or Down - It's a Matter of Perspective",
    description: "??? Requires 10,000,000,000 GP + Angel's Heart. What could it be?",
    baseCost: 10000000000,
    effectType: "upOrDown",
    merchant: "gemPowerMerchant",
    oneTimePurchase: true,
    requiresAngelHeart: true
  }
});
