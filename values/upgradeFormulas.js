import { UPGRADES } from "./upgradeDefinitions.js";
import { COMPRESSED_V2_UPGRADE_EFFECTS } from "./upgradeRankBalance.js";

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

// Resolve an explicit early linear curve followed by bounded late progression.
export function calculateSoftcappedEffect(softcapValue, maxValue, level, softcapLevel = 10, maxLevel = 99) {
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

export function calculateHeavyPunchEffect(softcapValue, maxValue, level, softcapLevel = 10, maxLevel = 99) {
  return calculateSoftcappedEffect(softcapValue, maxValue, level, softcapLevel, maxLevel);
}

// One meaningful level purchases several former price steps at once. Keeping
// the original 1.15 curve inside each bundle makes every purchase substantial
// without inventing a second economy curve.
export function calculateCompressedCost(baseCost, level, legacyLevelsPerLevel) {
  const safeLevel = Number.isFinite(level) ? Math.max(0, Math.floor(level)) : 0;
  const bundleSize = Number.isFinite(legacyLevelsPerLevel)
    ? Math.max(1, Math.floor(legacyLevelsPerLevel))
    : 1;
  const firstLegacyLevel = safeLevel * bundleSize;
  let total = 0;
  for (let offset = 0; offset < bundleSize; offset += 1) {
    total += calculateCost(baseCost, firstLegacyLevel + offset);
  }
  return total;
}

function calculateConfiguredEffect(upgrade, level, maxLevel = upgrade?.maxLevel) {
  if (!upgrade) return 0;

  if (upgrade.effectValue) {
    return upgrade.effectValue;
  }

  if (upgrade.softcapLevel && upgrade.softcapValue && upgrade.maxValue) {
    return calculateSoftcappedEffect(
      upgrade.softcapValue,
      upgrade.maxValue,
      level,
      upgrade.softcapLevel,
      maxLevel,
    );
  }

  if (upgrade.maxEffect) {
    if (upgrade.linearEffect) return Math.min(upgrade.baseEffect * level, upgrade.maxEffect);
    return Math.min(calculateEffect(upgrade.baseEffect, level), upgrade.maxEffect);
  }

  return calculateEffect(upgrade.baseEffect, level);
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
  if (upgrade.rankCosts) return upgrade.rankCosts[currentLevel] ?? Infinity;
  
  // For upgrades with baseCost, use exponential scaling
  if (upgrade.legacyLevelsPerLevel) {
    return calculateCompressedCost(
      upgrade.baseCost,
      currentLevel,
      upgrade.legacyLevelsPerLevel,
    );
  }
  return calculateCost(upgrade.baseCost, currentLevel);
}

// Get upgrade effect for a specific upgrade at level
export function getUpgradeEffect(upgradeId, level) {
  const upgrade = UPGRADES[upgradeId];
  return calculateConfiguredEffect(upgrade, level);
}

export function getCompressedV2UpgradeEffect(upgradeId, level) {
  const previous = COMPRESSED_V2_UPGRADE_EFFECTS[upgradeId];
  if (!previous) return getUpgradeEffect(upgradeId, level);
  return calculateConfiguredEffect(previous, Math.min(previous.maxLevel, Math.max(0, level)));
}

// Used only while migrating unversioned saves from the former long tracks.
export function getLegacyUpgradeEffect(upgradeId, level) {
  const upgrade = UPGRADES[upgradeId];
  if (!upgrade?.legacyEffect || !upgrade.legacyMaxLevel) return 0;
  const legacyLevel = Math.min(
    upgrade.legacyMaxLevel,
    Number.isFinite(level) ? Math.max(0, Math.floor(level)) : 0,
  );
  return calculateConfiguredEffect(
    upgrade.legacyEffect,
    legacyLevel,
    upgrade.legacyMaxLevel,
  );
}
