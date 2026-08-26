import { LEVEL_CONFIG } from "../../values/levelConfig.js";
import {
  PROGRESSION_LIMITS,
  validateBoundedNumber,
  validateLevel,
} from "../../values/progressionInvariants.js";

function normalizeLegacyProgress(level, currentXP) {
  let compressedLevel = LEVEL_CONFIG.getCompressedLevelForLegacyLevel(level);
  const legacyGroupStart = 1
    + (compressedLevel - 1) * LEVEL_CONFIG.LEGACY_LEVELS_PER_LEVEL;
  let compressedXP = currentXP;

  for (
    let legacyLevel = legacyGroupStart + 1;
    legacyLevel <= level;
    legacyLevel += 1
  ) {
    compressedXP += LEVEL_CONFIG.getXPRequiredForLegacyLevel(legacyLevel);
  }

  while (compressedLevel < LEVEL_CONFIG.HARDCAP) {
    const requiredXP = LEVEL_CONFIG.getXPRequiredForLevel(compressedLevel + 1);
    if (requiredXP <= 0 || compressedXP < requiredXP) break;
    compressedXP -= requiredXP;
    compressedLevel += 1;
  }

  return {
    level: compressedLevel,
    currentXP: compressedLevel >= LEVEL_CONFIG.HARDCAP ? 0 : compressedXP,
  };
}

export function resolvePlayerLevelSaveState(data) {
  if (!data || typeof data !== "object") {
    return { ok: false, reason: "level-save-missing" };
  }

  const persistedVersion = Number(data.progressionVersion);
  const isLegacy = !Number.isFinite(persistedVersion)
    || persistedVersion < LEVEL_CONFIG.PROGRESSION_VERSION;
  const level = isLegacy
    ? validateBoundedNumber(data.level || 1, {
      name: "legacy-level",
      min: 1,
      max: LEVEL_CONFIG.LEGACY_HARDCAP,
      integer: true,
    })
    : validateLevel(data.level || 1);
  const currentXP = validateBoundedNumber(data.currentXP || 0, {
    name: "current-xp",
    max: PROGRESSION_LIMITS.xp,
    integer: true,
  });
  const totalXP = validateBoundedNumber(data.totalXP || 0, {
    name: "total-xp",
    max: PROGRESSION_LIMITS.xp,
    integer: true,
  });
  if (!level.ok || !currentXP.ok || !totalXP.ok) {
    return { ok: false, reason: "invalid-level-save" };
  }

  const normalized = isLegacy
    ? normalizeLegacyProgress(level.value, currentXP.value)
    : { level: level.value, currentXP: currentXP.value };
  const automaticRewards = Number(data.automaticMilestoneRewards);

  return {
    ok: true,
    isLegacy,
    level: normalized.level,
    currentXP: normalized.currentXP,
    totalXP: totalXP.value,
    automaticMilestoneRewards: Number.isFinite(automaticRewards)
      ? Math.max(0, Math.floor(automaticRewards))
      : 0,
    choiceSelections: data.choiceSelections && typeof data.choiceSelections === "object"
      ? data.choiceSelections
      : null,
    calculatedBonuses: data.calculatedBonuses && typeof data.calculatedBonuses === "object"
      ? data.calculatedBonuses
      : null,
  };
}
