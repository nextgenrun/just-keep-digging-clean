import { UPGRADE_CATEGORIES } from "./upgradeCategories.js";

// ==================== UPGRADES DEFINITIONS ====================
export const UPGRADES = Object.freeze({
  // GEM POWER MERCHANT UPGRADES
  gemPowerUnlock: {
    id: "gemPowerUnlock",
    category: UPGRADE_CATEGORIES.GEM_POWER,
    name: "Gem of Great Power",
    description: "Unlock power of flight! Hold Shift in the air to fly.",
    goldCost: 100,
    baseEffect: 1,
    effectType: "gemPowerUnlocked",
    merchant: "gemPowerMerchant",
    oneTimePurchase: true,
    hiddenFromShop: true
  },
  gemPowerTank: {
    id: "gemPowerTank",
    category: UPGRADE_CATEGORIES.GEM_POWER,
    name: "Gem Power Tank",
    description: "Increases max Gem Power capacity (+40 GP per level)",
    baseCost: 45,
    baseEffect: 40,
    effectType: "gemPowerMax",
    merchant: "gemPowerMerchant",
    maxEffect: 600
  },
  gemPowerEfficiency: {
    id: "gemPowerEfficiency",
    category: UPGRADE_CATEGORIES.GEM_POWER,
    name: "Gem Power Efficiency",
    description: "Reduces Gem Power drain per second (max -5 GP/s across 10 levels)",
    baseCost: 75,
    baseEffect: 0.5,
    effectType: "gemPowerDrainReduction",
    maxLevel: 10,
    merchant: "gemPowerMerchant"
  },
  gemPowerRegeneration: {
    id: "gemPowerRegeneration",
    category: UPGRADE_CATEGORIES.GEM_POWER,
    name: "Gem Power Regeneration",
    description: "Increases Gem Power regeneration rate",
    baseCost: 105,
    baseEffect: 3,
    effectType: "gemPowerRegenIncrease",
    merchant: "gemPowerMerchant",
    maxEffect: 45
  },
  gemFlySpeed: {
    id: "gemFlySpeed",
    category: UPGRADE_CATEGORIES.GEM_POWER,
    name: "Gem Fly Speed",
    description: "Increases flight/climbing speed in all directions. Scales aggressively!",
    baseCost: 180,
    baseEffect: 40,
    effectType: "levitationSpeed",
    merchant: "gemPowerMerchant",
    maxEffect: 400
  },
  
  // GEM VISION UPGRADES
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
    description: "Increases zoom out range to see more of world (each level zooms further out)",
    baseCost: 200,
    baseEffect: 0.05,
    effectType: "gemVisionRange",
    merchant: "gemPowerMerchant",
    maxEffect: 0.60
  },
  gemVisionDeepSight: {
    id: "gemVisionDeepSight",
    category: UPGRADE_CATEGORIES.GEM_POWER,
    name: "Gem Vision Deep Sight",
    description: "Advanced zoom technology - see 4x area with minimal Gem Power drain",
    baseCost: 500,
    baseEffect: 1,
    effectType: "gemVisionDeepSight",
    merchant: "gemPowerMerchant",
    oneTimePurchase: true
  },
  gemVisionEfficiency: {
    id: "gemVisionEfficiency",
    category: UPGRADE_CATEGORIES.GEM_POWER,
    name: "Gem Vision Efficiency",
    description: "Reduces Gem Power drain while using Gem Vision",
    baseCost: 300,
    baseEffect: 2,
    effectType: "gemVisionDrainReduction",
    merchant: "gemPowerMerchant",
    maxEffect: 20
  },
  
  // PLAYER UPGRADES MERCHANT UPGRADES
  agility: {
    id: "agility",
    category: UPGRADE_CATEGORIES.PLAYER_STATS,
    name: "Agility Training",
    description: "Increases sideways-speed (+5 per level, scales to level 99)",
    baseCost: 3,
    baseEffect: 5,
    effectType: "walkSpeed",
    merchant: "playerUpgrades",
    maxLevel: 99
  },
  strength: {
    id: "strength",
    category: UPGRADE_CATEGORIES.PLAYER_STATS,
    name: "Strength",
    description: "Increases mining damage by +2 per level",
    baseCost: 18,
    baseEffect: 2,
    effectType: "digDamageAdditive",
    merchant: "playerUpgrades"
  },
  quickReflexes: {
    id: "quickReflexes",
    category: UPGRADE_CATEGORIES.PLAYER_STATS,
    name: "Quick Reflexes",
    description: "Reduces mining cooldown (max 30% reduction)",
    baseCost: 24,
    baseEffect: 0.008,
    effectType: "mineCooldownReduction",
    merchant: "playerUpgrades",
    maxEffect: 0.30
  },

  critChance: {
    id: "critChance",
    category: UPGRADE_CATEGORIES.PLAYER_STATS,
    name: "Critical Strike",
    description: "Each mining hit has a 0.05% chance per level to deal 2x damage",
    baseCost: 60,
    baseEffect: 0.0005,
    effectType: "critChance",
    merchant: "playerUpgrades",
    maxLevel: 100
  },
  heavyPunch: {
    id: "heavyPunch",
    category: UPGRADE_CATEGORIES.PLAYER_STATS,
    name: "Heavy Punch",
    description: "Punches through to the tile behind your target (softcap at level 10, max 40% at level 99)",
    baseCost: 285,
    baseEffect: 0.025,
    effectType: "heavyPunchDamage",
    merchant: "playerUpgrades",
    maxLevel: 99,
    softcapLevel: 10,  // FIX: Add softcap at level 10
    softcapValue: 0.25,  // 25% damage at level 10
    maxValue: 0.40,  // 40% damage at level 99
  },
  luckyCollector: {
    id: "luckyCollector",
    category: UPGRADE_CATEGORIES.PLAYER_STATS,
    name: "Lucky Collector",
    description: "0.1% chance per level to collect double resources when mining",
    baseCost: 75,
    baseEffect: 0.001,
    effectType: "luckyCollector",
    merchant: "playerUpgrades",
    maxLevel: 100
  },

  // GEAR MERCHANT - PICKAXES
  bronzePickaxe: {
    oneTimePurchase: true,
    id: "bronzePickaxe",
    category: UPGRADE_CATEGORIES.PICKAXES,
    name: "Bronze Pickaxe",
    description: "12 flat damage. Efficient on dirt, stone, copper.",
    goldCost: 30,
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
    goldCost: 150,
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
    goldCost: 600,
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
    goldCost: 3000,
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
    requiresLevel: 50,
    merchant: "gearMerchant"
  },
  adamantPickaxe: {
    oneTimePurchase: true,
    id: "adamantPickaxe",
    category: UPGRADE_CATEGORIES.PICKAXES,
    name: "Adamant Pickaxe",
    description: "40 flat damage. Efficient on all above. Bonus on mithril. Reduced on gold.",
    goldCost: 15000,
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
    requiresLevel: 60,
    merchant: "gearMerchant"
  },
  runePickaxe: {
    oneTimePurchase: true,
    id: "runePickaxe",
    category: UPGRADE_CATEGORIES.PICKAXES,
    name: "Rune Pickaxe",
    description: "60 flat damage. Efficient on gold and above. Bonus on adamant.",
    goldCost: 75000,
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
    requiresLevel: 75,
    merchant: "gearMerchant"
  },
  dragonPickaxe: {
    oneTimePurchase: true,
    id: "dragonPickaxe",
    category: UPGRADE_CATEGORIES.PICKAXES,
    name: "Dragon Pickaxe",
    description: "80 flat damage. Bonus on gold. Efficient on all tiles.",
    goldCost: 360,
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
    requiresLevel: 99,
    merchant: "gearMerchant"
  },

  // MONEY MONSTER UPGRADES
  sellAllButton: {
    id: "sellAllButton",
    category: UPGRADE_CATEGORIES.SPECIAL,
    name: "Sell All Button",
    description: "Adds a button to sell all resources at once",
    baseCost: 150,
    effectType: "sellAllUnlocked",
    merchant: "moneyMonster",
    oneTimePurchase: true
  },
  startResourcePrices: {
    id: "startResourcePrices",
    category: UPGRADE_CATEGORIES.SPECIAL,
    name: "Start Resource Prices",
    description: "Improve prices for dirt, stone, copper (slower progression)",
    baseCost: 150,
    baseEffect: 0.10,
    effectType: "startResourceBonus",
    maxLevel: 10,
    merchant: "moneyMonster"
  },
  nextResourcePrices: {
    id: "nextResourcePrices",
    category: UPGRADE_CATEGORIES.SPECIAL,
    name: "Next Resource Prices",
    description: "Improve prices for iron, bronze, steel, silver, gold (slower progression)",
    baseCost: 300,
    baseEffect: 0.10,
    effectType: "nextResourceBonus",
    maxLevel: 10,
    merchant: "moneyMonster"
  },
  marketInsight: {
    id: "marketInsight",
    category: UPGRADE_CATEGORIES.SPECIAL,
    name: "Market Insight",
    description: "Get bonus money on all sales (slower progression, requires level 50)",
    baseCost: 600,
    baseEffect: 0.05,
    effectType: "marketBonus",
    maxLevel: 10,
    requiresLevel: 50,
    merchant: "moneyMonster"
  },
  luckySales: {
    id: "luckySales",
    category: UPGRADE_CATEGORIES.SPECIAL,
    name: "Lucky Sales",
    description: "Chance for bonus money when selling (slower progression, requires level 60)",
    baseCost: 450,
    baseEffect: 0.5,
    effectType: "luckySales",
    maxLevel: 10,
    requiresLevel: 60,
    merchant: "moneyMonster"
  },
 

  // BOBO MERCHANT - ABILITY PURCHASES
  quickslashAbility: {
    id: "quickslashAbility",
    category: UPGRADE_CATEGORIES.SPECIAL,
    name: "Quick Slash",
    description: "Unlock the Quick Slash ability (Q key) — burst forward and break tiles rapidly",
    baseCost: 0,
    goldCost: 100,
    effectType: "unlockQuickslash",
    merchant: "boboMerchant",
    oneTimePurchase: true
  },
  thunderStrikeAbility: {
    id: "thunderStrikeAbility",
    category: UPGRADE_CATEGORIES.SPECIAL,
    name: "Thunder Strike",
    description: "Unlock the Thunder Strike ability (C key) — channel lightning to break tiles below you",
    baseCost: 0,
    goldCost: 250,
    effectType: "unlockThunderStrike",
    merchant: "boboMerchant",
    oneTimePurchase: true
  },
  worldTwoTunnelAccess: {
    id: "worldTwoTunnelAccess",
    category: UPGRADE_CATEGORIES.SPECIAL,
    name: "World Two Tunnel Key",
    description: "Endgame Bobo key. Opens the sealed far-right surface tunnel to the separated build zone.",
    baseCost: 0,
    goldCost: 25000,
    resources: {
      bronze: 50,
      silver: 25,
      gold: 10
    },
    requiresDepthGateAccepted: 1000,
    effectType: "worldTwoTunnelAccess",
    merchant: "boboMerchant",
    oneTimePurchase: true
  },

  // BOBO MERCHANT SPECIAL
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
    description: "Ask Bobo for a hint about all abilities (free)",
    baseCost: 0,
    effectType: "special",
    merchant: "boboMerchant",
  },
  
  // GEM POWER MERCHANT EASTER EGG
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
