import { UPGRADE_CATEGORIES } from "./upgradeCategories.js";

// ==================== BOBO MERCHANT SPECIAL ====================
export const BOBO_MERCHANT_UPGRADES = Object.freeze({
  mia: {
    id: "mia",
    category: UPGRADE_CATEGORIES.SPECIAL,
    name: "Mia",
    description: "A mysterious companion...",
    baseCost: 21391942151261,
    effectType: "special",
    merchant: "boboMerchant",
    oneTimePurchase: true
  },
  boboWisdom: {
    id: "boboWisdom",
    category: UPGRADE_CATEGORIES.SPECIAL,
    name: "Bobo's Wisdom",
    description: "Ask Bobo for a hint (free)",
    baseCost: 0,
    effectType: "special",
    merchant: "boboMerchant",
  },
});