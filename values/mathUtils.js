/**
 * Small pure math helpers shared by runtime systems.
 */

export const clamp01 = (value) => Math.max(0, Math.min(1, value));
export const clamp01Finite = (value) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
export const lerp = (a, b, t) => a + (b - a) * t;

export function frameRateIndependentStepCount(
  elapsedMs,
  referenceStepMs,
  maxStepCount,
) {
  const safeReferenceStepMs = Number.isFinite(referenceStepMs) && referenceStepMs > 0
    ? referenceStepMs
    : 1;
  const safeMaxStepCount = Number.isFinite(maxStepCount) && maxStepCount >= 0
    ? maxStepCount
    : 1;
  const safeElapsedMs = Number.isFinite(elapsedMs)
    ? Math.max(0, elapsedMs)
    : safeReferenceStepMs;
  return Math.min(safeMaxStepCount, safeElapsedMs / safeReferenceStepMs);
}

export function frameRateIndependentResponse(
  responsePerStep,
  elapsedMs,
  referenceStepMs,
  maxStepCount,
) {
  const safeResponse = clamp01Finite(responsePerStep);
  if (safeResponse === 0 || safeResponse === 1) return safeResponse;
  const stepCount = frameRateIndependentStepCount(
    elapsedMs,
    referenceStepMs,
    maxStepCount,
  );
  return 1 - Math.pow(1 - safeResponse, stepCount);
}
