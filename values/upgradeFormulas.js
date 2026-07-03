import { UPGRADES } from "./upgradeDefinitions.js";

// ==================== UPGRADE FORMULAS ====================

// Re-export UPGRADES for convenience
export { UPGRADES };

// Calculate upgrade cost with exponential scaling
// Base cost scales up: cost * (1.15 ^ level)
// Softcap at level 10, moderate curve at level 20+
export function calculateCost(baseCost, level) {
  // Exponential scaling with 1.15x multiplier per level
  // Level 0 = baseCost
  // Level 1 = baseCost * 1.15
  // Level 10 = baseCost * 4.05
  // Level 20 = baseCost * 16.37
  return Math.floor(baseCost * Math.pow(1.15, level));
}

// Calculate upgrade effect with diminishing returns
export function calculateEffect(baseEffect, level, softcapLevel = 10, maxEffectMultiplier = 2) {
  // Diminishing returns after softcap
  if (level <= softcapLevel) {
    return baseEffect * level;
  }
  // After softcap, effects grow much slower
  const softcapEffect = baseEffect * softcapLevel;
  const extraLevels = level - softcapLevel;
  const growthFactor = 0.1; // 10% growth per level after softcap
  const extraEffect = softcapEffect * (1 - Math.pow(growthFactor, extraLevels));
  return Math.min(softcapEffect + extraEffect, baseEffect * softcapLevel * maxEffectMultiplier);
}

// Calculate heavy punch effect with custom softcap
export function calculateHeavyPunchEffect(softcapValue, maxValue, level, softcapLevel = 10, maxLevel = 99) {
  const safeLevel = Number.isFinite(level) ? Math.max(0, level) : 0;
  const safeSoftcapLevel = Number.isFinite(softcapLevel) ? Math.max(1, softcapLevel) : 10;
  const safeMaxLevel = Number.isFinite(maxLevel) ? Math.max(safeSoftcapLevel, maxLevel) : 99;

  if (safeLevel <= 0) return 0;

  if (safeLevel <= safeSoftcapLevel) {
    return Math.min(maxValue, (softcapValue / safeSoftcapLevel) * safeLevel);
  }

  const postSoftcapLevels = Math.max(1, safeMaxLevel - safeSoftcapLevel);
  const progress = Math.min(1, (safeLevel - safeSoftcapLevel) / postSoftcapLevels);
  return Math.min(maxValue, softcapValue + (maxValue - softcapValue) * progress);
}

// Get upgrade cost for a specific upgrade at current level
export function getUpgradeCost(upgradeId, currentLevel) {
  const upgrade = UPGRADES[upgradeId];
  if (!upgrade) return Infinity;
  
  if (upgrade.oneTimePurchase && currentLevel > 0) {
    return Infinity; // Can only buy once
  }
  
  if (upgrade.maxLevel && currentLevel >= upgrade.maxLevel) {
    return Infinity; // Max level reached
  }
  
  // For pickaxes and one-time purchases with goldCost, return goldCost directly (no scaling)
  if (upgrade.goldCost !== undefined) {
    return upgrade.goldCost;
  }
  
  // For upgrades with baseCost, use exponential scaling
  return calculateCost(upgrade.baseCost, currentLevel);
}

// Get upgrade effect for a specific upgrade at level
export function getUpgradeEffect(upgradeId, level) {
  const upgrade = UPGRADES[upgradeId];
  if (!upgrade) return 0;
  
  if (upgrade.effectValue) {
    return upgrade.effectValue; // Fixed value for pickaxes
  }
  
  // FIX: Use custom heavy punch formula with softcap
  if (upgradeId === 'heavyPunch' && upgrade.softcapLevel && upgrade.softcapValue && upgrade.maxValue) {
    return calculateHeavyPunchEffect(upgrade.softcapValue, upgrade.maxValue, level, upgrade.softcapLevel, upgrade.maxLevel);
  }
  
  if (upgrade.maxEffect) {
    // Cap effect at absolute max value (e.g., quickReflexes caps at 0.75)
    return Math.min(calculateEffect(upgrade.baseEffect, level), upgrade.maxEffect);
  }
  
  return calculateEffect(upgrade.baseEffect, level);
}
