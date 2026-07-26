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
  if (!config?.artwork) return null;
  return {
    kind,
    arcMode,
    startedAtMs: timeMs,
    durationMs: config.artwork.cloudDurationMs,
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

function puffNoise(index, offset) {
  return 0.5 + Math.sin(index * 12.9898 + offset * 78.233) * 0.5;
}

export function drawArcCloudTransition(g, options) {
  const { transition, timeMs, cx, cy, direction } = options;
  const config = getArcCoreAnimationReviewMode(transition?.arcMode);
  if (!config?.artwork) return;

  const visual = resolveArcCloudTransitionVisuals(transition, timeMs);
  const artwork = config.artwork;
  const entering = transition.kind === "enter";
  const directionSign = entering ? 1 : -1;
  const spin = timeMs * (config.id === "arcCoreOmega" ? 0.0007 : 0.0018) * directionSign;
  const baseRadius = artwork.cloudRadiusPx;
  const radius = baseRadius * lerp(0.28, 1, visual.cloudEnvelope);
  const puffs = artwork.cloudPuffs;
  const paleColor = config.id === "arcCoreOmega" ? 0xffe4ff : 0xe8fdff;

  g.fillStyle(config.energyColor, 0.055 * visual.cloudEnvelope);
  g.fillCircle(cx, cy, radius * 1.08);
  for (let index = 0; index < puffs; index += 1) {
    const angle = index * GOLDEN_ANGLE + spin;
    const band = 0.22 + (index % 5) * 0.145;
    const turbulence = puffNoise(index, visual.progress);
    const radial = radius * band;
    const forwardBias = Math.sin(visual.progress * Math.PI) * baseRadius * 0.08;
    const px = cx + Math.cos(angle) * radial + direction.x * forwardBias;
    const py = cy + Math.sin(angle) * radial + direction.y * forwardBias;
    const puffSize = baseRadius * (0.075 + turbulence * 0.075) * visual.cloudEnvelope;
    const color = index % 5 === 0
      ? config.accentColor
      : index % 3 === 0 ? paleColor : config.energyColor;
    const alpha = visual.cloudEnvelope * (0.08 + turbulence * 0.1);

    g.fillStyle(color, alpha);
    g.fillEllipse(
      px,
      py,
      puffSize * (1.15 + turbulence * 0.45),
      puffSize * (0.72 + (1 - turbulence) * 0.35),
    );
  }

  const filamentCount = config.id === "arcCoreOmega" ? 8 : 3;
  for (let index = 0; index < filamentCount; index += 1) {
    const angle = spin * 1.8 + index * TAU / filamentCount;
    const startRadius = radius * (0.58 + (index % 2) * 0.16);
    const sx = cx + Math.cos(angle) * startRadius;
    const sy = cy + Math.sin(angle) * startRadius;
    const ex = lerp(sx, cx, 0.68 + visual.cloudEnvelope * 0.18);
    const ey = lerp(sy, cy, 0.68 + visual.cloudEnvelope * 0.18);
    g.lineStyle(
      config.id === "arcCoreOmega" ? 3 : 2,
      index % 2 ? config.accentColor : paleColor,
      visual.cloudEnvelope * 0.54,
    );
    g.lineBetween(sx, sy, ex, ey);
  }

  g.lineStyle(
    config.id === "arcCoreOmega" ? 6 : 3,
    config.energyColor,
    visual.cloudEnvelope * 0.42,
  );
  g.strokeCircle(cx, cy, radius * (0.28 + visual.cloudEnvelope * 0.08));
  g.fillStyle(paleColor, visual.cloudEnvelope * 0.18);
  g.fillCircle(cx, cy, baseRadius * 0.09 * visual.cloudEnvelope);
}
