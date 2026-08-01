import { STAR_RARITY_PROGRESSION_CONFIG } from "../../values/starRarityProgression.js";

export function resolveStarDiscoveryPopupDecision({
  enabled = true,
  nowMs = 0,
  lastShownAtMs = Number.NEGATIVE_INFINITY,
  activePriority = null,
  incomingPriority = 0,
  rarityEncounterCount = 0,
  levelsGained = 0,
  config = STAR_RARITY_PROGRESSION_CONFIG.popup,
} = {}) {
  if (!enabled) {
    return Object.freeze({
      show: false,
      replaceActive: false,
      reason: "disabled",
    });
  }

  const safeIncomingPriority = Number(incomingPriority) || 0;
  if (Number.isFinite(activePriority)) {
    if (safeIncomingPriority <= activePriority) {
      return Object.freeze({
        show: false,
        replaceActive: false,
        reason: "active-popup",
      });
    }
    return Object.freeze({
      show: true,
      replaceActive: true,
      reason: "higher-priority",
    });
  }

  if (
    config.alwaysShowFirstRarityEncounter
    && Math.floor(Number(rarityEncounterCount) || 0) === 1
  ) {
    return Object.freeze({
      show: true,
      replaceActive: false,
      reason: "first-rarity",
    });
  }

  if (
    config.alwaysShowSignLevelUp
    && Math.floor(Number(levelsGained) || 0) > 0
  ) {
    return Object.freeze({
      show: true,
      replaceActive: false,
      reason: "sign-level-up",
    });
  }

  const now = Number.isFinite(nowMs) ? nowMs : 0;
  const elapsed = Number.isFinite(lastShownAtMs)
    ? now - lastShownAtMs
    : Number.POSITIVE_INFINITY;
  if (elapsed < config.minimumIntervalMs) {
    return Object.freeze({
      show: false,
      replaceActive: false,
      reason: "cooldown",
    });
  }

  return Object.freeze({
    show: true,
    replaceActive: false,
    reason: "interval-ready",
  });
}
