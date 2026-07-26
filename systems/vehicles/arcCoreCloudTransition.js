import { getArcCoreVisualMode } from "../../values/arcCoreVisualConfig.js";

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function smooth(value) {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
}

function range(value, start, end) {
  return smooth((value - start) / (end - start));
}

export function beginArcCloudTransition(kind, arcMode, timeMs) {
  const config = getArcCoreVisualMode(arcMode);
  if (!config) return null;
  return {
    kind,
    arcMode,
    startedAtMs: timeMs,
    durationMs: config.cloudDurationMs,
  };
}

export function getArcCloudTransitionProgress(transition, timeMs) {
  if (!transition) return 0;
  return clamp((timeMs - transition.startedAtMs) / transition.durationMs);
}

export function isArcCloudTransitionComplete(transition, timeMs) {
  return Boolean(transition)
    && timeMs - transition.startedAtMs >= transition.durationMs;
}

export function resolveArcCloudTransitionVisuals(transition, timeMs) {
  const config = getArcCoreVisualMode(transition?.arcMode);
  if (!config) return null;
  const progress = getArcCloudTransitionProgress(transition, timeMs);
  const entering = transition.kind === "enter";
  const timing = config.transition;
  const capture = range(
    progress,
    timing.playerFadeOutStart,
    timing.playerFadeOutEnd,
  );
  const materialize = range(
    progress,
    timing.arcFadeInStart,
    timing.arcFadeInEnd,
  );
  const release = range(
    progress,
    timing.playerReturnStart,
    timing.playerReturnEnd,
  );
  const playerToCore = entering ? capture : 1 - release;
  return {
    progress,
    playerAlpha: entering ? 1 - capture : release,
    arcAlpha: entering ? materialize : 1 - capture,
    cloudEnvelope: Math.pow(
      Math.sin(progress * Math.PI),
      timing.envelopeExponent,
    ),
    playerToCore,
    playerScale: 1 - playerToCore * timing.playerScaleLoss,
    arcScale: timing.arcInitialScale
      + (1 - timing.arcInitialScale) * (entering ? materialize : 1 - capture),
  };
}

export function resolveArcCloudTransitionPhase(transition, timeMs) {
  const config = getArcCoreVisualMode(transition?.arcMode);
  if (!config) return "idle";
  const progress = getArcCloudTransitionProgress(transition, timeMs);
  const timing = config.transition;
  if (transition.kind === "enter") {
    if (progress < timing.playerFadeOutStart) return "ion wake";
    if (progress < timing.playerFadeOutEnd) return "silhouette capture";
    if (progress < timing.arcFadeInEnd) return "core assembly";
    return "seal collapse";
  }
  if (progress < timing.playerFadeOutStart) return "core vent";
  if (progress < timing.playerFadeOutEnd) return "cloud occlusion";
  if (progress < timing.playerReturnEnd) return "pilot release";
  return "ion release";
}
