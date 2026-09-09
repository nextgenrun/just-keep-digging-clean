import { UAL_NATIVE_ACTION_TUNING } from "../values/ualNativeActionTuning.js";

/** Keeps ordinary UAL mining visuals on the same cadence as authoritative hits. */
export function canStartUalMiningAction({
  digSystem,
  nowMs,
  abilities = null,
  actionKind = "normal",
} = {}) {
  // Authored contacts reserve cooldown authority at the action start timestamp,
  // so this gate removes empty swings without adding wind-up to mining speed.
  // Quickslash owns a separate sustained-action cadence and remains unchanged.
  if (actionKind !== "normal") return true;
  if (typeof digSystem?.isMineCooldownReady !== "function") return true;
  return digSystem.isMineCooldownReady(nowMs, abilities) === true;
}

/** Returns the presentation hold deadline around the next ordinary-hit time. */
export function resolveUalMiningRecoveryHoldUntilMs({
  digSystem,
  abilities = null,
  actionKind = "normal",
} = {}) {
  if (actionKind !== "normal") return null;
  const actionStartedAtMs = Number(digSystem?.lastMineTime);
  const cooldownMs = Number(digSystem?.getEffectiveCooldownMs?.(abilities));
  if (
    !Number.isFinite(actionStartedAtMs)
    || !Number.isFinite(cooldownMs)
    || cooldownMs < 0
  ) return null;
  const releaseGraceMs = Number(
    UAL_NATIVE_ACTION_TUNING.cadence.normal.recoveryReleaseGraceMs,
  );
  return actionStartedAtMs + cooldownMs
    + (Number.isFinite(releaseGraceMs) ? Math.max(0, releaseGraceMs) : 0);
}
