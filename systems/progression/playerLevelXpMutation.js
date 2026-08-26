import { LEVEL_CONFIG } from "../../values/levelConfig.js";
import {
  PROGRESSION_LIMITS,
  validateBoundedNumber,
  validateLevel,
} from "../../values/progressionInvariants.js";

export function resolvePlayerLevelXpMutation({
  level,
  currentXP,
  totalXP,
  xpGained,
}) {
  const checkedLevel = validateLevel(level);
  const checkedGain = validateBoundedNumber(xpGained, {
    name: "xp-gain",
    max: PROGRESSION_LIMITS.xp,
    integer: true,
  });
  const nextCurrent = validateBoundedNumber(currentXP + xpGained, {
    name: "current-xp",
    max: PROGRESSION_LIMITS.xp,
    integer: true,
  });
  const nextTotal = validateBoundedNumber(totalXP + xpGained, {
    name: "total-xp",
    max: PROGRESSION_LIMITS.xp,
    integer: true,
  });
  const invalid = [checkedLevel, checkedGain, nextCurrent, nextTotal]
    .find(result => !result.ok);
  if (invalid) return { ok: false, reason: invalid.reason };

  let nextLevel = checkedLevel.value;
  let remainingXP = nextCurrent.value;
  const earnedLevels = [];
  while (nextLevel < LEVEL_CONFIG.HARDCAP) {
    const requiredXP = LEVEL_CONFIG.getXPRequiredForLevel(nextLevel + 1);
    if (requiredXP <= 0 || remainingXP < requiredXP) break;
    remainingXP -= requiredXP;
    nextLevel += 1;
    earnedLevels.push(nextLevel);
  }

  return {
    ok: true,
    level: nextLevel,
    currentXP: remainingXP,
    totalXP: nextTotal.value,
    earnedLevels,
  };
}
