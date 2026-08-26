import { LEVEL_CONFIG } from "../../values/levelConfig.js";

export function calculatePlayerLevelBonuses(
  level,
  choiceSelections,
  automaticMilestoneRewards,
) {
  const bonuses = LEVEL_CONFIG.BONUSES;
  const legacySteps = (level - 1) * LEVEL_CONFIG.LEGACY_LEVELS_PER_LEVEL;
  const miningChoiceBonus = choiceSelections.miningPower
    * LEVEL_CONFIG.CHOICE_REWARDS.miningPower.damageBonus;
  const luckChoiceBonus = choiceSelections.resourceLuck
    * LEVEL_CONFIG.CHOICE_REWARDS.resourceLuck.luckBonus;
  const automaticMiningBonus = automaticMilestoneRewards
    * LEVEL_CONFIG.CHOICE_REWARDS.miningPower.damageBonus;
  const automaticLuckBonus = automaticMilestoneRewards
    * LEVEL_CONFIG.CHOICE_REWARDS.resourceLuck.luckBonus;

  return {
    level,
    miningDamageMultiplier: 1
      + legacySteps * bonuses.damagePerLegacyLevel
      + miningChoiceBonus
      + automaticMiningBonus,
    miningFlatDamageBonus: Math.floor(
      legacySteps * bonuses.flatDamagePerLegacyLevel,
    ),
    miningSpeedBonus: Math.min(
      legacySteps * bonuses.miningSpeedPerLegacyLevel,
      bonuses.miningSpeedCap,
    ),
    criticalHitChance: Math.min(
      legacySteps * bonuses.criticalChancePerLegacyLevel,
      bonuses.criticalChanceCap,
    ),
    criticalHitDamage: Math.floor(
      legacySteps * bonuses.criticalDamagePerLegacyLevel,
    ),
    maxHpBonus: legacySteps * bonuses.maxHpPerLegacyLevel,
    xpMultiplier: legacySteps * bonuses.xpMultiplierPerLegacyLevel,
    resourceLuck: Math.min(
      legacySteps * bonuses.resourceLuckPerLegacyLevel
        + luckChoiceBonus
        + automaticLuckBonus,
      bonuses.resourceLuckCap,
    ),
    globalMiningSpeed: Math.min(
      legacySteps * bonuses.miningSpeedPerLegacyLevel,
      bonuses.miningSpeedCap,
    ),
    perLevelSpeed: 0,
    hardcapMiningSpeed: bonuses.hardcapMiningSpeed,
    darknessResistanceMeters: LEVEL_CONFIG.getDarknessResistanceMeters(level),
  };
}

export function createPlayerLevelRewardSummary({
  startLevel,
  endLevel,
  automaticReward,
  getGemPowerMaxBonus,
}) {
  const levelsGained = Math.max(0, endLevel - startLevel);
  const legacySteps = levelsGained * LEVEL_CONFIG.LEGACY_LEVELS_PER_LEVEL;
  const darknessBefore = LEVEL_CONFIG.getDarknessResistanceMeters(startLevel);
  const darknessAfter = LEVEL_CONFIG.getDarknessResistanceMeters(endLevel);
  const miningPowerGain = legacySteps * LEVEL_CONFIG.BONUSES.damagePerLegacyLevel
    + (automaticReward?.miningPower || 0);

  return {
    level: endLevel,
    levelsGained,
    darknessResistanceGainMeters: darknessAfter - darknessBefore,
    darknessResistanceMeters: darknessAfter,
    miningPowerGainPercent: Math.round(miningPowerGain * 100),
    maxHpGain: legacySteps * LEVEL_CONFIG.BONUSES.maxHpPerLegacyLevel,
    gemPowerMaxGain: getGemPowerMaxBonus(endLevel) - getGemPowerMaxBonus(startLevel),
  };
}
