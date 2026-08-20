import { getUpgradeCost } from "../../values/upgradeFormulas.js";
import { UPGRADES } from "../../values/upgradeDefinitions.js";

export const UPGRADE_RECOMMENDATION_CONFIG = Object.freeze({
  rotationMs: 12000,
  historySize: 3,
  survivalIds: Object.freeze([
    "gemPowerTank",
    "gemPowerEfficiency",
    "gemPowerRegeneration",
    "torchDrainEfficiency",
    "torchRange",
    "boboCaveEyes",
  ]),
  coreIds: Object.freeze(["strength", "quickReflexes", "agility"]),
});

const excludedReasons = new Set([
  "invalid_upgrade",
  "gameplay_mode_disabled",
  "feature_disabled",
  "craft_only",
  "max_level",
  "progression_locked",
  "requires_player_level",
  "requires_depth_gate",
  "requires_upgrade",
  "resource_system_unavailable",
]);

function scoreCandidate(candidate, context) {
  let score = candidate.affordable ? 60 : 0;
  if (UPGRADE_RECOMMENDATION_CONFIG.coreIds.includes(candidate.id)) score += 35;
  if (candidate.category === "pickaxes") score += 28;
  if (UPGRADE_RECOMMENDATION_CONFIG.survivalIds.includes(candidate.id)) {
    score += context.bestDepth >= 40 || context.gemPowerPercent <= 35 ? 90 : 25;
  }
  if (context.history.includes(candidate.id)) score -= 120;
  score -= Math.log10(Math.max(1, candidate.cost)) * 2;
  return score;
}

export function resolveUpgradeRecommendations({
  upgradeSystem,
  bestDepth = 0,
  gemPowerPercent = 100,
  history = [],
  definitions = UPGRADES,
} = {}) {
  if (!upgradeSystem) return Object.freeze([]);
  const money = Number(upgradeSystem.getMoney?.()) || 0;
  const context = {
    bestDepth: Math.max(0, Number(bestDepth) || 0),
    gemPowerPercent: Math.max(0, Number(gemPowerPercent) || 0),
    history: Array.isArray(history) ? history : [],
  };
  const candidates = [];
  for (const [id, upgrade] of Object.entries(definitions)) {
    if (upgrade.hiddenFromShop || upgrade.firstFiveOnly || upgrade.acquisitionMode === "craft") {
      continue;
    }
    const availability = upgradeSystem.canPurchaseUpgrade?.(id) || {};
    if (!availability.canPurchase && excludedReasons.has(availability.reason)) continue;
    const level = upgradeSystem.getUpgradeLevel?.(id) || 0;
    const cost = getUpgradeCost(id, level);
    const candidate = {
      id,
      name: upgrade.name,
      category: upgrade.category,
      merchant: upgrade.merchant,
      cost,
      affordable: money >= cost && availability.reason !== "not_enough_resources",
    };
    candidate.score = scoreCandidate(candidate, context);
    candidates.push(Object.freeze(candidate));
  }
  candidates.sort((left, right) => (
    right.score - left.score
    || left.cost - right.cost
    || left.id.localeCompare(right.id)
  ));
  return Object.freeze(candidates);
}
