const moveToward = (current, target, maximumDelta) => {
  if (current < target) return Math.min(current + maximumDelta, target);
  if (current > target) return Math.max(current - maximumDelta, target);
  return target;
};

/** Resolves one frame of grounded horizontal velocity without changing input authority. */
export function resolveGroundHorizontalVelocity({
  currentVelocity,
  targetVelocity,
  effectiveMaxSpeed,
  deltaSeconds,
  config,
  reversing = false,
}) {
  const current = Number.isFinite(currentVelocity) ? currentVelocity : 0;
  const target = Number.isFinite(targetVelocity) ? targetVelocity : 0;
  const dt = Number.isFinite(deltaSeconds) ? Math.max(0, deltaSeconds) : 0;
  if (dt === 0 || current === target) return current === target ? target : current;

  const speedEnvelope = Math.max(
    Math.abs(Number(effectiveMaxSpeed) || 0),
    Math.abs(current),
    Math.abs(target),
  );
  if (speedEnvelope === 0) return target;

  const targetSign = Math.sign(target);
  const releasing = targetSign === 0 || Math.abs(target) < Math.abs(current);
  const durationMs = reversing
    ? config.reverseFullDirectionMs
    : releasing ? config.releaseToStopMs : config.accelerateToMaxMs;
  if (!Number.isFinite(durationMs) || durationMs <= 0) return target;

  const fullEnvelopeDelta = reversing ? speedEnvelope * 2 : speedEnvelope;
  const maximumDelta = fullEnvelopeDelta * dt / (durationMs / 1000);
  return moveToward(current, target, maximumDelta);
}
