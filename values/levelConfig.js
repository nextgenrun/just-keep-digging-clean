/**
 * Leveling System Configuration
 * Defines XP values, level caps, and rewards
 */

export const LEVEL_CONFIG = Object.freeze({
  // Level caps
  SOFTCAP: 99,
  HARDCAP: 999,

  // XP formula: XP Required = 100 * level^1.2
  XP_BASE_MULTIPLIER: 25,
  XP_EXPONENT: 1.2,

  // XP values for each tile type
  TILE_XP: {
    dirt: 30,
    stone: 60,
    darkDirtNormal: 90,
    darkDirtStrong: 120,
    copper: 180,
    steel: 225,
    iron: 270,
    bronze: 340,
    silver: 450,
    gold: 750,
    lavaDirt: 900,
    obsidian: 1300,
    emberOre: 1900,
    magmaCrystal: 2800,
  },

  // Every 5 levels: Choose ONE of these two options
  CHOICE_REWARDS: {
    miningPower: {
      name: "Mining Power",
      icon: "⛏️",
      description: "+3% damage to all tiles",
      damageBonus: 0.03
    },
    resourceLuck: {
      name: "Resource Luck",
      icon: "🍀",
      description: "+2% chance for bonus resources",
      luckBonus: 0.02
    }
  },

  // Every 10 levels: Major milestone rewards
  MILESTONE_REWARDS: {
    10: {
      type: "gemPower",
      amount: 5,
      description: "+5 Gem Power max"
    },
    20: {
      type: "xpMultiplier",
      amount: 0.10,
      description: "+10% XP multiplier"
    },
    30: {
      type: "criticalHit",
      chance: 0.05,
      damageMultiplier: 1.5,
      description: "+5% critical hit chance (1.5x damage)"
    },
    40: {
      type: "criticalDamage",
      amount: 0.15,
      description: "+15% critical hit damage (total 1.65x)"
    },
    50: {
      type: "softcapMilestone",
      gemPower: 25,
      description: "+25 Gem Power max + Special visual effect"
    },
    60: {
      type: "xpMultiplier",
      amount: 0.20,
      description: "+20% XP multiplier (total +30%)"
    },
    70: {
      type: "globalMiningSpeed",
      amount: 0.10,
      description: "+10% global mining speed"
    },
    75: {
      type: "gemPower",
      amount: 50,
      description: "+50 Gem Power max"
    },
    80: {
      type: "globalDamage",
      amount: 0.25,
      description: "+25% global damage"
    },
    90: {
      type: "globalMiningSpeed",
      amount: 0.15,
      description: "+15% global mining speed (total +25%)"
    },
    99: {
      type: "softcapReached",
      miningPower: 0.15,
      gemPower: 50,
      description: "15% mining power + 50 GP + Legendary Title"
    }
  },

  // Hardcap progression (Levels 100-999)
  // Rewards decrease exponentially
  HARDCAP_TIERS: [
    {
      levelRange: [100, 199],
      xpMultiplier: 2.0,
      rewardType: "miningSpeed",
      rewardPerLevel: 0.005
    },
    {
      levelRange: [200, 299],
      xpMultiplier: 3.0,
      rewardType: "miningSpeed",
      rewardPerLevel: 0.003
    },
    {
      levelRange: [300, 399],
      xpMultiplier: 4.0,
      rewardType: "miningSpeed",
      rewardPerLevel: 0.002
    },
    {
      levelRange: [400, 499],
      xpMultiplier: 5.0,
      rewardType: "miningSpeed",
      rewardPerLevel: 0.0015
    },
    {
      levelRange: [500, 599],
      xpMultiplier: 6.0,
      rewardType: "miningDamage",
      rewardPerLevel: 0.0015
    },
    {
      levelRange: [600, 699],
      xpMultiplier: 7.0,
      rewardType: "miningDamage",
      rewardPerLevel: 0.001
    },
    {
      levelRange: [700, 799],
      xpMultiplier: 8.0,
      rewardType: "miningDamage",
      rewardPerLevel: 0.0008
    },
    {
      levelRange: [800, 899],
      xpMultiplier: 9.0,
      rewardType: "miningDamage",
      rewardPerLevel: 0.0005
    },
    {
      levelRange: [900, 999],
      xpMultiplier: 10.0,
      rewardType: "cosmetic",
      rewardPerLevel: 0
    }
  ],

  // Calculate XP required for a specific level
  getXPRequiredForLevel(level) {
    if (level <= 1) return 0;
    
    // Check if in hardcap range
    const hardcapTier = this.getHardcapTier(level);
    if (hardcapTier) {
      // Calculate base XP then apply hardcap multiplier
      const baseXP = Math.floor(this.XP_BASE_MULTIPLIER * Math.pow(level, this.XP_EXPONENT));
      return Math.floor(baseXP * hardcapTier.xpMultiplier);
    }
    
    // Normal softcap calculation
    return Math.floor(this.XP_BASE_MULTIPLIER * Math.pow(level, this.XP_EXPONENT));
  },

  // Get hardcap tier for a level (if beyond softcap)
  getHardcapTier(level) {
    if (level <= this.SOFTCAP) return null;
    
    for (const tier of this.HARDCAP_TIERS) {
      const [min, max] = tier.levelRange;
      if (level >= min && level <= max) {
        return tier;
      }
    }
    return null;
  },

  // Get total XP required to reach a level from 0
  getTotalXPForLevel(level) {
    let totalXP = 0;
    for (let i = 2; i <= level; i++) {
      totalXP += this.getXPRequiredForLevel(i);
    }
    return totalXP;
  },

  // Check if a level has a milestone reward
  hasMilestoneReward(level) {
    return this.MILESTONE_REWARDS[level] !== undefined;
  },

  // Get milestone reward for a level
  getMilestoneReward(level) {
    return this.MILESTONE_REWARDS[level] || null;
  },

  // Check if a level has a choice reward
  hasChoiceReward(level) {
    return level % 5 === 0 && level > 0 && !this.hasMilestoneReward(level);
  }
});
