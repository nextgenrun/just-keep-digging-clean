import { SESSION_AWAKENING as C } from "../../values/sessionAwakening.js";

const clamp = value => Math.max(0, Math.min(1, value));
export const awakeningEase = (from, to, value) => {
  const t = clamp((value - from) / (to - from));
  return t * t * (3 - 2 * t);
};

export function chooseAwakening(previous, { random = Math.random, forced = null, reduced = false } = {}) {
  const candidates = C.variants.filter(variant => variant.id !== previous);
  const variant = C.variants.find(item => item.id === forced)
    || candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))];
  return {
    ...variant,
    durationMs: reduced ? C.reducedDurationMs : variant.durationMs * (1 + (random() * 2 - 1) * C.durationJitter),
    blurStrength: !reduced && random() < variant.blurChance ? variant.blurStrength : 0,
    cameraScale: reduced ? 0 : variant.cameraScale,
    reduced,
  };
}

function eyeAt(points, progress) {
  for (let i = 1; i < points.length; i++) {
    if (progress <= points[i][0]) {
      const left = points[i - 1], right = points[i];
      return left[1] + (right[1] - left[1]) * awakeningEase(left[0], right[0], progress);
    }
  }
  return points.at(-1)[1];
}

export function sampleAwakening(selection, elapsedMs) {
  const progress = clamp(elapsedMs / selection.durationMs);
  const settle = 1 - awakeningEase(0, C.releaseAt, progress);
  const focus = Math.sin(Math.PI * awakeningEase(C.blurFrom, C.blurTo, progress));
  return {
    progress,
    opening: selection.reduced ? awakeningEase(0, C.releaseAt, progress) : eyeAt(selection.eye, progress),
    lidAlpha: 1 - awakeningEase(C.art.fadeFrom, C.art.fadeTo, progress),
    hudAlpha: awakeningEase(C.hudFrom, C.hudTo, progress),
    blur: progress >= C.blurTo ? 0 : focus * selection.blurStrength,
    cameraY: settle * C.cameraRisePx * selection.cameraScale,
    cameraZoom: settle * C.cameraZoom * selection.cameraScale,
    animationRate: selection.reduced ? 1 : elapsedMs < C.holdMs ? 0
      : C.animationSlow + (1 - C.animationSlow) * awakeningEase(C.holdMs, C.animationSettleMs, elapsedMs),
    release: progress >= C.releaseAt,
    complete: progress >= 1,
  };
}

/** A clear outdoor shot sits between closing and reopening the eyes. */
export function sampleSleepTimelapse(selection, elapsedMs) {
  const progress = clamp(elapsedMs / selection.durationMs);
  const reveal = awakeningEase(0, selection.fadeMs, elapsedMs);
  const close = awakeningEase(selection.durationMs - selection.fadeMs, selection.durationMs, elapsedMs);
  return { progress, opening: 1, lidAlpha: 0, coverAlpha: 1 - reveal + close,
    hudAlpha: 0, blur: 0, cameraY: 0, cameraZoom: 0,
    animationRate: 1, release: false, complete: false };
}

/** Bed-owned time drives the closing eyes; only the bed advances the day. */
export function sampleDozing(selection, elapsedMs) {
  const progress = clamp(elapsedMs / selection.durationMs);
  const opening = selection.reduced ? 1 - awakeningEase(0, 1, progress)
    : eyeAt(C.sleep.eye, progress);
  return { progress, opening, lidAlpha: 1,
    coverAlpha: selection.reduced ? 1 - opening : awakeningEase(C.sleep.coverFrom, C.sleep.coverTo, progress),
    hudAlpha: 1 - awakeningEase(0, C.sleep.hudTo, progress),
    blur: Math.sin(Math.PI * progress) * selection.blurStrength,
    cameraY: 0, cameraZoom: 0, animationRate: 1, release: false, complete: false };
}
