import { LEVEL_CONFIG } from "../../values/levelConfig.js";
import { getEarnedCelestialTalentPoints } from "../../values/celestialTalentProgression.js";

export function calculatePlayerLevelBonuses(
  level,
  choiceSelections,
  automaticMilestoneRewards,
) {
  const bonuses = LEVEL_CONFIG.BONUSES;
  const legacySteps = (level - 1) * LEVEL_CONFIG.LEGACY_LEVELS_PER_LEVEL;
  const miningChoiceBonus = choiceSelections.miningPower
    * LEVEL_CONFIG.CHOICE_REWARDS.miningPower.damageBonus;
  const automaticMiningBonus = automaticMilestoneRewards
    * LEVEL_CONFIG.CHOICE_REWARDS.miningPower.damageBonus;

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
    maxHpBonus: legacySteps * bonuses.maxHpPerLegacyLevel,
    xpMultiplier: legacySteps * bonuses.xpMultiplierPerLegacyLevel,
    globalMiningSpeed: Math.min(
      legacySteps * bonuses.miningSpeedPerLegacyLevel,
      bonuses.miningSpeedCap,
    ),
    perLevelSpeed: 0,
    hardcapMiningSpeed: bonuses.hardcapMiningSpeed,
    panicResistanceMeters: LEVEL_CONFIG.getPanicResistanceMeters(level),
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
  const panicBefore = LEVEL_CONFIG.getPanicResistanceMeters(startLevel);
  const panicAfter = LEVEL_CONFIG.getPanicResistanceMeters(endLevel);
  const miningPowerGain = legacySteps * LEVEL_CONFIG.BONUSES.damagePerLegacyLevel
    + (automaticReward?.miningPower || 0);

  return {
    level: endLevel,
    levelsGained,
    talentPointsGain: getEarnedCelestialTalentPoints(endLevel) - getEarnedCelestialTalentPoints(startLevel),
    panicResistanceGainMeters: panicAfter - panicBefore,
    panicResistanceMeters: panicAfter,
    miningPowerGainPercent: Math.round(miningPowerGain * 100),
    maxHpGain: legacySteps * LEVEL_CONFIG.BONUSES.maxHpPerLegacyLevel,
    gemPowerMaxGain: getGemPowerMaxBonus(endLevel) - getGemPowerMaxBonus(startLevel),
  };
}
