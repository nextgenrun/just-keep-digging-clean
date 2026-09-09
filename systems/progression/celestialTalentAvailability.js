import {
  CELESTIAL_TALENT_PROGRESSION_CONFIG,
  getCelestialTalentPrerequisiteState,
  getEarnedCelestialTalentPoints,
} from "../../values/celestialTalentProgression.js";
import {
  CELESTIAL_TALENT_RANK_CONFIG,
  getCelestialTalentRank,
  getCelestialTalentRankCost,
} from "../../values/celestialTalentRanks.js";

export function getCelestialTalentNodeAvailability(node, {
  data, playerLevel, purchased, godMode, rootCount, rootCapacity,
}) {
  const owned = purchased.has(node.id);
  const rank = owned ? getCelestialTalentRank(data.nodeRanks[node.id]) : 0;
  const prerequisite = getCelestialTalentPrerequisiteState(node, purchased);
  const config = CELESTIAL_TALENT_PROGRESSION_CONFIG;
  const starsCost = owned ? getCelestialTalentRankCost(node, rank) : 0;
  const talentPointsCost = owned ? 0 : config.talentPoints.unlockCost;
  const talentPointsBalance = Math.max(0,
    getEarnedCelestialTalentPoints(playerLevel) - data.spentTalentPoints);
  const base = {
    nodeId: node.id,
    action: owned ? "upgrade" : "unlock",
    rank,
    maxRank: CELESTIAL_TALENT_RANK_CONFIG.maxRank,
    requiredLevel: config.access.requiredPlayerLevel,
    playerLevel,
    starsCost: godMode ? 0 : starsCost,
    normalStarsCost: starsCost,
    starsBalance: data.stars,
    talentPointsCost: godMode ? 0 : talentPointsCost,
    talentPointsBalance,
    godMode,
    prerequisiteMode: prerequisite.mode,
    purchasedPrerequisiteIds: prerequisite.purchasedPrerequisiteIds,
    missingPrerequisiteIds: prerequisite.missingPrerequisiteIds,
  };
  const locked = reason => ({ ...base, available: false, reason });
  if (owned && rank >= base.maxRank) return locked("max-rank");
  if (godMode) return { ...base, available: true, reason: null };
  if (playerLevel < config.access.requiredPlayerLevel) return locked("talents-locked");
  if (owned) {
    return data.stars < starsCost
      ? locked("insufficient-stars") : { ...base, available: true, reason: null };
  }
  if (node.kind === "ability" && rootCount >= rootCapacity) return locked("root-choice-locked");
  if (!prerequisite.satisfied) return locked("prerequisite-locked");
  if (talentPointsBalance < talentPointsCost) return locked("insufficient-talent-points");
  return { ...base, available: true, reason: null };
}
