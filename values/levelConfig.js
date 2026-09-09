/**
 * Leveling System Configuration
 * Defines XP values, level caps, and rewards
 */

export const LEVEL_CONFIG = Object.freeze({
  PROGRESSION_VERSION: 2,
  LEGACY_LEVELS_PER_LEVEL: 10,

  // Level caps
  SOFTCAP: 11,
  HARDCAP: 99,
  LEGACY_SOFTCAP: 99,
  LEGACY_HARDCAP: 999,

  // XP formula: XP Required = 100 * level^1.2
  XP_BASE_MULTIPLIER: 25,
  XP_EXPONENT: 1.2,

  // One meaningful level carries the permanent growth of ten former levels.
  BONUSES: Object.freeze({
    damagePerLegacyLevel: 0.05,
    flatDamagePerLegacyLevel: 0.25,
    miningSpeedPerLegacyLevel: 0.005,
    miningSpeedCap: 0.5,
    maxHpPerLegacyLevel: 5,
    xpMultiplierPerLegacyLevel: 0.02,
    hardcapMiningSpeed: 0.75,
  }),

  // Each earned level postpones depth-driven panic by 20-50 metres without
  // changing underground visibility. Early gains stay restrained; the
  // exponential curve approaches 50m late.
  PANIC_RESISTANCE: Object.freeze({
    minimumGainMeters: 20,
    maximumGainMeters: 50,
    approachLevels: 23,
    roundToMeters: 1,
  }),

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

  // Each meaningful level crosses two former five-level reward checkpoints.
  CHOICE_INTERVAL: 1,
  AUTOMATIC_REWARDS_PER_LEVEL: 2,
  CHOICE_REWARDS: {
    miningPower: {
      name: "Mining Power",
      icon: "pickaxe",
      description: "+3% damage to all tiles",
      damageBonus: 0.03
    }
  },

  // Former ten-level milestones now align with meaningful levels.
  MILESTONE_REWARDS: {
    2: {
      type: "gemPower",
      amount: 5,
      description: "+5 Gem Power max"
    },
    3: {
      type: "xpMultiplier",
      amount: 0.10,
      description: "+10% XP multiplier"
    },
    6: {
      type: "softcapMilestone",
      gemPower: 25,
      description: "+25 Gem Power max + Special visual effect"
    },
    7: {
      type: "xpMultiplier",
      amount: 0.20,
      description: "+20% XP multiplier (total +30%)"
    },
    8: {
      type: "globalMiningSpeed",
      amount: 0.10,
      description: "+10% global mining speed"
    },
    9: {
      type: "globalDamage",
      amount: 0.25,
      description: "+25% global damage"
    },
    10: {
      type: "globalMiningSpeed",
      amount: 0.15,
      description: "+15% global mining speed (total +25%)"
    },
    11: {
      type: "softcapReached",
      miningPower: 0.15,
      gemPower: 50,
      description: "15% mining power + 50 GP + Legendary Title"
    }
  },

  // Legacy bands remain the exact XP source inside each ten-level bundle.
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

  getLegacyEquivalentLevel(level) {
    const safeLevel = Math.max(1, Math.min(this.HARDCAP, Math.floor(Number(level) || 1)));
    return 1 + (safeLevel - 1) * this.LEGACY_LEVELS_PER_LEVEL;
  },

  getCompressedLevelForLegacyLevel(level) {
    const safeLegacyLevel = Math.max(
      1,
      Math.min(this.LEGACY_HARDCAP, Math.floor(Number(level) || 1)),
    );
    return Math.min(
      this.HARDCAP,
      Math.floor((safeLegacyLevel - 1) / this.LEGACY_LEVELS_PER_LEVEL) + 1,
    );
  },

  getXPRequiredForLegacyLevel(level) {
    if (level <= 1) return 0;
    const hardcapTier = this.getHardcapTier(level);
    const baseXP = Math.floor(this.XP_BASE_MULTIPLIER * Math.pow(level, this.XP_EXPONENT));
    return hardcapTier ? Math.floor(baseXP * hardcapTier.xpMultiplier) : baseXP;
  },

  // One visible threshold is the sum of ten consecutive former thresholds.
  getXPRequiredForLevel(level) {
    if (level <= 1) return 0;
    const previousMeaningfulLevel = Math.max(1, Math.floor(level) - 1);
    const legacyStart = this.getLegacyEquivalentLevel(previousMeaningfulLevel);
    let requiredXP = 0;
    for (let offset = 1; offset <= this.LEGACY_LEVELS_PER_LEVEL; offset += 1) {
      requiredXP += this.getXPRequiredForLegacyLevel(legacyStart + offset);
    }
    return requiredXP;
  },

  // Get hardcap tier for a level (if beyond softcap)
  getHardcapTier(level) {
    if (level <= this.LEGACY_SOFTCAP) return null;
    
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

  getPanicResistanceGainMeters(level) {
    if (level <= 1) return 0;
    const cfg = this.PANIC_RESISTANCE;
    const earnedIndex = Math.max(0, Math.floor(level) - 2);
    const approach = 1 - Math.exp(-earnedIndex / cfg.approachLevels);
    const rawGain = cfg.minimumGainMeters
      + (cfg.maximumGainMeters - cfg.minimumGainMeters) * approach;
    return Math.round(rawGain / cfg.roundToMeters) * cfg.roundToMeters;
  },

  getPanicResistanceMeters(level) {
    const cappedLevel = Math.max(1, Math.min(this.HARDCAP, Math.floor(Number(level) || 1)));
    let totalMeters = 0;
    for (let earnedLevel = 2; earnedLevel <= cappedLevel; earnedLevel += 1) {
      totalMeters += this.getPanicResistanceGainMeters(earnedLevel);
    }
    return totalMeters;
  },

  getAutomaticRewardUnitsForLevel(level) {
    return this.hasChoiceReward(level) ? this.AUTOMATIC_REWARDS_PER_LEVEL : 0;
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
    return level % this.CHOICE_INTERVAL === 0 && level > 1;
  }
});
