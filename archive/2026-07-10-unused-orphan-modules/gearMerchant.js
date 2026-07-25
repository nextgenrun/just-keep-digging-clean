import { UPGRADE_CATEGORIES } from "./upgradeCategories.js";

// ==================== GEAR MERCHANT - PICKAXES ====================
export const GEAR_MERCHANT_UPGRADES = Object.freeze({
  bronzePickaxe: {
    oneTimePurchase: true,
    id: "bronzePickaxe",
    category: UPGRADE_CATEGORIES.PICKAXES,
    name: "Bronze Pickaxe",
    description: "12 flat damage. Efficient on dirt, stone, copper.",
    goldCost: 10,
    resources: {
      copper: 5,
      stone: 10
    },
    baseDamage: 12,
    damageMultipliers: {
      dirt: 1.0,
      stone: 1.0,
      copper: 0.75,
      default: 0.5
    },
    metalTier: 1,
    merchant: "gearMerchant"
  },
  ironPickaxe: {
    oneTimePurchase: true,
    id: "ironPickaxe",
    category: UPGRADE_CATEGORIES.PICKAXES,
    name: "Iron Pickaxe",
    description: "10 flat damage. Efficient on steel, copper, stone.",
    goldCost: 50,
    resources: {
      copper: 20,
      stone: 50,
      steel: 5
    },
    baseDamage: 18,
    damageMultipliers: {
      steel: 1.0,
      copper: 1.0,
      stone: 1.0,
      default: 0.75
    },
    metalTier: 2,
    merchant: "gearMerchant"
  },
  steelPickaxe: {
    oneTimePurchase: true,
    id: "steelPickaxe",
    category: UPGRADE_CATEGORIES.PICKAXES,
    name: "Steel Pickaxe",
    description: "15 flat damage. Efficient on iron and above. Bonus on bronze.",
    goldCost: 200,
    resources: {
      copper: 50,
      stone: 100,
      steel: 20,
      iron: 5
    },
    baseDamage: 15,
    damageMultipliers: {
      iron: 1.0,
      bronze: 1.5,
      default: 1.0
    },
    metalTier: 3,
    merchant: "gearMerchant"
  },
  mithrilPickaxe: {
    oneTimePurchase: true,
    id: "mithrilPickaxe",
    category: UPGRADE_CATEGORIES.PICKAXES,
    name: "Mithril Pickaxe",
    description: "25 flat damage. Efficient on silver and above. Bonus on steel.",
    goldCost: 1000,
    resources: {
      copper: 100,
      stone: 200,
      steel: 50,
      iron: 20,
      bronze: 10
    },
    baseDamage: 25,
    damageMultipliers: {
      silver: 1.0,
      default: 1.0,
      steel: 1.5
    },
    metalTier: 4,
    merchant: "gearMerchant"
  },
  adamantPickaxe: {
    oneTimePurchase: true,
    id: "adamantPickaxe",
    category: UPGRADE_CATEGORIES.PICKAXES,
    name: "Adamant Pickaxe",
    description: "40 flat damage. Efficient on all above. Bonus on mithril. Reduced on gold.",
    goldCost: 5000,
    resources: {
      copper: 200,
      steel: 100,
      iron: 50,
      bronze: 25,
      silver: 5
    },
    baseDamage: 40,
    damageMultipliers: {
      gold: 0.5,
      default: 1.0,
      mithril: 1.5
    },
    metalTier: 5,
    merchant: "gearMerchant"
  },
  runePickaxe: {
    oneTimePurchase: true,
    id: "runePickaxe",
    category: UPGRADE_CATEGORIES.PICKAXES,
    name: "Rune Pickaxe",
    description: "60 flat damage. Efficient on gold and above. Bonus on adamant.",
    goldCost: 25000,
    resources: {
      iron: 100,
      steel: 200,
      bronze: 50,
      silver: 20,
      gold: 5
    },
    baseDamage: 60,
    damageMultipliers: {
      gold: 1.0,
      default: 1.0,
      adamant: 1.5
    },
    metalTier: 6,
    merchant: "gearMerchant"
  },
  dragonPickaxe: {
    oneTimePurchase: true,
    id: "dragonPickaxe",
    category: UPGRADE_CATEGORIES.PICKAXES,
    name: "Dragon Pickaxe",
    description: "80 flat damage. Bonus on gold. Efficient on all tiles.",
    goldCost: 120,
    resources: {
      iron: 200,
      steel: 400,
      silver: 50,
      gold: 20
    },
    baseDamage: 80,
    damageMultipliers: {
      gold: 1.5,
      default: 1.0
    },
    metalTier: 7,
    merchant: "gearMerchant"
  },
});
