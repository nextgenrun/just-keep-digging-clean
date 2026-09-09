import { MINING_IMPACT_POLISH_CONFIG } from "../../values/miningImpactPolish.js";

const MILLISECONDS_PER_SECOND = 1000;
const TAU = Math.PI * 2;

/** Resolves one deterministic, bounded camera-shake sample. */
export function resolveCameraShakeOffset(shake, elapsedMs, progress, config) {
  let factor;
  if (shake.decay === "linear") {
    factor = 1 - progress;
  } else if (shake.decay === "none") {
    factor = 1;
  } else {
    factor = Math.exp(-progress * config.exponentialDecayRate)
      * Math.pow(1 - progress, config.exponentialEndTaperPower);
  }

  const elapsedSeconds = elapsedMs / MILLISECONDS_PER_SECOND;
  const phaseX = elapsedSeconds * shake.freqX * TAU;
  const phaseY = elapsedSeconds * shake.freqY * TAU;
  const amplitude = shake.intensity * factor;
  const directionLength = Math.hypot(shake.direction?.x || 0, shake.direction?.y || 0);
  if (shake.renderImpulse && directionLength > 0) {
    const x = shake.direction.x / directionLength, y = shake.direction.y / directionLength;
    let normal = Math.cos(phaseX) * amplitude;
    let tangent = Math.sin(phaseY) * amplitude * MINING_IMPACT_POLISH_CONFIG.shake.tangentRatio;
    const magnitude = Math.hypot(normal, tangent);
    if (magnitude > amplitude) { normal *= amplitude / magnitude; tangent *= amplitude / magnitude; }
    return { offsetX: x * normal - y * tangent, offsetY: y * normal + x * tangent };
  }
  const secondaryRatio = config.secondaryWaveAmplitudeRatio;
  const waveNormalization = 1 + secondaryRatio;
  const secondaryX = Math.sin(
    phaseX * config.secondaryWaveFrequencyRatioX + config.secondaryWavePhaseX,
  );
  const secondaryY = Math.cos(
    phaseY * config.secondaryWaveFrequencyRatioY + config.secondaryWavePhaseY,
  );

  return {
    offsetX: (Math.sin(phaseX) + secondaryX * secondaryRatio)
      * amplitude / waveNormalization,
    offsetY: (Math.cos(phaseY) + secondaryY * secondaryRatio)
      * amplitude / waveNormalization,
  };
}
