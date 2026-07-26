import {
  getArcCoreAnimationReviewMode,
} from "../../../values/arcCoreAnimationReview.js";

const TAU = Math.PI * 2;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function smooth(value) {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
}

function lerp(from, to, amount) {
  return from + (to - from) * clamp(amount);
}

export function beginArcCloudTransition(kind, arcMode, timeMs) {
  const config = getArcCoreAnimationReviewMode(arcMode);
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
  const progress = getArcCloudTransitionProgress(transition, timeMs);
  const entering = transition?.kind === "enter";
  const playerAlpha = entering
    ? 1 - smooth((progress - 0.12) / 0.46)
    : smooth((progress - 0.36) / 0.42);
  const arcAlpha = entering
    ? smooth((progress - 0.36) / 0.38)
    : 1 - smooth((progress - 0.12) / 0.46);
  const cloudEnvelope = Math.pow(Math.sin(progress * Math.PI), 0.68);
  const playerToCore = entering
    ? smooth((progress - 0.08) / 0.52)
    : 1 - smooth((progress - 0.38) / 0.5);
  return {
    progress,
    playerAlpha,
    arcAlpha,
    cloudEnvelope,
    playerToCore,
    playerScale: 1 - playerToCore * 0.22,
    arcScale: 0.78 + arcAlpha * 0.22,
  };
}

export function resolveArcCloudTransitionPhase(transition, timeMs) {
  const progress = getArcCloudTransitionProgress(transition, timeMs);
  if (transition?.kind === "enter") {
    if (progress < 0.2) return "cloud summon";
    if (progress < 0.5) return "player occlusion";
    if (progress < 0.76) return "arc materialization";
    return "cloud collapse";
  }
  if (progress < 0.22) return "arc vent";
  if (progress < 0.52) return "cloud silhouette";
  if (progress < 0.8) return "player rematerialization";
  return "cloud release";
}

function sparkNoise(index, offset) {
  return 0.5 + Math.sin(index * 12.9898 + offset * 78.233) * 0.5;
}

export function drawArcCloudTransition(g, options) {
  const { transition, timeMs, cx, cy, direction } = options;
  const config = getArcCoreAnimationReviewMode(transition?.arcMode);
  if (!config) return;

  const visual = resolveArcCloudTransitionVisuals(transition, timeMs);
  const entering = transition.kind === "enter";
  const directionSign = entering ? 1 : -1;
  const omega = config.id === "arcCoreOmega";
  const spin = timeMs * (omega ? 0.0007 : 0.0018) * directionSign;
  const baseRadius = config.cloudRadiusPx;
  const radius = baseRadius * lerp(0.28, 1, visual.cloudEnvelope);
  const paleColor = omega ? 0xffe4ff : 0xe8fdff;
  const shadowColor = omega ? 0x110619 : 0x06151c;

  g.fillStyle(shadowColor, 0.2 * visual.cloudEnvelope);
  g.fillCircle(cx, cy, radius * 0.48);
  for (let index = 0; index < config.cloudSparkCount; index += 1) {
    const angle = index * GOLDEN_ANGLE + spin;
    const band = 0.38 + (index % 5) * 0.12;
    const turbulence = sparkNoise(index, visual.progress);
    const radial = radius * band;
    const forwardBias = Math.sin(visual.progress * Math.PI)
      * baseRadius
      * 0.08;
    const px = cx
      + Math.cos(angle) * radial
      + direction.x * forwardBias;
    const py = cy
      + Math.sin(angle) * radial
      + direction.y * forwardBias;
    const sparkSize = baseRadius
      * (0.012 + turbulence * 0.018)
      * visual.cloudEnvelope;
    const color = index % 5 === 0
      ? config.accentColor
      : index % 3 === 0 ? paleColor : config.energyColor;
    const alpha = visual.cloudEnvelope * (0.34 + turbulence * 0.36);

    g.fillStyle(color, alpha);
    g.fillCircle(px, py, sparkSize);
    g.lineStyle(Math.max(1, sparkSize * 0.34), color, alpha * 0.56);
    g.lineBetween(
      px,
      py,
      px - Math.cos(angle) * sparkSize * 4.5,
      py - Math.sin(angle) * sparkSize * 4.5,
    );
  }

  const filamentCount = omega ? 8 : 3;
  for (let index = 0; index < filamentCount; index += 1) {
    const angle = spin * 1.8 + index * TAU / filamentCount;
    const startRadius = radius * (0.58 + (index % 2) * 0.16);
    const sx = cx + Math.cos(angle) * startRadius;
    const sy = cy + Math.sin(angle) * startRadius;
    const ex = lerp(sx, cx, 0.68 + visual.cloudEnvelope * 0.18);
    const ey = lerp(sy, cy, 0.68 + visual.cloudEnvelope * 0.18);
    g.lineStyle(
      omega ? 3 : 2,
      index % 2 ? config.accentColor : paleColor,
      visual.cloudEnvelope * 0.54,
    );
    g.lineBetween(sx, sy, ex, ey);
  }

  for (let index = 0; index < 3; index += 1) {
    const ringRadius = radius * (0.25 + index * 0.16);
    g.lineStyle(
      Math.max(2, baseRadius * (0.012 - index * 0.002)),
      index === 1 ? config.accentColor : config.energyColor,
      visual.cloudEnvelope * (0.42 - index * 0.09),
    );
    g.beginPath();
    g.arc(
      cx,
      cy,
      ringRadius,
      spin * (1 + index * 0.26) + index * 1.4,
      spin * (1 + index * 0.26) + index * 1.4 + Math.PI * 0.72,
    );
    g.strokePath();
  }
}
