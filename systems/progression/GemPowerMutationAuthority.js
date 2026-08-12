import {
  PROGRESSION_LIMITS,
  validateBoundedNumber,
  validateGemPower,
} from "../../values/progressionInvariants.js";
import { reportProgressionInvariantFailure } from "../health/progressionInvariantReporter.js";

function reject(validation, value, returnValue) {
  reportProgressionInvariantFailure({
    authority: "gem-power",
    reason: validation.reason,
    value,
  });
  return returnValue;
}

export function setProgressionGemPowerMaxBonus(subject, bonus) {
  const validation = validateBoundedNumber(bonus, {
    name: "gem-power-max-bonus",
    max: PROGRESSION_LIMITS.gemPower,
    integer: true,
  });
  if (!validation.ok) return reject(validation, bonus, false);
  if (validation.value === subject._progressionGemPowerMaxBonus) return true;
  subject._progressionGemPowerMaxBonus = validation.value;
  subject._gemPowerMax = subject._baseGemPowerMax + validation.value;
  subject.gemPower = Math.min(subject.gemPower, subject.getGemPowerMax());
  return true;
}

export function resolveGemPowerMaximum(subject) {
  let maximum = Number.isFinite(subject._gemPowerMax)
    ? subject._gemPowerMax
    : Number.isFinite(subject._baseGemPowerMax)
      ? subject._baseGemPowerMax
      : Number.isFinite(subject.gemPower) ? subject.gemPower : 0;
  if (subject.upgradeSystem?.getEffectiveGemPowerMax) {
    maximum = subject.upgradeSystem.getEffectiveGemPowerMax(subject._gemPowerMax);
  } else if (subject.upgradeSystem?.getUpgradeEffects) {
    maximum += subject.upgradeSystem.getUpgradeEffects().gemPowerMax || 0;
  }
  const validation = validateGemPower(maximum, PROGRESSION_LIMITS.gemPower);
  if (validation.ok) return validation.value;
  reject(validation, maximum, false);
  return Math.min(PROGRESSION_LIMITS.gemPower, Math.max(0, subject._gemPowerMax));
}

export function canSpendGemPower(subject, amount, context) {
  const validation = validateGemPower(amount, PROGRESSION_LIMITS.gemPower);
  return validation.ok
    && subject.getSpendableGemPower(context) + Number.EPSILON >= validation.value;
}

export function fillGemPower(subject, context) {
  const previous = subject.gemPower;
  subject.gemPower = subject.getGemPowerMax();
  const restored = Math.max(0, subject.gemPower - previous);
  if (restored > 0) subject._emitGemPowerChange(previous, context);
  return restored;
}

export function restoreGemPower(subject, amount, context) {
  const validation = validateGemPower(amount, PROGRESSION_LIMITS.gemPower);
  if (!validation.ok) return reject(validation, amount, 0);
  const previous = subject.gemPower;
  subject.gemPower = Math.min(subject.getGemPowerMax(), subject.gemPower + validation.value);
  const restored = Math.max(0, subject.gemPower - previous);
  if (restored > 0) subject._emitGemPowerChange(previous, context);
  return restored;
}

export function setGemPowerExact(subject, amount, { silent = false, source = "restore" } = {}) {
  const previous = subject.gemPower;
  const validation = validateGemPower(amount, subject.getGemPowerMax());
  if (!validation.ok) return reject(validation, amount, previous);
  subject.gemPower = validation.value;
  if (!silent) subject._emitGemPowerChange(previous, { source });
  return subject.gemPower;
}

export function consumeGemPower(subject, amount, context) {
  const validation = validateGemPower(amount, PROGRESSION_LIMITS.gemPower);
  if (!validation.ok) return reject(validation, amount, 0);
  if (subject._godMode) return validation.value;
  const previous = subject.gemPower;
  const consumed = Math.min(subject.getSpendableGemPower(context), validation.value);
  subject.gemPower = Math.max(0, subject.gemPower - consumed);
  if (consumed > 0) subject._emitGemPowerChange(previous, context);
  return consumed;
}

export function drainAllGemPower(subject, context) {
  if (subject._godMode) return 0;
  const drained = subject.getSpendableGemPower(context);
  const previous = subject.gemPower;
  subject.gemPower = Math.max(0, subject.gemPower - drained);
  if (drained > 0) subject._emitGemPowerChange(previous, context);
  return drained;
}
