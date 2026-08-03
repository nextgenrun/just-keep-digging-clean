import { STAR_RARITY_PROGRESSION_CONFIG } from "./starRarityProgression.js";

function finiteNonNegative(value) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function getStarRarityTier(rarity, config = STAR_RARITY_PROGRESSION_CONFIG) {
  const tiers = config.rarityTiers;
  const index = Math.max(
    0,
    Math.min(tiers.length - 1, Math.floor(Number(rarity) || 0)),
  );
  return Object.freeze({ ...tiers[index], index });
}

export function resolveStarRarityIndex(
  depthTiles,
  roll,
  config = STAR_RARITY_PROGRESSION_CONFIG,
) {
  const depth = finiteNonNegative(depthTiles);
  const eligible = config.rarityTiers
    .map((tier, index) => ({ tier, index }))
    .filter(({ tier }) => depth >= tier.minDepthTiles);
  if (eligible.length === 0) return 0;
  const totalWeight = eligible.reduce((total, entry) => total + entry.tier.weight, 0);
  let cursor = Math.min(0.999999999, finiteNonNegative(roll)) * totalWeight;
  for (const entry of eligible) {
    cursor -= entry.tier.weight;
    if (cursor < 0) return entry.index;
  }
  return eligible[eligible.length - 1].index;
}

export function getSignLevelThresholds(
  resourceType,
  config = STAR_RARITY_PROGRESSION_CONFIG,
) {
  const progression = config.signProgression;
  const totalXp = progression.xpTotals[resourceType] || 1;
  let previous = 0;
  return progression.levelFractions.map((fraction, index) => {
    const remainingLevels = progression.maxLevel - index - 1;
    const maximum = totalXp - remainingLevels;
    const threshold = index === progression.maxLevel - 1
      ? totalXp
      : Math.round(totalXp * fraction);
    previous = Math.max(previous + 1, Math.min(maximum, threshold));
    return previous;
  });
}

export function getSignProgress(
  resourceType,
  xp,
  config = STAR_RARITY_PROGRESSION_CONFIG,
) {
  const thresholds = getSignLevelThresholds(resourceType, config);
  const totalXp = thresholds[thresholds.length - 1];
  const safeXp = Math.min(totalXp, Math.floor(finiteNonNegative(xp)));
  const level = thresholds.filter(threshold => safeXp >= threshold).length;
  const levelFloorXp = level <= 0 ? 0 : thresholds[level - 1];
  const levelCeilingXp = level >= thresholds.length
    ? totalXp
    : thresholds[level];
  const levelXpRequired = Math.max(1, levelCeilingXp - levelFloorXp);
  const levelXp = level >= thresholds.length
    ? levelXpRequired
    : Math.max(0, safeXp - levelFloorXp);
  return Object.freeze({
    resourceType,
    xp: safeXp,
    totalXp,
    level,
    maxLevel: thresholds.length,
    levelFloorXp,
    levelCeilingXp,
    levelXp,
    levelXpRequired,
    levelProgress: level >= thresholds.length
      ? 1
      : Math.max(0, Math.min(1, levelXp / levelXpRequired)),
    nextLevelXp: level >= thresholds.length ? totalXp : levelCeilingXp,
    mastered: level >= thresholds.length,
    thresholds: Object.freeze(thresholds),
  });
}

export function migrateLegacyStarCountToXp(
  resourceType,
  count,
  config = STAR_RARITY_PROGRESSION_CONFIG,
) {
  const legacyThreshold = config.signProgression.legacyStarThresholds[resourceType] || 1;
  const ratio = Math.max(
    0,
    Math.min(1, finiteNonNegative(count) / legacyThreshold),
  );
  const totalXp = config.signProgression.xpTotals[resourceType] || 1;
  return Math.round(totalXp * ratio);
}

export function validateStarRarityProgressionConfig(
  config = STAR_RARITY_PROGRESSION_CONFIG,
) {
  const weights = config.rarityTiers.map(tier => tier.weight);
  const thresholdsValid = Object.keys(config.signProgression.xpTotals).every(
    resourceType => {
      const thresholds = getSignLevelThresholds(resourceType, config);
      return thresholds.length === config.signProgression.maxLevel
        && thresholds.every((value, index) => (
          value > 0 && (index === 0 || value > thresholds[index - 1])
        ));
    },
  );
  const weightTotal = weights.reduce((total, weight) => total + weight, 0);
  const ready = config.rarityTiers.length === config.health.expectedTierCount
    && weightTotal === config.health.expectedWeightTotal
    && Math.abs(
      config.spawn.reductionRatio - config.health.expectedSpawnReductionRatio,
    ) < Number.EPSILON
    && Math.abs(
      config.spawn.probability
        - config.spawn.legacyProbability * (1 - config.spawn.reductionRatio),
    ) < Number.EPSILON
    && thresholdsValid;
  return Object.freeze({
    ready,
    tierCount: config.rarityTiers.length,
    weightTotal,
    spawnProbability: config.spawn.probability,
    spawnReductionRatio: config.spawn.reductionRatio,
    thresholdsValid,
  });
}
